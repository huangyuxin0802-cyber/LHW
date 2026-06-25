-- Memory, growth, and mood for ghost pet
alter table public.pet_status
  add column if not exists xp int not null default 0 check (xp >= 0);

alter table public.pet_status
  add column if not exists level int not null default 1 check (level >= 1);

alter table public.pet_status
  add column if not exists last_food_eaten text;

alter table public.pet_status
  add column if not exists mood_state text not null default 'happy';

alter table public.pet_status
  drop constraint if exists pet_status_mood_state_check;

alter table public.pet_status
  add constraint pet_status_mood_state_check
  check (mood_state in ('happy', 'starving', 'angry', 'tired', 'neutral'));
