import type { ResourceType } from '@/lib/windi-data';

export interface SourceCandidate {
  source: 'github' | 'skills_sh' | 'mcp_registry' | 'manual';
  sourceId: string;
  canonicalUrl: string;
  name: string;
  description?: string;
  type?: ResourceType;
  metadata: Record<string, unknown>;
}

export interface SourceAdapter {
  name: SourceCandidate['source'];
  discover(input: { query?: string; cursor?: string }): Promise<SourceCandidate[]>;
  normalize(candidate: SourceCandidate): SourceCandidate;
}
