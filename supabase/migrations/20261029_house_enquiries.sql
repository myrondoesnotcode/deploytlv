-- Deploy House enquiries (deploytlv.com/residency, the "Get in touch" form). 2026-10-29
--
-- Run in project ketmhhwpkafgwvpwfukd (deploy-db). Safe to re-run.
--
-- The public never touches this table directly: the `house` edge function
-- (service role) inserts rows and emails Myron. Admins can read through RLS.
-- Emails are personal data: they live here only, never in the repo.

create table if not exists public.house_enquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       citext not null,
  company     text,
  interest    text not null check (interest in ('Founding patron','Brand partner','Distribution partner','Joining as a founder','Something else')),
  message     text,
  source      jsonb not null default '{}',
  emailed_at  timestamptz
);
create index if not exists house_enquiries_created on public.house_enquiries (created_at desc);

alter table public.house_enquiries enable row level security;
drop policy if exists house_enquiries_admin_read on public.house_enquiries;
create policy house_enquiries_admin_read on public.house_enquiries for select using (public.is_admin());
-- no insert/update/delete policies: writes go through the edge function only.
