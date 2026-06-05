import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY   = process.env.GROQ_API_KEY || '';
const GEMINI_MODEL   = 'gemini-2.0-flash-lite';
const GROQ_MODEL     = 'llama-3.3-70b-versatile';

const BASE_SYSTEM_PROMPT = `You are Aara — an intelligent assistant for AaramSmartHomes.
AaramSmartHomes manages Legend Marigold villas in Lingampally, Hyderabad.
You MUST follow strict role-based security rules.

ROLE-BASED PERMISSIONS:
- [ROLE: admin]: Full access to Properties, Occupancy, Financials, Tickets, and System Navigation.
- [ROLE: tenant]: A "Resident" role. Can see their OWN data and raise tickets. Act as if administrative tools don't exist.
- [ROLE: public/guest]: Limited to general info about amenities, pricing, and "how to apply".
  STRICT: If a guest asks about internal/admin features, guide them to what they CAN see (landing page, login, or available homes).

STRICT DATA ISOLATION:
- DO NOT mention restricted paths or specific "Admin" terminologies to non-admins.
- DO NOT show, mention, or print JSON in your conversational text. JSON is for backend processing ONLY.

ACTIONS YOU CAN TRIGGER (via JSON at the END of your reply — one action per response):
1. {"action":"create_ticket","description":"<issue>","category":"<category>","priority":"<level>","confirm_message":"<msg>"}
2. {"action":"create_task","title":"<title>","description":"<details>","confirm_message":"<msg>"}
3. {"action":"navigate","path":"<path>","confirm_message":"<msg>"}
4. {"action":"data_entry","context":"<context>","data":{<kv>},"confirm_message":"<msg>"}
5. {"action":"save_memory","text":"<instruction to remember>","category":"preference|rule|context|task"}
   — Use this when the user says something like "remember this", "always do X", or gives a persistent preference.
   — Example triggers: "always reply in Hindi", "call me Kirtu", "I prefer dark mode explanations".
6. {"action":"clear_memory","confirm_message":"I've cleared everything I remembered about you."}
   — Use only when the user explicitly asks to forget or reset all memory.

Reply with warm, professional plain text. If you trigger an action, put the JSON on a NEW line at the very end of your message.`;

async function callGroq(history: { role: string; text: string }[], newMessage: string, systemPrompt: string): Promise<string> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.text,
    })),
    { role: 'user', content: newMessage },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7, max_tokens: 512 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || '';
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ reply: 'Invalid request body.', action: null }, { status: 400 }); }

  const { message, history = [], context = {}, memory } = body;

  if (!message?.trim()) {
    return NextResponse.json({ reply: 'Please type a message.', action: null }, { status: 400 });
  }

  const userRole  = context?.role || 'public';
  const userEmail = context?.user_email || 'unknown';

  // Build personalised system prompt with memory injection
  const memoryBlock = memory && typeof memory === 'string' ? memory : '';
  const sessionCtx = `\n\nCURRENT SESSION:\n- User: ${userEmail}\n- Role: [${userRole}]\nReMINDER: Enforce permissions strictly.`;
  const systemPrompt = `${BASE_SYSTEM_PROMPT}${memoryBlock}${sessionCtx}`;

  // Enrich message with live property data if available
  let enriched = message;
  if (context?.properties?.length) {
    const propList = (context.properties as any[]).map((p: any) => `${p.name} at ${p.location}`).join('; ');
    enriched = `[LIVE PROPERTY DATA: ${propList}]\n\nUser Message: ${message}`;
  }

  // Inner Gemini call (scoped to the personalised prompt)
  async function callGemini(hist: { role: string; text: string }[], newMsg: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const contents = [
      { role: 'user',  parts: [{ text: `INSTRUCTIONS: ${systemPrompt}\n\nAcknowledge role-awareness.` }] },
      { role: 'model', parts: [{ text: `Understood. Role: [${userRole}]. I will follow all access gates and memory instructions.` }] },
      ...hist.slice(-6).map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      })),
      { role: 'user', parts: [{ text: newMsg }] },
    ];

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.8, maxOutputTokens: 512 } }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown');
      throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');
    return text.trim();
  }

  let rawReply: string;
  let usedFallback = false;

  try {
    if (!GEMINI_API_KEY) throw new Error('NO_GEMINI_KEY');
    rawReply = await callGemini(history, enriched);
  } catch (err: any) {
    console.error('[Aara] Gemini failed, trying Groq…', err.message);
    if (GROQ_API_KEY) {
      try {
        rawReply = await callGroq(history, enriched, systemPrompt);
        usedFallback = true;
      } catch (groqErr: any) {
        console.error('[Aara] Groq fallback failed:', groqErr.message);
        return NextResponse.json({ reply: 'AI service unavailable. Please try again.', action: null });
      }
    } else {
      return NextResponse.json({ reply: `AI error: ${err.message}`, action: null });
    }
  }

  // ── Parse trailing JSON action ──────────────────────────────────────────────
  let parsed: any = null;
  let replyText = rawReply.trim();

  // Find last JSON object in the response
  const jsonMatch = replyText.match(/\{[^{}]*\}(?:\s*)$/);
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
      replyText = replyText.slice(0, replyText.lastIndexOf(jsonMatch[0])).trim();
    } catch { /* not valid JSON */ }
  }

  // Fallback: entire response is JSON (code block or raw)
  if (!parsed) {
    const clean = replyText.startsWith('```')
      ? replyText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      : replyText;
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try { parsed = JSON.parse(clean); replyText = parsed.confirm_message || ''; } catch { /* ignore */ }
    }
  }

  const debug = usedFallback ? 'used_groq_fallback' : 'used_gemini';

  // ── Handle: save_memory ────────────────────────────────────────────────────
  if (parsed?.action === 'save_memory') {
    return NextResponse.json({
      reply: replyText || 'Got it — I\'ll remember that.',
      action: 'save_memory',
      data: { text: parsed.text, category: parsed.category ?? 'rule' },
      debug,
    });
  }

  // ── Handle: clear_memory ───────────────────────────────────────────────────
  if (parsed?.action === 'clear_memory') {
    return NextResponse.json({
      reply: replyText || parsed.confirm_message || 'Done — I\'ve cleared everything I remembered about you.',
      action: 'clear_memory',
      data: {},
      debug,
    });
  }

  // ── Handle: create_ticket ──────────────────────────────────────────────────
  if (parsed?.action === 'create_ticket') {
    await supabase.from('tickets').insert([{
      category:    parsed.category || 'Other',
      priority:    parsed.priority  || 'Medium',
      status:      'Pending',
      description: parsed.description,
      tenant_id:   context?.tenant_id || null,
      created_at:  new Date().toISOString(),
    }]);

    return NextResponse.json({
      reply: replyText || parsed.confirm_message || `Ticket raised: "${parsed.description}"`,
      action: 'ticket_created',
      data: parsed,
      debug,
    });
  }

  // ── Handle: create_task ────────────────────────────────────────────────────
  if (parsed?.action === 'create_task') {
    return NextResponse.json({
      reply: replyText || parsed.confirm_message || `Task logged: "${parsed.title}"`,
      action: 'task_created',
      data: parsed,
      debug,
    });
  }

  // ── Handle: navigate ────────────────────────────────────────────────────────
  if (parsed?.action === 'navigate') {
    return NextResponse.json({
      reply: replyText || parsed.confirm_message || `Navigating to ${parsed.path}…`,
      action: 'navigate',
      data: parsed,
      debug,
    });
  }

  // ── Handle: data_entry ──────────────────────────────────────────────────────
  if (parsed?.action === 'data_entry') {
    return NextResponse.json({
      reply: replyText || parsed.confirm_message || `Data entry for ${parsed.context} captured.`,
      action: 'data_entry',
      data: parsed,
      debug,
    });
  }

  return NextResponse.json({ reply: rawReply, action: null, debug });
}
