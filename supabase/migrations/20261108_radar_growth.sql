-- Hiring Radar growth: funnel tracking, saved follows, weekly alert list. Additive; safe to re-run.

-- 1. Funnel events (anonymous; one row per step). Readable only with the service role.
create table if not exists public.radar_events (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  sid      text not null,                 -- random id kept in the visitor's browser
  event    text not null,
  props    jsonb not null default '{}'::jsonb,
  member   boolean not null default false
);
create index if not exists radar_events_at on public.radar_events (at);
alter table public.radar_events enable row level security;
revoke all on public.radar_events from anon, authenticated;

create or replace function public.radar_track(p_sid text, p_event text, p_props jsonb default '{}'::jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_event not in ('visit','view','gate','signup_open','code_sent','signed_in','subscribed','roles','apply','share','follow','discover','deeplink')
     or length(p_sid) > 64 or length(coalesce(p_props::text, '')) > 500 then return; end if;
  insert into radar_events (sid, event, props, member)
  values (p_sid, p_event, coalesce(p_props, '{}'::jsonb), coalesce(auth.jwt() ->> 'email', '') <> '' and public.is_member());
end $$;
revoke all on function public.radar_track(text, text, jsonb) from public;
grant execute on function public.radar_track(text, text, jsonb) to anon, authenticated;

-- Funnel summary for the last N days (service role / SQL editor only).
create or replace function public.radar_funnel(p_days int default 7) returns table(event text, visitors bigint, events bigint)
language sql stable security definer set search_path = public as $$
  select event, count(distinct sid), count(*) from radar_events where at > now() - make_interval(days => p_days)
  group by event order by 2 desc;
$$;
revoke all on function public.radar_funnel(int) from public, anon, authenticated;

-- 2. Follows, per signed-in email.
create table if not exists public.radar_follows (
  email    text not null,
  company  text not null,
  at       timestamptz not null default now(),
  primary key (email, company)
);
alter table public.radar_follows enable row level security;
revoke all on public.radar_follows from anon, authenticated;

create or replace function public.radar_follow(p_company text, p_on boolean) returns void
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(auth.jwt() ->> 'email');
begin
  if e is null or e = '' or length(p_company) > 100 then return; end if;
  if p_on then insert into radar_follows (email, company) values (e, p_company) on conflict do nothing;
  else delete from radar_follows where email = e and company = p_company; end if;
end $$;
revoke all on function public.radar_follow(text, boolean) from public, anon;
grant execute on function public.radar_follow(text, boolean) to authenticated;

create or replace function public.radar_my_follows() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(company order by at), '[]'::jsonb) from radar_follows where email = lower(auth.jwt() ->> 'email');
$$;
revoke all on function public.radar_my_follows() from public, anon;
grant execute on function public.radar_my_follows() to authenticated;

-- 3. Weekly alert list: active subscribers who follow at least one company (service role only; tracker/alerts.py).
create or replace function public.radar_alert_list() returns table(email text, name text, follows jsonb)
language sql stable security definer set search_path = public as $$
  select f.email, max(s.name), jsonb_agg(f.company order by f.at)
  from radar_follows f join subscribers s on lower(s.email) = f.email and s.status = 'subscribed'
  group by f.email;
$$;
revoke all on function public.radar_alert_list() from public, anon, authenticated;
