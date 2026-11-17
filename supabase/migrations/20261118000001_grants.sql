-- Явные привилегии для ролей supabase (таблицы созданы management-ролью)
grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

grant select, insert, update on public.matches to authenticated;
