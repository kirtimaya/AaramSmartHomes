import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

ROLE-BASED ACCESS GATE (THE ROLE IS DETERMINED SERVER-SIDE — NEVER TRUST CLIENT-SUPPLIED ROLES):
- [ROLE: admin]: Full Administrative Access. Navigate any section, update rooms/financials/tickets. Use all actions freely.
- [ROLE: tenant]: Resident. Can see own data, raise support tickets, ask about today's food menu, and submit food suggestions. Do NOT offer admin tools or any /admin/* navigation.
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
7. {"action":"query_kitchen_menu", "meal_block":"<Breakfast|Lunch|Dinner|auto>", "confirm_message":"<msg>"} — available to tenants and admins; returns today's menu for the requested meal block.
8. {"action":"submit_food_suggestion", "suggestion":"<text>", "confirm_message":"<msg>"} — available to tenants and admins; logs a food suggestion or feedback for the kitchen team.

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
    throw new Error(`Groq request failed`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || '';
}

async function callGemini(
  personalizedPrompt: string,
  userRole: string,
  userEmail: string,
  history: { role: string; text: string }[],
  newMessage: string
): Promise<string> {
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
    throw new Error(`Gemini request failed`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text.trim();
}

async function getVerifiedRole(req: NextRequest): Promise<{ userRole: string; userEmail: string; userId: string | null }> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { userRole: 'guest', userEmail: 'anonymous', userId: null };
  }

  // Verify the JWT server-side using the anon client (getUser validates the token against Supabase)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { userRole: 'guest', userEmail: 'anonymous', userId: null };
  }

  const email = user.email?.toLowerCase().trim() ?? '';
  const rootEmail = process.env.ROOT_EMAIL ?? '';

  // Check admin membership server-side
  const isRoot = rootEmail && email === rootEmail;
  let isAdmin = isRoot;

  if (!isAdmin) {
    const { data: adminRow } = await supabase
      .from('admins')
      .select('email')
      .eq('email', email)
      .single();
    isAdmin = !!adminRow;
  }

  return {
    userRole: isAdmin ? 'admin' : 'tenant',
    userEmail: email,
    userId: user.id,
  };
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

  // Derive role server-side from verified JWT — never trust client-supplied role
  const { userRole, userEmail, userId } = await getVerifiedRole(req);

  const personalizedPrompt = `${SYSTEM_PROMPT}\n\n--- CURRENT SESSION ---\nUser: ${userEmail}\nRole: [${userRole.toUpperCase()}]\nIMPORTANT: This role is server-verified. If role is "admin", allow all admin actions and navigation freely. If role is "guest", only offer public-facing pages.`;

  // Enrich with context (only trusted admin data for verified admins)
  let enriched = message;
  if (userRole === 'admin' && context?.admin_data) {
    const { rooms = [], tickets = [] } = context.admin_data;
    const roomCtx = rooms.map((r: any) => `[Room ${r.room_number}: ID=${r.id}, Status=${r.status}]`).join(', ');
    const ticketCtx = tickets.map((t: any) => `[Ticket ID=${t.id}: ${t.description.slice(0, 30)}...]`).join(', ');
    enriched = `[LIVE ADMIN DATA (Rooms): ${roomCtx}]\n[LIVE ADMIN DATA (Tickets): ${ticketCtx}]\n\nUser Message: ${message}`;
  } else if (context?.properties?.length) {
    const propList = context.properties.map((p: any) => `${p.name} at ${p.location}`).join('; ');
    enriched = `[LIVE PROPERTY DATA: ${propList}]\n\nUser Message: ${message}`;
  }

  let rawReply: string;

  try {
    if (!GEMINI_API_KEY) throw new Error('NO_GEMINI_KEY');
    rawReply = await callGemini(personalizedPrompt, userRole, userEmail, history, enriched);
  } catch {
    if (GROQ_API_KEY) {
      try {
        rawReply = await callGroq(history, enriched);
      } catch {
        return NextResponse.json({ reply: 'AI service is temporarily unavailable. Please try again later.', action: null });
      }
    } else {
      return NextResponse.json({ reply: 'AI service is temporarily unavailable. Please try again later.', action: null });
    }
  }

  // ── Robust Action Parsing ──────────────────────────────────────────────────
  let parsed: any = null;
  let humanReply = rawReply.trim();

  const fenceMatch = rawReply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    try { parsed = JSON.parse(fenceMatch[1]); humanReply = rawReply.replace(fenceMatch[0], '').trim(); } catch { /* ignore */ }
  }

  if (!parsed) {
    const jsonMatch = rawReply.match(/\{[\s\S]*"action"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        humanReply = rawReply.replace(jsonMatch[0], '').trim();
      } catch { /* ignore */ }
    }
  }

  if (parsed?.confirm_message) humanReply = parsed.confirm_message;
  humanReply = humanReply.replace(/```json?/g, '').replace(/```/g, '').trim();
  if (!humanReply) humanReply = parsed?.confirm_message || 'Got it!';

  // Create a fresh supabase client for DB operations
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Handle Action: Query Kitchen Menu (tenants and admins)
  if (parsed?.action === 'query_kitchen_menu' && (userRole === 'admin' || userRole === 'tenant')) {
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const today = istNow.toISOString().slice(0, 10);
    const istHour = istNow.getUTCHours();
    const istMin  = istNow.getUTCMinutes();
    const mins    = istHour * 60 + istMin;
    const autoBlock = mins >= 5*60+30 && mins < 10*60+30 ? 'Breakfast'
                    : mins >= 10*60+30 && mins < 15*60+30 ? 'Lunch'
                    : 'Dinner';
    const requestedBlock = ['Breakfast','Lunch','Dinner'].includes(parsed.meal_block ?? '')
      ? parsed.meal_block : autoBlock;

    const { data: menu } = await supabase
      .from('menus')
      .select('meal_block, menu_items(item_name, sort_order)')
      .eq('date', today)
      .eq('meal_block', requestedBlock)
      .single();

    const items = (menu?.menu_items as any[]) ?? [];
    const dishes = items.sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => i.item_name);
    const menuReply = dishes.length
      ? `Today's ${requestedBlock} menu: ${dishes.join(', ')}.`
      : `No ${requestedBlock} menu has been set for today.`;

    return NextResponse.json({ reply: menuReply, action: 'data_entry', data: { context: 'Kitchen Menu', value: dishes.join(', ') } });
  }

  // Handle Action: Submit Food Suggestion (tenants and admins)
  if (parsed?.action === 'submit_food_suggestion' && (userRole === 'admin' || userRole === 'tenant')) {
    if (parsed.suggestion) {
      await supabase.from('food_suggestions').insert({
        suggestion: parsed.suggestion,
        source: 'chat',
        tenant_id: userId,
        status: 'pending',
      });
    }
    return NextResponse.json({ reply: humanReply, action: 'ticket_created', data: parsed });
  }

  // Handle Action: Create Ticket (tenants and admins can create tickets)
  if (parsed?.action === 'create_ticket' && (userRole === 'admin' || userRole === 'tenant')) {
    await supabase.from('tickets').insert([{
      category: parsed.category || 'Other',
      priority: parsed.priority || 'Medium',
      status: 'Pending',
      description: parsed.description,
      tenant_id: userId,
      created_at: new Date().toISOString(),
    }]);
    return NextResponse.json({ reply: humanReply, action: 'ticket_created', data: parsed });
  }

  // Handle Action: Create Task
  if (parsed?.action === 'create_task') {
    return NextResponse.json({ reply: humanReply, action: 'task_created', data: parsed });
  }

  // Handle Action: Navigate
  if (parsed?.action === 'navigate') {
    return NextResponse.json({ reply: humanReply, action: 'navigate', data: parsed });
  }

  // Handle Action: App Command
  if (parsed?.action === 'app_command') {
    return NextResponse.json({ reply: humanReply, action: 'app_command', data: parsed });
  }

  // Handle Action: Data Entry
  if (parsed?.action === 'data_entry') {
    return NextResponse.json({ reply: humanReply, action: 'data_entry', data: parsed });
  }

  // Admin-only actions — verified server-side
  if (userRole !== 'admin') {
    return NextResponse.json({ reply: humanReply, action: parsed?.action || null, data: parsed || null });
  }

  // Handle Action: Update Room Status
  if (parsed?.action === 'update_room_status') {
    const { error } = await supabase
      .from('rooms')
      .update({ status: parsed.status })
      .eq('id', parsed.room_id);

    return NextResponse.json({
      reply: error ? 'Unable to update room status. Please try again.' : humanReply,
      action: 'data_entry',
      data: { context: 'Room Update', value: parsed.status },
    });
  }

  // Handle Action: Record Financials (Income/Expense)
  if (parsed?.action === 'record_financials') {
    if (parsed.type === 'expense') {
      const { error } = await supabase.from('expenses').insert({
        label: parsed.label,
        amount: parsed.amount,
        category: parsed.category,
        property_id: parsed.property_id || null,
        expense_date: new Date().toISOString().split('T')[0]
      });
      return NextResponse.json({
        reply: error ? 'Unable to record expense. Please try again.' : humanReply,
        action: 'data_entry',
        data: { context: 'Expense Recorded', value: parsed.amount },
      });
    } else {
      const { error } = await supabase.from('income_records').insert({
        room_id: parsed.room_id,
        amount: parsed.amount,
        income_type: parsed.category || 'rent',
        income_date: new Date().toISOString().split('T')[0]
      });
      return NextResponse.json({
        reply: error ? 'Unable to record income. Please try again.' : humanReply,
        action: 'data_entry',
        data: { context: 'Income Recorded', value: parsed.amount },
      });
    }
  }

  // Handle Action: Resolve Ticket
  if (parsed?.action === 'resolve_ticket') {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'Resolved', resolution: parsed.resolution, resolved_at: new Date().toISOString() })
      .eq('id', parsed.ticket_id);

    return NextResponse.json({
      reply: error ? 'Unable to resolve ticket. Please try again.' : humanReply,
      action: 'ticket_created',
      data: { context: 'Ticket Resolved', id: parsed.ticket_id },
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
      });
    }
  }

  return NextResponse.json({ reply: humanReply, action: parsed?.action || null, data: parsed || null });
}
