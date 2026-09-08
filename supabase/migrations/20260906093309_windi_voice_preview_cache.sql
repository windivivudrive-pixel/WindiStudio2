-- Public catalog samples are only written by the server. Keep the bucket private
-- so neither anonymous nor authenticated clients can list or replace the files.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('windi-voice-previews','windi-voice-previews',false,2097152,array['audio/mpeg'])
on conflict(id) do nothing;
