-- Короткий код комнаты для входа по коду + метаданные результата (Эло)
alter table public.matches add column if not exists code text;
alter table public.matches add column if not exists meta jsonb;

create unique index if not exists matches_code_uidx
  on public.matches (code)
  where code is not null;
