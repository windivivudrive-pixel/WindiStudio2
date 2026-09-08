-- Run only in project zpjphixcttehkkgxlmsn after the editorial migration.
-- User explicitly requested this account; resolve against verified Auth, not profiles.
begin;
do $$
declare target uuid;
begin
  select id into strict target from auth.users
    where id='4f018bf9-b2c6-4075-8a21-9018efcb003f'
      and lower(email)='quochungdn151@gmail.com'
      and email_confirmed_at is not null;
  insert into public.editorial_members(user_id,role) values(target,'admin')
    on conflict(user_id) do update set role=excluded.role;
end $$;
commit;
