-- ============================================================================
-- FIX: "permission denied for table ..." trên Supabase tự host (self-hosted)
-- Bản Supabase cloud tự cấp quyền này mặc định, bản CLI local thì không tự
-- cấp cho các bảng do migration của mình tạo ra — cần cấp thủ công 1 lần.
-- Chạy an toàn nhiều lần (không ảnh hưởng dữ liệu, không ảnh hưởng bản cloud).
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

grant select on all tables in schema public to anon;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
