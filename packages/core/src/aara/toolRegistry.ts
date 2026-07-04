export type AaraRole = 'guest' | 'tenant' | 'admin';

export type ToolKind = 'server' | 'client';

/** JSON-schema-ish parameter spec, matching Gemini's functionDeclarations.parameters shape. */
export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, { type: string; description?: string; enum?: string[] }>;
  required?: string[];
}

export interface ToolDefinition<TArgs = any, TResult = any, TCtx = any> {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  /** Roles allowed to invoke this tool. */
  roles: AaraRole[];
  /** 'server' tools execute immediately and feed a functionResponse back to the model.
   *  'client' tools (navigate, app_command) are surfaced to the browser to act on. */
  kind: ToolKind;
  execute: (args: TArgs, ctx: TCtx) => Promise<TResult>;
}

/** Returns only the tools a given role is permitted to see/call. */
export function filterToolsForRole<T extends Pick<ToolDefinition, 'roles'>>(
  tools: T[],
  role: AaraRole,
): T[] {
  return tools.filter(t => t.roles.includes(role));
}

/** Converts a filtered tool list into Gemini's `functionDeclarations` shape. */
export function toGeminiDeclarations(
  tools: Pick<ToolDefinition, 'name' | 'description' | 'parameters'>[],
): { name: string; description: string; parameters: ToolParameterSchema }[] {
  return tools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters }));
}

/** Finds a tool by name within an already role-filtered list; returns undefined if absent or not permitted. */
export function findTool<T extends Pick<ToolDefinition, 'name'>>(
  tools: T[],
  name: string,
): T | undefined {
  return tools.find(t => t.name === name);
}
