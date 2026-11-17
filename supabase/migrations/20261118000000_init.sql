-- ─────────────────────────────────────────────────────────────
-- Тоғызқұмалақ онлайн: профили, матчи, real-time, RLS
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- Профили игроков (расширяют auth.users)
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  elo         integer not null default 1200,
  wins        integer not null default 0,
  losses      integer not null default 0,
  draws       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Матчи. position — движковая Position в jsonb (holes, kazan, tuzdyk, turn, …)
create table public.matches (
  id          uuid primary key default gen_random_uuid (),
  status      text not null default 'waiting'
              check (status in ('waiting', 'playing', 'finished')),
  player0     uuid not null references public.profiles (id),
  player1     uuid references public.profiles (id),
  position    jsonb not null,
  outcome     text check (outcome in ('p0', 'p1', 'draw') or outcome is null),
  move_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index matches_status_created_idx on public.matches (status, created_at desc);
create index matches_players_idx on public.matches (player0, player1);

-- Автосоздание профиля при появлении пользователя (в т.ч. anonymous)
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    case
      when new.email is not null then split_part(new.email, '@', 1)
      else 'Гость-' || upper(substr(md5(random()::text), 1, 4))
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user ();

-- updated_at автоматически
create or replace function public.touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now ();
  return new;
end;
$$;

create trigger matches_touch
  before update on public.matches
  for each row
  execute function public.touch_updated_at ();

-- ── Row Level Security ──────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.matches  enable row level security;

-- Профили: читают все вошедшие (нужны имена и рейтинг на доске лобби),
-- пишет только владелец; вставка профиля — через security definer триггер.
create policy "profiles_select" on public.profiles
  for select using (auth.role () = 'authenticated');

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid () = id) with check (auth.uid () = id);

-- Матчи: читают все вошедшие (лобби + зрители),
-- создаёт первый игрок, обновляют участники либо присоединяющийся.
create policy "matches_select" on public.matches
  for select using (auth.role () = 'authenticated');

create policy "matches_insert" on public.matches
  for insert with check (auth.uid () = player0);

create policy "matches_update" on public.matches
  for update
  using (
    auth.uid () = player0
    or auth.uid () = player1
    or (status = 'waiting' and player1 is null)
  )
  with check (auth.uid () = player0 or auth.uid () = player1);

-- Realtime: транслируем изменения таблицы матчей
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;
