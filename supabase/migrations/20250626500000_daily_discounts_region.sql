-- AU/NZ regional expansion for EatClub & First Table discounts
alter table public.daily_discounts
  add column if not exists country text not null default 'Australia';

alter table public.daily_discounts
  add column if not exists city text not null default 'Brisbane';

create index if not exists daily_discounts_city_idx on public.daily_discounts (city);
create index if not exists daily_discounts_country_idx on public.daily_discounts (country);

update public.daily_discounts
set country = 'Australia', city = 'Brisbane'
where country is null or city is null or city = 'Brisbane';

-- Sydney (Australia)
insert into public.daily_discounts (
  restaurant_name, latitude, longitude, platform, discount_text, booking_url, distance, country, city
)
values
  (
    'Bennelong',
    -33.8568,
    151.2153,
    'First Table',
    '50% Off Food — First Table',
    'https://www.firsttable.com.au/sydney/sydney-cbd/bennelong',
    null,
    'Australia',
    'Sydney'
  ),
  (
    'Chin Chin Sydney',
    -33.8654,
    151.2099,
    'EatClub',
    'Up to 40% Off — Dine In',
    'https://eatclub.com.au/venue/chin-chin-sydney',
    null,
    'Australia',
    'Sydney'
  )
on conflict do nothing;

-- Auckland (New Zealand)
insert into public.daily_discounts (
  restaurant_name, latitude, longitude, platform, discount_text, booking_url, distance, country, city
)
values
  (
    'Depot Eatery',
    -36.8485,
    174.7633,
    'First Table',
    '50% Off Food — First Table',
    'https://www.firsttable.co.nz/auckland/auckland-cbd/depot',
    null,
    'New Zealand',
    'Auckland'
  ),
  (
    'Azabu',
    -36.8442,
    174.7687,
    'EatClub',
    'Up to 35% Off — Dine In',
    'https://eatclub.com.au/venue/azabu-auckland',
    null,
    'New Zealand',
    'Auckland'
  )
on conflict do nothing;

-- Melbourne sample
insert into public.daily_discounts (
  restaurant_name, latitude, longitude, platform, discount_text, booking_url, distance, country, city
)
values
  (
    'Chin Chin Melbourne',
    -37.8136,
    144.9631,
    'EatClub',
    'Up to 40% Off — Dine In',
    'https://eatclub.com.au/venue/chin-chin-melbourne',
    null,
    'Australia',
    'Melbourne'
  )
on conflict do nothing;
