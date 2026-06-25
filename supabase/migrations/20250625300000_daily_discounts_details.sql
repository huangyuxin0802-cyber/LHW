alter table public.daily_discounts
  add column if not exists cuisine text,
  add column if not exists description text,
  add column if not exists mock_drive_time text,
  add column if not exists mock_transit_info text;

delete from public.daily_discounts;

insert into public.daily_discounts (
  restaurant_name,
  latitude,
  longitude,
  platform,
  discount_text,
  booking_url,
  distance,
  cuisine,
  description,
  mock_drive_time,
  mock_transit_info
)
values
  (
    'The Lex',
    -27.4689,
    153.0234,
    'First Table',
    '50% Off Food — First Table',
    'https://www.firsttable.com.au/brisbane/brisbane-cbd/the-lex',
    null,
    'Australian, Grill',
    'Classic New York grillhouse in Brisbane CBD with tableside steaks and waterfront views.',
    '8 min',
    'Bus 66 (12 min)'
  ),
  (
    'Ciao',
    -27.4648,
    153.0356,
    'EatClub',
    'Up to 35% Off — Dine In',
    'https://eatclub.com.au/venue/ciao-papi',
    null,
    'Italian',
    'Elevated Italian dining at Howard Smith Wharves with spectacular Brisbane River views.',
    '10 min',
    'CityCat (14 min)'
  ),
  (
    'Lennons Restaurant & Bar',
    -27.4702,
    153.0258,
    'First Table',
    '50% Off Food — First Table',
    'https://www.firsttable.com.au/brisbane/brisbane-cbd/lennons-restaurant-and-bar',
    null,
    'Australian, Bistro',
    'Timeless Queen Street Mall bistro serving Queensland produce in the heart of the CBD.',
    '6 min',
    'Bus 199 (10 min)'
  );
