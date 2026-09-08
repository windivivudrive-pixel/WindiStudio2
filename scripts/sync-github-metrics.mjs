import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';

async function main() {
  const envContent = await readFile('.env.local', 'utf8');
  const env = parse(envContent);
  const base = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!base || !serviceKey) {
    throw new Error('Missing Supabase URL or Service Role Key in .env.local');
  }

  // Load repo stats from scratch
  const stats = JSON.parse(await readFile('/Users/win/.gemini/antigravity/brain/ea876d67-0583-4453-a25b-4888d82f2cd1/scratch/repo_stats.json', 'utf8'));
  console.log(`Loaded ${stats.length} repo stats.`);

  // Determine top trending:
  // Repos with commit in last 48h and high stars
  const now = Date.now();
  const trendingCandidates = stats
    .map(s => {
      const pushedTime = s.pushedAt ? new Date(s.pushedAt).getTime() : 0;
      const ageHours = (now - pushedTime) / (1000 * 3600);
      return { ...s, ageHours };
    })
    .filter(s => s.ageHours <= 48 && s.stars >= 30000)
    .sort((a, b) => b.stars - a.stars);

  const trendingMap = new Map();
  trendingCandidates.slice(0, 15).forEach((item, index) => {
    trendingMap.set(item.id, {
      rank: index + 1,
      source: 'GitHub Trending & Fresh Commits',
      url: 'https://github.com/trending',
      observedAt: new Date().toISOString(),
      period: 'daily'
    });
  });

  console.log(`Assigned trending status to ${trendingMap.size} top active tools.`);

  // Fetch current published resources
  const res = await fetch(`${base}/rest/v1/resources?select=id,slug,name,import_metadata,last_source_update_at&status=eq.PUBLISHED`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  const published = await res.json();

  const observedAt = new Date().toISOString();

  let updatedCount = 0;
  for (const row of published) {
    const stat = stats.find(s => s.id === row.id || s.slug === row.slug);
    if (!stat) {
      console.warn(`No stats for ${row.name}`);
      continue;
    }

    const currentMeta = row.import_metadata || {};
    const creatorCatalog = currentMeta.creatorCatalog;
    if (!creatorCatalog) {
      console.warn(`No creatorCatalog for ${row.name}`);
      continue;
    }

    const trending = trendingMap.get(row.id) || null;

    const updatedCreatorCatalog = {
      ...creatorCatalog,
      github: {
        ...creatorCatalog.github,
        stars: stat.stars,
        forks: stat.forks,
        pushedAt: stat.pushedAt,
        observedAt,
        archived: Boolean(stat.archived)
      },
      trending
    };

    const updatedMeta = {
      ...currentMeta,
      creatorCatalog: updatedCreatorCatalog
    };

    // Update resource in Supabase
    const updateRes = await fetch(`${base}/rest/v1/resources?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        last_source_update_at: stat.pushedAt,
        import_metadata: updatedMeta,
        updated_at: observedAt
      })
    });

    if (!updateRes.ok) {
      console.error(`Failed to update ${row.name}: ${updateRes.status}`, await updateRes.text());
    } else {
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount}/${published.length} resources in Supabase.`);

  // Insert metric snapshots
  const snapshots = [];
  for (const stat of stats) {
    snapshots.push({
      resource_id: stat.id,
      source_type: 'github',
      metric_key: 'stars',
      metric_value: stat.stars,
      captured_at: observedAt
    });
    snapshots.push({
      resource_id: stat.id,
      source_type: 'github',
      metric_key: 'forks',
      metric_value: stat.forks,
      captured_at: observedAt
    });
  }

  const snapRes = await fetch(`${base}/rest/v1/resource_metric_snapshots`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(snapshots)
  });

  if (!snapRes.ok) {
    console.warn(`Snapshot insert status: ${snapRes.status}`, await snapRes.text());
  } else {
    console.log(`Inserted ${snapshots.length} metric snapshots.`);
  }
}

main().catch(console.error);
