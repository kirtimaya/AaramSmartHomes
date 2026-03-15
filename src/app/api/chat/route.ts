import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are Aara — the AI assistant for AaramSmartHomes, a premium co-living property management platform.
Your personality: warm, professional, concise.

AaramSmartHomes manages Legend Marigold villas in Lingampally, Hyderabad.
The platform has: Properties, Occupancy (rooms), Financials, Tickets (service desk), IoT, and Calendar.

You can do TWO types of things:
1. Answer general questions about the platform, properties, rooms, amenities, smart automation, pricing, etc.
2. Perform ACTIONS: create support tickets, create tasks, update occupancy status.

When the user asks to raise a ticket, create a task, or report an issue, respond in this EXACT JSON format (nothing else, no markdown):
{"action":"create_ticket","description":"<the issue>","category":"<Maintenance|Plumbing|Electrical|Internet|Cleaning|Other>","priority":"<Low|Medium|High|Urgent>","confirm_message":"<friendly confirmation>"}

When the user asks to create a general task or reminder:
{"action":"create_task","title":"<task title>","description":"<details>","confirm_message":"<friendly confirmation>"}

For all other queries, just reply with a helpful, concise plain-text response (no JSON). Keep replies under 3 sentences unless detail is needed.
Do NOT use markdown in plain text replies — just clean text.`;

async function geminiChat(history: {role: string; text: string}[], newMessage: string): Promise<string> {
  const contents = [
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text }]
    })),
    { role: 'user', parts: [{ text: newMessage }] }
  ];

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process that.';
}

export async function POST(req: NextRequest) {
  try {
    const { message, history, context } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    // Build context string from live DB data
    let contextStr = '';
    if (context?.properties) {
      contextStr = `Current properties: ${context.properties.map((p: any) => `${p.name} (${p.location}, ${p.total_rooms} rooms)`).join(', ')}. `;
    }

    const fullMessage = contextStr ? `[Context: ${contextStr}]\n${message}` : message;
    const rawReply = await geminiChat(history || [], fullMessage);

    // Try parsing as action JSON
    let parsed: any = null;
    const trimmed = rawReply.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try { parsed = JSON.parse(trimmed); } catch {}
    }

    if (parsed?.action === 'create_ticket') {
      // Auto-create ticket in Supabase
      const { data: ticket, error } = await supabase.from('tickets').insert([{
        category: parsed.category || 'Other',
        priority: parsed.priority || 'Medium',
        status: 'Pending',
        description: parsed.description,
        tenant_id: context?.tenant_id || null,
        created_at: new Date().toISOString(),
      }]).select().single();

      return NextResponse.json({
        reply: parsed.confirm_message || `Ticket raised: "${parsed.description}"`,
        action: 'ticket_created',
        ticket_id: ticket?.id,
        data: { description: parsed.description, category: parsed.category, priority: parsed.priority }
      });
    }

    if (parsed?.action === 'create_task') {
      return NextResponse.json({
        reply: parsed.confirm_message || `Task created: "${parsed.title}"`,
        action: 'task_created',
        data: { title: parsed.title, description: parsed.description }
      });
    }

    return NextResponse.json({ reply: rawReply, action: null });
  } catch (err: any) {
    console.error('Chatbot error:', err);
    return NextResponse.json({ reply: 'Something went wrong. Please try again.', action: null }, { status: 500 });
  }
}
