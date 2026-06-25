-- Memory diary, trophy backpack, and equipped cosmetic
alter table public.pet_status
  add column if not exists memory_logs jsonb not null default '[{"date": "2026-06-25", "content": "主人说他最喜欢吃绿咖喱和牛腩"}]'::jsonb;

alter table public.pet_status
  add column if not exists backpack jsonb not null default '[]'::jsonb;

alter table public.pet_status
  add column if not exists equipped_item text;
