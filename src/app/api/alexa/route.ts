/**
 * Alexa Custom Skill Webhook — Aaram Kitchen (AI-First)
 *
 * Alexa is used purely as voice I/O (STT + TTS). All natural-language
 * understanding is handled by Gemini 2.5 Flash, which receives full
 * kitchen context (menus, headcounts, pantry) and conversation history,
 * then returns a Hindi reply + optional DB action.
 *
 * Intents:
 *   ConversationIntent (AMAZON.SearchQuery) → handleFreeFormConversation()
 *   AMAZON.YesIntent / AMAZON.NoIntent     → simple acknowledgement
 *   AMAZON.HelpIntent / Stop / Cancel      → standard handlers
 *
 * Developer test mode: x-alexa-test-secret header + ALEXA_TEST_SECRET env
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';

type ConvTurn = { role: 'user' | 'model'; text: string };
const MAX_HISTORY = 10; // 5 user+model pairs

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

interface MealCtx {
  dishes: string[];
  count: number | null;
  id: string | null;
}

interface AiResponse {
  reply: string;
  action: 'none' | 'replace_menu_item' | 'log_missing_items' | 'create_grocery_alert';
  params: Record<string, unknown>;
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

// ── Alexa Response Builders ───────────────────────────────────────────────────

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

// Hindi TTS: wraps SSML + reprompt in <lang xml:lang="hi-IN"> for native Hindi pronunciation
function speakHi(ssml: string, opts: Parameters<typeof speak>[1] = {}): NextResponse {
  return speak(`<lang xml:lang="hi-IN">${ssml}</lang>`, opts.reprompt
    ? { ...opts, reprompt: `<lang xml:lang="hi-IN">${opts.reprompt}</lang>` }
    : opts);
}

// ── Alexa Signature Verification ──────────────────────────────────────────────

async function verifyAlexaSignature(req: NextRequest, rawBody: string): Promise<void> {
  const testSecret = process.env.ALEXA_TEST_SECRET;
  if (testSecret && req.headers.get('x-alexa-test-secret') === testSecret) return;
  if (process.env.SKIP_ALEXA_VERIFICATION === 'true') return;

  const certUrl =
    req.headers.get('signaturecertchainurl') ??
    req.headers.get('SignatureCertChainUrl') ?? '';
  const signature =
    req.headers.get('signature') ??
    req.headers.get('Signature') ?? '';

  if (!certUrl || !signature) throw new Error('Missing Alexa signature headers');

  const parsedUrl = new URL(certUrl);
  if (
    parsedUrl.protocol !== 'https:' ||
    !parsedUrl.hostname.toLowerCase().endsWith('.amazonaws.com') ||
    !parsedUrl.pathname.startsWith('/echo.api/')
  ) throw new Error('Invalid certificate URL');

  const { default: verify } = await import('alexa-verifier');
  await new Promise<void>((resolve, reject) =>
    verify(certUrl, signature, rawBody, (err) => (err ? reject(err) : resolve()))
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
    .order('status');
  return (data ?? []) as PantryRow[];
}

async function fetchMenuContext(date: string): Promise<{ b: MealCtx; l: MealCtx; d: MealCtx }> {
  const [bMenu, bCount, lMenu, lCount, dMenu, dCount] = await Promise.all([
    fetchMenu(date, 'Breakfast'), fetchMealCount(date, 'Breakfast'),
    fetchMenu(date, 'Lunch'),     fetchMealCount(date, 'Lunch'),
    fetchMenu(date, 'Dinner'),    fetchMealCount(date, 'Dinner'),
  ]);

  const toCtx = (menu: MenuRow | null, count: number | null): MealCtx => ({
    dishes: menu?.menu_items?.slice().sort((a, b) => a.sort_order - b.sort_order).map(i => i.item_name) ?? [],
    count,
    id: menu?.id ?? null,
  });

  return { b: toCtx(bMenu, bCount), l: toCtx(lMenu, lCount), d: toCtx(dMenu, dCount) };
}

// ── Tenant Notifications ──────────────────────────────────────────────────────

async function notifyTenantsMenuChange(
  oldItem: string,
  newItem: string,
  block: string,
  date: string
): Promise<void> {
  const { data: tenants } = await db
    .from('tenants')
    .select('email')
    .eq('status', 'active')
    .eq('food_opted', true);

  if (!tenants?.length) return;

  const emails = tenants.map((t: { email: string }) => t.email);
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

// ── Gemini: Free-Form Conversation ────────────────────────────────────────────

function buildSystemPrompt(
  menuCtx: { b: MealCtx; l: MealCtx; d: MealCtx },
  pantry: PantryRow[],
  date: string,
  adminMode: boolean
): string {
  const fmt = (ctx: MealCtx) =>
    ctx.dishes.length
      ? `${ctx.dishes.join(', ')} — ${ctx.count ?? '?'} log`
      : 'set nahi hua';

  const lowItems = pantry.map(p => `${p.name} (${p.status})`);
  const pantryLine = lowItems.length ? lowItems.join(', ') : 'Sab kuch available hai';

  const lang = adminMode
    ? 'English'
    : 'Hindi written in Roman/Latin script only (called Hinglish). NEVER use Devanagari characters (क ख ग घ etc.). Write Hindi words using English letters only — like "Aaj breakfast mein poha hai" not "आज नाश्ते में पोहा है"';

  return `You are Aaram Smart Homes' kitchen AI assistant for the ${adminMode ? 'admin' : 'cook'}.

Today's kitchen status (IST date: ${date}):
- Breakfast: ${fmt(menuCtx.b)}
- Lunch: ${fmt(menuCtx.l)}
- Dinner: ${fmt(menuCtx.d)}
- Low or out of stock: ${pantryLine}

CRITICAL RULES:
1. Respond ONLY in ${lang}
2. This is a VOICE interface — keep replies SHORT (2 sentences max)
3. Be warm and helpful
4. NEVER use Devanagari script. NEVER use markdown or bullet points.

When to use actions:
- Item missing / nahi hai / khatam → action "log_missing_items", params.items: [item names in English]
- Dish change / replace / ki jagah → action "replace_menu_item", params: { "oldItem": "...", "newItem": "...", "block": "Breakfast|Lunch|Dinner", "date": "${date}" }
- Order / mangvao / grocery → action "create_grocery_alert", params.items: [item names]
- Everything else → action "none", params: {}

Return ONLY valid JSON, nothing else:
{"reply":"<Hinglish response>","action":"none","params":{}}`;
}

function extractReplyFallback(text: string): AiResponse {
  // If JSON is truncated, try to salvage just the "reply" field value
  const m = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return { reply: m?.[1] ?? 'Theek hai, main samajh nahi payi.', action: 'none', params: {} };
}

function parseAiJson(text: string): AiResponse | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Partial<AiResponse>;
    if (!parsed.reply) return null;
    return {
      reply:  parsed.reply,
      action: parsed.action || 'none',
      params: parsed.params || {},
    };
  } catch {
    return null;
  }
}

async function callGeminiConversation(
  systemPrompt: string,
  history: ConvTurn[],
  utterance: string
): Promise<AiResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const contents = [
    ...history.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: 'user', parts: [{ text: utterance }] },
  ];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
      signal: AbortSignal.timeout(6_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return parseAiJson(text) ?? extractReplyFallback(text);
  } catch {
    return null;
  }
}

async function callGroqConversation(
  systemPrompt: string,
  history: ConvTurn[],
  utterance: string
): Promise<AiResponse | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(t => ({ role: t.role === 'model' ? 'assistant' : 'user', content: t.text })),
    { role: 'user', content: utterance },
  ];

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    return parseAiJson(text) ?? extractReplyFallback(text);
  } catch {
    return null;
  }
}

async function callAIConversation(
  systemPrompt: string,
  history: ConvTurn[],
  utterance: string
): Promise<AiResponse> {
  const geminiResult = await callGeminiConversation(systemPrompt, history, utterance);
  if (geminiResult) return geminiResult;

  const groqResult = await callGroqConversation(systemPrompt, history, utterance);
  if (groqResult) return groqResult;

  return { reply: 'Abhi thodi problem hai. Thodi der mein try karo.', action: 'none', params: {} };
}

// ── Execute DB Actions from AI ────────────────────────────────────────────────

async function executeReplaceMenuItem(
  params: Record<string, unknown>,
  todayDate: string,
  sessionId: string,
  adminMode: boolean
): Promise<string | null> {
  const oldRaw = String(params.oldItem ?? '').trim();
  const newRaw = String(params.newItem ?? '').trim();
  if (!oldRaw || !newRaw) return null;

  const { data: allItems } = await db
    .from('menu_items')
    .select('id, menu_id, item_name, menus!inner(date, meal_block)')
    .gte('menus.date', todayDate)
    .lte('menus.date', istDatePlusDays(1));

  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const needle      = normalise(oldRaw);
  const needleWords = needle.split(/\s+/).filter(w => w.length > 2);
  const stem3       = (s: string) => normalise(s).split(/\s+/).map(w => w.slice(0, 3)).filter(w => w.length === 3);

  const scored = (allItems ?? []).map((item: any) => {
    const hay = normalise(item.item_name);
    if (hay === needle)                              return { item, score: 4 };
    if (hay.startsWith(needle) || needle.startsWith(hay)) return { item, score: 3 };
    if (needleWords.some(w => hay.includes(w)))     return { item, score: 2 };
    if (stem3(oldRaw).some(ns => stem3(item.item_name).includes(ns))) return { item, score: 1 };
    return { item, score: 0 };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) return null;

  const target   = scored[0].item as any;
  const menuData = Array.isArray(target.menus) ? target.menus[0] : target.menus;
  const block    = menuData?.meal_block ?? 'Unknown';
  const itemDate = menuData?.date ?? todayDate;

  await db.from('menu_items').update({ item_name: newRaw }).eq('id', target.id);
  await notifyTenantsMenuChange(oldRaw, newRaw, block, itemDate).catch(() => {});

  logAsync({
    sessionId,
    intent:    'ConversationIntent:replace_menu_item',
    utterance: `${oldRaw} → ${newRaw}`,
    reply:     `Replaced ${oldRaw} with ${newRaw} in ${block}`,
    mealBlock: block,
    adminMode,
  });

  return block;
}

// ── Main AI Handler ───────────────────────────────────────────────────────────

interface HandlerResult { response: NextResponse; reply: string; }

async function handleFreeFormConversation(
  utterance: string,
  sessionAttrs: Record<string, unknown>,
  adminMode: boolean,
  sessionId: string
): Promise<HandlerResult> {
  const { date } = getIST();

  // Fetch DB context and pantry in parallel
  const [menuCtx, pantry] = await Promise.all([
    fetchMenuContext(date),
    fetchLowPantryItems(),
  ]);

  const systemPrompt = buildSystemPrompt(menuCtx, pantry, date, adminMode);

  // Conversation history (trimmed to MAX_HISTORY)
  const history = (sessionAttrs.conversationHistory as ConvTurn[] | undefined) ?? [];

  // Call AI (Gemini with Groq fallback)
  const ai = await callAIConversation(systemPrompt, history, utterance);

  // Execute DB action
  let actionNote = '';
  try {
    if (ai.action === 'replace_menu_item') {
      const block = await executeReplaceMenuItem(ai.params, date, sessionId, adminMode);
      if (!block) {
        ai.reply += ' Lekin menu mein match nahi mila. Dish ka naam check karo.';
      } else {
        actionNote = `(replaced in ${block})`;
      }
    } else if (ai.action === 'log_missing_items' || ai.action === 'create_grocery_alert') {
      const items = (ai.params.items as string[] | undefined) ?? [];
      if (items.length) {
        await db.from('grocery_alerts').insert({
          meal_block:      null,
          raw_utterance:   utterance,
          extracted_items: items,
          logged_at:       new Date().toISOString(),
        });
        actionNote = `(logged: ${items.join(', ')})`;
      }
    }
  } catch {
    // DB action failed — reply still goes through
  }

  // Update conversation history
  const newHistory: ConvTurn[] = [
    ...history,
    { role: 'user'  as const, text: utterance },
    { role: 'model' as const, text: ai.reply },
  ].slice(-MAX_HISTORY);

  const newAttrs = { ...sessionAttrs, conversationHistory: newHistory };

  logAsync({
    sessionId,
    intent:    'ConversationIntent',
    utterance: actionNote ? `${utterance} ${actionNote}` : utterance,
    reply:     ai.reply,
    adminMode,
  });

  const response = adminMode
    ? speak(ai.reply, { endSession: false, sessionAttributes: newAttrs })
    : speakHi(ai.reply, { endSession: false, sessionAttributes: newAttrs });

  return { reply: ai.reply, response };
}

// ── Main Route Handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  try {
    await verifyAlexaSignature(req, rawBody);
  } catch {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 403 });
  }

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

  try {
    if (request.type === 'SessionEndedRequest') {
      return NextResponse.json({ version: '1.0', response: {} });
    }

    // ── Launch → warm greeting, session stays open ──────────────────────────
    if (request.type === 'LaunchRequest') {
      const { hour } = getIST();
      const greeting = hour < 12 ? 'Subah' : hour < 17 ? 'Dopahar' : 'Shaam';
      logAsync({ sessionId, intent: 'LaunchRequest', reply: 'Greeted cook.' });
      return speakHi(
        `${greeting} ki namaste! Aaram Kitchen mein aapka swagat hai. <break time="300ms"/> Kya banana hai aaj? Ya poochho kuch bhi.`,
        {
          reprompt: 'Koi sawaal poochho ya kuch batao.',
          endSession: false,
          sessionAttributes: {},
        }
      );
    }

    // ── Intent Requests ─────────────────────────────────────────────────────
    if (request.type === 'IntentRequest' && request.intent) {
      const { name: intent, slots } = request.intent;

      switch (intent) {

        // ── Free-form AI conversation (catches everything) ──────────────────
        case 'ConversationIntent': {
          const utterance = slots?.Query?.value?.trim() ?? '';
          if (!utterance) {
            return speakHi(
              'Kuch sun nahi aaya. Dobara boliye.',
              { reprompt: 'Koi sawaal poochho.', endSession: false, sessionAttributes: sessionAttrs }
            );
          }
          const result = await handleFreeFormConversation(utterance, sessionAttrs, adminMode, sessionId);
          return result.response;
        }

        // ── Yes → simple acknowledgement, stay open ─────────────────────────
        case 'AMAZON.YesIntent':
          logAsync({ sessionId, intent: 'AMAZON.YesIntent', reply: 'Ji! Koi aur kaam?' });
          return speakHi(
            'Ji! Koi aur kaam?',
            { reprompt: 'Koi sawaal ho to poochho.', endSession: false, sessionAttributes: sessionAttrs }
          );

        // ── No → prompt for details, stay open ─────────────────────────────
        case 'AMAZON.NoIntent':
          logAsync({ sessionId, intent: 'AMAZON.NoIntent', reply: 'Kya khatam ho gaya?' });
          return speakHi(
            'Theek hai. Kya khatam ho gaya? Batao.',
            { reprompt: 'Kaunsi cheez available nahi hai?', endSession: false, sessionAttributes: sessionAttrs }
          );

        // ── Fallback — utterance didn't match any intent pattern ───────────
        case 'AMAZON.FallbackIntent':
          logAsync({ sessionId, intent: 'AMAZON.FallbackIntent', reply: 'Re-prompted.' });
          return speakHi(
            'Seedha boliye kya chahiye. <break time="200ms"/> Jaise: "batao aaj kya banana hai" ya "tomatoes khatam ho gaye".',
            { reprompt: 'Koi baat poochho.', endSession: false, sessionAttributes: sessionAttrs }
          );

        // ── Help ────────────────────────────────────────────────────────────
        case 'AMAZON.HelpIntent':
          logAsync({ sessionId, intent: 'AMAZON.HelpIntent', reply: 'Help.' });
          return speakHi(
            'Main Aaram Kitchen AI hoon. Mujhse koi bhi kitchen sawaal poochho Hindi mein. <break time="200ms"/> Jaise: "aaj ka menu kya hai", "tomatoes khatam ho gaye", ya "lunch mein rajma ki jagah chole bana do".',
            { reprompt: 'Koi sawaal poochho.', endSession: false, sessionAttributes: sessionAttrs }
          );

        // ── Stop / Cancel ───────────────────────────────────────────────────
        case 'AMAZON.StopIntent':
        case 'AMAZON.CancelIntent':
          logAsync({ sessionId, intent, reply: 'Goodbye.' });
          return speakHi('Alvida! Achha kaam karo.', { endSession: true });

        // ── Default fallback ────────────────────────────────────────────────
        default:
          return speakHi(
            'Kuch samajh nahi aaya. Koi baat poochho Hindi mein.',
            { reprompt: 'Koi sawaal ho to poochho.', endSession: false, sessionAttributes: sessionAttrs }
          );
      }
    }

    return speakHi('Kuch gadbad ho gayi. Dobara try karo.', { endSession: true });

  } catch (err) {
    console.error('[Alexa Webhook] Unhandled error:', err);
    return speakHi('Abhi connection mein thodi problem hai. Thodi der mein try karo.', { endSession: true });
  }
}
