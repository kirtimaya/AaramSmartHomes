import { NextRequest, NextResponse } from 'next/server';
import type { AaraRole, AgentEvent, AgentHistoryTurn } from '@aaram/core/aara/server';
import { getUserRole, makeAdminClient, supabaseAdmin } from '@/lib/supabaseAdmin';
import { runAara } from '@/lib/aara/agent';
import { createSSEStream } from '@/lib/aara/stream';
import type { AaraToolContext } from '@/lib/aara/tools';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Role is always resolved server-side from the verified JWT via getUserRole
 * (the same resolver /api/auth/me uses), never trusted from the client. An
 * authenticated user with no admin/tenant/guest row falls back to 'guest'
 * (least privilege) rather than being silently upgraded to 'tenant'.
 */
async function resolveToolContext(req: NextRequest): Promise<AaraToolContext> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { role: 'guest', userId: null, email: 'anonymous', db: supabaseAdmin };

  const { role, userId, email } = await getUserRole(token);
  return { role: (role ?? 'guest') as AaraRole, userId, email: email ?? 'anonymous', db: makeAdminClient(token) };
}

function aggregateEvents(events: AgentEvent[]): { reply: string; action: string | null; data: any } {
  const done = events.find(e => e.type === 'done') as Extract<AgentEvent, { type: 'done' }> | undefined;
  const clientAction = events.find(e => e.type === 'client-action') as Extract<AgentEvent, { type: 'client-action' }> | undefined;

  return {
    reply: done?.text || 'Got it!',
    action: clientAction?.name ?? null,
    data: clientAction?.args ?? null,
  };
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ reply: 'Invalid request body.', action: null }, { status: 400 }); }

  const { message, history = [], memory, stream = false } = body;
  if (!message?.trim()) {
    return NextResponse.json({ reply: 'Please type a message.', action: null }, { status: 400 });
  }

  const ctx = await resolveToolContext(req);
  const memoryBlock = typeof memory === 'string' ? memory : '';
  const typedHistory: AgentHistoryTurn[] = Array.isArray(history)
    ? history.map((h: any) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', text: String(h.text ?? '') }))
    : [];

  if (stream) {
    const body = createSSEStream(async (onEvent) => {
      await runAara({ message, history: typedHistory, role: ctx.role, ctx, memoryBlock, onEvent });
    });
    return new Response(body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  const events: AgentEvent[] = [];
  await runAara({ message, history: typedHistory, role: ctx.role, ctx, memoryBlock, onEvent: (e) => events.push(e) });
  return NextResponse.json(aggregateEvents(events));
}
