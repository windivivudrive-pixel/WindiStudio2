import { hash } from './core.mjs';

export const RANKING_VERSION = 'nontech-growth-v1';
const NEED_ALIASES = {
  video: 'video', audio: 'audio', image: 'image', design: 'image', office: 'office',
  research: 'office', content: 'content', social: 'content', seo: 'content', automation: 'automation',
};

function activeNeeds(resources) {
  const counts = new Map();
  for (const row of resources) {
    if (['REJECTED', 'ARCHIVED', 'DEPRECATED'].includes(row.status)) continue;
    const raw = row.import_metadata?.autoDiscovery?.needs || row.import_metadata?.creatorCatalog?.categories || [];
    for (const value of Array.isArray(raw) ? raw : []) {
      const need = NEED_ALIASES[String(value).toLowerCase()];
      if (need) counts.set(need, (counts.get(need) || 0) + 1);
    }
  }
  return counts;
}

function round(value) { return Math.round(value * 10) / 10; }

export function rankDiscoveryCandidates(candidates, database, { now = Date.now() } = {}) {
  const coverage = activeNeeds(database.resources || []);
  const previous = database.previousStars || new Map();
  const known = database.allIdentities || new Set();
  return candidates.filter(row => row.fit.lane === 'PRIORITY_REVIEW' && !known.has(row.identity)).map(row => {
    const stars = Number(row.metadata.stars) || 0;
    const prior = previous.get(row.identity);
    const hours = prior ? Math.max(0, (Date.parse(row.readme?.observedAt || new Date(now).toISOString()) - Date.parse(prior.observed_at)) / 3_600_000) : 0;
    const starDelta = prior && hours >= 1 ? Math.max(0, stars - Number(prior.github_stars || 0)) : null;
    const starsPerDay = starDelta === null ? null : round(starDelta * 24 / hours);
    const primaryNeed = [...row.fit.needs].sort((a, b) => (coverage.get(a) || 0) - (coverage.get(b) || 0))[0];
    const ageDays = Math.max(0, (now - Date.parse(row.metadata.pushedAt)) / 86_400_000);
    const components = {
      usefulness: round(row.fit.score * 0.5),
      hotness: round(Math.min(15, Math.log10(stars + 1) * 3)),
      growth: starsPerDay === null ? 0 : round(Math.min(20, Math.log2(starsPerDay + 1) * 4)),
      freshness: ageDays <= 30 ? 10 : ageDays <= 90 ? 7 : ageDays <= 180 ? 5 : 3,
      catalogGap: round(15 / (1 + (coverage.get(primaryNeed) || 0) / 5)),
    };
    const total = round(Math.min(100, Object.values(components).reduce((sum, value) => sum + value, 0)));
    return { ...row, ranking: { version: RANKING_VERSION, total, components, primaryNeed, currentStars: stars, previousStars: prior ? Number(prior.github_stars) : null, starDelta, starsPerDay, observedAt: row.readme?.observedAt || new Date(now).toISOString() } };
  }).sort((a, b) => b.ranking.total - a.ranking.total || b.metadata.stars - a.metadata.stars || a.name.localeCompare(b.name));
}

export function selectReviewBatch(ranked, { target = 8, minimum = 5, perNeed = 2, perOwner = 1 } = {}) {
  const selected = []; const needs = new Map(); const owners = new Map();
  for (const row of ranked) {
    if (selected.length >= target || row.ranking.total < 60) break;
    const need = row.ranking.primaryNeed;
    const owner = row.name.split('/')[0].toLowerCase();
    if ((needs.get(need) || 0) >= perNeed || (owners.get(owner) || 0) >= perOwner) continue;
    selected.push(row); needs.set(need, (needs.get(need) || 0) + 1); owners.set(owner, (owners.get(owner) || 0) + 1);
  }
  return selected.length >= minimum ? selected : [];
}

export function discoveryRunKey(observations, now = Date.now()) {
  const date = new Date(now);
  const bucket = `${date.toISOString().slice(0, 10).replaceAll('-', '')}${String(Math.floor(date.getUTCHours() / 6) * 6).padStart(2, '0')}`;
  const digest = hash(JSON.stringify(observations.map(row => [row.identity, row.metadata.stars]))).slice(0, 16);
  return `windi-repo-${bucket}-${digest}`;
}
