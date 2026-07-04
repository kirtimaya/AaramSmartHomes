/**
 * Server-safe subset of the aara module: pure logic only, no React hooks.
 * Imported by Next.js route handlers via the `@aaram/core/aara/server`
 * subpath so bundlers never pull in client-only hooks (useAaraChat) into
 * a server module graph.
 */
export { filterToolsForRole, toGeminiDeclarations, findTool } from './toolRegistry';
export type { AaraRole, ToolKind, ToolParameterSchema, ToolDefinition } from './toolRegistry';

export { runAgentLoop } from './agentLoop';
export type {
  AgentHistoryTurn, GeminiFunctionCall, GeminiPart, GeminiContent,
  GenerateContentFn, AgentEvent, RunAgentLoopOptions,
} from './agentLoop';
