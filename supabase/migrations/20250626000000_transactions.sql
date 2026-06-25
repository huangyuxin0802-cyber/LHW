-- Income / expense ledger: transactions table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists type text not null default 'expense';

alter table public.transactions
  drop constraint if exists transactions_type_check;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('income', 'expense'));

-- category stays free-form text (no FK) for custom labels
alter table public.transactions
  alter column category type text;

create index if not exists transactions_user_id_created_at_idx
  on public.transactions (user_id, created_at desc);

alter table public.transactions enable row level security;

drop policy if exists "Users manage own transactions" on public.transactions;

create policy "Users manage own transactions"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
