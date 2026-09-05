-- Deploy Academy — online waitlist
-- Run once in the Supabase SQL editor (project uzloavbzhebsoizkxheb).
--
-- SECURITY NOTE, read before changing anything here:
-- The page submits with the *anon* key, which is public — it ships inside
-- academy/index.html and anyone can read it. That is normal for Supabase, but
-- it only stays safe because of the policies below. There is exactly ONE
-- policy, and it is INSERT. There is deliberately NO select/update/delete
-- policy for anon, so the public key can add a row and can never read one.
-- If you ever add "for select ... to anon", the entire email list becomes
-- downloadable by anyone who views source. Read the list from the dashboard
-- or with the service_role key instead.

create table if not exists public.academy_waitlist (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null,
  source      text        not null default 'academy',
  created_at  timestamptz not null default now(),

  constraint academy_waitlist_name_len  check (char_length(btrim(name)) between 1 and 120),
  constraint academy_waitlist_email_len check (char_length(email) <= 254),
  -- cheap server-side shape check; the browser check can be bypassed
  constraint academy_waitlist_email_fmt check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- one row per person, case-insensitively. A repeat signup hits this and the
-- page treats the resulting 409 as "you are already on the list".
create unique index if not exists academy_waitlist_email_uniq
  on public.academy_waitlist (lower(email));

create index if not exists academy_waitlist_created_idx
  on public.academy_waitlist (created_at desc);

alter table public.academy_waitlist enable row level security;

drop policy if exists "anon may join the waitlist" on public.academy_waitlist;
create policy "anon may join the waitlist"
  on public.academy_waitlist
  for insert
  to anon
  with check (true);

-- Reading the list (dashboard, or any client using the service_role key):
--   select created_at, name, email from public.academy_waitlist order by created_at desc;
