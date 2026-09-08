import { describe, expect, it } from 'vitest';
import type { WindiResource } from '@/lib/windi-data';

const LEGACY_STARTER_SLUGS = new Set(['ui-ux-pro-max', 'playwright-mcp', 'context7-mcp', 'supabase-mcp']);

function isOnlyLegacyStarters(list: { slug: string }[]): boolean {
  if (list.length === 0 || list.length > 4) return false;
  return list.every((item) => LEGACY_STARTER_SLUGS.has(item.slug));
}

function calculateCounts(items: WindiResource[]) {
  return {
    skills: items.filter((i) => i.type === 'SKILL').length,
    mcp: items.filter((i) => i.type === 'MCP').length,
    openSource: items.filter((i) => i.type === 'OPEN_SOURCE').length,
    workflows: items.filter((i) => i.type === 'WORKFLOW').length,
  };
}

describe('Toolbox Data & User Integrity', () => {
  it('correctly detects and discards legacy auto-injected starter tools', () => {
    const legacyTools = [
      { slug: 'ui-ux-pro-max' },
      { slug: 'playwright-mcp' },
      { slug: 'context7-mcp' },
      { slug: 'supabase-mcp' },
    ];
    expect(isOnlyLegacyStarters(legacyTools)).toBe(true);

    const genuineTools = [
      { slug: 'ui-ux-pro-max' },
      { slug: 'my-custom-skill' },
    ];
    expect(isOnlyLegacyStarters(genuineTools)).toBe(false);

    expect(isOnlyLegacyStarters([])).toBe(false);
  });

  it('calculates counts by type accurately', () => {
    const tools = [
      { slug: 's1', type: 'SKILL' },
      { slug: 's2', type: 'SKILL' },
      { slug: 'm1', type: 'MCP' },
      { slug: 'w1', type: 'WORKFLOW' },
      { slug: 'o1', type: 'OPEN_SOURCE' },
    ] as WindiResource[];

    const counts = calculateCounts(tools);
    expect(counts.skills).toBe(2);
    expect(counts.mcp).toBe(1);
    expect(counts.workflows).toBe(1);
    expect(counts.openSource).toBe(1);
  });

  it('merges guest tools into authenticated user tools without duplicates', () => {
    const userTools = [{ slug: 'tool-a' }, { slug: 'tool-b' }] as WindiResource[];
    const guestTools = [{ slug: 'tool-b' }, { slug: 'tool-c' }] as WindiResource[];

    const existingSlugs = new Set(userTools.map((i) => i.slug));
    const toAdd = guestTools.filter((g) => !existingSlugs.has(g.slug));
    const merged = [...toAdd, ...userTools];

    expect(merged.length).toBe(3);
    expect(merged.map((m) => m.slug)).toEqual(['tool-c', 'tool-a', 'tool-b']);
  });
});
