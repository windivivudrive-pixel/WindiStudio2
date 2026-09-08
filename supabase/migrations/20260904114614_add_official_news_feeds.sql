begin;

-- Official XML feeds added after verifying their availability. New feed entries
-- remain CANDIDATE until Windi has a Vietnamese, user-useful editorial summary.
update public.news_sources
set feed_url = case slug
  when 'google-deepmind' then 'https://deepmind.google/blog/rss.xml'
  when 'openai' then 'https://openai.com/news/rss.xml'
  else feed_url
end,
updated_at = now()
where slug in ('google-deepmind','openai');

commit;
