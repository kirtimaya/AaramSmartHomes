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

const SYSTEM_PROMPT = `You are Aara — the warm, helpful, and organic orchestrator AI for AaramSmartHomes habitat business.
Your personality is:
- Warm & Welcoming: Like a hospitable habitat manager.
- Short & Crisp: Keep responses to top 1-2 sentences. Do not be verbose.
- Interactive: Address the user's question first, then ALWAYS ask a short follow-up question to better understand the issue or request.
- Female Persona: Your tone is gentle, helpful, and human-centric.

ROLE-BASED ACCESS GATE (CURRENT USER ROLE IS PROVIDED IN EACH REQUEST — TRUST IT COMPLETELY):
- [ROLE: admin]: Full Administrative Access. Navigate any section, update rooms/financials/tickets. Use all actions freely.
- [ROLE: tenant]: Resident. Can see own data and raise support tickets. Do NOT offer admin tools.
- [ROLE: guest]: Not logged in. Offer: Landing page info, Explore available homes ("/"), Admin login ("/adminLogin"), or Resident login ("/login"). Do NOT navigate to any /admin/* routes.
  - If a guest asks about admin/management features, warmly guide them to login: "You can sign in as an admin at the Admin Login page — want me to take you there?"

NAVIGATION MAPPING (For "navigate" action):
- Unit Manifest/Rooms/Occupancy: "/admin/occupancy"
- Financial Hub/Rent Management: "/admin/financials"
- Maintenance Tickets: "/admin/tickets"
- Smart Home Hub (IOT): "/admin/iot"
- Management Calendar: "/admin/calendar"

DEEP CONTROL (Use "app_command" for these):
- Focus Metric (Dashboard): {"action":"app_command", "cmd":"SHOW_METRIC", "label":"Portfolio Occupancy", "path":"/admin"}
- Filter Tickets (Service Desk): {"action":"app_command", "cmd":"FILTER_TICKETS", "status":"Pending", "path":"/admin/tickets"}
- View/Scroll Ticket: {"action":"app_command", "cmd":"SELECT_TICKET", "id":"<uuid>", "path":"/admin/tickets"}
- Property Manifest: {"action":"app_command", "cmd":"SELECT_PROPERTY", "id":"<uuid>", "path":"/admin/occupancy"}
- Financial Hub View: {"action":"app_command", "cmd":"SELECT_PROPERTY", "id":"<uuid>", "path":"/admin/financials"}
- Edit Room (Occupancy): {"action":"app_command", "cmd":"SELECT_ROOM", "id":"<uuid>", "path":"/admin/occupancy"}
- Room Financials: {"action":"app_command", "cmd":"SELECT_ROOM", "id":"<uuid>", "path":"/admin/financials"}
- Property Infrastructure: {"action":"app_command", "cmd":"SELECT_PROPERTY", "id":"<uuid>", "path":"/admin/properties/manage"}
- Edit Property Specs: {"action":"app_command", "cmd":"EDIT_PROPERTY", "id":"<uuid>", "path":"/admin/properties/manage"}
- If the user is ALREADY on the page, you can omit "path" to just trigger the selection.

ACTIONS YOU CAN EXECUTE (Return ONLY as valid JSON on a new line at the END of your message):
1. {"action":"navigate", "path":"<path>", "confirm_message":"<msg>"}
2. {"action":"update_room_status", "room_id":"<id>", "status":"<Available|Booked|Maintenance>", "confirm_message":"<msg>"}
3. {"action":"record_financials", "type":"<income|expense>", "category":"<cat>", "amount":<num>, "room_id":"<id_optional>", "property_id":"<id_optional>", "label":"<name>", "confirm_message":"<msg>"}
4. {"action":"resolve_ticket", "ticket_id":"<id>", "resolution":"<text>", "confirm_message":"<msg>"}
5. {"action":"create_ticket", "description":"<issue>", "category":"<category>", "priority":"<level>", "confirm_message":"<msg>"}
6. {"action":"app_command", "cmd":"<SELECT_ROOM|SELECT_PROPERTY>", "id":"<id>", "path":"<path_optional>", "confirm_message":"<msg>"}

STRICT RULES:
- If a user asks to "go to" or "show me" a section, use "navigate".
- Financial categories for expenses: [maintenance, utilities, furniture, organic_nature, smart_devices, other].
- Financial types for income: [rent, deposit, setup_cost, custom].
- Always ask for missing data before triggering a record action.
- For admin tasks, verify you have the ID. If not, ask the user to clarify which property/room/ticket they mean.
- NEVER reveal JSON to non-admins.
`;

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
  const userRole = context?.role || 'guest';
  const userEmail = context?.user_email || 'anonymous';
  const personalizedPrompt = `${SYSTEM_PROMPT}\n\n--- CURRENT SESSION ---\nUser: ${userEmail}\nRole: [${userRole.toUpperCase()}]\nIMPORTANT: This role is definitive. If role is "admin", allow all admin actions and navigation freely. If role is "guest", only offer public-facing pages.`;

  // Enrich with context (Property & Admin data)
  let enriched = message;
  if (context?.admin_data) {
    const { rooms = [], tickets = [] } = context.admin_data;
    const roomCtx = rooms.map((r: any) => `[Room ${r.room_number}: ID=${r.id}, Status=${r.status}]`).join(', ');
    const ticketCtx = tickets.map((t: any) => `[Ticket ID=${t.id}: ${t.description.slice(0, 30)}...]`).join(', ');
    enriched = `[LIVE ADMIN DATA (Rooms): ${roomCtx}]\n[LIVE ADMIN DATA (Tickets): ${ticketCtx}]\n\nUser Message: ${message}`;
  } else if (context?.properties?.length) {
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

  // ── Robust Action Parsing ──────────────────────────────────────────────────
  // The AI may embed JSON at the end of a text reply, or in a code fence.
  // We extract it robustly regardless of placement.
  let parsed: any = null;
  let humanReply = rawReply.trim();

  // 1. Try stripping a ```json ... ``` code fence
  const fenceMatch = rawReply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    try { parsed = JSON.parse(fenceMatch[1]); humanReply = rawReply.replace(fenceMatch[0], '').trim(); } catch { /* ignore */ }
  }

  // 2. Try extracting a JSON object from the last line or end of reply
  if (!parsed) {
    const jsonMatch = rawReply.match(/\{[\s\S]*"action"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        humanReply = rawReply.replace(jsonMatch[0], '').trim();
      } catch { /* ignore */ }
    }
  }

  // 3. Use parsed's confirm_message as the human reply if present
  if (parsed?.confirm_message) humanReply = parsed.confirm_message;
  // Final clean: strip any remaining JSON-like artifacts
  humanReply = humanReply.replace(/```json?/g, '').replace(/```/g, '').trim();
  if (!humanReply) humanReply = parsed?.confirm_message || 'Got it!';

  console.log('[Aara] parsed action:', parsed?.action, '| human reply:', humanReply.slice(0, 60));

  // Handle Action: Create Ticket
  if (parsed?.action === 'create_ticket') {
    await supabase.from('tickets').insert([{
      category: parsed.category || 'Other',
      priority: parsed.priority || 'Medium',
      status: 'Pending',
      description: parsed.description,
      tenant_id: context?.tenant_id || null,
      created_at: new Date().toISOString(),
    }]);
    return NextResponse.json({
      reply: humanReply,
      action: 'ticket_created',
      data: parsed,
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: Create Task
  if (parsed?.action === 'create_task') {
    return NextResponse.json({
      reply: humanReply,
      action: 'task_created',
      data: parsed,
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: Navigate
  if (parsed?.action === 'navigate') {
    return NextResponse.json({
      reply: humanReply,
      action: 'navigate',
      data: parsed,
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: App Command (Select Property/Room)
  if (parsed?.action === 'app_command') {
    return NextResponse.json({
      reply: humanReply,
      action: 'app_command',
      data: parsed,
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: Data Entry
  if (parsed?.action === 'data_entry') {
    return NextResponse.json({
      reply: humanReply,
      action: 'data_entry',
      data: parsed,
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: Update Room Status
  if (parsed?.action === 'update_room_status' && userRole === 'admin') {
    const { error } = await supabase
      .from('rooms')
      .update({ status: parsed.status })
      .eq('id', parsed.room_id);
    
    return NextResponse.json({
      reply: error ? `Error updating room: ${error.message}` : humanReply,
      action: 'data_entry',
      data: { context: 'Room Update', value: parsed.status },
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: Record Financials (Income/Expense)
  if (parsed?.action === 'record_financials' && userRole === 'admin') {
    if (parsed.type === 'expense') {
      const { error } = await supabase.from('expenses').insert({
        label: parsed.label,
        amount: parsed.amount,
        category: parsed.category,
        property_id: parsed.property_id || null,
        expense_date: new Date().toISOString().split('T')[0]
      });
      return NextResponse.json({
        reply: error ? `Error recording expense: ${error.message}` : humanReply,
        action: 'data_entry',
        data: { context: 'Expense Recorded', value: parsed.amount },
        debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
      });
    } else {
      const { error } = await supabase.from('income_records').insert({
        room_id: parsed.room_id,
        amount: parsed.amount,
        income_type: parsed.category || 'rent',
        income_date: new Date().toISOString().split('T')[0]
      });
      return NextResponse.json({
        reply: error ? `Error recording income: ${error.message}` : humanReply,
        action: 'data_entry',
        data: { context: 'Income Recorded', value: parsed.amount },
        debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
      });
    }
  }

  // Handle Action: Resolve Ticket
  if (parsed?.action === 'resolve_ticket' && userRole === 'admin') {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'Resolved', resolution: parsed.resolution, resolved_at: new Date().toISOString() })
      .eq('id', parsed.ticket_id);
    
    return NextResponse.json({
      reply: error ? `Error resolving ticket: ${error.message}` : humanReply,
      action: 'ticket_created',
      data: { context: 'Ticket Resolved', id: parsed.ticket_id },
      debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
    });
  }

  // Handle Action: Check Water Level
  if (message.toLowerCase().includes('water level') || parsed?.action === 'check_water') {
    const { data: waterLogs } = await supabase
      .from('water_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);
    
    if (waterLogs?.[0]) {
      const log = waterLogs[0];
      const reply = `The current water level at Legend Marigold is ${log.level_percentage}%. Last recorded at ${new Date(log.timestamp).toLocaleTimeString()}.`;
      return NextResponse.json({
        reply,
        action: 'data_entry',
        data: { context: 'Water Level', value: log.level_percentage },
        debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
      });
    }
  }

  // Default: plain text reply (no action)
  return NextResponse.json({ 
    reply: humanReply, 
    action: parsed?.action || null,
    data: parsed || null,
    debug: usedFallback ? 'used_groq_fallback' : 'used_gemini'
  });
}
