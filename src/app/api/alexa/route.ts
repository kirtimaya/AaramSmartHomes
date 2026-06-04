/**
 * Alexa Custom Skill Webhook — Aaram Kitchen
 *
 * Single POST endpoint that handles every Alexa request:
 *   LaunchRequest / ArrivalIntent  → read today's menu for current IST meal block
 *   DepartureIntent                → read next meal's ingredients, ask for availability
 *   AMAZON.NoIntent                → prompt cook to say what's missing
 *   MissingItemsIntent             → Gemini extracts ingredients → logs to grocery_alerts
 *   AMAZON.YesIntent               → confirm all items available, end session
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (or NEXT_PUBLIC_SUPABASE_ANON_KEY as fallback)
 *   GEMINI_API_KEY
 *   ALEXA_SKILL_ID              (amzn1.ask.skill.xxx — from Alexa Developer Console)
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
    timestamp: string;  // ISO-8601 UTC
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

// ── Supabase (service role — bypasses RLS) ────────────────────────────────────

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── IST Helpers ───────────────────────────────────────────────────────────────

function getIST(): { date: string; hour: number; minute: number } {
  // IST = UTC + 5:30 — avoid any external timezone library
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return {
    date: ist.toISOString().slice(0, 10),   // "YYYY-MM-DD"
    hour: ist.getUTCHours(),
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
  if (mins >= 10 * 60 + 30 && mins < 15 * 60 + 30) return 'Lunch';
  if (mins >= 15 * 60 + 30) return 'Dinner';
  return 'Breakfast'; // before 5:30 AM — treat as pre-Breakfast prep
}

function nextMealBlock(current: MealBlock): { block: MealBlock; addDays: number } {
  if (current === 'Breakfast') return { block: 'Lunch',     addDays: 0 };
  if (current === 'Lunch')     return { block: 'Dinner',    addDays: 0 };
  return                              { block: 'Breakfast', addDays: 1 }; // Dinner → next-day Breakfast
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
  return NextResponse.json(
    {
      version: '1.0',
      sessionAttributes: opts.sessionAttributes ?? {},
      response: {
        outputSpeech: {
          type: 'SSML',
          ssml: `<speak>${ssml}</speak>`,
        },
        ...(opts.reprompt && {
          reprompt: {
            outputSpeech: {
              type: 'SSML',
              ssml: `<speak>${opts.reprompt}</speak>`,
            },
          },
        }),
        shouldEndSession: opts.endSession ?? false,
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

// ── Alexa Signature Verification ──────────────────────────────────────────────

async function verifyAlexaSignature(req: NextRequest, rawBody: string): Promise<void> {
  // In development, skip cryptographic verification for local testing.
  if (process.env.NODE_ENV !== 'production') return;

  // Allow automated tests in production via a pre-shared secret header.
  // Set ALEXA_TEST_SECRET in env and pass x-alexa-test-secret: <value> in requests.
  const testSecret = process.env.ALEXA_TEST_SECRET;
  if (testSecret && req.headers.get('x-alexa-test-secret') === testSecret) return;

  const certUrl   = req.headers.get('SignatureCertChainUrl') ?? '';
  const signature = req.headers.get('Signature') ?? '';

  if (!certUrl || !signature) {
    throw new Error('Missing Alexa signature headers');
  }

  // Validate certificate URL is genuinely from Amazon before downloading it
  const url = new URL(certUrl);
  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 's3.amazonaws.com' ||
    !url.pathname.startsWith('/echo.api/')
  ) {
    throw new Error('Invalid certificate URL origin');
  }

  // Full cryptographic verification via alexa-verifier (already installed)
  // alexa-verifier is CJS — use require() to avoid ESM issues
  const verifierMod = require('alexa-verifier') as { default: Function };
  const verifier = verifierMod.default;

  await new Promise<void>((resolve, reject) =>
    verifier(certUrl, signature, rawBody, (err: Error | null) =>
      err ? reject(err) : resolve()
    )
  );
}

// ── Request Timestamp Guard ───────────────────────────────────────────────────

function isTimestampFresh(timestamp: string): boolean {
  const age = Date.now() - new Date(timestamp).getTime();
  return age >= 0 && age <= 150_000; // Alexa requires ≤ 150 seconds
}

// ── Supabase Queries ──────────────────────────────────────────────────────────

async function fetchMenu(date: string, block: MealBlock): Promise<MenuRow | null> {
  const { data, error } = await db
    .from('menus')
    .select(`
      id,
      notes,
      menu_items ( item_name, sort_order ),
      menu_ingredients ( ingredient_name, quantity, unit )
    `)
    .eq('date', date)
    .eq('meal_block', block)
    .single();

  if (error || !data) return null;
  return data as unknown as MenuRow;
}

// ── Gemini: Extract Ingredient Names from Natural Language ────────────────────

async function extractIngredients(utterance: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [utterance];

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

  const prompt = `A kitchen cook said: "${utterance}"
Extract the specific grocery or ingredient names they mentioned are missing.
Return ONLY a valid JSON array of strings — no explanation, no markdown fences.
Normalise names to lowercase singular form.
Example output: ["onions", "tomatoes", "chicken breast", "cumin seeds"]`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return [utterance];

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Pull the JSON array out, even if the model wraps it in prose
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [utterance];

    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    return [utterance];
  } catch {
    return [utterance]; // graceful fallback — still log the raw utterance
  }
}

// ── Intent Handlers ───────────────────────────────────────────────────────────

async function handleArrival(sessionAttrs: Record<string, unknown>): Promise<NextResponse> {
  const { date, hour, minute } = getIST();
  const block = currentMealBlock(hour, minute);
  const menu = await fetchMenu(date, block);

  if (!menu?.menu_items?.length) {
    return speak(
      `Welcome to Aaram Smart Homes Kitchen! <break time="300ms"/>
       No ${block} menu has been set for today.
       Please check with your supervisor and have a great shift!`,
      {
        endSession: true,
        sessionAttributes: { currentBlock: block },
      }
    );
  }

  const dishes = menu.menu_items
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => i.item_name)
    .join(', <break time="200ms"/> ');

  return speak(
    `Welcome to Aaram Smart Homes Kitchen!
     <break time="400ms"/>
     Today's ${block} menu is:
     <break time="400ms"/>
     ${dishes}.
     <break time="600ms"/>
     Have a wonderful cooking session!
     Say <emphasis level="moderate">I am leaving</emphasis> when you finish.`,
    {
      endSession: false,
      sessionAttributes: {
        ...sessionAttrs,
        currentBlock: block,
        currentMenuId: menu.id,
      },
    }
  );
}

async function handleDeparture(sessionAttrs: Record<string, unknown>): Promise<NextResponse> {
  const { date, hour, minute } = getIST();
  const block = (sessionAttrs?.currentBlock as MealBlock | undefined) ?? currentMealBlock(hour, minute);
  const { block: nextBlock, addDays } = nextMealBlock(block);
  const nextDate = addDays > 0 ? istDatePlusDays(addDays) : date;

  const menu = await fetchMenu(nextDate, nextBlock);

  if (!menu?.menu_ingredients?.length) {
    return speak(
      `Good job today! No ingredient list has been set for ${nextBlock} yet.
       Please check with your supervisor. Goodbye!`,
      { endSession: true }
    );
  }

  // Build a natural-language ingredient list for Alexa to read
  const ingredientList = menu.menu_ingredients
    .map((i) => {
      if (i.quantity && i.unit) return `${i.quantity} ${i.unit} of ${i.ingredient_name}`;
      if (i.quantity)           return `${i.quantity} ${i.ingredient_name}`;
      return i.ingredient_name;
    })
    .join(', <break time="200ms"/> ');

  const label = addDays > 0 ? `tomorrow's ${nextBlock}` : nextBlock;

  return speak(
    `Great work! Before you leave, for <emphasis level="moderate">${label}</emphasis>,
     you will need:
     <break time="500ms"/>
     ${ingredientList}.
     <break time="800ms"/>
     Are all these items available in the kitchen?`,
    {
      reprompt:
        'Please say <emphasis level="moderate">Yes</emphasis> if everything is available, ' +
        'or <emphasis level="moderate">No</emphasis> followed by what is missing.',
      endSession: false,
      sessionAttributes: {
        ...sessionAttrs,
        awaitingInventoryCheck: true,
        nextMenuId: menu.id,
        nextBlock,
      },
    }
  );
}

async function handleMissingItems(
  utterance: string,
  sessionAttrs: Record<string, unknown>
): Promise<NextResponse> {
  const menuId    = sessionAttrs?.nextMenuId  as string | undefined;
  const mealBlock = sessionAttrs?.nextBlock   as string | undefined;

  // ── Gemini extraction ──
  const extractedItems = await extractIngredients(utterance);

  // ── Persist to Supabase ──
  await db.from('grocery_alerts').insert({
    menu_id:         menuId    ?? null,
    meal_block:      mealBlock ?? null,
    raw_utterance:   utterance,
    extracted_items: extractedItems,
    logged_at:       new Date().toISOString(),
  });

  const itemReadout = extractedItems
    .map((item) => `<emphasis level="moderate">${item}</emphasis>`)
    .join(', <break time="200ms"/> ');

  return speak(
    `Understood! I have logged the following missing items:
     <break time="400ms"/>
     ${itemReadout}.
     <break time="600ms"/>
     The kitchen manager has been notified.
     Goodbye and have a great day!`,
    { endSession: true }
  );
}

// ── Main Route Handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text(); // must read before any JSON.parse for signature verification

  // 1. Verify Alexa signature (production only; uses alexa-verifier)
  try {
    await verifyAlexaSignature(req, rawBody);
  } catch (err) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 403 });
  }

  // 2. Parse body
  let body: AlexaBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 3. Validate Skill Application ID
  const skillId = process.env.ALEXA_SKILL_ID;
  if (skillId && body.session?.application?.applicationId !== skillId) {
    return NextResponse.json({ error: 'Application ID mismatch' }, { status: 403 });
  }

  // 4. Validate request timestamp is fresh (≤ 150s)
  if (!isTimestampFresh(body.request.timestamp)) {
    return NextResponse.json({ error: 'Request timestamp expired' }, { status: 400 });
  }

  const { request, session } = body;
  const sessionAttrs = (session?.attributes ?? {}) as Record<string, unknown>;

  // 5. Route by request type + intent — always return a valid Alexa response
  try {
    // ── Session ended (no response body needed) ──
    if (request.type === 'SessionEndedRequest') {
      return NextResponse.json({ version: '1.0', response: {} });
    }

    // ── Skill opened or ArrivalIntent ──
    if (
      request.type === 'LaunchRequest' ||
      request.intent?.name === 'ArrivalIntent'
    ) {
      return await handleArrival(sessionAttrs);
    }

    // ── Intent routing ──
    if (request.type === 'IntentRequest' && request.intent) {
      const { name: intent, slots } = request.intent;

      switch (intent) {

        case 'DepartureIntent':
          return await handleDeparture(sessionAttrs);

        case 'MissingItemsIntent': {
          const utterance = slots?.MissingItems?.value?.trim() ?? '';
          if (!utterance) {
            return speak(
              "I didn't catch what was missing. " +
              'Please try again and say, for example: ' +
              '<emphasis level="moderate">we are missing onions and tomatoes</emphasis>.',
              {
                reprompt: 'What items are missing from the list?',
                endSession: false,
                sessionAttributes: sessionAttrs,
              }
            );
          }
          return await handleMissingItems(utterance, sessionAttrs);
        }

        case 'AMAZON.YesIntent':
          if (sessionAttrs?.awaitingInventoryCheck) {
            return speak(
              'Great! All ingredients are available. Have a wonderful cooking session. Goodbye!',
              { endSession: true }
            );
          }
          return speak('Alright! Goodbye!', { endSession: true });

        case 'AMAZON.NoIntent':
          if (sessionAttrs?.awaitingInventoryCheck) {
            return speak(
              'No problem. Please tell me what is missing. ' +
              'For example, say: <emphasis level="moderate">we are missing onions and tomatoes</emphasis>.',
              {
                reprompt: 'Which items are missing from the ingredient list?',
                endSession: false,
                sessionAttributes: sessionAttrs,
              }
            );
          }
          return speak('Alright. Goodbye!', { endSession: true });

        case 'AMAZON.HelpIntent':
          return speak(
            'I can help with your kitchen workflow. ' +
            'When you arrive, say <emphasis level="moderate">I have arrived</emphasis> to hear today\'s menu. ' +
            'When you finish cooking, say <emphasis level="moderate">I am leaving</emphasis> ' +
            'and I will read out tomorrow\'s ingredient list.',
            {
              reprompt: "Say 'I have arrived' or 'I am leaving'.",
              endSession: false,
              sessionAttributes: sessionAttrs,
            }
          );

        case 'AMAZON.StopIntent':
        case 'AMAZON.CancelIntent':
          return speak('Goodbye! Have a wonderful day.', { endSession: true });

        default:
          return speak(
            "I didn't understand that. " +
            "Say <emphasis level=\"moderate\">I have arrived</emphasis> to start " +
            "or <emphasis level=\"moderate\">I am leaving</emphasis> to finish.",
            {
              reprompt: "Say 'I have arrived' or 'I am leaving'.",
              endSession: false,
              sessionAttributes: sessionAttrs,
            }
          );
      }
    }

    // Fallback for unknown request types
    return speak('Something went wrong. Please try again.', { endSession: true });

  } catch (err) {
    // Never crash the webhook — Alexa needs a valid JSON response
    console.error('[Alexa Webhook] Unhandled error:', err);
    return speak(
      'I am having trouble connecting right now. Please try again in a moment.',
      { endSession: true }
    );
  }
}
