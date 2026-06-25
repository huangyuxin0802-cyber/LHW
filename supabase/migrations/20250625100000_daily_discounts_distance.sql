alter table public.daily_discounts
  add column if not exists distance float8;

update public.daily_discounts
set
  discount_text = '$10 Book for 50% Off Food',
  distance = 0.6
where restaurant_name = 'Blackbird Dining & Bar';

update public.daily_discounts
set
  discount_text = '30% Off Total Bill — Dine In',
  distance = 0.3
where restaurant_name = 'Joyful Chinese Seafood Restaurant';

update public.daily_discounts
set
  discount_text = '$15 Book for 40% Off Dining',
  distance = 1.2
where restaurant_name = 'Vista Lounge at Emporium Hotel';
