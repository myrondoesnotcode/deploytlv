-- Deploy community applications (deploytlv.com/join). 2026-10-23
--
-- Run in project ketmhhwpkafgwvpwfukd (deploy-db). Safe to re-run.
--
-- The public never touches this table directly: the `join` edge function
-- (service role) inserts and reviews rows. Admins read and review from
-- /db/applicants/ through RLS. Phone numbers and emails are personal data:
-- they live here only, never in the repo.

create table if not exists public.admins (
  email citext primary key,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Admins are added by hand (not committed):
--   insert into public.admins (email) values ('<admin email>') on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email')::citext)
$$;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.join_applications (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       citext not null,
  phone       text,
  linkedin    text,
  role        text not null check (role in ('founder','builder','other')),
  building    text,
  stage       text,
  tools       text[] not null default '{}',
  wants       text[] not null default '{}',
  source      jsonb not null default '{}',
  status      text not null default 'pending' check (status in ('approved','pending','declined')),
  decided_by  text,               -- 'auto' or the admin email / 'email link'
  reasons     text[] not null default '{}',  -- why the screen held it for review
  decided_at  timestamptz,
  invited_at  timestamptz
);
create index if not exists join_applications_created on public.join_applications (created_at desc);
create index if not exists join_applications_email on public.join_applications (email);

alter table public.join_applications enable row level security;
drop policy if exists join_applications_admin_read on public.join_applications;
create policy join_applications_admin_read on public.join_applications for select using (public.is_admin());
-- no insert/update/delete policies: writes go through the edge function only.

-- Admin view for the /db/applicants/ page.
create or replace function public.am_i_admin() returns boolean
language sql stable as $$ select public.is_admin() $$;
grant execute on function public.am_i_admin() to authenticated;
