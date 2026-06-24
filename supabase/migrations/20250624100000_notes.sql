-- Notes table for user-written notes
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists notes_user_id_created_at_idx
  on public.notes (user_id, created_at desc);

alter table public.notes enable row level security;

create policy "Users can view own notes"
  on public.notes
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notes"
  on public.notes
  for delete
  using (auth.uid() = user_id);
