create table if not exists public.loot_rounds (
  id uuid primary key default gen_random_uuid(),
  item_name text not null check (char_length(item_name) between 1 and 160),
  rarity text not null check (rarity in ('серая', 'необычная', 'редкая', 'эпическая', 'легендарная', 'мифическая')),
  duration_seconds integer not null check (duration_seconds between 10 and 86400),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'finished', 'cancelled')),
  created_at timestamptz not null default now()
);

create unique index if not exists loot_rounds_one_active_idx
  on public.loot_rounds (status)
  where status = 'active';

create table if not exists public.loot_rolls (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.loot_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nick text not null check (char_length(nick) between 1 and 80),
  roll integer not null check (roll between 1 and 100),
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);

create table if not exists public.loot_oauth_states (
  state_hash text primary key,
  callback_url text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.loot_owner_codes (
  code_hash text primary key,
  twitch_user_id text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.loot_owner_sessions (
  token_hash text primary key,
  twitch_user_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function public.claim_loot_roll(
  p_round_id uuid,
  p_user_id uuid,
  p_nick text,
  p_roll integer
)
returns public.loot_rolls
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.loot_rolls;
begin
  if p_roll < 1 or p_roll > 100 then
    raise exception using errcode = '22023', message = 'ROLL_OUT_OF_RANGE';
  end if;

  insert into public.loot_rolls (round_id, user_id, nick, roll)
  select p_round_id, p_user_id, left(trim(p_nick), 80), p_roll
  from public.loot_rounds
  where id = p_round_id
    and status = 'active'
    and ends_at > now()
  returning * into inserted;

  if inserted.id is null then
    if exists (select 1 from public.loot_rounds where id = p_round_id and ends_at <= now()) then
      raise exception using errcode = '57014', message = 'ROUND_EXPIRED';
    end if;
    raise exception using errcode = '22023', message = 'ROUND_NOT_ACTIVE';
  end if;

  return inserted;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'ALREADY_ROLLED';
end;
$$;

revoke all on function public.claim_loot_roll(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_loot_roll(uuid, uuid, text, integer) to service_role;

alter table public.loot_rounds enable row level security;
alter table public.loot_rolls enable row level security;
alter table public.loot_oauth_states enable row level security;
alter table public.loot_owner_codes enable row level security;
alter table public.loot_owner_sessions enable row level security;

revoke all on public.loot_rounds, public.loot_rolls,
  public.loot_oauth_states, public.loot_owner_codes, public.loot_owner_sessions
  from anon, authenticated;
grant select on public.loot_rounds, public.loot_rolls to authenticated;
grant all on public.loot_rounds, public.loot_rolls,
  public.loot_oauth_states, public.loot_owner_codes, public.loot_owner_sessions
  to service_role;

drop policy if exists loot_rounds_read_authenticated on public.loot_rounds;
create policy loot_rounds_read_authenticated on public.loot_rounds
  for select to authenticated using (true);

drop policy if exists loot_rolls_read_authenticated on public.loot_rolls;
create policy loot_rolls_read_authenticated on public.loot_rolls
  for select to authenticated using (true);

alter table public.loot_rounds replica identity full;
alter table public.loot_rolls replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.loot_rounds;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.loot_rolls;
exception
  when duplicate_object then null;
end $$;
