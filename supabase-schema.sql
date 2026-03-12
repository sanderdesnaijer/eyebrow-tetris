-- Eyebrow Tetris Leaderboard Schema
-- Run this in your Supabase SQL Editor to set up the database
--
-- For existing databases, run this migration to add input_mode:
-- ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS input_mode text not null default 'eyebrow' check (input_mode in ('eyebrow', 'keyboard'));
-- CREATE INDEX IF NOT EXISTS leaderboard_input_mode_idx ON leaderboard (input_mode, score desc);

-- Create the leaderboard table
create table if not exists leaderboard (
  id uuid default gen_random_uuid() primary key,
  nickname text not null check (char_length(nickname) between 2 and 20),
  score integer not null check (score >= 0),
  level integer not null check (level between 1 and 10),
  lines integer not null check (lines >= 0),
  input_mode text not null default 'eyebrow' check (input_mode in ('eyebrow', 'keyboard')),
  created_at timestamp with time zone default now()
);

-- Create index for input_mode filtering
create index if not exists leaderboard_input_mode_idx on leaderboard (input_mode, score desc);

-- Create index for faster score lookups
create index if not exists leaderboard_score_idx on leaderboard (score desc);

-- Enable Row Level Security
alter table leaderboard enable row level security;

-- Allow anyone to read the leaderboard
create policy "Anyone can read leaderboard"
  on leaderboard for select
  using (true);

-- Allow anyone to insert scores
-- Note: For production, consider adding rate limiting via Supabase Edge Functions
create policy "Anyone can insert scores"
  on leaderboard for insert
  with check (true);

-- Optionally: Add a function to prevent duplicate submissions within a time window
-- This provides server-side rate limiting
create or replace function check_rate_limit(p_nickname text)
returns boolean as $$
declare
  last_submission timestamp with time zone;
begin
  select created_at into last_submission
  from leaderboard
  where nickname = p_nickname
  order by created_at desc
  limit 1;
  
  if last_submission is null then
    return true;
  end if;
  
  return (now() - last_submission) > interval '1 minute';
end;
$$ language plpgsql security definer;
