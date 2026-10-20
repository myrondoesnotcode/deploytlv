-- Deploy DB: access = Deploy Log newsletter subscription.
-- Anyone can get access by subscribing (explicit consent); unsubscribing ends access.
-- Replaces the event-guest allowlist as the access rule. Safe to re-run.

create table if not exists public.subscribers (
  email          citext primary key,
  user_id        uuid unique references auth.users(id) on delete set null,
  name           text check (name is null or char_length(name) <= 120),
  status         text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  consent_at     timestamptz,                 -- when they ticked "send me the Deploy Log"
  consent_text   text,                        -- the exact wording they agreed to
  source         text not null default 'db',  -- db | email | import
  subscribed_at  timestamptz not null default now(),
  unsubscribed_at timestamptz,
  synced_at      timestamptz                  -- last pushed to the Resend audience
);
alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;

-- Access check: an active subscriber with the signed-in, verified email.
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscribers s
    where s.status = 'subscribed' and s.email = (auth.jwt() ->> 'email')::citext
  );
$$;

-- Account menu data.
drop function if exists public.me();
create or replace function public.me() returns table (email citext, name text, member_since date, status text)
language sql stable security definer set search_path = public as $$
  select s.email, s.name, s.subscribed_at::date, s.status from public.subscribers s
  where s.email = (auth.jwt() ->> 'email')::citext;
$$;
revoke all on function public.me() from public;
grant execute on function public.me() to authenticated;

-- Subscribe the signed-in user. Requires explicit consent; records the wording agreed to.
create or replace function public.subscribe(p_name text, p_consent boolean, p_consent_text text) returns void
language plpgsql security definer set search_path = public as $$
declare e citext := (auth.jwt() ->> 'email')::citext;
begin
  if e is null then raise exception 'not signed in'; end if;
  if not coalesce(p_consent, false) then raise exception 'consent required'; end if;
  insert into public.subscribers (email, user_id, name, status, consent_at, consent_text, source)
  values (e, auth.uid(), nullif(trim(p_name), ''), 'subscribed', now(), left(p_consent_text, 400), 'db')
  on conflict (email) do update
    set status = 'subscribed', unsubscribed_at = null, consent_at = now(),
        consent_text = left(excluded.consent_text, 400), user_id = coalesce(subscribers.user_id, excluded.user_id),
        name = coalesce(subscribers.name, excluded.name), synced_at = null;
end $$;
revoke all on function public.subscribe(text, boolean, text) from public;
grant execute on function public.subscribe(text, boolean, text) to authenticated;

-- Unsubscribe (from the account menu). Access ends immediately.
create or replace function public.unsubscribe() returns void
language sql security definer set search_path = public as $$
  update public.subscribers set status = 'unsubscribed', unsubscribed_at = now(), synced_at = null
  where email = (auth.jwt() ->> 'email')::citext;
$$;
revoke all on function public.unsubscribe() from public;
grant execute on function public.unsubscribe() to authenticated;

-- Privacy switch now keys on the subscriber's name.
create or replace function public.set_my_visibility(visible boolean) returns void
language plpgsql security definer set search_path = public as $$
declare n text;
begin
  select coalesce(s.name, m.name) into n
  from public.subscribers s left join public.members m on m.email = s.email
  where s.status = 'subscribed' and s.email = (auth.jwt() ->> 'email')::citext;
  if n is null then raise exception 'add your name first'; end if;
  if visible then delete from public.hidden_people where name = n;
  else insert into public.hidden_people(name) values (n) on conflict do nothing; end if;
end $$;

-- Subscriber count for the landing page ("join 1,234 builders").
create or replace function public.subscriber_count() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from public.subscribers where status = 'subscribed';
$$;
revoke all on function public.subscriber_count() from public;
grant execute on function public.subscriber_count() to anon, authenticated;
