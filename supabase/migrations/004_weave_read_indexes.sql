-- Weave read paths: equality filters first, newest-row ordering second.
-- Explicit names keep production advisor output and rollback discussions readable.

create index if not exists muel_messages_v2_discord_user_created_idx
  on public.muel_messages_v2 ((metadata ->> 'discordUserId'), created_at desc);

create index if not exists dreams_profile_created_idx
  on public.dreams (muel_profile_id, created_at desc);

create index if not exists muel_rolling_papers_target_created_idx
  on public.muel_rolling_papers (target_id, created_at desc);
