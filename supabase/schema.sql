-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Profiles table: stores the user's financial profile
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  profile_data jsonb,               -- full profile object from onboarding
  onboarding_complete boolean default false,
  next_checkin_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Snapshots table: monthly history of the user's plan
create table public.snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  profile_data jsonb not null,      -- full profile at time of snapshot
  result_data jsonb not null,       -- computed waterfall result
  waterfall_step integer,           -- 0–4, for easy querying/charting
  net_worth numeric,                -- pre-computed for trends
  created_at timestamptz default now()
);

-- Row Level Security: users can only see their own data
alter table public.profiles enable row level security;
alter table public.snapshots enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can view own snapshots"
  on public.snapshots for select
  using (auth.uid() = user_id);

create policy "Users can insert own snapshots"
  on public.snapshots for insert
  with check (auth.uid() = user_id);

-- Function to auto-update updated_at on profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Function to auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
