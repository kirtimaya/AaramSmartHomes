import type { SupabaseClient } from '@supabase/supabase-js';
import type { ToolDefinition } from '@aaram/core/aara/server';
import { isMealLocked } from '@aaram/core/food/server';
import { logAudit } from '@/lib/audit';

export interface AaraToolContext {
  role: 'guest' | 'tenant' | 'admin';
  userId: string | null;
  email: string;
  db: SupabaseClient;
}

function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function autoMealBlock(): 'Breakfast' | 'Lunch' | 'Dinner' {
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const mins = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
  if (mins >= 5 * 60 + 30 && mins < 10 * 60 + 30) return 'Breakfast';
  if (mins >= 10 * 60 + 30 && mins < 15 * 60 + 30) return 'Lunch';
  return 'Dinner';
}

// ── Read-only tools (all roles, filtered by declared `roles`) ────────────────

const listProperties: ToolDefinition<{}, any, AaraToolContext> = {
  name: 'list_properties',
  description: 'Lists all AaramSmartHomes properties with name, location, and total room count.',
  parameters: { type: 'object', properties: {} },
  roles: ['guest', 'tenant', 'admin'],
  kind: 'server',
  execute: async (_args, ctx) => {
    const { data, error } = await ctx.db.from('properties').select('id, name, location, total_rooms').order('name');
    if (error) return { error: error.message };
    return { properties: data ?? [] };
  },
};

const getMenu: ToolDefinition<{ date?: string; meal_block?: string }, any, AaraToolContext> = {
  name: 'get_menu',
  description: "Gets the kitchen menu for a given date and meal block. Defaults to today and the currently-active meal block if omitted.",
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'YYYY-MM-DD, defaults to today (IST)' },
      meal_block: { type: 'string', enum: ['Breakfast', 'Lunch', 'Dinner'], description: 'Defaults to the meal block currently in progress' },
    },
  },
  roles: ['guest', 'tenant', 'admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    const date = args.date || istToday();
    const block = (['Breakfast', 'Lunch', 'Dinner'].includes(args.meal_block ?? '') ? args.meal_block : autoMealBlock())!;
    const { data } = await ctx.db.from('menus')
      .select('meal_block, menu_items(item_name, sort_order)')
      .eq('date', date).eq('meal_block', block).maybeSingle();
    const items = ((data?.menu_items as any[]) ?? []).sort((a, b) => a.sort_order - b.sort_order);
    return { date, meal_block: block, items: items.map(i => i.item_name) };
  },
};

const getDishNutrition: ToolDefinition<{ dish_name: string }, any, AaraToolContext> = {
  name: 'get_dish_nutrition',
  description: 'Gets approved nutrition facts (calories, macros, benefits) for a named dish from the catalog.',
  parameters: {
    type: 'object',
    properties: { dish_name: { type: 'string', description: 'Name of the dish to look up' } },
    required: ['dish_name'],
  },
  roles: ['guest', 'tenant', 'admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    const { data } = await ctx.db.from('dish_catalog')
      .select('name, serving_size, calories, protein_g, carbs_g, fats_g, fiber_g, benefits, cooking_tip')
      .ilike('name', args.dish_name).eq('nutrition_status', 'approved').maybeSingle();
    if (!data) return { found: false };
    return { found: true, dish: data };
  },
};

const getMyBills: ToolDefinition<{}, any, AaraToolContext> = {
  name: 'get_my_bills',
  description: "Gets the signed-in member's own electricity bill splits (recent first).",
  parameters: { type: 'object', properties: {} },
  roles: ['tenant', 'admin'],
  kind: 'server',
  execute: async (_args, ctx) => {
    if (!ctx.userId) return { bills: [] };
    const { data, error } = await ctx.db.from('bill_splits')
      .select('id, bill_id, ac_units, ac_charge, common_share, total_payable, locked_at')
      .eq('tenant_id', ctx.userId).order('locked_at', { ascending: false }).limit(6);
    if (error) return { error: error.message };
    return { bills: data ?? [] };
  },
};

const getMyTickets: ToolDefinition<{}, any, AaraToolContext> = {
  name: 'get_my_tickets',
  description: "Gets the signed-in member's own support/maintenance tickets.",
  parameters: { type: 'object', properties: {} },
  roles: ['tenant', 'admin'],
  kind: 'server',
  execute: async (_args, ctx) => {
    if (!ctx.userId) return { tickets: [] };
    const { data, error } = await ctx.db.from('tickets')
      .select('id, category, priority, status, description, created_at')
      .eq('requester_id', ctx.userId).order('created_at', { ascending: false }).limit(10);
    if (error) return { error: error.message };
    return { tickets: data ?? [] };
  },
};

const getMyMealPrefs: ToolDefinition<{}, any, AaraToolContext> = {
  name: 'get_my_meal_prefs',
  description: "Gets the signed-in member's meal subscription preferences (which of breakfast/lunch/dinner they receive).",
  parameters: { type: 'object', properties: {} },
  roles: ['tenant', 'admin'],
  kind: 'server',
  execute: async (_args, ctx) => {
    if (!ctx.userId) return { preferences: null };
    const { data } = await ctx.db.from('tenant_meal_preferences')
      .select('meal_breakfast, meal_lunch, meal_dinner').eq('tenant_id', ctx.userId).maybeSingle();
    return { preferences: data ?? { meal_breakfast: true, meal_lunch: true, meal_dinner: true } };
  },
};

const getMyNutrition: ToolDefinition<{ date?: string }, any, AaraToolContext> = {
  name: 'get_my_nutrition',
  description: "Gets the signed-in member's actual nutrition intake (calories/macros) for a given date, accounting for skipped meals. Defaults to today.",
  parameters: {
    type: 'object',
    properties: { date: { type: 'string', description: 'YYYY-MM-DD, defaults to today (IST)' } },
  },
  roles: ['tenant', 'admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    if (!ctx.userId) return { macros: null };
    const date = args.date || istToday();

    const [{ data: menus }, { data: skips }, { data: prefs }] = await Promise.all([
      ctx.db.from('menus').select('meal_block, menu_items(dish_id)').eq('date', date),
      ctx.db.from('meal_skip_requests').select('meal_block').eq('tenant_id', ctx.userId).eq('skip_date', date),
      ctx.db.from('tenant_meal_preferences').select('meal_breakfast, meal_lunch, meal_dinner').eq('tenant_id', ctx.userId).maybeSingle(),
    ]);

    const skippedBlocks = new Set((skips ?? []).map((s: any) => s.meal_block));
    const enabled: Record<string, boolean> = {
      Breakfast: prefs?.meal_breakfast ?? true,
      Lunch: prefs?.meal_lunch ?? true,
      Dinner: prefs?.meal_dinner ?? true,
    };

    const receivedBlocks = (menus ?? []).filter((m: any) => enabled[m.meal_block] && !skippedBlocks.has(m.meal_block));
    const dishIds = Array.from(new Set(
      receivedBlocks.flatMap((m: any) => (m.menu_items ?? []).map((i: any) => i.dish_id)).filter(Boolean),
    )) as string[];

    let macros = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    if (dishIds.length > 0) {
      const { data: dishes } = await ctx.db.from('dish_catalog')
        .select('id, calories, protein_g, carbs_g, fats_g, fiber_g').in('id', dishIds);
      for (const d of dishes ?? []) {
        macros.calories += d.calories ?? 0;
        macros.protein += d.protein_g ?? 0;
        macros.carbs += d.carbs_g ?? 0;
        macros.fats += d.fats_g ?? 0;
        macros.fiber += d.fiber_g ?? 0;
      }
    }

    return { date, mealsReceived: receivedBlocks.length, mealsSkipped: (menus ?? []).length - receivedBlocks.length, macros };
  },
};

const getMealHeadcount: ToolDefinition<{ date?: string }, any, AaraToolContext> = {
  name: 'get_meal_headcount',
  description: 'Gets kitchen headcount per meal block for a date: subscribed members minus same-day skips.',
  parameters: {
    type: 'object',
    properties: { date: { type: 'string', description: 'YYYY-MM-DD, defaults to today (IST)' } },
  },
  roles: ['admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    const date = args.date || istToday();
    const [{ data: prefs }, { data: skips }] = await Promise.all([
      ctx.db.from('tenant_meal_preferences').select('meal_breakfast, meal_lunch, meal_dinner'),
      ctx.db.from('meal_skip_requests').select('meal_block').eq('skip_date', date),
    ]);
    const skipCounts: Record<string, number> = { Breakfast: 0, Lunch: 0, Dinner: 0 };
    for (const s of skips ?? []) skipCounts[s.meal_block] = (skipCounts[s.meal_block] ?? 0) + 1;

    const subscribed = { Breakfast: 0, Lunch: 0, Dinner: 0 };
    for (const p of prefs ?? []) {
      if (p.meal_breakfast) subscribed.Breakfast++;
      if (p.meal_lunch) subscribed.Lunch++;
      if (p.meal_dinner) subscribed.Dinner++;
    }

    return {
      date,
      headcount: {
        Breakfast: subscribed.Breakfast - skipCounts.Breakfast,
        Lunch: subscribed.Lunch - skipCounts.Lunch,
        Dinner: subscribed.Dinner - skipCounts.Dinner,
      },
    };
  },
};

const findRoom: ToolDefinition<{ query: string }, any, AaraToolContext> = {
  name: 'find_room',
  description: 'Finds rooms by name/number match, returning their id, occupancy status, and property.',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Room name or number to search for' } },
    required: ['query'],
  },
  roles: ['admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    const { data, error } = await ctx.db.from('rooms')
      .select('id, name, occupancy_status, property_id').ilike('name', `%${args.query}%`).limit(10);
    if (error) return { error: error.message };
    return { rooms: data ?? [] };
  },
};

// ── Admin mutating tools (all write audit_log with source:'aara') ───────────

const updateRoomStatus: ToolDefinition<{ room_id: string; status: string }, any, AaraToolContext> = {
  name: 'update_room_status',
  description: 'Updates a room’s occupancy status. Confirm with the user before calling this.',
  parameters: {
    type: 'object',
    properties: {
      room_id: { type: 'string', description: 'Room id, from find_room' },
      status: { type: 'string', enum: ['Vacant', 'Occupied', 'Notice Period', 'Maintenance'] },
    },
    required: ['room_id', 'status'],
  },
  roles: ['admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    const { data: before } = await ctx.db.from('rooms').select('occupancy_status').eq('id', args.room_id).maybeSingle();
    const { error } = await ctx.db.from('rooms').update({ occupancy_status: args.status }).eq('id', args.room_id);
    if (error) return { error: error.message };
    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.email, actorRole: 'admin', action: 'room.status_update',
      entityType: 'room', entityId: args.room_id, before, after: { occupancy_status: args.status }, source: 'aara',
    });
    return { updated: true };
  },
};

const recordFinancials: ToolDefinition<
  { type: 'income' | 'expense'; category: string; amount: number; room_id?: string; property_id?: string; label?: string },
  any, AaraToolContext
> = {
  name: 'record_financials',
  description: 'Records an income or expense entry. Confirm the amount and category with the user before calling this.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['income', 'expense'] },
      category: { type: 'string', description: 'expense: maintenance|utilities|furniture|organic_nature|smart_devices|other. income: rent|deposit|setup_cost|custom' },
      amount: { type: 'number' },
      room_id: { type: 'string' },
      property_id: { type: 'string' },
      label: { type: 'string' },
    },
    required: ['type', 'category', 'amount'],
  },
  roles: ['admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    if (args.type === 'expense') {
      const { data, error } = await ctx.db.from('expenses').insert({
        label: args.label ?? args.category, amount: args.amount, category: args.category,
        property_id: args.property_id || null, expense_date: new Date().toISOString().split('T')[0],
      }).select().maybeSingle();
      if (error) return { error: error.message };
      await logAudit({
        actorId: ctx.userId, actorEmail: ctx.email, actorRole: 'admin', action: 'expense.record',
        entityType: 'expense', entityId: data?.id, before: null, after: data, source: 'aara',
      });
      return { recorded: true };
    }
    const { data, error } = await ctx.db.from('income_records').insert({
      room_id: args.room_id || null, amount: args.amount, income_type: args.category || 'rent',
      income_date: new Date().toISOString().split('T')[0],
    }).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.email, actorRole: 'admin', action: 'income.record',
      entityType: 'income_record', entityId: data?.id, before: null, after: data, source: 'aara',
    });
    return { recorded: true };
  },
};

const resolveTicket: ToolDefinition<{ ticket_id: string; resolution: string }, any, AaraToolContext> = {
  name: 'resolve_ticket',
  description: 'Marks a ticket resolved with a resolution note. Confirm with the user before calling this.',
  parameters: {
    type: 'object',
    properties: { ticket_id: { type: 'string' }, resolution: { type: 'string' } },
    required: ['ticket_id', 'resolution'],
  },
  roles: ['admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    const { data: before } = await ctx.db.from('tickets').select('status, resolution').eq('id', args.ticket_id).maybeSingle();
    const { error } = await ctx.db.from('tickets')
      .update({ status: 'Resolved', resolution: args.resolution, resolved_at: new Date().toISOString() })
      .eq('id', args.ticket_id);
    if (error) return { error: error.message };
    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.email, actorRole: 'admin', action: 'ticket.resolve',
      entityType: 'ticket', entityId: args.ticket_id, before, after: { status: 'Resolved', resolution: args.resolution }, source: 'aara',
    });
    return { resolved: true };
  },
};

const markMemberAbsent: ToolDefinition<{ tenant_id: string; date: string; meal_block: string }, any, AaraToolContext> = {
  name: 'mark_member_absent',
  description: "Marks a member as skipping a meal on a given date, on the kitchen's behalf (bypasses the member's own cutoff window — admin override). Confirm with the user before calling this.",
  parameters: {
    type: 'object',
    properties: {
      tenant_id: { type: 'string', description: 'Member id, e.g. from find_room’s occupant' },
      date: { type: 'string', description: 'YYYY-MM-DD' },
      meal_block: { type: 'string', enum: ['Breakfast', 'Lunch', 'Dinner'] },
    },
    required: ['tenant_id', 'date', 'meal_block'],
  },
  roles: ['admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    const { data, error } = await ctx.db.from('meal_skip_requests').upsert({
      tenant_id: args.tenant_id, skip_date: args.date, meal_block: args.meal_block, reason: 'Marked by Aara (kitchen)',
    }, { onConflict: 'tenant_id,skip_date,meal_block' }).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.email, actorRole: 'admin', action: 'meal_skip.admin_mark',
      entityType: 'meal_skip_request', entityId: data?.id, before: null, after: data, source: 'aara',
    });
    return { marked: true };
  },
};

// ── Member mutating tools ────────────────────────────────────────────────────

const createTicket: ToolDefinition<{ description: string; category?: string; priority?: string }, any, AaraToolContext> = {
  name: 'create_ticket',
  description: "Raises a support/maintenance ticket for the signed-in member. Confirm the details with the user before calling this.",
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string' },
      category: { type: 'string', enum: ['Maintenance', 'Electrical', 'Plumbing', 'Housekeeping', 'Other', 'Support'] },
      priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'] },
    },
    required: ['description'],
  },
  roles: ['tenant'],
  kind: 'server',
  execute: async (args, ctx) => {
    if (!ctx.userId) return { error: 'not_authenticated' };
    const { data, error } = await ctx.db.from('tickets').insert({
      requester_id: ctx.userId, requester_type: 'tenant',
      category: args.category || 'Other', priority: args.priority || 'Medium',
      status: 'Pending', description: args.description,
    }).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.email, actorRole: 'tenant', action: 'ticket.create',
      entityType: 'ticket', entityId: data?.id, before: null, after: data, source: 'aara',
    });
    return { created: true, ticket_id: data?.id };
  },
};

const skipMeal: ToolDefinition<{ date: string; meal_block: string }, any, AaraToolContext> = {
  name: 'skip_meal',
  description: "Skips a meal for the signed-in member on a given date. Must be at least 8 hours before that meal's serving window starts.",
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'YYYY-MM-DD' },
      meal_block: { type: 'string', enum: ['Breakfast', 'Lunch', 'Dinner'] },
    },
    required: ['date', 'meal_block'],
  },
  roles: ['tenant'],
  kind: 'server',
  execute: async (args, ctx) => {
    if (!ctx.userId) return { error: 'not_authenticated' };
    // Re-checked here in TS rather than relying solely on the DB trigger: ctx.db may be the
    // service-role client (bypasses RLS), and the meal-skip trigger explicitly treats a null
    // auth.uid() as a trusted caller — the same bypass mark_member_absent relies on for admins.
    // A member's own self-service skip must not get that bypass for free.
    if (isMealLocked(args.meal_block as any, args.date)) {
      return { error: 'MEAL_SKIP_CUTOFF_PASSED' };
    }
    const { data, error } = await ctx.db.from('meal_skip_requests').upsert({
      tenant_id: ctx.userId, skip_date: args.date, meal_block: args.meal_block,
    }, { onConflict: 'tenant_id,skip_date,meal_block' }).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.email, actorRole: 'tenant', action: 'meal_skip.create',
      entityType: 'meal_skip_request', entityId: data?.id, before: null, after: data, source: 'aara',
    });
    return { skipped: true };
  },
};

// ── Guest mutating tool ───────────────────────────────────────────────────────

const createVisitRequest: ToolDefinition<{ property_id: string; preferred_date?: string; message?: string }, any, AaraToolContext> = {
  name: 'create_visit_request',
  description: 'Requests a property visit for the signed-in guest. Confirm the property and date with the user before calling this.',
  parameters: {
    type: 'object',
    properties: {
      property_id: { type: 'string', description: 'Property id, from list_properties' },
      preferred_date: { type: 'string', description: 'YYYY-MM-DD' },
      message: { type: 'string' },
    },
    required: ['property_id'],
  },
  roles: ['guest'],
  kind: 'server',
  execute: async (args, ctx) => {
    if (!ctx.userId) return { error: 'not_authenticated' };
    const { data, error } = await ctx.db.from('visit_requests').insert({
      requester_id: ctx.userId, requester_type: 'guest', property_id: args.property_id,
      preferred_date: args.preferred_date || null, message: args.message || null, status: 'pending',
    }).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.email, actorRole: 'guest', action: 'visit_request.create',
      entityType: 'visit_request', entityId: data?.id, before: null, after: data, source: 'aara',
    });
    return { created: true };
  },
};

// ── All-roles mutating tool ───────────────────────────────────────────────────

const submitFoodSuggestion: ToolDefinition<{ suggestion: string }, any, AaraToolContext> = {
  name: 'submit_food_suggestion',
  description: 'Submits a food/menu suggestion to the kitchen.',
  parameters: {
    type: 'object',
    properties: { suggestion: { type: 'string' } },
    required: ['suggestion'],
  },
  roles: ['guest', 'tenant', 'admin'],
  kind: 'server',
  execute: async (args, ctx) => {
    const { data, error } = await ctx.db.from('food_suggestions').insert({
      suggestion: args.suggestion, source: 'chat', tenant_id: ctx.userId, status: 'pending',
    }).select().maybeSingle();
    if (error) return { error: error.message };
    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.email, actorRole: ctx.role, action: 'food_suggestion.submit',
      entityType: 'food_suggestion', entityId: data?.id, before: null, after: data, source: 'aara',
    });
    return { submitted: true };
  },
};

// ── Client-kind tools (executed in the browser, never touch the DB here) ────

const navigate: ToolDefinition<{ path: string }, void, AaraToolContext> = {
  name: 'navigate',
  description: 'Navigates the user to an in-app page.',
  parameters: {
    type: 'object',
    properties: { path: { type: 'string', description: 'App-relative path, e.g. /admin/tickets' } },
    required: ['path'],
  },
  roles: ['guest', 'tenant', 'admin'],
  kind: 'client',
  execute: async () => {},
};

const appCommand: ToolDefinition<{ cmd: string; [k: string]: any }, void, AaraToolContext> = {
  name: 'app_command',
  description: 'Triggers a deep in-app UI command such as selecting a room, filtering tickets, or focusing a dashboard metric.',
  parameters: {
    type: 'object',
    properties: {
      cmd: { type: 'string', description: 'e.g. SELECT_ROOM, SELECT_PROPERTY, FILTER_TICKETS, SELECT_TICKET, SHOW_METRIC' },
      id: { type: 'string' },
      status: { type: 'string' },
      path: { type: 'string' },
    },
    required: ['cmd'],
  },
  roles: ['admin'],
  kind: 'client',
  execute: async () => {},
};

// save_memory/clear_memory are client-kind because memory is stored in the
// browser's localStorage (see lib/aaraMemory.ts) — there is nothing for the
// server to write. The client applies these the same way it already handles
// navigate/app_command client-actions.

const saveMemory: ToolDefinition<{ text: string; category?: string }, void, AaraToolContext> = {
  name: 'save_memory',
  description: 'Remembers a persistent instruction or preference the user wants followed in future conversations, e.g. "always call me by my first name" or "I prefer email over calls".',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string' },
      category: { type: 'string', enum: ['preference', 'rule', 'context', 'task'] },
    },
    required: ['text'],
  },
  roles: ['guest', 'tenant', 'admin'],
  kind: 'client',
  execute: async () => {},
};

const clearMemoryTool: ToolDefinition<{}, void, AaraToolContext> = {
  name: 'clear_memory',
  description: 'Clears everything remembered about the user. Only use when the user explicitly asks to forget everything.',
  parameters: { type: 'object', properties: {} },
  roles: ['guest', 'tenant', 'admin'],
  kind: 'client',
  execute: async () => {},
};

export const AARA_TOOLS: ToolDefinition[] = [
  listProperties, getMenu, getDishNutrition,
  getMyBills, getMyTickets, getMyMealPrefs, getMyNutrition,
  getMealHeadcount, findRoom,
  updateRoomStatus, recordFinancials, resolveTicket, markMemberAbsent,
  createTicket, skipMeal,
  createVisitRequest,
  submitFoodSuggestion,
  navigate, appCommand, saveMemory, clearMemoryTool,
];
