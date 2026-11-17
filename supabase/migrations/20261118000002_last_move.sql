-- Последний ход (абсолютный индекс лунки) — для анимации у клиентов
alter table public.matches add column if not exists last_move integer;

-- Отмена своего незанятого матча
create policy "matches_delete_own_waiting" on public.matches
  for delete using (auth.uid () = player0 and status = 'waiting');

grant delete on public.matches to authenticated;
