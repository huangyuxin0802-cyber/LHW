-- AU/NZ country constraint + geo bounding-box query indexes
alter table public.daily_discounts
  drop constraint if exists daily_discounts_country_check;

alter table public.daily_discounts
  add constraint daily_discounts_country_check
  check (country in ('Australia', 'New Zealand'));

create index if not exists daily_discounts_country_city_lat_lng_idx
  on public.daily_discounts (country, city, latitude, longitude);

create index if not exists daily_discounts_lat_lng_idx
  on public.daily_discounts (latitude, longitude);
