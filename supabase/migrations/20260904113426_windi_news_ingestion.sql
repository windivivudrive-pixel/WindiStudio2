begin;

-- News is intentionally separate from resources. The crawler may collect a
-- candidate, but only source-backed PUBLISHED rows are readable by visitors.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

create table public.news_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,78}$'),
  name text not null check(length(trim(name)) between 2 and 120),
  homepage_url text not null check(homepage_url ~ '^https://'),
  feed_url text check(feed_url is null or feed_url ~ '^https://'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.news_sources(id) on delete restrict,
  canonical_url text not null unique check(canonical_url ~ '^https://'),
  source_name text not null check(length(trim(source_name)) between 2 and 120),
  source_title text not null check(length(trim(source_title)) between 1 and 600),
  source_description text,
  title_vi text not null check(length(trim(title_vi)) between 1 and 600),
  title_en text,
  summary_vi text not null check(length(trim(summary_vi)) between 1 and 5000),
  summary_en text,
  category text not null default 'AI TOOLS' check(length(trim(category)) between 2 and 80),
  status text not null default 'CANDIDATE' check(status in ('CANDIDATE','PUBLISHED','ARCHIVED')),
  published_at timestamptz not null,
  reviewed_at timestamptz,
  published_to_windi_at timestamptz,
  source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_items_public_idx on public.news_items(status, published_at desc);
create index news_items_source_idx on public.news_items(source_id, last_seen_at desc);

create table public.news_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_kind text not null check(trigger_kind in ('CRON','MANUAL')),
  status text not null check(status in ('RUNNING','SUCCEEDED','PARTIAL','FAILED')),
  source_count integer not null default 0 check(source_count >= 0),
  discovered_count integer not null default 0 check(discovered_count >= 0),
  inserted_count integer not null default 0 check(inserted_count >= 0),
  updated_count integer not null default 0 check(updated_count >= 0),
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index news_ingestion_runs_recent_idx on public.news_ingestion_runs(started_at desc);

alter table public.news_sources enable row level security;
alter table public.news_items enable row level security;
alter table public.news_ingestion_runs enable row level security;
revoke all on public.news_sources, public.news_items, public.news_ingestion_runs from public, anon, authenticated;
grant select on public.news_items to anon, authenticated;
grant all on public.news_sources, public.news_items, public.news_ingestion_runs to service_role;
create policy news_public_read on public.news_items for select to anon, authenticated
  using(status='PUBLISHED' and published_to_windi_at is not null and published_at <= now());
create policy news_editor_read on public.news_items for select to authenticated
  using(exists(select 1 from public.editorial_members m where m.user_id=(select auth.uid())));
create policy news_source_editor_read on public.news_sources for select to authenticated
  using(exists(select 1 from public.editorial_members m where m.user_id=(select auth.uid())));
create policy news_run_editor_read on public.news_ingestion_runs for select to authenticated
  using(exists(select 1 from public.editorial_members m where m.user_id=(select auth.uid())));

-- The cron caller reads its URL and signed anon key from Vault. Nothing is
-- embedded in source code or exposed to browser clients.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.trigger_windi_news_ingestion()
returns void
language plpgsql
security definer
set search_path = pg_catalog, vault, net, pg_temp
as $$
declare project_url text; scheduler_key text;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name='windi_news_project_url';
  select decrypted_secret into scheduler_key from vault.decrypted_secrets where name='windi_news_scheduler_key';
  if project_url is null or scheduler_key is null then
    raise exception 'Windi News scheduler credentials are not configured';
  end if;
  perform net.http_post(
    url := project_url || '/functions/v1/ingest-news',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || scheduler_key,
      'apikey',scheduler_key
    ),
    body := jsonb_build_object('trigger','CRON','requested_at',now()),
    timeout_milliseconds := 45000
  );
end;
$$;
revoke all on function private.trigger_windi_news_ingestion() from public, anon, authenticated;
grant execute on function private.trigger_windi_news_ingestion() to postgres;

-- Every two hours, at seven minutes past the hour. The Edge Function has a
-- database lock and source-hash upsert so retries cannot create duplicates.
do $$
begin
  if exists(select 1 from cron.job where jobname='windi-news-ingestion-2h') then
    perform cron.unschedule('windi-news-ingestion-2h');
  end if;
  perform cron.schedule(
    'windi-news-ingestion-2h',
    '7 */2 * * *',
    'select private.trigger_windi_news_ingestion();'
  );
end $$;

insert into public.news_sources(slug,name,homepage_url,feed_url) values
  ('github-blog','GitHub Blog','https://github.blog/','https://github.blog/ai-and-ml/feed/'),
  ('google-deepmind','Google DeepMind','https://deepmind.google/blog/',null),
  ('openai','OpenAI','https://openai.com/news/',null),
  ('anthropic','Anthropic','https://www.anthropic.com/news',null)
on conflict(slug) do update set name=excluded.name, homepage_url=excluded.homepage_url, feed_url=excluded.feed_url, updated_at=now();

insert into public.news_items(
  source_id,canonical_url,source_name,source_title,title_vi,title_en,summary_vi,summary_en,category,status,published_at,published_to_windi_at,reviewed_at,source_hash,raw_payload
) values
(
  (select id from public.news_sources where slug='github-blog'),
  'https://github.blog/ai-and-ml/github-copilot/github-copilot-app-for-beginners-run-several-agents-at-once/',
  'GitHub Blog',
  'GitHub Copilot app for Beginners: Run several agents at once',
  'GitHub hướng dẫn chạy nhiều AI agent song song trong cùng một dự án',
  'GitHub explains how to run multiple AI agents in parallel on one project',
  'GitHub mô tả cách tách các nhiệm vụ thành những phiên Copilot độc lập để agent không dẫm chân nhau. Với người dùng Windi, đây là cách dễ áp dụng khi muốn một agent tìm tool, một agent cài, và một agent kiểm tra kết quả.',
  'GitHub describes splitting tasks into independent Copilot sessions so agents do not step on each other. For Windi users, this is a practical pattern: one agent finds a tool, one installs it, and one verifies the outcome.',
  'AI AGENTS','PUBLISHED','2026-09-03T00:00:00Z',now(),now(),'85f4ba0ac6ed3ca4708fd30f3025e59d1b41ed992bc0f1d18be21be75f971c70','{}'
),(
  (select id from public.news_sources where slug='google-deepmind'),
  'https://deepmind.google/blog/',
  'Google DeepMind',
  'Introducing agentic video understanding with Gemini',
  'Google DeepMind đưa “agentic video understanding” của Gemini vào danh sách cập nhật mới',
  'Google DeepMind adds Gemini’s agentic video understanding to its latest updates',
  'Google DeepMind vừa đưa bài giới thiệu về khả năng hiểu video theo kiểu agent lên trang News. Đây là tín hiệu đáng theo dõi cho Video Kits: các công cụ làm video đang dịch chuyển từ “tạo từng asset” sang hiểu và xử lý cả quy trình.',
  'Google DeepMind has added an introduction to agentic video understanding to its News page. For Video Kits, this is worth watching: video tools are moving from generating single assets toward understanding and handling an entire workflow.',
  'VIDEO AI','PUBLISHED','2026-09-01T00:00:00Z',now(),now(),'3b0662a7993f4e61042bce021b12b2a85e0e12b8fbee46a72502265a144e10e8','{}'
),(
  (select id from public.news_sources where slug='openai'),
  'https://openai.com/index/daybreak-for-frontline-defenders/',
  'OpenAI',
  'Daybreak for Frontline Defenders: $1B to protect essential services',
  'OpenAI công bố Daybreak hỗ trợ các đội ngũ bảo vệ hạ tầng thiết yếu',
  'OpenAI announces Daybreak support for teams protecting essential infrastructure',
  'OpenAI giới thiệu Daybreak for Frontline Defenders, một chương trình kết hợp quyền truy cập, đào tạo và hỗ trợ kỹ thuật cho các tổ chức bảo vệ hạ tầng thiết yếu. Tin này nhắc người dùng Windi rằng với các tool có quyền truy cập hệ thống, an toàn luôn phải đi cùng hiệu quả.',
  'OpenAI introduces Daybreak for Frontline Defenders, combining access, training, and technical support for organizations protecting essential infrastructure. It is a reminder that tools with system access need safety alongside usefulness.',
  'AN TOÀN AI','PUBLISHED','2026-09-03T00:00:00Z',now(),now(),'a7c5f4c3555445452460caef2991fe3e83b9844acafeb1a4c3c2b2b1d4d6711f','{}'
),(
  (select id from public.news_sources where slug='anthropic'),
  'https://www.anthropic.com/news/improving-alignment-security-efforts',
  'Anthropic',
  'Improving our alignment and security practices',
  'Anthropic cập nhật các biện pháp giám sát và cô lập cho AI agent',
  'Anthropic updates monitoring and isolation practices for AI agents',
  'Anthropic chia sẻ các thay đổi về giám sát, sandbox và quy trình đánh giá agent sau các sự cố trong môi trường kiểm thử. Đây là checklist nền tảng khi dùng agent cài repo hoặc chạy workflow: chỉ cấp quyền vừa đủ và luôn xem lại đầu ra.',
  'Anthropic shares changes to monitoring, sandboxes, and agent evaluations following incidents in test environments. The practical checklist when an agent installs a repo or runs a workflow: grant only necessary access and always review the result.',
  'AN TOÀN AGENT','PUBLISHED','2026-08-31T00:00:00Z',now(),now(),'092cbd77df91f9391a61dc92f5f0dd7f8d8635d9dfc893ab8ca82f1c5f5f6ece','{}'
)
on conflict(canonical_url) do update set
  source_name=excluded.source_name,source_title=excluded.source_title,title_vi=excluded.title_vi,title_en=excluded.title_en,
  summary_vi=excluded.summary_vi,summary_en=excluded.summary_en,category=excluded.category,
  status='PUBLISHED',published_to_windi_at=coalesce(public.news_items.published_to_windi_at,now()),
  reviewed_at=now(),source_hash=excluded.source_hash,last_seen_at=now(),updated_at=now();

notify pgrst,'reload schema';
commit;
