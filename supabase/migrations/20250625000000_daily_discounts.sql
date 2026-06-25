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
    'Blackbird Dining & Bar',
    -27.4654,
    153.0301,
    'First Table',
    '$10 Book for 50% Off Food',
    'https://www.firsttable.com.au/brisbane/blackbird',
    0.6
  ),
  (
    'Joyful Chinese Seafood Restaurant',
    -27.4698,
    153.0255,
    'EatClub',
    '30% Off Total Bill — Dine In',
    'https://eatclub.com.au/venues/joyful-chinese-seafood-restaurant',
    0.3
  ),
  (
    'Vista Lounge at Emporium Hotel',
    -27.4772,
    153.0218,
    'First Table',
    '$15 Book for 40% Off Dining',
    'https://www.firsttable.com.au/brisbane/vista-lounge',
    1.2
  )
on conflict do nothing;
