-- service_role (серверные интеграции) тоже нуждается в правах
grant usage on schema public to service_role;
grant select, insert, update, delete on public.matches to service_role;
grant select, update on public.profiles to service_role;
