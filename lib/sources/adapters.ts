import type { SourceAdapter, SourceCandidate } from './types';

const unavailable = (source: SourceCandidate['source']): SourceAdapter => ({
  name: source,
  async discover() { return []; },
  normalize(candidate) { return { ...candidate, source }; },
});

// Adapters deliberately return candidates only. Publishing requires an editor review in the database.
export const sourceAdapters = {
  github: unavailable('github'),
  skillsSh: unavailable('skills_sh'),
  mcpRegistry: unavailable('mcp_registry'),
  manual: unavailable('manual'),
};
