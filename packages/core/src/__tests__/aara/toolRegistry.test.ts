import { describe, it, expect } from 'vitest';
import { filterToolsForRole, toGeminiDeclarations, findTool, ToolDefinition } from '../../aara/toolRegistry';

function makeTool(name: string, roles: ToolDefinition['roles'], kind: ToolDefinition['kind'] = 'server'): ToolDefinition {
  return {
    name,
    description: `desc-${name}`,
    parameters: { type: 'object', properties: {} },
    roles,
    kind,
    execute: async () => ({}),
  };
}

describe('filterToolsForRole', () => {
  const tools = [
    makeTool('list_properties', ['guest', 'tenant', 'admin']),
    makeTool('get_my_bills', ['tenant', 'admin']),
    makeTool('update_room_status', ['admin']),
  ];

  it('guest only sees guest-scoped tools', () => {
    const result = filterToolsForRole(tools, 'guest');
    expect(result.map(t => t.name)).toEqual(['list_properties']);
  });

  it('tenant never sees admin-only tools', () => {
    const result = filterToolsForRole(tools, 'tenant');
    expect(result.map(t => t.name)).toEqual(['list_properties', 'get_my_bills']);
    expect(result.some(t => t.name === 'update_room_status')).toBe(false);
  });

  it('admin sees everything', () => {
    const result = filterToolsForRole(tools, 'admin');
    expect(result).toHaveLength(3);
  });
});

describe('toGeminiDeclarations', () => {
  it('strips roles/kind/execute, keeps name/description/parameters', () => {
    const tools = [makeTool('get_menu', ['guest', 'tenant', 'admin'])];
    const decls = toGeminiDeclarations(tools);
    expect(decls).toEqual([{ name: 'get_menu', description: 'desc-get_menu', parameters: { type: 'object', properties: {} } }]);
  });
});

describe('findTool', () => {
  const tools = [makeTool('a', ['admin']), makeTool('b', ['admin'])];

  it('finds a tool by name', () => {
    expect(findTool(tools, 'b')?.name).toBe('b');
  });

  it('returns undefined for a tool not in the (already role-filtered) list', () => {
    expect(findTool(tools, 'update_room_status')).toBeUndefined();
  });
});
