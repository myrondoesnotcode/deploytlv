-- Deploy DB: schema and access rules.
-- Run once in Supabase → SQL Editor (or `supabase db push`). Safe to re-run.
--
-- Model
--   members          allowlist of who may read the DB (emails come from Luma / Academy / approvals)
--   entries          the knowledge base (answers, tools, projects, wins, asks, events)
--   hidden_people    builders who opted out of being named (the page shows them as "A member")
--   access_requests  "request access" form submissions, reviewed by Myron
--   saved            each member's bookmarked entries
--
-- Sign-in: magic link / Google / LinkedIn via Supabase Auth. Self sign-up is OFF in the page
-- (shouldCreateUser:false); member accounts are created by build/db/import-members.mjs.

create extension if not exists citext;

-- ---------- tables ----------
create table if not exists public.members (
  email        citext primary key,
  name         text,
  source       text not null default 'manual',      -- luma | academy | approved | manual
  active       boolean not null default true,
  member_since date not null default current_date,
  created_at   timestamptz not null default now()
);

create table if not exists public.entries (
  id          text primary key,
  type        text not null check (type in ('answer','resource','project','win','ask','event')),
  title       text not null,
  body        text,
  answer      text,
  who         text[] not null default '{}',
  date        date not null,
  week        text,
  tags        text[] not null default '{}',
  link        text check (link is null or link like 'https://%'),
  link_label  text,
  image       text,
  image_alt   text,
  status      text check (status is null or status in ('open','solved')),
  time        text,
  hidden      boolean not null default false,       -- pulled from the DB without deleting
  reviewed    boolean not null default false,       -- a human has checked it
  updated_at  timestamptz not null default now()
);
create index if not exists entries_type_date on public.entries (type, date desc);

create table if not exists public.hidden_people (
  name       text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null check (position('@' in email) > 1),
  name       text not null check (char_length(name) between 1 and 120),
  how        text check (char_length(how) <= 120),
  link       text check (link is null or char_length(link) <= 300),
  status     text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now()
);

create table if not exists public.saved (
  user_id    uuid not null references auth.users(id) on delete cascade,
  entry_id   text not null references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

-- ---------- membership check ----------
-- True when the signed-in user's verified email is an active member.
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.active and m.email = (auth.jwt() ->> 'email')::citext
  );
$$;
revoke all on function public.is_member() from public;
grant execute on function public.is_member() to authenticated;

-- The signed-in member's own row, for the account menu ("Member since ...").
create or replace function public.me() returns table (email citext, name text, member_since date)
language sql stable security definer set search_path = public as $$
  select m.email, m.name, m.member_since from public.members m
  where m.active and m.email = (auth.jwt() ->> 'email')::citext;
$$;
revoke all on function public.me() from public;
grant execute on function public.me() to authenticated;

-- ---------- row level security ----------
alter table public.members         enable row level security;
alter table public.entries         enable row level security;
alter table public.hidden_people   enable row level security;
alter table public.access_requests enable row level security;
alter table public.saved           enable row level security;

-- members: no direct reads or writes from the website (only through me() / is_member()).

drop policy if exists "members read entries" on public.entries;
create policy "members read entries" on public.entries
  for select to authenticated using (public.is_member() and not hidden);

drop policy if exists "members read hidden people" on public.hidden_people;
create policy "members read hidden people" on public.hidden_people
  for select to authenticated using (public.is_member());

-- Anyone may submit a request; nobody can read requests from the website.
drop policy if exists "anyone requests access" on public.access_requests;
create policy "anyone requests access" on public.access_requests
  for insert to anon, authenticated with check (status = 'pending');

drop policy if exists "members manage own saved" on public.saved;
create policy "members manage own saved" on public.saved
  for all to authenticated
  using (user_id = auth.uid() and public.is_member())
  with check (user_id = auth.uid() and public.is_member());

-- Privacy switch: a member can hide or unhide their own name (matched by members.name).
create or replace function public.set_my_visibility(visible boolean) returns void
language plpgsql security definer set search_path = public as $$
declare n text;
begin
  select m.name into n from public.members m
  where m.active and m.email = (auth.jwt() ->> 'email')::citext;
  if n is null then raise exception 'not a member'; end if;
  if visible then delete from public.hidden_people where name = n;
  else insert into public.hidden_people(name) values (n) on conflict do nothing; end if;
end $$;
revoke all on function public.set_my_visibility(boolean) from public;
grant execute on function public.set_my_visibility(boolean) to authenticated;

-- Explicit grants (Supabase defaults are similar; stated here so the intent is readable).
grant select on public.entries, public.hidden_people to authenticated;
grant insert on public.access_requests to anon, authenticated;
grant select, insert, delete on public.saved to authenticated;
revoke all on public.members from anon, authenticated;

-- ---------- signed-out page: counts and teaser titles only ----------
-- Lets the public landing show real numbers and 3 recent titles, with no names, bodies or links.
create or replace function public.public_stats() returns table (type text, n bigint, builders bigint)
language sql stable security definer set search_path = public as $$
  select e.type, count(*), (select count(distinct w) from public.entries x, unnest(x.who) w where not x.hidden)
  from public.entries e where not e.hidden group by e.type;
$$;
create or replace function public.public_teaser() returns table (type text, title text)
language sql stable security definer set search_path = public as $$
  (select type, title from public.entries where not hidden and type = 'answer' order by date desc limit 1)
  union all (select type, title from public.entries where not hidden and type = 'resource' order by date desc limit 1)
  union all (select type, title from public.entries where not hidden and type = 'win' order by date desc limit 1);
$$;
revoke all on function public.public_stats() from public;
revoke all on function public.public_teaser() from public;
grant execute on function public.public_stats() to anon, authenticated;
grant execute on function public.public_teaser() to anon, authenticated;

-- ---------- private photos ----------
-- Entry photos (event photos with faces) live in a private bucket, readable by members only.
insert into storage.buckets (id, name, public) values ('entry-images', 'entry-images', false)
on conflict (id) do nothing;
drop policy if exists "members read entry images" on storage.objects;
create policy "members read entry images" on storage.objects
  for select to authenticated using (bucket_id = 'entry-images' and public.is_member());
