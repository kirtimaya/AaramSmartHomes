import type { SupabaseClient } from '@supabase/supabase-js';
import type { ToolDefinition } from '@aaram/core/aara/server';

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

export const AARA_TOOLS: ToolDefinition[] = [
  listProperties, getMenu, getDishNutrition,
  getMyBills, getMyTickets, getMyMealPrefs, getMyNutrition,
  getMealHeadcount, findRoom,
  navigate, appCommand,
];
