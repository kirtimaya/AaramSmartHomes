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

const SYSTEM_PROMPT = `You are Aara — an intelligent assistant for AaramSmartHomes.
AaramSmartHomes manages Legend Marigold villas in Lingampally, Hyderabad.
You MUST follow strict role-based security rules.

ROLE-BASED PERMISSIONS:
- [ROLE: admin]: Full access to Properties, Occupancy, Financials, Tickets, and System Navigation. Can help with all managerial tasks.
- [ROLE: tenant]: A "Resident" role. Can see their OWN data and raise tickets. Act as if administrative tools don't exist.
- [ROLE: public/guest]: Limited to general info about amenities, pricing, and "how to apply" (landing page, Explore Homes). 
  STRICT: If a guest asks about internal/admin features, do NOT say "you don't have permission". 
  Instead, act as if those features aren't part of the public site and guide them back to what THEY can see (landing page, login, or available homes).

STRICT DATA ISOLATION:
- DO NOT mention restricted paths or specific "Admin" terminologies to non-admins.
- DO NOT show, mention, or print JSON in your conversational text. JSON is for backend processing ONLY.

ACTIONS YOU CAN TRIGGER (via JSON at the END of your reply):
1. {"action":"create_ticket","description":"<issue>","category":"<category>","priority":"<level>","confirm_message":"<msg>"}
2. {"action":"create_task","title":"<title>","description":"<details>","confirm_message":"<msg>"}
3. {"action":"navigate","path":"<path>","confirm_message":"<msg>"}
4. {"action":"data_entry","context":"<context>","data":{<kv>},"confirm_message":"<msg>"}

Reply with warm, professional plain text. If you need to trigger an action, put the JSON on a NEW line at the very end of your message. I will strip it from the UI.`;

async function callGroq(history: { role: string; text: string }[], newMessage: string): Promise<string> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.text
    })),
    { role: 'user', content: newMessage }
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 512,
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || '';
}

async function callGemini(history: { role: string; text: string }[], newMessage: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const contents = [
    { role: 'user', parts: [{ text: `CONTEXT & INSTRUCTIONS: ${SYSTEM_PROMPT}\n\nPlease confirm you understand.` }] },
    { role: 'model', parts: [{ text: "Understood. I am Aara, your assistant for AaramSmartHomes. I will remain concise, professional, and follow your instructions for tickets and tasks." }] },
    ...history.slice(-10).map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text }],
    })),
    { role: 'user', parts: [{ text: newMessage }] },
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

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: 'Invalid request body.', action: null }, { status: 400 });
  }

  const { message, history = [], context = {} } = body;

  if (!message?.trim()) {
    return NextResponse.json({ reply: 'Please type a message.', action: null }, { status: 400 });
  }

  // Inject Role-Based Identity into System Prompt
  const userRole = context?.role || 'public';
  const userEmail = context?.user_email || 'unknown';
  const personalizedPrompt = `${SYSTEM_PROMPT}\n\nCURRENT SESSION CONTEXT:\n- Logged-in User: ${userEmail}\n- Access Level: [${userRole}]\n\nREMINDER: Strictly enforce permissions based on the above access level.`;

  // Enrich with context (Property data)
  let enriched = message;
  if (context?.properties?.length) {
    const propList = context.properties.map((p: any) => `${p.name} at ${p.location}`).join('; ');
    enriched = `[LIVE PROPERTY DATA: ${propList}]\n\nUser Message: ${message}`;
  }

  async function callGemini(history: { role: string; text: string }[], newMessage: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
    const contents = [
      { role: 'user', parts: [{ text: `INSTRUCTIONS: ${personalizedPrompt}\n\nDo not greet. Confirm role-awareness by processing the user's intent.` }] },
      { role: 'model', parts: [{ text: `Understood. Role: [${userRole}]. Session: [${userEmail}]. I will follow all access gates.` }] },
      ...history.slice(-6).map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      })),
      { role: 'user', parts: [{ text: newMessage }] },
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
    // Attempt Gemini first
    if (!GEMINI_API_KEY) throw new Error('NO_GEMINI_KEY');
    rawReply = await callGemini(history, enriched);
  } catch (err: any) {
    console.error('[Aara] Gemini failed, attempting Groq fallback...', err.message);
    
    // Check if we can fallback to Groq
    if (GROQ_API_KEY) {
      try {
        rawReply = await callGroq(history, enriched);
        usedFallback = true;
      } catch (groqErr: any) {
        console.error('[Aara] Groq fallback also failed:', groqErr.message);
        return NextResponse.json({ reply: `AI service error: Both providers unavailable.`, action: null });
      }
    } else {
      return NextResponse.json({ reply: `AI service error: ${err.message}`, action: null });
    }
  }

  // Parse action (JSON)
  let parsed: any = null;
  const clean = rawReply.trim();
  const jsonStr = clean.startsWith('```')
    ? clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    : clean;

  if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
    try { parsed = JSON.parse(jsonStr); } catch { /* ignore */ }
  }

  // Handle Action: Create Ticket
  if (parsed?.action === 'create_ticket') {
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .insert([{
        category: parsed.category || 'Other',
        priority: parsed.priority || 'Medium',
        status: 'Pending',
        description: parsed.description,
        tenant_id: context?.tenant_id || null,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    return NextResponse.json({
      reply: parsed.confirm_message || `Ticket raised: "${parsed.description}"`,
      action: 'ticket_created',
      data: parsed,
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: Create Task
  if (parsed?.action === 'create_task') {
    return NextResponse.json({
      reply: parsed.confirm_message || `Task logged: "${parsed.title}"`,
      action: 'task_created',
      data: parsed,
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: Navigate
  if (parsed?.action === 'navigate') {
    return NextResponse.json({
      reply: parsed.confirm_message || `Navigating to ${parsed.path}...`,
      action: 'navigate',
      data: parsed,
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: Data Entry
  if (parsed?.action === 'data_entry') {
    return NextResponse.json({
      reply: parsed.confirm_message || `Data entry for ${parsed.context} captured.`,
      action: 'data_entry',
      data: parsed,
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  return NextResponse.json({ 
    reply: rawReply, 
    action: null,
    debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
  });
}
