-- Deploy DB: hide-my-name is enforced on the server.
-- Before this, the page read entries.who and the whole hidden_people list and swapped names in the
-- browser, so a hidden name was still in the API response and hidden_people was a readable list of
-- who asked to hide. Now the page can only read entries through entries_for_me(), which replaces
-- hidden names with 'A member' before anything leaves the database. Safe to re-run.

-- ---------- no direct reads of entries or hidden_people from the website ----------
drop policy if exists "members read hidden people" on public.hidden_people;
drop policy if exists "members read entries" on public.entries;
revoke all on public.entries, public.hidden_people from anon, authenticated;

-- ---------- entries, with hidden names redacted ----------
-- Free text (titles, bodies, answers) names people too ("Dana recommended ..."), so hidden names
-- are also replaced there: whole words, any case. Only used inside entries_for_me().
create or replace function public.redact_hidden(t text) returns text
language plpgsql stable security definer set search_path = public as $$
declare n text;
begin
  if t is null then return null; end if;
  for n in select distinct trim(h.name) from public.hidden_people h where trim(h.name) <> '' loop
    t := regexp_replace(t,
           '(?<![[:alnum:]_])' || regexp_replace(n, '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '(?![[:alnum:]_])',
           'A member', 'gi');
  end loop;
  return t;
end $$;
revoke all on function public.redact_hidden(text) from public, anon, authenticated;

-- Same access rule as the old policy: an active subscriber, and only entries that aren't pulled.
-- who[] names match hidden_people ignoring case and surrounding spaces.
create or replace function public.entries_for_me() returns table (
  id text, type text, title text, body text, answer text, who text[], date date, week text,
  tags text[], link text, link_label text, image text, image_alt text, status text, "time" text
)
language sql stable security definer set search_path = public as $$
  -- ids are slugs that can contain a name (w-dana-paywall), so they get the same treatment
  select case when redact_hidden(e.id) = e.id then e.id else lower(replace(redact_hidden(e.id), ' ', '-')) end,
         e.type, redact_hidden(e.title), redact_hidden(e.body), redact_hidden(e.answer),
         coalesce((
           select array_agg(case when exists (
                    select 1 from public.hidden_people h where lower(trim(h.name)) = lower(trim(w.name))
                  ) then 'A member' else w.name end order by w.ord)
           from unnest(e.who) with ordinality as w(name, ord)
         ), '{}'::text[]),
         e.date, e.week, e.tags, e.link, redact_hidden(e.link_label), e.image, redact_hidden(e.image_alt),
         e.status, e.time
  from public.entries e
  where public.is_member() and not e.hidden
  order by e.date desc, e.id;
$$;
revoke all on function public.entries_for_me() from public, anon;
grant execute on function public.entries_for_me() to authenticated;

-- ---------- account menu: add the hide toggle's state ----------
drop function if exists public.me();
create or replace function public.me() returns table (
  email citext, name text, member_since date, status text, hidden boolean
)
language sql stable security definer set search_path = public as $$
  select s.email, s.name, s.subscribed_at::date, s.status,
         s.name is not null and exists (
           select 1 from public.hidden_people h where lower(trim(h.name)) = lower(trim(s.name))
         )
  from public.subscribers s
  where s.email = (auth.jwt() ->> 'email')::citext;
$$;
revoke all on function public.me() from public, anon;
grant execute on function public.me() to authenticated;

notify pgrst, 'reload schema';
