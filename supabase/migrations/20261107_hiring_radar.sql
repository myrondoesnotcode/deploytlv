-- Deploy Hiring Radar (deploytlv.com/db/radar/): companies hiring in Israel, from public job boards.
-- Access rule = the Deploy DB's: an active Deploy Log subscriber (public.is_member()).
--   Everyone: radar_public() -> totals + the first 10 companies (3 roles each, no US pay) + a stub for the rest.
--   Subscribers: radar_for_me() -> every company with every role.
-- Written daily by the hiring-radar GitHub Action with the service-role key (tracker/push_supabase.py).
-- Additive only; safe to re-run.

create table if not exists public.radar_companies (
  name        text primary key,
  pos         int  not null,          -- feed order (0 = first)
  data        jsonb not null,         -- one company from tracker/data/report.json
  updated_at  timestamptz not null default now()
);
create table if not exists public.radar_meta (
  id          int primary key default 1 check (id = 1),
  totals      jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.radar_companies enable row level security;
alter table public.radar_meta enable row level security;
revoke all on public.radar_companies, public.radar_meta from anon, authenticated;

-- Public teaser: the free part of the feed.
create or replace function public.radar_public() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'totals', (select totals from radar_meta where id = 1),
    'companies', coalesce((
      select jsonb_agg(
        case when c.pos < 10
          then (c.data - 'top_paid' - 'us_pay_median_mid' - 'us_pay_roles') || jsonb_build_object(
               'has_pay', c.data->'top_paid' is not null and c.data->'top_paid' <> 'null'::jsonb,
               'hooks', coalesce((select jsonb_agg(h) from jsonb_array_elements_text(c.data->'hooks') h where h not like 'Top US pay%'), '[]'::jsonb),
               'latest_israel', coalesce((
                 select jsonb_agg(r) from (select r from jsonb_array_elements(c.data->'latest_israel') r limit 3) x), '[]'::jsonb),
               'locked_roles', greatest(jsonb_array_length(c.data->'latest_israel') - 3, 0))
          else jsonb_build_object('name', c.name, 'israel', c.data->'israel', 'israel_new30', c.data->'israel_new30',
                                  'ai_israel', c.data->'ai_israel', 'teams_israel', c.data->'teams_israel',
                                  'cities', c.data->'cities', 'locked', true)
        end order by c.pos)
      from radar_companies c), '[]'::jsonb),
    'member', false);
$$;
revoke all on function public.radar_public() from public;
grant execute on function public.radar_public() to anon, authenticated;

-- Subscribers: everything. Non-subscribers get the teaser.
create or replace function public.radar_for_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_member() then jsonb_build_object(
      'totals', (select totals from radar_meta where id = 1),
      'companies', coalesce((select jsonb_agg(c.data order by c.pos) from radar_companies c), '[]'::jsonb),
      'member', true)
    else public.radar_public() end;
$$;
revoke all on function public.radar_for_me() from public, anon;
grant execute on function public.radar_for_me() to authenticated;
