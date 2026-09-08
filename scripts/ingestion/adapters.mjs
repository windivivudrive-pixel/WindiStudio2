import { cleanText, repositoryUrl, safeUrl } from './core.mjs';

export const SOURCE_URLS = {
  skills_sh: 'https://skills.sh/',
  awesome_agent_skills: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md',
  trendshift: 'https://trendshift.io/',
  mcp_registry: 'https://registry.modelcontextprotocol.io/v0.1/servers?limit=100&version=latest',
  github_search: 'https://api.github.com/search/repositories',
};

export function parseSkills(html) {
  // Parse serialized data, never evaluate the upstream scripts.
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)].map(m => JSON.parse(m[1])).join('');
  const objects = [...chunks.matchAll(/\{"source":"[^"\n]+","skillId":"[^"\n]+","name":"[^"\n]+","installs":\d+[^{}]*\}/g)].map(m => JSON.parse(m[0]));
  return objects.filter(row => /^[\w.-]+\/[\w.-]+$/.test(row.source)).map((row, index) => ({
    name: row.name, skillId: row.skillId, type: 'SKILL', sourceId: `${row.source}/${row.skillId}`,
    canonicalUrl: `https://skills.sh/${row.source}/${row.skillId}`, repositoryUrl: `https://github.com/${row.source}`,
    publisher: row.source.split('/')[0], metadata: { listingPosition: index + 1 },
    metrics: [{ kind: 'skills_sh_installs', value: row.installs }],
  }));
}

export function parseAwesome(markdown) {
  const rows = [];
  for (const match of markdown.matchAll(/^- \*\*\[([^\]]+)\]\((https:\/\/[^)]+)\)\*\*/gm)) {
    const url = new URL(match[2]);
    const parts = url.pathname.split('/').filter(Boolean);
    let repo; let skillId;
    // A directory URL is not proof of a GitHub repository/subpath. Only ingest
    // directly attributed GitHub entries until directory alias resolution exists.
    if (url.hostname === 'github.com' && parts.length >= 2) {
      repo = repositoryUrl(url.toString());
      skillId = parts.length > 4 ? parts.at(-1).replace(/\.md$/i, '') : match[1].split('/').at(-1);
      if (skillId.toLowerCase() === 'skill') skillId = parts.at(-2);
    } else continue;
    const type = parts.length === 2 && !/skills?/i.test(parts[1]) ? (/mcp/i.test(parts[1]) ? 'MCP' : 'OPEN_SOURCE') : 'SKILL';
    rows.push({ name: match[1], type, skillId: type === 'SKILL' ? skillId : null, sourceId: match[2], canonicalUrl: match[2], repositoryUrl: repo, publisher: parts[0], metadata: { attribution: 'VoltAgent/awesome-agent-skills', originalListingUrl: match[2] } });
  }
  return rows;
}

export function parseTrendshift(html) {
  const rows = new Map();
  for (const match of html.matchAll(/<a\b[^>]*href="(\/repositories\/\d+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const name = cleanText(match[2]);
    if (!/^[\w.-]+\/[\w.-]+$/.test(name)) continue;
    // Only project links: no sponsor strip, ranking scores or licensed Signal payloads.
    rows.set(name.toLowerCase(), { name, type: 'OPEN_SOURCE', sourceId: match[1], canonicalUrl: `https://github.com/${name}`, repositoryUrl: `https://github.com/${name}`, publisher: name.split('/')[0], listingUrl: `https://trendshift.io${match[1]}`, metadata: { discoverySignal: 'public_project_link', licenseReviewRequired: true } });
  }
  return [...rows.values()];
}

export function parseRegistry(body) {
  if (!Array.isArray(body.servers)) throw new Error('Registry schema changed');
  return body.servers.filter(row => {
    const meta = row._meta?.['io.modelcontextprotocol.registry/official'];
    return meta?.status === 'active' && meta?.isLatest === true;
  }).map(({ server }) => {
    const sourceId = server.name;
    const listingUrl = `https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(sourceId)}/versions/latest`;
    return {
      name: server.title || sourceId, type: 'MCP', sourceId,
      canonicalUrl: safeUrl(server.repository?.url) || safeUrl(server.websiteUrl) || listingUrl,
      repositoryUrl: repositoryUrl(server.repository?.url), publisher: sourceId.split('/')[0], listingUrl,
      metadata: {
        registryName: sourceId, version: server.version,
        // Installation identities only; secrets/default arguments and instructions are not copied.
        packages: (server.packages || []).map(p => ({ registryType: p.registryType, identifier: p.identifier, version: p.version, transport: p.transport?.type })),
        transports: [...new Set((server.remotes || []).map(r => r.type))],
      },
    };
  });
}

export function parseGitHub(body) {
  if (!Array.isArray(body.items) || body.incomplete_results) throw new Error('GitHub returned incomplete/schema-invalid search results');
  return body.items.filter(repo => !repo.archived && !repo.fork && !repo.private && repo.license?.spdx_id && !['NOASSERTION', 'NONE'].includes(repo.license.spdx_id) && !/(awesome|tutorial|for-beginners|cookbook|courses?|resources|handbook|guide|prompts.leaks|best.practice|from-scratch)/i.test(repo.name) && !/(system prompts|leaked.{0,30}prompts|prompts.{0,30}leak)/i.test(repo.description || '')).map(repo => ({
    name: repo.full_name, type: /(?:^|[-_])mcp(?:[-_]|$)/i.test(repo.name) ? 'MCP' : 'OPEN_SOURCE',
    sourceId: String(repo.id), canonicalUrl: repo.html_url, repositoryUrl: repo.html_url, publisher: repo.owner.login,
    license: repo.license.spdx_id, metadata: { githubId: repo.id, topics: repo.topics || [], pushedAt: repo.pushed_at },
    metrics: [{ kind: 'github_stars', value: repo.stargazers_count }, { kind: 'github_forks', value: repo.forks_count }],
  }));
}

export function robotsAllows(text, path) {
  const rules = []; let agents = []; let hasRules = false;
  for (const raw of text.split('\n')) {
    const line = raw.split('#')[0].trim();
    const split = line.indexOf(':'); if (split < 0) continue;
    const key = line.slice(0, split).toLowerCase(); const value = line.slice(split + 1).trim();
    if (key === 'user-agent') { if (hasRules) { agents = []; hasRules = false; } agents.push(value.toLowerCase()); }
    else if (key === 'allow' || key === 'disallow') {
      hasRules = true;
      if (value && agents.some(a => a === '*' || a === 'windistudio-candidatecollector')) rules.push({ allowed: key === 'allow', pattern: value });
    }
  }
  const matches = rules.filter(rule => {
    const end = rule.pattern.endsWith('$') ? '$' : '';
    const raw = end ? rule.pattern.slice(0, -1) : rule.pattern;
    const regex = raw.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp(`^${regex}${end}`).test(path);
  }).sort((a, b) => b.pattern.length - a.pattern.length || Number(b.allowed) - Number(a.allowed));
  return matches[0]?.allowed ?? true;
}

async function checkPublicRoot(http, origin, paths = ['/']) {
  const robots = await http(`${origin}/robots.txt`);
  if (paths.some(path => !robotsAllows(robots.text, path))) throw new Error('Source robots disallows crawling');
}

export async function discoverSource(source, http) {
  const rows = [];
  async function page(url, parse, options) {
    const response = await http(url, options);
    rows.push(...parse(response.text).map(row => ({ ...row, source, sourceUrl: url, listingUrl: row.listingUrl || row.canonicalUrl, fetchedAt: response.fetchedAt, metrics: (row.metrics || []).map(m => ({ ...m, source, observedAt: response.fetchedAt })) })));
    return response;
  }
  if (source === 'skills_sh') {
    await checkPublicRoot(http, 'https://skills.sh');
    await page(SOURCE_URLS[source], parseSkills);
  } else if (source === 'awesome_agent_skills') {
    await page(SOURCE_URLS[source], parseAwesome);
  } else if (source === 'trendshift') {
    await checkPublicRoot(http, 'https://trendshift.io', ['/', '/weekly']);
    await page(SOURCE_URLS[source], parseTrendshift);
    await page('https://trendshift.io/weekly', parseTrendshift);
    // Trending is not quality assurance. Verify repository metadata, licensing,
    // and AI/tooling relevance before promoting a listing into the shortlist pool.
    const verified = [];
    const seen = new Set();
    for (const row of rows) {
      if (seen.has(row.repositoryUrl.toLowerCase())) continue;
      seen.add(row.repositoryUrl.toLowerCase());
      if (seen.size > 50) break;
      try {
        const response = await http(`https://api.github.com/repos/${row.name}`, { github: true });
        const repo = JSON.parse(response.text);
        const relevance = [repo.name, repo.description, ...(repo.topics || [])].join(' ');
        if (!/\b(ai|llm|agent|mcp|diffusion|rag|machine.learning|language.model|speech|video|coding|automation)\b/i.test(relevance)) continue;
        const [valid] = parseGitHub({ items: [repo] });
        if (!valid) continue;
        verified.push({ ...row, type: valid.type, license: valid.license, metadata: { ...row.metadata, githubVerifiedAt: response.fetchedAt, githubMetadataUrl: response.url, ...valid.metadata }, metrics: valid.metrics.map(m => ({ ...m, source: 'github', observedAt: response.fetchedAt })) });
      } catch (error) {
        if (error.message.includes('404') || error.message.includes('451')) continue;
        throw error;
      }
      if (verified.length >= 20) break;
    }
    if (!verified.length) throw new Error('No verified relevant Trendshift candidates within request budget');
    return verified;
  } else if (source === 'mcp_registry') {
    for (const query of ['playwright', 'github', 'context7', 'filesystem', 'postgres', 'memory', 'brave', 'notion', 'slack', 'supabase', 'firecrawl', 'exa', 'tavily', 'sentry', 'figma', 'chrome', 'google']) {
      const url = SOURCE_URLS[source] + `&search=${encodeURIComponent(query)}`;
      const relevance = new RegExp(`(^|[\\s_-])${query}($|[\\s_-])`, 'i');
      await page(url, text => parseRegistry(JSON.parse(text))
        .filter(row => relevance.test(`${row.metadata.registryName.split('/').at(-1)} ${row.name}`))
        .sort((a, b) => Number(b.metadata.registryName.split('/').at(-1).toLowerCase() === query) - Number(a.metadata.registryName.split('/').at(-1).toLowerCase() === query))
        .map(row => ({ ...row, metadata: { ...row.metadata, discoveryQuery: query } })));
    }
  } else if (source === 'github_search') {
    for (const query of ['topic:ai-agents stars:>500 archived:false fork:false', 'topic:mcp-server stars:>500 archived:false fork:false']) {
      const url = `${SOURCE_URLS[source]}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=100`;
      await page(url, text => parseGitHub(JSON.parse(text)), { github: true });
    }
  } else throw new Error('Unknown source');
  if (!rows.length) throw new Error('No candidates parsed; source needs review (not a successful empty run)');
  return rows;
}
