-- Daily "who's waiting to join" email. 2026-10-23
--
-- Run in project ketmhhwpkafgwvpwfukd (deploy-db). Safe to re-run.
-- Needs the JOIN_SECRET value stored in Vault first (not committed):
--   select vault.create_secret('<JOIN_SECRET>', 'join_secret');
--
-- 17:00 UTC = 19:00 in Israel in winter (20:00 in summer). The function only
-- sends when someone is waiting.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('join-digest') where exists (select 1 from cron.job where jobname = 'join-digest');
select cron.schedule('join-digest', '0 17 * * *', $$
  select net.http_post(
    url := 'https://ketmhhwpkafgwvpwfukd.supabase.co/functions/v1/join',
    body := '{"action":"digest"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-join-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'join_secret')),
    timeout_milliseconds := 30000);
$$);
