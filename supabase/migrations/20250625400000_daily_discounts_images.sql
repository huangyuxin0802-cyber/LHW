alter table public.daily_discounts
  add column if not exists image_url text;

update public.daily_discounts
set image_url = 'https://images.firsttable.net/1292x800/public/restaurant/36e6e7bf08/Facetune_08-05-2026-14-05-14.jpeg'
where restaurant_name = 'The Lex';

update public.daily_discounts
set image_url = 'https://eccdn.com.au/images/C400B823-82FB-47A5-BAEF-16D79F9586FE/C400B823-82FB-47A5-BAEF-16D79F9586FE_image_3_1775021008863.jpg'
where restaurant_name = 'Ciao';

update public.daily_discounts
set image_url = 'https://images.firsttable.net/1292x800/public/restaurant/3bdc2910e8/Photo-size-for-QR-codes-2025-07-21T130515.902.jpg'
where restaurant_name = 'Lennons Restaurant & Bar';
