-- Lookup user id by email (for adding friends)
create or replace function public.find_user_id_by_email(target_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(target_email))
  limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to authenticated;

-- Friendships
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references auth.users on delete cascade not null,
  addressee_id uuid references auth.users on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now() not null,
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_idx
  on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

create policy "Users can view own friendships"
  on public.friendships
  for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests"
  on public.friendships
  for insert
  with check (auth.uid() = requester_id);

create policy "Users can update friendships they receive"
  on public.friendships
  for update
  using (auth.uid() = addressee_id or auth.uid() = requester_id)
  with check (auth.uid() = addressee_id or auth.uid() = requester_id);

create policy "Users can delete own friendships"
  on public.friendships
  for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Messages
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users on delete cascade not null,
  recipient_id uuid references auth.users on delete cascade not null,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz default now() not null,
  check (sender_id <> recipient_id)
);

create index if not exists messages_conversation_idx
  on public.messages (sender_id, recipient_id, created_at desc);

create index if not exists messages_recipient_idx
  on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;

create or replace function public.are_friends(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = user_a and f.addressee_id = user_b)
        or (f.requester_id = user_b and f.addressee_id = user_a)
      )
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

create policy "Users can view own messages"
  on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send messages to friends"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and public.are_friends(auth.uid(), recipient_id)
  );

-- Enable realtime for chat
alter publication supabase_realtime add table public.messages;
