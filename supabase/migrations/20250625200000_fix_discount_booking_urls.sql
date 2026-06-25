update public.daily_discounts
set
  restaurant_name = 'The Lex',
  latitude = -27.4689,
  longitude = 153.0234,
  platform = 'First Table',
  discount_text = '50% Off Food — First Table',
  booking_url = 'https://www.firsttable.com.au/brisbane/brisbane-cbd/the-lex',
  distance = null
where restaurant_name in ('Blackbird Dining & Bar', 'The Lex');

update public.daily_discounts
set
  restaurant_name = 'Ciao',
  latitude = -27.4648,
  longitude = 153.0356,
  platform = 'EatClub',
  discount_text = 'Up to 35% Off — Dine In',
  booking_url = 'https://eatclub.com.au/venue/ciao-papi',
  distance = null
where restaurant_name in ('Joyful Chinese Seafood Restaurant', 'Ciao');

update public.daily_discounts
set
  restaurant_name = 'Lennons Restaurant & Bar',
  latitude = -27.4702,
  longitude = 153.0258,
  platform = 'First Table',
  discount_text = '50% Off Food — First Table',
  booking_url = 'https://www.firsttable.com.au/brisbane/brisbane-cbd/lennons-restaurant-and-bar',
  distance = null
where restaurant_name in ('Vista Lounge at Emporium Hotel', 'Lennons Restaurant & Bar');
