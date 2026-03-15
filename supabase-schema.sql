-- Personal OS — Supabase Schema
-- Run this in Supabase SQL Editor (one time setup)

create table if not exists goals (
  id text primary key,
  user_id text not null,
  title text not null,
  description text,
  status text not null default 'active',
  period text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists actions (
  id text primary key,
  user_id text not null,
  goal_id text,
  title text not null,
  description text,
  frequency text default 'daily',
  execution_type text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists today_tasks (
  id text primary key,
  user_id text not null,
  action_id text,
  title text not null,
  description text,
  execution_type text not null default 'user',
  status text not null default 'pending',
  result text,
  date text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists ideas (
  id text primary key,
  user_id text not null,
  content text not null,
  summary text,
  category text,
  tags text,
  expanded text,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key,
  user_id text not null,
  role text not null,
  content text not null,
  context text not null default 'general',
  created_at timestamptz not null default now()
);

create table if not exists usage_logs (
  id text primary key,
  user_id text not null,
  date text not null,
  count integer not null default 0,
  unique(user_id, date)
);

-- Indexes for performance
create index if not exists idx_goals_user_id on goals(user_id);
create index if not exists idx_actions_user_id on actions(user_id);
create index if not exists idx_today_tasks_user_date on today_tasks(user_id, date);
create index if not exists idx_ideas_user_id on ideas(user_id);
create index if not exists idx_messages_user_context on messages(user_id, context);
create index if not exists idx_usage_logs_user_date on usage_logs(user_id, date);

-- Enable Row Level Security (optional but recommended)
alter table goals enable row level security;
alter table actions enable row level security;
alter table today_tasks enable row level security;
alter table ideas enable row level security;
alter table messages enable row level security;
alter table usage_logs enable row level security;
