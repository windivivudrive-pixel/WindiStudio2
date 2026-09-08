import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Source = { id: string; slug: string; name: string; feed_url: string | null };
type ParsedEntry = { title: string; url: string; description: string; publishedAt: string };

const MAX_ITEMS_PER_SOURCE = 12;
const MINIMUM_MINUTES_BETWEEN_RUNS = 15;

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

function field(xml: string, name: string) {
  const found = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decode(found?.[1] || '');
}

function link(xml: string) {
  const href = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  return href || field(xml, 'link');
}

function parseFeed(xml: string): ParsedEntry[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks.flatMap((block) => {
    const title = field(block, 'title');
    const url = link(block);
    const description = field(block, 'description') || field(block, 'content') || field(block, 'summary');
    const timestamp = field(block, 'pubDate') || field(block, 'published') || field(block, 'updated');
    const publishedAt = new Date(timestamp);
    if (!title || !url.startsWith('https://') || Number.isNaN(publishedAt.getTime())) return [];
    return [{ title: title.slice(0, 600), url, description: description.slice(0, 5000), publishedAt: publishedAt.toISOString() }];
  }).slice(0, MAX_ITEMS_PER_SOURCE);
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return Response.json({ error: 'Server configuration missing' }, { status: 500 });

  const db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const body = await req.json().catch(() => ({}));
  const triggerKind = body?.trigger === 'CRON' ? 'CRON' : 'MANUAL';
  const cutoff = new Date(Date.now() - MINIMUM_MINUTES_BETWEEN_RUNS * 60_000).toISOString();
  const { data: recentRun } = await db.from('news_ingestion_runs').select('id').gte('started_at', cutoff).order('started_at', { ascending: false }).limit(1).maybeSingle();
  if (recentRun) return Response.json({ status: 'cooldown', next_allowed_after_minutes: MINIMUM_MINUTES_BETWEEN_RUNS });

  const { data: run, error: runError } = await db.from('news_ingestion_runs').insert({ trigger_kind: triggerKind, status: 'RUNNING' }).select('id').single();
  if (runError || !run) return Response.json({ error: 'Could not start ingestion run' }, { status: 500 });

  let discovered = 0;
  let inserted = 0;
  let updated = 0;
  const errors: Array<{ source: string; message: string }> = [];

  try {
    const { data: sources, error: sourceError } = await db.from('news_sources').select('id,slug,name,feed_url').eq('enabled', true).not('feed_url', 'is', null);
    if (sourceError) throw sourceError;

    for (const source of (sources || []) as Source[]) {
      if (!source.feed_url) continue;
      try {
        const response = await fetch(source.feed_url, { headers: { 'User-Agent': 'WindiStudio-news-ingestion/1.0 (+https://windistudio.app)' } });
        if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}`);
        const entries = parseFeed(await response.text());
        discovered += entries.length;

        for (const entry of entries) {
          const sourceHash = await sha256(`${source.slug}|${entry.url}|${entry.title}|${entry.description}`);
          const { data: existing, error: existingError } = await db.from('news_items').select('id').eq('canonical_url', entry.url).maybeSingle();
          if (existingError) throw existingError;

          if (existing) {
            const { error } = await db.from('news_items').update({
              source_name: source.name,
              source_title: entry.title,
              source_description: entry.description || null,
              source_hash: sourceHash,
              raw_payload: { source: source.slug, title: entry.title, description: entry.description, published_at: entry.publishedAt },
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', existing.id);
            if (error) throw error;
            updated += 1;
          } else {
            const { error } = await db.from('news_items').insert({
              source_id: source.id,
              canonical_url: entry.url,
              source_name: source.name,
              source_title: entry.title,
              source_description: entry.description || null,
              title_vi: entry.title,
              title_en: entry.title,
              summary_vi: entry.description || 'Chờ Windi biên tập tóm tắt trước khi xuất bản.',
              summary_en: entry.description || 'Awaiting Windi editorial summary before publication.',
              category: 'AI TOOLS',
              status: 'CANDIDATE',
              published_at: entry.publishedAt,
              source_hash: sourceHash,
              raw_payload: { source: source.slug, title: entry.title, description: entry.description, published_at: entry.publishedAt },
            });
            if (error) throw error;
            inserted += 1;
          }
        }
      } catch (error) {
        errors.push({ source: source.slug, message: error instanceof Error ? error.message.slice(0, 300) : 'Unknown source failure' });
      }
    }

    const status = errors.length ? (discovered ? 'PARTIAL' : 'FAILED') : 'SUCCEEDED';
    await db.from('news_ingestion_runs').update({ status, source_count: sources?.length || 0, discovered_count: discovered, inserted_count: inserted, updated_count: updated, errors, finished_at: new Date().toISOString() }).eq('id', run.id);
    return Response.json({ status, run_id: run.id, discovered, inserted, updated, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Unknown ingestion failure';
    await db.from('news_ingestion_runs').update({ status: 'FAILED', discovered_count: discovered, inserted_count: inserted, updated_count: updated, errors: [...errors, { source: 'worker', message }], finished_at: new Date().toISOString() }).eq('id', run.id);
    return Response.json({ status: 'FAILED', run_id: run.id, error: message }, { status: 500 });
  }
});
