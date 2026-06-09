/**
 * Alexa Custom Skill Webhook — Aaram Kitchen
 *
 * Locales supported: hi-IN (primary for cook), en-IN (admin mode)
 *
 * Cook intents (Hindi):
 *   LaunchRequest / ArrivalIntent  → time-based greeting            (all)
 *   MorningBriefingIntent          → today's Breakfast + Lunch      (cook)
 *   DinnerBriefingIntent           → today's Dinner + ingredient check (cook)
 *   TomorrowBriefingIntent         → next day's B+L + ingredient check (cook)
 *   WaitIntent                     → keep session open while cook checks (cook)
 *   ReplaceMenuItemIntent          → update menu_items in DB        (cook/admin)
 *   MissingItemsIntent             → Gemini extract → grocery_alerts (cook/admin)
 *   AMAZON.Yes/NoIntent            → inventory confirmation flow    (cook/admin)
 *
 * Admin intents (English):
 *   AdminModeIntent                → activate admin session         (admin)
 *   AdminBriefingIntent            → all 3 meals + supply alerts    (admin)
 *   SupplyCheckIntent              → pantry status summary          (admin)
 *   CreateGroceryAlertIntent       → direct grocery alert           (admin)
 *
 * Legacy intents (unchanged):
 *   QueryMenuIntent, FoodSuggestionIntent, DepartureIntent
 *
 * Developer test mode: x-alexa-test-secret header + ALEXA_TEST_SECRET env
 *   x-alexa-force-block: Breakfast|Lunch|Dinner  → override IST time
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';

interface AlexaSlot {
  name: string;
  value?: string;
  confirmationStatus: string;
}
interface AlexaIntent {
  name: string;
  confirmationStatus: string;
  slots?: Record<string, AlexaSlot>;
}
interface AlexaSession {
  new: boolean;
  sessionId: string;
  application: { applicationId: string };
  attributes?: Record<string, unknown>;
  user: { userId: string };
}
interface AlexaBody {
  version: string;
  session: AlexaSession;
  request: {
    type: 'LaunchRequest' | 'IntentRequest' | 'SessionEndedRequest';
    requestId: string;
    timestamp: string;
    locale: string;
    intent?: AlexaIntent;
  };
}

interface MenuRow {
  id: string;
  notes: string | null;
  menu_items: Array<{ item_name: string; sort_order: number }>;
  menu_ingredients: Array<{ ingredient_name: string; quantity: string | null; unit: string | null }>;
}

interface PantryRow {
  id: string;
  name: string;
  status: 'In Stock' | 'Low' | 'Out of Stock';
  quantity: string | null;
  unit: string | null;
}

// ── Supabase (service role — bypasses RLS) ────────────────────────────────────

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Conversation logging (fire-and-forget) ────────────────────────────────────

function logAsync(params: {
  sessionId: string;
  intent: string;
  utterance?: string | null;
  reply?: string | null;
  mealBlock?: string | null;
  adminMode?: boolean;
}) {
  db.from('alexa_logs').insert({
    session_id: params.sessionId,
    intent:     params.intent,
    utterance:  params.utterance  ?? null,
    reply:      params.reply      ?? null,
    meal_block: params.mealBlock  ?? null,
  }).then(() => {}, () => {});
}

// ── IST Helpers ───────────────────────────────────────────────────────────────

function getIST(): { date: string; hour: number; minute: number } {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return {
    date:   ist.toISOString().slice(0, 10),
    hour:   ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  };
}

function istDatePlusDays(days: number): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  ist.setUTCDate(ist.getUTCDate() + days);
  return ist.toISOString().slice(0, 10);
}

function currentMealBlock(hour: number, minute: number): MealBlock {
  const mins = hour * 60 + minute;
  if (mins >= 5 * 60 + 30 && mins < 10 * 60 + 30) return 'Breakfast';
  if (mins >= 10 * 60 + 30 && mins < 14 * 60 + 30) return 'Lunch';
  if (mins >= 14 * 60 + 30) return 'Dinner';
  return 'Breakfast'; // before 5:30 AM — pre-Breakfast prep
}

function nextMealBlock(current: MealBlock): { block: MealBlock; addDays: number } {
  if (current === 'Breakfast') return { block: 'Lunch',     addDays: 0 };
  if (current === 'Lunch')     return { block: 'Dinner',    addDays: 0 };
  return                              { block: 'Breakfast', addDays: 1 };
}

// ── Alexa Response Builder ────────────────────────────────────────────────────

function speak(
  ssml: string,
  opts: {
    reprompt?: string;
    endSession?: boolean;
    sessionAttributes?: Record<string, unknown>;
  } = {}
): NextResponse {
  return NextResponse.json({
    version: '1.0',
    sessionAttributes: opts.sessionAttributes ?? {},
    response: {
      outputSpeech: { type: 'SSML', ssml: `<speak>${ssml}</speak>` },
      ...(opts.reprompt && {
        reprompt: { outputSpeech: { type: 'SSML', ssml: `<speak>${opts.reprompt}</speak>` } },
      }),
      shouldEndSession: opts.endSession ?? false,
    },
  }, { headers: { 'Content-Type': 'application/json' } });
}

// ── Alexa Signature Verification ──────────────────────────────────────────────

async function verifyAlexaSignature(req: NextRequest, rawBody: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  const testSecret = process.env.ALEXA_TEST_SECRET;
  if (testSecret && req.headers.get('x-alexa-test-secret') === testSecret) return;

  const certUrl   = req.headers.get('SignatureCertChainUrl') ?? '';
  const signature = req.headers.get('Signature') ?? '';
  if (!certUrl || !signature) throw new Error('Missing Alexa signature headers');

  const url = new URL(certUrl);
  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 's3.amazonaws.com' ||
    !url.pathname.startsWith('/echo.api/')
  ) throw new Error('Invalid certificate URL origin');

  const verifierMod = require('alexa-verifier') as { default: Function };
  await new Promise<void>((resolve, reject) =>
    verifierMod.default(certUrl, signature, rawBody, (err: Error | null) =>
      err ? reject(err) : resolve()
    )
  );
}

function isTimestampFresh(timestamp: string): boolean {
  const age = Date.now() - new Date(timestamp).getTime();
  return age >= 0 && age <= 150_000;
}

// ── Supabase Queries ──────────────────────────────────────────────────────────

async function fetchMenu(date: string, block: MealBlock): Promise<MenuRow | null> {
  const { data, error } = await db
    .from('menus')
    .select('id, notes, menu_items(item_name, sort_order), menu_ingredients(ingredient_name, quantity, unit)')
    .eq('date', date)
    .eq('meal_block', block)
    .single();
  if (error || !data) return null;
  return data as unknown as MenuRow;
}

async function fetchMealCount(date: string, block: MealBlock): Promise<number | null> {
  const blockCol =
    block === 'Breakfast' ? 'meal_breakfast' :
    block === 'Lunch'     ? 'meal_lunch'     : 'meal_dinner';

  const { data: prefs } = await db
    .from('tenant_meal_preferences')
    .select('tenant_id')
    .eq(blockCol, true);

  // Fallback: count tenants with food_opted = true
  if (!prefs?.length) {
    const { count } = await db
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('food_opted', true);
    return count ?? null;
  }

  const subscribedIds = prefs.map((p: { tenant_id: string }) => p.tenant_id);
  const { data: activeTenants } = await db
    .from('tenants')
    .select('id')
    .eq('status', 'active')
    .in('id', subscribedIds);

  if (!activeTenants?.length) return null;
  const activeIds = activeTenants.map((t: { id: string }) => t.id);

  const { count: skipCount } = await db
    .from('meal_skip_requests')
    .select('id', { count: 'exact', head: true })
    .eq('skip_date', date)
    .eq('meal_block', block)
    .in('tenant_id', activeIds);

  return Math.max(0, activeIds.length - (skipCount ?? 0));
}

async function fetchLowPantryItems(): Promise<PantryRow[]> {
  const { data } = await db
    .from('pantry_items')
    .select('id, name, status, quantity, unit')
    .in('status', ['Low', 'Out of Stock'])
    .order('status'); // Out of Stock first (alphabetically after Low)
  return (data ?? []) as PantryRow[];
}

// ── Gemini: Extract Ingredients (+ optional replacement) ─────────────────────

interface GeminiExtraction {
  missing: string[];
  replacement: { old: string; new: string; certain: boolean } | null;
}

async function extractWithGemini(utterance: string): Promise<GeminiExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { missing: [utterance], replacement: null };

  const prompt = `A kitchen cook said (in Hindi or English): "${utterance}"

Your job is to extract:
1. "missing": array of grocery/ingredient names they said are NOT available (lowercase singular).
2. "replacement": if they suggest replacing one dish with another, extract { "old": "<dish being replaced>", "new": "<replacement dish>", "certain": true/false }.
   - "certain" is true only if they clearly commit to the change (e.g. "bana lete hain", "kar do", "replace karo").
   - "certain" is false if they are just suggesting (e.g. "shayad", "soch rahe hain").
   - Return null if no replacement is mentioned.

Return ONLY valid JSON, no markdown, no explanation.
Example 1: {"missing": ["rajma"], "replacement": {"old": "rajma", "new": "bhindi curry", "certain": true}}
Example 2: {"missing": ["tomatoes", "onions"], "replacement": null}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { missing: [utterance], replacement: null };

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { missing: [utterance], replacement: null };
    const parsed = JSON.parse(match[0]) as GeminiExtraction;
    return {
      missing:     Array.isArray(parsed.missing) ? parsed.missing : [utterance],
      replacement: parsed.replacement ?? null,
    };
  } catch {
    return { missing: [utterance], replacement: null };
  }
}

async function extractIngredients(utterance: string): Promise<string[]> {
  const result = await extractWithGemini(utterance);
  return result.missing;
}

// ── Gemini: Parse replacement slot values ─────────────────────────────────────

async function parseReplacementSlots(
  oldRaw: string,
  newRaw: string
): Promise<{ old: string; new: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { old: oldRaw.trim(), new: newRaw.trim() };

  const prompt = `Clean up these two dish names from a voice utterance. Return ONLY JSON with "old" and "new" keys.
Old dish (raw): "${oldRaw}"
New dish (raw): "${newRaw}"
Example: {"old": "Rajma", "new": "Bhindi Curry"}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 64 },
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { old: oldRaw.trim(), new: newRaw.trim() };
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { old: oldRaw.trim(), new: newRaw.trim() };
    return JSON.parse(match[0]);
  } catch {
    return { old: oldRaw.trim(), new: newRaw.trim() };
  }
}

// ── Tenant Notifications for Menu Change ─────────────────────────────────────

async function notifyTenantsMenuChange(
  oldItem: string,
  newItem: string,
  block: string,
  date: string
): Promise<void> {
  // Get tenants with food opted in, fetch their auth user ID via profiles
  const { data: tenants } = await db
    .from('tenants')
    .select('email')
    .eq('status', 'active')
    .eq('food_opted', true);

  if (!tenants?.length) return;

  const emails = tenants.map((t: { email: string }) => t.email);

  // Look up auth user IDs from profiles table
  const { data: profiles } = await db
    .from('profiles')
    .select('id, email')
    .in('email', emails);

  if (!profiles?.length) return;

  const dateLabel = date === getIST().date ? 'aaj' : 'kal';
  const message   = `${dateLabel === 'aaj' ? 'Aaj' : 'Kal'} ke ${block} mein ${oldItem} ki jagah ab ${newItem} banega.`;

  const notifications = profiles.map((p: { id: string }) => ({
    user_id:   p.id,
    user_type: 'tenant',
    type:      'menu_change',
    title:     'Menu Update 🍽️',
    message,
    read:      false,
  }));

  await db.from('notifications').insert(notifications);
}

// ── Intent Handlers ───────────────────────────────────────────────────────────

interface HandlerResult { response: NextResponse; reply: string; mealBlock?: string; }

function resolveBlock(forceBlock: MealBlock | null, slotBlock?: string | null): MealBlock {
  if (forceBlock) return forceBlock;
  if (slotBlock === 'Breakfast' || slotBlock === 'Lunch' || slotBlock === 'Dinner') return slotBlock;
  const { hour, minute } = getIST();
  return currentMealBlock(hour, minute);
}

// ── LaunchRequest / ArrivalIntent (legacy — single block) ────────────────────

async function handleArrival(
  sessionAttrs: Record<string, unknown>,
  forceBlock: MealBlock | null,
  adminMode: boolean
): Promise<HandlerResult> {
  if (adminMode) return handleAdminBriefing(sessionAttrs);

  const { date } = getIST();
  const block = resolveBlock(forceBlock);
  const [menu, count] = await Promise.all([fetchMenu(date, block), fetchMealCount(date, block)]);

  if (!menu?.menu_items?.length) {
    const reply = `Aaj ka ${block} menu abhi set nahi hua hai.`;
    return {
      reply, mealBlock: block,
      response: speak(
        `Aaram Smart Homes Kitchen mein aapka swagat hai! <break time="300ms"/>
         Aaj ka <emphasis level="moderate">${block}</emphasis> menu abhi set nahi hua hai.
         Supervisor se poochh lijiye.`,
        { endSession: true, sessionAttributes: { currentBlock: block } }
      ),
    };
  }

  const dishes = menu.menu_items.slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name);
  const countText = count != null ? ` ${count} logon ke liye` : '';
  const reply = `Aaj ka ${block}: ${dishes.join(', ')}${countText}.`;

  return {
    reply, mealBlock: block,
    response: speak(
      `Aaram Smart Homes Kitchen mein aapka swagat hai!
       <break time="400ms"/>
       Aaj ke <emphasis level="moderate">${block}</emphasis> mein
       <break time="300ms"/>
       ${dishes.join(', <break time="200ms"/> ')}
       ${count != null ? `<break time="300ms"/> <emphasis level="moderate">${count} logon</emphasis> ke liye` : ''}.
       <break time="600ms"/>
       Subah ka kaam shuru karo. Agar kuch chahiye ho to batao.`,
      { endSession: false, sessionAttributes: { ...sessionAttrs, currentBlock: block, currentMenuId: menu.id } }
    ),
  };
}

// ── MorningBriefingIntent — Breakfast + Lunch for today ──────────────────────

async function handleMorningBriefing(
  sessionAttrs: Record<string, unknown>,
  forceBlock: MealBlock | null
): Promise<HandlerResult> {
  const { date } = getIST();
  const targetDate = forceBlock ? date : date; // always today for morning briefing

  const [bMenu, bCount, lMenu, lCount] = await Promise.all([
    fetchMenu(targetDate, 'Breakfast'),
    fetchMealCount(targetDate, 'Breakfast'),
    fetchMenu(targetDate, 'Lunch'),
    fetchMealCount(targetDate, 'Lunch'),
  ]);

  const bDishes = bMenu?.menu_items?.slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name) ?? [];
  const lDishes = lMenu?.menu_items?.slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name) ?? [];

  const bText = bDishes.length ? bDishes.join(', ') : 'set nahi hua';
  const lText = lDishes.length ? lDishes.join(', ') : 'set nahi hua';
  const bCount_ = bCount != null ? ` — ${bCount} log` : '';
  const lCount_ = lCount != null ? ` — ${lCount} log` : '';

  const reply = `Aaj ke liye — Breakfast: ${bText}${bCount_}. Lunch: ${lText}${lCount_}.`;

  return {
    reply,
    response: speak(
      `Aaj ke liye suno. <break time="400ms"/>
       Breakfast mein <emphasis level="moderate">${bText}</emphasis> hai
       ${bCount != null ? `<break time="200ms"/> <emphasis level="moderate">${bCount} logon</emphasis> ke liye` : ''}.
       <break time="600ms"/>
       Lunch mein <emphasis level="moderate">${lText}</emphasis> hai
       ${lCount != null ? `<break time="200ms"/> <emphasis level="moderate">${lCount} logon</emphasis> ke liye` : ''}.
       <break time="800ms"/>
       Kaam shuru karo! Dinner ke liye poochho jab tayaar ho.`,
      { endSession: true, sessionAttributes: { ...sessionAttrs } }
    ),
  };
}

// ── DinnerBriefingIntent — today's Dinner + ingredient check ─────────────────

async function handleDinnerBriefing(
  sessionAttrs: Record<string, unknown>,
  forceBlock: MealBlock | null
): Promise<HandlerResult> {
  const { date } = getIST();
  const [menu, count] = await Promise.all([fetchMenu(date, 'Dinner'), fetchMealCount(date, 'Dinner')]);

  if (!menu?.menu_items?.length) {
    const reply = `Aaj ka Dinner menu set nahi hua hai.`;
    return {
      reply, mealBlock: 'Dinner',
      response: speak(`Aaj ka Dinner menu abhi set nahi hua hai. Supervisor se poochh lijiye.`, { endSession: true }),
    };
  }

  const dishes = menu.menu_items.slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name);
  const countText = count != null ? ` ${count} logon ke liye` : '';
  const reply = `Aaj ka Dinner: ${dishes.join(', ')}${countText}.`;

  return {
    reply, mealBlock: 'Dinner',
    response: speak(
      `Aaj ke Dinner mein <emphasis level="moderate">${dishes.join(', <break time="200ms"/> ')}</emphasis> banana hai
       ${count != null ? `<break time="200ms"/> <emphasis level="moderate">${count} logon</emphasis> ke liye` : ''}.
       <break time="600ms"/>
       Kya saari cheezein available hain? Agar kuch nahi hai to batao.`,
      {
        reprompt: 'Kya sab kuch available hai? Haan ya nahi mein batao.',
        endSession: false,
        sessionAttributes: {
          ...sessionAttrs,
          awaitingInventoryCheck: true,
          nextMenuId: menu.id,
          nextBlock:  'Dinner',
          nextDate:   date,
        },
      }
    ),
  };
}

// ── TomorrowBriefingIntent — next day Breakfast + Lunch + ingredient check ────

async function handleTomorrowBriefing(
  sessionAttrs: Record<string, unknown>
): Promise<HandlerResult> {
  const tomorrow = istDatePlusDays(1);
  const [bMenu, bCount, lMenu, lCount] = await Promise.all([
    fetchMenu(tomorrow, 'Breakfast'),
    fetchMealCount(tomorrow, 'Breakfast'),
    fetchMenu(tomorrow, 'Lunch'),
    fetchMealCount(tomorrow, 'Lunch'),
  ]);

  const bDishes = bMenu?.menu_items?.slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name) ?? [];
  const lDishes = lMenu?.menu_items?.slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name) ?? [];

  const bText = bDishes.length ? bDishes.join(', ') : 'set nahi hua';
  const lText = lDishes.length ? lDishes.join(', ') : 'set nahi hua';

  const reply = `Kal ke liye — Breakfast: ${bText}. Lunch: ${lText}.`;

  return {
    reply,
    response: speak(
      `Kal ke liye suno. <break time="400ms"/>
       Breakfast mein <emphasis level="moderate">${bText}</emphasis> hai
       ${bCount != null ? `<break time="200ms"/> ${bCount} logon ke liye` : ''}.
       <break time="600ms"/>
       Lunch mein <emphasis level="moderate">${lText}</emphasis> hai
       ${lCount != null ? `<break time="200ms"/> ${lCount} logon ke liye` : ''}.
       <break time="800ms"/>
       Kya kal ke liye saari cheezein available hain? Agar kuch nahi hai to abhi batao.`,
      {
        reprompt: 'Kal ke liye kya kuch cheez missing hai?',
        endSession: false,
        sessionAttributes: {
          ...sessionAttrs,
          awaitingInventoryCheck: true,
          nextBlock:              'BreakfastLunch',
          nextDate:               tomorrow,
          nextMenuIdB:            bMenu?.id ?? null,
          nextMenuIdL:            lMenu?.id ?? null,
        },
      }
    ),
  };
}

// ── WaitIntent — keep session open while cook checks inventory ────────────────

function handleWait(sessionAttrs: Record<string, unknown>): HandlerResult {
  return {
    reply: 'Ji bilkul, wait kar rahi hoon.',
    response: speak(
      'Ji bilkul, main wait karti hoon. <break time="500ms"/> Jab ready ho jaao, tab batao.',
      {
        reprompt: 'Kya saari cheezein mil gayi? Haan ya nahi mein batao.',
        endSession: false,
        sessionAttributes: sessionAttrs,
      }
    ),
  };
}

// ── ReplaceMenuItemIntent ─────────────────────────────────────────────────────

async function handleReplaceMenuItem(
  sessionId: string,
  sessionAttrs: Record<string, unknown>,
  oldRaw: string,
  newRaw: string,
  adminMode: boolean
): Promise<HandlerResult> {
  const { date } = getIST();
  const { old: oldDish, new: newDish } = await parseReplacementSlots(oldRaw, newRaw);

  // Find matching menu_items for today (and tomorrow for cook post-dinner flow)
  const { data: matchingItems } = await db
    .from('menu_items')
    .select('id, menu_id, item_name, menus!inner(date, meal_block)')
    .ilike('item_name', `%${oldDish}%`)
    .gte('menus.date', date)
    .lte('menus.date', istDatePlusDays(1))
    .limit(5);

  if (!matchingItems?.length) {
    const reply = `${oldDish} menu mein nahi mila. Kripya dobara check karein.`;
    return {
      reply,
      response: speak(
        `Mujhe <emphasis level="moderate">${oldDish}</emphasis> aaj ya kal ke menu mein nahi mila.
         Kya aap naam dobara bata sakte ho?`,
        { reprompt: 'Kaunsa dish replace karna hai?', endSession: false, sessionAttributes: sessionAttrs }
      ),
    };
  }

  const target = matchingItems[0] as any;
  const menuData = Array.isArray(target.menus) ? target.menus[0] : target.menus;
  const block: string = menuData?.meal_block ?? 'Unknown';
  const itemDate: string = menuData?.date ?? date;

  // Update menu_items
  await db.from('menu_items').update({ item_name: newDish }).eq('id', target.id);

  // Notify tenants
  await notifyTenantsMenuChange(oldDish, newDish, block, itemDate).catch(() => {});

  // Log change
  logAsync({
    sessionId,
    intent:    'ReplaceMenuItemIntent',
    utterance: `${oldDish} → ${newDish}`,
    reply:     `Replaced ${oldDish} with ${newDish} in ${block}`,
    mealBlock: block,
    adminMode,
  });

  const reply = `${oldDish} ki jagah ${newDish} update kar diya ${block} mein.`;
  return {
    reply, mealBlock: block,
    response: speak(
      `<emphasis level="moderate">${oldDish}</emphasis> ki jagah
       <emphasis level="moderate">${newDish}</emphasis> update kar diya gaya hai ${block} mein.
       <break time="400ms"/>
       Tenants ko notification bhej diya gaya hai.`,
      { endSession: true }
    ),
  };
}

// ── MissingItemsIntent (enhanced — Gemini detects replacement too) ────────────

async function handleMissingItems(
  sessionId: string,
  utterance: string,
  sessionAttrs: Record<string, unknown>
): Promise<HandlerResult> {
  const menuId    = sessionAttrs?.nextMenuId as string | undefined;
  const mealBlock = sessionAttrs?.nextBlock  as string | undefined;

  const { missing: extractedItems, replacement } = await extractWithGemini(utterance);

  // If Gemini detected a definite replacement, ask for confirmation
  if (replacement?.certain) {
    return {
      reply: `Kya ${replacement.old} ki jagah ${replacement.new} kar doon?`,
      response: speak(
        `Theek hai. Kya main <emphasis level="moderate">${replacement.old}</emphasis> ki jagah
         <emphasis level="moderate">${replacement.new}</emphasis> update kar doon
         aur grocery alert nahi banaoon?`,
        {
          reprompt: 'Haan ya nahi mein batao.',
          endSession: false,
          sessionAttributes: {
            ...sessionAttrs,
            pendingReplacement: replacement,
            pendingMissingIfNo: extractedItems,
          },
        }
      ),
    };
  }

  // Standard missing item flow — create grocery alert
  await db.from('grocery_alerts').insert({
    menu_id:         menuId    ?? null,
    meal_block:      mealBlock ?? null,
    raw_utterance:   utterance,
    extracted_items: extractedItems,
    logged_at:       new Date().toISOString(),
  });

  logAsync({ sessionId, intent: 'MissingItemsIntent', utterance, reply: `Logged: ${extractedItems.join(', ')}`, mealBlock });

  const reply = `Logged missing items: ${extractedItems.join(', ')}.`;
  return {
    reply, mealBlock: mealBlock ?? undefined,
    response: speak(
      `Samajh gaya! Maine ye cheezein note kar li hain:
       <break time="400ms"/>
       ${extractedItems.map(i => `<emphasis level="moderate">${i}</emphasis>`).join(', <break time="200ms"/> ')}.
       <break time="600ms"/>
       Admin ko notify kar diya gaya hai. Acha kaam karo!`,
      { endSession: true }
    ),
  };
}

// ── Admin: Activate Admin Mode ────────────────────────────────────────────────

function handleAdminMode(sessionAttrs: Record<string, unknown>): HandlerResult {
  return {
    reply: 'Admin mode activated.',
    response: speak(
      `Admin mode activated. <break time="300ms"/>
       You can say: <emphasis level="moderate">today's briefing</emphasis> for full day overview,
       <emphasis level="moderate">supply check</emphasis> for pantry status,
       or <emphasis level="moderate">create alert</emphasis> for a grocery alert.`,
      {
        endSession: false,
        sessionAttributes: { ...sessionAttrs, adminMode: true },
      }
    ),
  };
}

// ── Admin: Full Day Briefing ──────────────────────────────────────────────────

async function handleAdminBriefing(
  sessionAttrs: Record<string, unknown>
): Promise<HandlerResult> {
  const { date } = getIST();
  const [bMenu, bCount, lMenu, lCount, dMenu, dCount, alerts] = await Promise.all([
    fetchMenu(date, 'Breakfast'),
    fetchMealCount(date, 'Breakfast'),
    fetchMenu(date, 'Lunch'),
    fetchMealCount(date, 'Lunch'),
    fetchMenu(date, 'Dinner'),
    fetchMealCount(date, 'Dinner'),
    fetchLowPantryItems(),
  ]);

  const fmt = (menu: MenuRow | null, count: number | null) => {
    const dishes = menu?.menu_items?.slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name) ?? [];
    const text   = dishes.length ? dishes.join(', ') : 'not set';
    const suffix = count != null ? ` for ${count} people` : '';
    return `${text}${suffix}`;
  };

  const b = fmt(bMenu, bCount);
  const l = fmt(lMenu, lCount);
  const d = fmt(dMenu, dCount);

  let alertsText = '';
  if (alerts.length > 0) {
    const out = alerts.filter(a => a.status === 'Out of Stock').map(a => a.name);
    const low = alerts.filter(a => a.status === 'Low').map(a => a.name);
    const parts = [];
    if (out.length) parts.push(`${out.join(', ')} ${out.length > 1 ? 'are' : 'is'} out of stock`);
    if (low.length) parts.push(`${low.join(', ')} ${low.length > 1 ? 'are' : 'is'} low`);
    alertsText = `Supply alerts: ${parts.join('. ')}.`;
  } else {
    alertsText = 'All supplies are in stock.';
  }

  const reply = `Today — Breakfast: ${b}. Lunch: ${l}. Dinner: ${d}. ${alertsText}`;

  return {
    reply,
    response: speak(
      `Today's plan: <break time="400ms"/>
       Breakfast — <emphasis level="moderate">${b}</emphasis>. <break time="500ms"/>
       Lunch — <emphasis level="moderate">${l}</emphasis>. <break time="500ms"/>
       Dinner — <emphasis level="moderate">${d}</emphasis>. <break time="700ms"/>
       ${alertsText}`,
      { endSession: true, sessionAttributes: { ...sessionAttrs, adminMode: true } }
    ),
  };
}

// ── Admin: Supply Check ───────────────────────────────────────────────────────

async function handleSupplyCheck(sessionAttrs: Record<string, unknown>): Promise<HandlerResult> {
  const alerts = await fetchLowPantryItems();

  if (!alerts.length) {
    return {
      reply: 'All pantry items are in stock.',
      response: speak('All pantry items are currently in stock. Great job!', { endSession: true }),
    };
  }

  const out = alerts.filter(a => a.status === 'Out of Stock');
  const low = alerts.filter(a => a.status === 'Low');

  let ssml = '';
  if (out.length) ssml += `Out of stock: <emphasis level="moderate">${out.map(a => a.name).join(', ')}</emphasis>. <break time="400ms"/>`;
  if (low.length) ssml += `Running low: <emphasis level="moderate">${low.map(a => a.name).join(', ')}</emphasis>.`;

  const reply = `Out of stock: ${out.map(a => a.name).join(', ') || 'none'}. Low: ${low.map(a => a.name).join(', ') || 'none'}.`;
  return { reply, response: speak(ssml, { endSession: true }) };
}

// ── Admin: Create Grocery Alert Directly ─────────────────────────────────────

async function handleCreateGroceryAlert(
  utterance: string,
  sessionAttrs: Record<string, unknown>
): Promise<HandlerResult> {
  // Admin is directly naming items to order — split on commas/and rather than extracting negations
  const items = utterance
    .split(/,|\band\b/i)
    .map(s => s.trim())
    .filter(Boolean);
  const extracted = items.length ? items : [utterance];

  await db.from('grocery_alerts').insert({
    meal_block:      null,
    raw_utterance:   utterance,
    extracted_items: extracted,
    logged_at:       new Date().toISOString(),
  });
  const reply = `Grocery alert created for: ${extracted.join(', ')}.`;
  return {
    reply,
    response: speak(
      `Grocery alert created for: <emphasis level="moderate">${extracted.join(', ')}</emphasis>.
       This will appear on your admin dashboard.`,
      { endSession: true }
    ),
  };
}

// ── Legacy: QueryMenuIntent ───────────────────────────────────────────────────

async function handleQueryMenu(
  sessionAttrs: Record<string, unknown>,
  forceBlock: MealBlock | null,
  slotBlock?: string | null
): Promise<HandlerResult> {
  const { date } = getIST();
  const block = resolveBlock(forceBlock, slotBlock);
  const [menu, count] = await Promise.all([fetchMenu(date, block), fetchMealCount(date, block)]);

  if (!menu?.menu_items?.length) {
    return {
      reply: `No ${block} menu set for today.`,
      mealBlock: block,
      response: speak(`Aaj ka ${block} menu set nahi hua hai.`, { endSession: true }),
    };
  }

  const dishes = menu.menu_items.slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name);
  const countText = count != null ? ` ${count} logon ke liye` : '';
  const reply = `Today's ${block}: ${dishes.join(', ')}${countText}.`;

  return {
    reply, mealBlock: block,
    response: speak(
      `Aaj ke <emphasis level="moderate">${block}</emphasis> mein
       ${dishes.join(', <break time="200ms"/> ')}
       ${count != null ? `<break time="200ms"/> ${count} logon ke liye` : ''}.`,
      { endSession: true }
    ),
  };
}

// ── Legacy: FoodSuggestionIntent ─────────────────────────────────────────────

async function handleFoodSuggestion(suggestion: string): Promise<HandlerResult> {
  if (!suggestion.trim()) {
    return {
      reply: 'No suggestion captured.',
      response: speak(
        "Aapki suggestion clear nahi aayi. " +
        'Please dobara boliye, jaise: <emphasis level="moderate">mujhe biryani banana chahiye</emphasis>.',
        { reprompt: 'Aapka suggestion kya hai?', endSession: false }
      ),
    };
  }
  await db.from('food_suggestions').insert({
    suggestion: suggestion.trim(), source: 'alexa', tenant_id: null, status: 'pending',
  });
  return {
    reply: `Logged suggestion: "${suggestion}".`,
    response: speak(
      `Shukriya! Aapka suggestion kitchen team ko bhej diya gaya:
       <break time="300ms"/> <emphasis level="moderate">${suggestion}</emphasis>.
       <break time="400ms"/> Goodbye!`,
      { endSession: true }
    ),
  };
}

// ── Legacy: DepartureIntent ───────────────────────────────────────────────────

async function handleDeparture(
  sessionAttrs: Record<string, unknown>,
  forceBlock: MealBlock | null
): Promise<HandlerResult> {
  const { date } = getIST();
  const block = resolveBlock(forceBlock, sessionAttrs?.currentBlock as string | undefined);
  const { block: nextBlock, addDays } = nextMealBlock(block);
  const nextDate = addDays > 0 ? istDatePlusDays(addDays) : date;

  const menu = await fetchMenu(nextDate, nextBlock);

  if (!menu?.menu_ingredients?.length) {
    return {
      reply: `No ingredient list for ${nextBlock} yet.`,
      mealBlock: block,
      response: speak(
        `Aaj ka kaam accha raha! ${nextBlock} ke liye ingredient list abhi set nahi hui hai.
         Supervisor se poochh lijiye. Goodbye!`,
        { endSession: true }
      ),
    };
  }

  const ingredientList = menu.menu_ingredients.map(i => {
    if (i.quantity && i.unit) return `${i.quantity} ${i.unit} of ${i.ingredient_name}`;
    if (i.quantity) return `${i.quantity} ${i.ingredient_name}`;
    return i.ingredient_name;
  });

  const label = addDays > 0 ? `kal ke ${nextBlock}` : nextBlock;
  const reply = `Ingredients for ${label}: ${ingredientList.join(', ')}.`;

  return {
    reply, mealBlock: block,
    response: speak(
      `Bahut accha kaam kiya! Jaane se pehle, <emphasis level="moderate">${label}</emphasis> ke liye
       ye cheezein chahiye hongi:
       <break time="500ms"/>
       ${ingredientList.join(', <break time="200ms"/> ')}.
       <break time="800ms"/>
       Kya ye saari cheezein kitchen mein available hain?`,
      {
        reprompt: 'Haan ya nahi mein batao.',
        endSession: false,
        sessionAttributes: { ...sessionAttrs, awaitingInventoryCheck: true, nextMenuId: menu.id, nextBlock },
      }
    ),
  };
}

// ── Main Route Handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  try {
    await verifyAlexaSignature(req, rawBody);
  } catch {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 403 });
  }

  // Detect test mode early so we can skip strict validation checks
  const isTestMode = !!(
    process.env.ALEXA_TEST_SECRET &&
    req.headers.get('x-alexa-test-secret') === process.env.ALEXA_TEST_SECRET
  );

  let body: AlexaBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isTestMode) {
    const skillId = process.env.ALEXA_SKILL_ID;
    if (skillId && body.session?.application?.applicationId !== skillId) {
      return NextResponse.json({ error: 'Application ID mismatch' }, { status: 403 });
    }

    if (!isTimestampFresh(body.request.timestamp)) {
      return NextResponse.json({ error: 'Request timestamp expired' }, { status: 400 });
    }
  }

  const { request, session } = body;
  const sessionId    = session?.sessionId ?? 'unknown';
  const sessionAttrs = (session?.attributes ?? {}) as Record<string, unknown>;
  const adminMode    = !!(sessionAttrs?.adminMode);

  const forceBlockRaw = isTestMode ? req.headers.get('x-alexa-force-block') : null;
  const forceBlock: MealBlock | null =
    forceBlockRaw === 'Breakfast' || forceBlockRaw === 'Lunch' || forceBlockRaw === 'Dinner'
      ? forceBlockRaw : null;

  const log = (result: HandlerResult, intent: string, utterance?: string | null) => {
    logAsync({ sessionId, intent, utterance, reply: result.reply, mealBlock: result.mealBlock, adminMode });
    return result.response;
  };

  try {
    if (request.type === 'SessionEndedRequest') {
      return NextResponse.json({ version: '1.0', response: {} });
    }

    // ── Launch / Arrival ──────────────────────────────────────────────────────
    if (request.type === 'LaunchRequest' || request.intent?.name === 'ArrivalIntent') {
      return log(await handleArrival(sessionAttrs, forceBlock, adminMode), 'ArrivalIntent');
    }

    if (request.type === 'IntentRequest' && request.intent) {
      const { name: intent, slots } = request.intent;

      switch (intent) {

        // ── Cook: Morning Briefing ──────────────────────────────────────────
        case 'MorningBriefingIntent':
          return log(await handleMorningBriefing(sessionAttrs, forceBlock), 'MorningBriefingIntent');

        // ── Cook: Dinner Briefing ───────────────────────────────────────────
        case 'DinnerBriefingIntent':
          return log(await handleDinnerBriefing(sessionAttrs, forceBlock), 'DinnerBriefingIntent');

        // ── Cook: Tomorrow Briefing ─────────────────────────────────────────
        case 'TomorrowBriefingIntent':
          return log(await handleTomorrowBriefing(sessionAttrs), 'TomorrowBriefingIntent');

        // ── Cook: Wait (keep session open) ─────────────────────────────────
        case 'WaitIntent':
          if (sessionAttrs?.awaitingInventoryCheck) {
            return log(handleWait(sessionAttrs), 'WaitIntent');
          }
          return speak('Ji batao, main sun rahi hoon.', { endSession: false, sessionAttributes: sessionAttrs });

        // ── Cook/Admin: Replace menu item ───────────────────────────────────
        case 'ReplaceMenuItemIntent': {
          const oldRaw = slots?.OldItem?.value?.trim() ?? '';
          const newRaw = slots?.NewItem?.value?.trim() ?? '';
          if (!oldRaw || !newRaw) {
            return speak(
              'Kripya batao kaunsa dish replace karna hai aur uski jagah kya banana hai.',
              { reprompt: 'Kaunsa dish replace karna hai?', endSession: false, sessionAttributes: sessionAttrs }
            );
          }
          return log(
            await handleReplaceMenuItem(sessionId, sessionAttrs, oldRaw, newRaw, adminMode),
            'ReplaceMenuItemIntent', `${oldRaw} → ${newRaw}`
          );
        }

        // ── Cook/Admin: Legacy query ────────────────────────────────────────
        case 'QueryMenuIntent': {
          const slotBlock = slots?.RequestedBlock?.value ?? null;
          return log(await handleQueryMenu(sessionAttrs, forceBlock, slotBlock), 'QueryMenuIntent');
        }

        // ── All: Food suggestion ────────────────────────────────────────────
        case 'FoodSuggestionIntent': {
          const suggestion = slots?.SuggestionText?.value?.trim() ?? '';
          return log(await handleFoodSuggestion(suggestion), 'FoodSuggestionIntent', suggestion);
        }

        // ── Cook/Admin: Legacy departure ────────────────────────────────────
        case 'DepartureIntent':
          return log(await handleDeparture(sessionAttrs, forceBlock), 'DepartureIntent');

        // ── Cook/Admin: Missing items ───────────────────────────────────────
        case 'MissingItemsIntent': {
          const utterance = slots?.MissingItems?.value?.trim() ?? '';
          if (!utterance) {
            const r = speak(
              'Kya nahi mila? Please batao, jaise: <emphasis level="moderate">tomatoes aur pyaz nahi hai</emphasis>.',
              { reprompt: 'Kya khatam ho gaya?', endSession: false, sessionAttributes: sessionAttrs }
            );
            logAsync({ sessionId, intent: 'MissingItemsIntent', utterance: null, reply: 'Prompt: what is missing?' });
            return r;
          }
          return log(await handleMissingItems(sessionId, utterance, sessionAttrs), 'MissingItemsIntent', utterance);
        }

        // ── Admin: Activate mode ────────────────────────────────────────────
        case 'AdminModeIntent':
          return log(handleAdminMode(sessionAttrs), 'AdminModeIntent');

        // ── Admin: Full briefing ────────────────────────────────────────────
        case 'AdminBriefingIntent':
          return log(await handleAdminBriefing(sessionAttrs), 'AdminBriefingIntent');

        // ── Admin: Supply check ─────────────────────────────────────────────
        case 'SupplyCheckIntent':
          return log(await handleSupplyCheck(sessionAttrs), 'SupplyCheckIntent');

        // ── Admin: Create grocery alert ─────────────────────────────────────
        case 'CreateGroceryAlertIntent': {
          const utterance = slots?.AlertItem?.value?.trim() ?? '';
          if (!utterance) {
            return speak('Kaunsi cheez mangvani hai?', { reprompt: 'Grocery alert kiske liye?', endSession: false, sessionAttributes: sessionAttrs });
          }
          return log(await handleCreateGroceryAlert(utterance, sessionAttrs), 'CreateGroceryAlertIntent', utterance);
        }

        // ── Yes/No: inventory confirmation ─────────────────────────────────
        case 'AMAZON.YesIntent': {
          // If confirming a pending replacement (from combined missing+replace utterance)
          if (sessionAttrs?.pendingReplacement) {
            const rep = sessionAttrs.pendingReplacement as { old: string; new: string };
            return log(
              await handleReplaceMenuItem(sessionId, sessionAttrs, rep.old, rep.new, adminMode),
              'AMAZON.YesIntent'
            );
          }
          if (sessionAttrs?.awaitingInventoryCheck) {
            logAsync({ sessionId, intent: 'AMAZON.YesIntent', reply: 'All ingredients available.' });
            return speak('Bahut badhiya! Saari cheezein available hain. Mast khaana banao!', { endSession: true });
          }
          return speak('Achha! Goodbye!', { endSession: true });
        }

        case 'AMAZON.NoIntent': {
          // If rejecting a pending replacement
          if (sessionAttrs?.pendingReplacement) {
            const missingItems = sessionAttrs.pendingMissingIfNo as string[] | undefined;
            if (missingItems?.length) {
              const menuId    = sessionAttrs?.nextMenuId as string | undefined;
              const mealBlock = sessionAttrs?.nextBlock  as string | undefined;
              await db.from('grocery_alerts').insert({
                menu_id: menuId ?? null, meal_block: mealBlock ?? null,
                raw_utterance: missingItems.join(', '), extracted_items: missingItems,
                logged_at: new Date().toISOString(),
              });
              logAsync({ sessionId, intent: 'AMAZON.NoIntent', reply: `Grocery alert: ${missingItems.join(', ')}` });
              return speak(
                `Theek hai! Maine <emphasis level="moderate">${missingItems.join(', ')}</emphasis> ka grocery alert bana diya. Admin ko notify kar diya gaya. Goodbye!`,
                { endSession: true }
              );
            }
          }
          if (sessionAttrs?.awaitingInventoryCheck) {
            logAsync({ sessionId, intent: 'AMAZON.NoIntent', reply: 'Prompted for missing items.' });
            return speak(
              'Koi baat nahi. Kya khatam ho gaya? Batao, jaise: <emphasis level="moderate">tomatoes aur pyaz nahi hai</emphasis>.',
              {
                reprompt: 'Kaunsi cheezein nahi hain?',
                endSession: false,
                sessionAttributes: sessionAttrs,
              }
            );
          }
          return speak('Achha. Goodbye!', { endSession: true });
        }

        case 'AMAZON.HelpIntent':
          return speak(
            `Main Aaram Kitchen Assistant hoon. <break time="300ms"/>
             Cook ke liye: <emphasis level="moderate">Aaj ka menu batao</emphasis> boliye Breakfast aur Lunch ke liye.
             <break time="300ms"/>
             <emphasis level="moderate">Dinner mein kya banana hai</emphasis> boliye Dinner ke liye.
             <break time="300ms"/>
             <emphasis level="moderate">Kal ke liye kya banana hai</emphasis> boliye kal ki planning ke liye.
             <break time="300ms"/>
             Admin ke liye: <emphasis level="moderate">admin mode</emphasis> boliye.`,
            { reprompt: "Kya poochha chahte ho?", endSession: false, sessionAttributes: sessionAttrs }
          );

        case 'AMAZON.StopIntent':
        case 'AMAZON.CancelIntent':
          return speak('Goodbye! Achha kaam karo.', { endSession: true });

        default:
          return speak(
            'Samajh nahi aaya. <emphasis level="moderate">Aaj ka menu batao</emphasis> ya <emphasis level="moderate">Dinner mein kya banana hai</emphasis> boliye.',
            { reprompt: "Kya poochha chahte ho?", endSession: false, sessionAttributes: sessionAttrs }
          );
      }
    }

    return speak('Kuch gadbad ho gayi. Dobara try karo.', { endSession: true });

  } catch (err) {
    console.error('[Alexa Webhook] Unhandled error:', err);
    return speak('Abhi connection mein thodi problem hai. Thodi der mein try karo.', { endSession: true });
  }
}
