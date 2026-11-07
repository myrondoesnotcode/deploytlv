-- Hiring Radar "Connect via Deploy": intro requests from members. Written only by the radar-connect edge function (service role).
create table if not exists public.radar_intros (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null,
  name        text,
  company     text not null,
  role_title  text,
  role_url    text,
  note        text not null,
  linkedin    text,
  status      text not null default 'new',   -- new / intro_made / passed / hired
  emailed_at  timestamptz
);
create index if not exists radar_intros_created on public.radar_intros (created_at);
alter table public.radar_intros enable row level security;
revoke all on public.radar_intros from anon, authenticated;

-- allow the two new funnel steps
create or replace function public.radar_track(p_sid text, p_event text, p_props jsonb default '{}'::jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_event not in ('visit','view','gate','signup_open','code_sent','signed_in','subscribed','roles','apply','share','follow','discover','deeplink','connect','connect_sent')
     or length(p_sid) > 64 or length(coalesce(p_props::text, '')) > 500 then return; end if;
  insert into radar_events (sid, event, props, member)
  values (p_sid, p_event, coalesce(p_props, '{}'::jsonb), coalesce(auth.jwt() ->> 'email', '') <> '' and public.is_member());
end $$;
