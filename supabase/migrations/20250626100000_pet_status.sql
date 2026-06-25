-- Ghost pet persistent status (one row per user)
create table if not exists public.pet_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  personality text not null default '调皮捣蛋',
  hunger int not null default 50 check (hunger >= 0 and hunger <= 100),
  energy int not null default 100 check (energy >= 0 and energy <= 100),
  last_updated timestamptz not null default now(),
  unique (user_id)
);

create index if not exists pet_status_user_id_idx on public.pet_status (user_id);

alter table public.pet_status enable row level security;

drop policy if exists "Users manage own pet status" on public.pet_status;

create policy "Users manage own pet status"
  on public.pet_status
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
