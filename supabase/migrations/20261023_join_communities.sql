-- Two communities on one /join: Founders/Builders and DeployTLV for Startups (people using AI at work). 2026-10-23
-- Run in project ketmhhwpkafgwvpwfukd (deploy-db). Safe to re-run.

alter table public.join_applications add column if not exists community text not null default 'builders';
alter table public.join_applications drop constraint if exists join_applications_community_check;
alter table public.join_applications add constraint join_applications_community_check check (community in ('builders','startups'));

alter table public.join_applications drop constraint if exists join_applications_role_check;
alter table public.join_applications add constraint join_applications_role_check check (role in ('founder','builder','work','other'));

alter table public.join_applications add column if not exists company  text;
alter table public.join_applications add column if not exists title    text;
alter table public.join_applications add column if not exists location text;
