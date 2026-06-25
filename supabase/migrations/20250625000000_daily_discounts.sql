create table if not exists public.daily_discounts (
  id uuid primary key default gen_random_uuid(),
  restaurant_name text not null,
  latitude float8 not null,
  longitude float8 not null,
  platform text not null check (platform in ('First Table', 'EatClub')),
  discount_text text not null,
  booking_url text not null,
  distance float8,
  created_at timestamptz not null default now()
);

alter table public.daily_discounts enable row level security;

create policy "Anyone can read daily discounts"
  on public.daily_discounts
  for select
  to anon, authenticated
  using (true);

insert into public.daily_discounts (
  restaurant_name,
  latitude,
  longitude,
  platform,
  discount_text,
  booking_url,
  distance
)
values
  (
    'The Lex',
    -27.4689,
    153.0234,
    'First Table',
    '50% Off Food — First Table',
    'https://www.firsttable.com.au/brisbane/brisbane-cbd/the-lex',
    null
  ),
  (
    'Ciao',
    -27.4648,
    153.0356,
    'EatClub',
    'Up to 35% Off — Dine In',
    'https://eatclub.com.au/venue/ciao-papi',
    null
  ),
  (
    'Lennons Restaurant & Bar',
    -27.4702,
    153.0258,
    'First Table',
    '50% Off Food — First Table',
    'https://www.firsttable.com.au/brisbane/brisbane-cbd/lennons-restaurant-and-bar',
    null
  )
on conflict do nothing;
