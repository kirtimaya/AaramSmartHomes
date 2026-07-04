import { describe, it, expect, vi } from 'vitest';
import { runAgentLoop, GeminiContent, AgentEvent } from '../../aara/agentLoop';
import { ToolDefinition } from '../../aara/toolRegistry';

function baseOpts(overrides: Partial<Parameters<typeof runAgentLoop>[0]> = {}) {
  return {
    systemPrompt: 'sys',
    history: [],
    message: 'hi',
    role: 'admin' as const,
    ctx: {},
    tools: [] as ToolDefinition[],
    generateContent: vi.fn(),
    ...overrides,
  };
}

describe('runAgentLoop', () => {
  it('returns a done event straight away when the model replies with plain text', async () => {
    const generateContent = vi.fn().mockResolvedValue({ parts: [{ text: 'Hello there!' }] });
    const events = await runAgentLoop(baseOpts({ generateContent }));

    expect(events).toEqual([
      { type: 'text-delta', text: 'Hello there!' },
      { type: 'done', text: 'Hello there!' },
    ]);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('executes a server tool then feeds the functionResponse back for a second turn', async () => {
    const execute = vi.fn().mockResolvedValue({ count: 3 });
    const tools: ToolDefinition[] = [{
      name: 'get_meal_headcount',
      description: 'd', parameters: { type: 'object', properties: {} },
      roles: ['admin'], kind: 'server', execute,
    }];

    const generateContent = vi.fn()
      .mockResolvedValueOnce({ parts: [{ functionCall: { name: 'get_meal_headcount', args: { date: '2026-07-04' } } }] })
      .mockResolvedValueOnce({ parts: [{ text: '3 members are having lunch today.' }] });

    const events = await runAgentLoop(baseOpts({ tools, generateContent }));

    expect(execute).toHaveBeenCalledWith({ date: '2026-07-04' }, {});
    expect(events).toEqual([
      { type: 'tool-start', name: 'get_meal_headcount', args: { date: '2026-07-04' } },
      { type: 'tool-result', name: 'get_meal_headcount', result: { count: 3 } },
      { type: 'text-delta', text: '3 members are having lunch today.' },
      { type: 'done', text: '3 members are having lunch today.' },
    ]);
    expect(generateContent).toHaveBeenCalledTimes(2);

    // second call's contents must include the functionResponse turn
    const secondCallContents = generateContent.mock.calls[1][0] as GeminiContent[];
    const fnResponseTurn = secondCallContents.find(c => c.role === 'function');
    expect(fnResponseTurn?.parts[0].functionResponse).toEqual({ name: 'get_meal_headcount', response: { count: 3 } });
  });

  it('a tenant role never sees or executes an admin-only tool call, even if the model tries', async () => {
    const execute = vi.fn();
    const tools: ToolDefinition[] = [{
      name: 'update_room_status', description: 'd', parameters: { type: 'object', properties: {} },
      roles: ['admin'], kind: 'server', execute,
    }];
    const generateContent = vi.fn().mockResolvedValue({
      parts: [{ functionCall: { name: 'update_room_status', args: { room_id: 'r1', status: 'Vacant' } } }],
    });

    const events = await runAgentLoop(baseOpts({ role: 'tenant', tools, generateContent }));

    expect(execute).not.toHaveBeenCalled();
    expect(events[0]).toEqual({ type: 'error', message: 'Unknown or unauthorized tool: update_room_status' });
  });

  it('stops on a client-kind tool call without executing it, surfacing client-action', async () => {
    const execute = vi.fn();
    const tools: ToolDefinition[] = [{
      name: 'navigate', description: 'd', parameters: { type: 'object', properties: {} },
      roles: ['admin'], kind: 'client', execute,
    }];
    const generateContent = vi.fn().mockResolvedValue({
      parts: [{ text: 'Taking you there.' }, { functionCall: { name: 'navigate', args: { path: '/admin/tickets' } } }],
    });

    const events = await runAgentLoop(baseOpts({ tools, generateContent }));

    expect(execute).not.toHaveBeenCalled();
    expect(events).toEqual([
      { type: 'client-action', name: 'navigate', args: { path: '/admin/tickets' } },
      { type: 'done', text: 'Taking you there.' },
    ]);
  });

  it('a tool execution error is captured as a functionResponse error, not a thrown exception', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('DB unreachable'));
    const tools: ToolDefinition[] = [{
      name: 'get_my_bills', description: 'd', parameters: { type: 'object', properties: {} },
      roles: ['tenant'], kind: 'server', execute,
    }];
    const generateContent = vi.fn()
      .mockResolvedValueOnce({ parts: [{ functionCall: { name: 'get_my_bills', args: {} } }] })
      .mockResolvedValueOnce({ parts: [{ text: 'Sorry, I could not fetch your bills.' }] });

    const events = await runAgentLoop(baseOpts({ role: 'tenant', tools, generateContent }));

    expect(events[1]).toEqual({ type: 'tool-result', name: 'get_my_bills', result: { error: 'DB unreachable' } });
  });

  it('stops after maxIterations and surfaces an error + graceful done message', async () => {
    const execute = vi.fn().mockResolvedValue({ ok: true });
    const tools: ToolDefinition[] = [{
      name: 'loopy', description: 'd', parameters: { type: 'object', properties: {} },
      roles: ['admin'], kind: 'server', execute,
    }];
    const generateContent = vi.fn().mockResolvedValue({
      parts: [{ functionCall: { name: 'loopy', args: {} } }],
    });

    const events = await runAgentLoop(baseOpts({ tools, generateContent, maxIterations: 2 }));

    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(events.at(-2)).toEqual({ type: 'error', message: 'Max tool iterations reached' });
    expect(events.at(-1)?.type).toBe('done');
  });

  it('a transport error from generateContent yields a single error event', async () => {
    const generateContent = vi.fn().mockRejectedValue(new Error('network down'));
    const events = await runAgentLoop(baseOpts({ generateContent }));
    expect(events).toEqual([{ type: 'error', message: 'network down' }]);
  });

  it('onEvent callback fires for every emitted event in order', async () => {
    const generateContent = vi.fn().mockResolvedValue({ parts: [{ text: 'ok' }] });
    const seen: AgentEvent[] = [];
    await runAgentLoop(baseOpts({ generateContent, onEvent: (e) => seen.push(e) }));
    expect(seen).toEqual([{ type: 'text-delta', text: 'ok' }, { type: 'done', text: 'ok' }]);
  });
});
