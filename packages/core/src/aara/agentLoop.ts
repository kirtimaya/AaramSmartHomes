import { ToolDefinition, filterToolsForRole, toGeminiDeclarations, findTool, AaraRole } from './toolRegistry';

export interface AgentHistoryTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: { name: string; response: any };
}

export interface GeminiContent {
  role: 'user' | 'model' | 'function';
  parts: GeminiPart[];
}

/** Injected transport so the loop is unit-testable without a network call. */
export type GenerateContentFn = (contents: GeminiContent[], declarations: any[]) => Promise<{
  parts: GeminiPart[];
}>;

export type AgentEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-start'; name: string; args: Record<string, any> }
  | { type: 'tool-result'; name: string; result: any }
  | { type: 'client-action'; name: string; args: Record<string, any> }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string };

export interface RunAgentLoopOptions<TCtx> {
  systemPrompt: string;
  history: AgentHistoryTurn[];
  message: string;
  role: AaraRole;
  ctx: TCtx;
  tools: ToolDefinition[];
  generateContent: GenerateContentFn;
  maxIterations?: number;
  onEvent?: (event: AgentEvent) => void;
}

/**
 * Drives the Gemini function-calling loop: sends the conversation + role-filtered tool
 * declarations, executes any 'server' tool calls the model makes, appends functionResponses,
 * and repeats until the model returns plain text or maxIterations is hit.
 * 'client' tool calls (navigate/app_command) stop the loop immediately and are surfaced
 * to the browser instead of being executed here.
 */
export async function runAgentLoop<TCtx>(opts: RunAgentLoopOptions<TCtx>): Promise<AgentEvent[]> {
  const { systemPrompt, history, message, role, ctx, tools, generateContent, maxIterations = 6, onEvent } = opts;

  const roleTools = filterToolsForRole(tools, role);
  const declarations = toGeminiDeclarations(roleTools);
  const events: AgentEvent[] = [];
  const emit = (e: AgentEvent) => { events.push(e); onEvent?.(e); };

  const contents: GeminiContent[] = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood.' }] },
    ...history.map(h => ({ role: h.role === 'assistant' ? 'model' as const : 'user' as const, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  for (let i = 0; i < maxIterations; i++) {
    let response;
    try {
      response = await generateContent(contents, declarations);
    } catch (e) {
      const errMessage = e instanceof Error ? e.message : 'Agent request failed';
      emit({ type: 'error', message: errMessage });
      return events;
    }

    const functionCallPart = response.parts.find(p => p.functionCall);
    const textParts = response.parts.filter(p => p.text).map(p => p.text!).join('');

    if (!functionCallPart) {
      if (textParts) emit({ type: 'text-delta', text: textParts });
      emit({ type: 'done', text: textParts });
      return events;
    }

    const call = functionCallPart.functionCall!;
    const tool = findTool(roleTools, call.name);

    if (!tool) {
      emit({ type: 'error', message: `Unknown or unauthorized tool: ${call.name}` });
      emit({ type: 'done', text: textParts || "I can't do that from here." });
      return events;
    }

    if (tool.kind === 'client') {
      emit({ type: 'client-action', name: call.name, args: call.args });
      emit({ type: 'done', text: textParts });
      return events;
    }

    emit({ type: 'tool-start', name: call.name, args: call.args });
    let result: any;
    try {
      result = await tool.execute(call.args, ctx);
    } catch (e) {
      result = { error: e instanceof Error ? e.message : 'Tool execution failed' };
    }
    emit({ type: 'tool-result', name: call.name, result });

    contents.push({ role: 'model', parts: [{ functionCall: call }] });
    contents.push({ role: 'function', parts: [{ functionResponse: { name: call.name, response: result } }] });
  }

  emit({ type: 'error', message: 'Max tool iterations reached' });
  emit({ type: 'done', text: "I've hit my step limit working through that — could you simplify the request?" });
  return events;
}
