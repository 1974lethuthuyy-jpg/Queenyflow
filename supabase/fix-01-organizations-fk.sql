-- Sửa lỗi: bảng organizations và profiles tham chiếu vòng lặp lẫn nhau khiến
-- không thể tạo tài khoản admin mới ("violates foreign key constraint organizations_id_fkey").
-- Chạy đoạn này 1 lần trong SQL Editor (chỉ cần chạy nếu bạn đã chạy schema.sql trước đó).

alter table public.organizations drop constraint if exists organizations_id_fkey;

-- Xoá tài khoản auth "mồ côi" (đã tạo ở bước đăng ký bị lỗi, chưa có organization/profile đi kèm)
delete from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
