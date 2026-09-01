-- Links Supabase auth users to AeroPay sandbox users and stores webhook payloads.

create table if not exists public.aeropay_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null unique,
  aeropay_user_id text unique,
  first_name text not null,
  last_name text not null,
  phone_number text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists webhook_events_topic_idx on public.webhook_events (topic);
create index if not exists webhook_events_received_at_idx on public.webhook_events (received_at desc);

alter table public.aeropay_profiles enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "Users can read own aeropay profile" on public.aeropay_profiles;
create policy "Users can read own aeropay profile"
  on public.aeropay_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own aeropay profile" on public.aeropay_profiles;
create policy "Users can insert own aeropay profile"
  on public.aeropay_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own aeropay profile" on public.aeropay_profiles;
create policy "Users can update own aeropay profile"
  on public.aeropay_profiles for update
  using (auth.uid() = user_id);

-- Webhook events are written by the service role from API routes only.
drop policy if exists "Service role manages webhook events" on public.webhook_events;
create policy "Service role manages webhook events"
  on public.webhook_events for all
  using (false)
  with check (false);
