import 'server-only';
import { cache } from 'react';
import type { WindiResource } from './windi-data';
import type { CommunityEvidence } from './community-evidence';
import {creatorBrief,popularityLabel,purposeLabel} from './creator-catalog';
import type { EasyPrompt } from '@/windi/easy-prompt';

export type CatalogResult = { available: boolean; resources: WindiResource[] };
async function publicQuery(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error('Catalog is not configured');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Catalog unavailable (${response.status})`);
  return response.json();
}

import { resources as defaultResources } from './windi-data';

export function calculateHotTrendingScore(resource: WindiResource): number {
  const brief = resource.creatorBrief;
  const stars = brief?.github?.stars || 0;
  const pushedTime = brief?.github?.pushedAt
    ? new Date(brief.github.pushedAt).getTime()
    : 0;
  const now = Date.now();
  const ageDays = pushedTime ? Math.max(0, (now - pushedTime) / (1000 * 60 * 60 * 24)) : 999;

  // 1. Logarithmic star scaling (1k = 24, 10k = 32, 50k = 37.6, 100k = 40, 200k = 42.4)
  const starScore = Math.log10(Math.max(10, stars)) * 8;

  // 2. Commit freshness / recency:
  let recencyScore = 0;
  if (ageDays <= 1) recencyScore = 30;
  else if (ageDays <= 3) recencyScore = 27;
  else if (ageDays <= 7) recencyScore = 23;
  else if (ageDays <= 14) recencyScore = 18;
  else if (ageDays <= 30) recencyScore = 12;
  else if (ageDays <= 90) recencyScore = 4;
  else if (ageDays <= 365) recencyScore = -10;
  else recencyScore = -25;

  // 3. Trending bonus
  const trendingBonus = brief?.trending ? 10 : 0;

  // 4. Editor's Pick bonus
  const editorBonus = resource.badges?.includes('EDITOR') ? 5 : 0;

  return starScore + recencyScore + trendingBonus + editorBonus;
}

export const getCatalog = cache(async (): Promise<CatalogResult> => {
  try {
    const rows = await publicQuery('resources?select=id,slug,type,status,name,tagline,description,long_description,canonical_url,owner_name,license,last_source_update_at,import_metadata,is_editor_pick,is_official&status=eq.PUBLISHED&limit=1000');
    if (Array.isArray(rows) && rows.length > 0) {
      let scoresMap: Record<string, any> = {};
      try {
        const scoreRows = await publicQuery('resource_scores?select=resource_id,utility,setup,originality,adoption');
        if (Array.isArray(scoreRows)) {
          scoresMap = Object.fromEntries(scoreRows.map((s: any) => [s.resource_id, s]));
        }
      } catch {
        // Table resource_scores may not exist yet or be empty
      }

      const starRanked = rows
        .map(r => ({ id: r.id, stars: creatorBrief(r.import_metadata)?.github?.stars || 0 }))
        .filter(item => item.stars > 0)
        .sort((a, b) => b.stars - a.stars);
      const hotIds = new Set(starRanked.slice(0, 25).map(item => item.id));

      const dbResources: WindiResource[] = rows.map(row => {
        const brief = creatorBrief(row.import_metadata);
        const scoreData = (row.import_metadata as any)?.windi_score || scoresMap[row.id] || null;
        const badges: Array<'EDITOR' | 'OFFICIAL' | 'RISING' | 'SECURITY' | 'HOT'> = [];
        const stars = brief?.github?.stars || 0;
        if (hotIds.has(row.id) || stars >= 20000) {
          badges.push('HOT');
        }
        if (row.is_editor_pick) badges.push('EDITOR');
        if (row.is_official) badges.push('OFFICIAL');
        if (brief?.trending) badges.push('RISING');

        return ({
          id: row.id,
          slug: row.slug,
          type: row.type,
          status: row.status,
          name: row.name,
          tagline: row.tagline || 'Xem thông tin và bằng chứng tại nguồn gốc.',
          description: row.description || 'Chưa có mô tả biên tập chi tiết.',
          canonicalUrl: row.canonical_url,
          source: row.owner_name || 'Nguồn gốc',
          longDescription: row.long_description || '',
          tags: [...(brief?.categories.map(purposeLabel) || []), ...(row.license ? [row.license] : [])],
          agents: ['Codex', 'Claude', 'Cursor'],
          score: scoreData,
          badges,
          purposes: brief?.categories || [],
          creatorBrief: brief,
          metricLabel: brief ? popularityLabel(brief) : 'Chưa có chỉ số',
          updatedLabel: row.last_source_update_at ? `Nguồn: ${new Date(row.last_source_update_at).toLocaleDateString('vi-VN')}` : 'Chưa rõ ngày cập nhật',
        });
      });

      // Sắp xếp theo thứ tự Hot & Trending (điểm tổng hợp từ số sao, commit mới nhất và cờ trending)
      dbResources.sort((a, b) => {
        const diff = calculateHotTrendingScore(b) - calculateHotTrendingScore(a);
        if (diff !== 0) return diff;
        return (b.creatorBrief?.github?.stars || 0) - (a.creatorBrief?.github?.stars || 0);
      });

      return { available: true, resources: dbResources };
    }
    // Return empty array when DB has 0 published items, only fallback if connection fails completely
    return { available: true, resources: [] };
  } catch {
    return { available: false, resources: [] };
  }
});

export async function getPublishedResource(slug: string) {
  const catalog = await getCatalog();
  const resource = catalog.resources.find(row => row.slug === slug);
  return { available: true, resource };
}

export async function getCommunityEvidence(resourceId?: string): Promise<{ available: boolean; evidence: CommunityEvidence[] }> {
  if (!resourceId) return { available: true, evidence: [] };
  try {
    const evidence = await publicQuery(`resource_community_evidence?select=id,title,source_url,platform,author_name,author_relationship,summary_vi,positive_notes,limitation_notes,resource_match,match_explanation,observed_at,media:resource_evidence_media(id,kind,source_url,media_url,alt_text,rights_basis,rights_verified_at)&resource_id=eq.${encodeURIComponent(resourceId)}&status=eq.PUBLISHED&order=observed_at.desc&limit=12`);
    return { available: true, evidence };
  } catch { return { available: false, evidence: [] }; }
}

export async function getPublishedEasyPrompt(resourceId?: string): Promise<{ available: boolean; prompt: EasyPrompt | null }> {
  if (!resourceId) return { available: true, prompt: null };
  try {
    const rows = await publicQuery(`resource_easy_prompts?select=prompt_vi,prompt_en,source_url,generated_at&resource_id=eq.${encodeURIComponent(resourceId)}&status=eq.GENERATED&limit=1`);
    const row = rows[0];
    if (!row || typeof row.prompt_vi !== 'string' || typeof row.prompt_en !== 'string') return { available: true, prompt: null };
    return { available: true, prompt: { promptVi: row.prompt_vi, promptEn: row.prompt_en, sourceUrl: row.source_url, generatedAt: row.generated_at } };
  } catch { return { available: false, prompt: null }; }
}
