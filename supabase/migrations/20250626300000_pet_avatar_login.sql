-- Avatar, drop frequency, and login-day based leveling
alter table public.pet_status
  add column if not exists avatar text not null default 'ghost';

alter table public.pet_status
  add column if not exists drop_frequency int not null default 30
  check (drop_frequency >= 10 and drop_frequency <= 120);

alter table public.pet_status
  add column if not exists login_days int not null default 1 check (login_days >= 1);

alter table public.pet_status
  add column if not exists last_login_date date;

alter table public.pet_status
  drop constraint if exists pet_status_avatar_check;

alter table public.pet_status
  add constraint pet_status_avatar_check
  check (avatar in ('ghost', 'puppy'));
