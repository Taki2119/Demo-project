-- ─────────────────────────────────────────────────────────────────────────────
-- QUYỀN ĐỌC — một role CHỈ ĐỌC cho Vercel (board-data + công cụ truy vấn của AI).
--
-- Hàng rào là QUYỀN CỦA POSTGRES, không phải regex trong code:
--   · `analytics_reader` chỉ có SELECT trên schema `mart`, không đụng được `raw`;
--   · mọi giao dịch mặc định READ ONLY + giới hạn thời gian chạy ⇒ câu SQL do AI viết có
--     sai cũng không ghi được gì và không treo được DB.
--
-- ⚠ Mật khẩu KHÔNG nằm trong repo. Sau khi chạy migration, đặt nó bằng tay trong SQL editor
--   của Supabase (xem docs/SCHEMA.md §6):
--     alter role analytics_reader with login password '<mật khẩu mạnh>';
--   rồi chỉ lưu chuỗi kết nối ở biến môi trường của Vercel.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'analytics_reader') then
    create role analytics_reader nologin;
  end if;
end
$$;

alter role analytics_reader set default_transaction_read_only = on;
alter role analytics_reader set statement_timeout = '15s';
alter role analytics_reader set idle_in_transaction_session_timeout = '30s';
alter role analytics_reader set search_path = mart;

revoke all on schema raw from analytics_reader;
grant usage on schema mart to analytics_reader;
grant select on all tables in schema mart to analytics_reader;   -- gồm cả view + materialized view
grant execute on function mart.as_of() to analytics_reader;
alter default privileges in schema mart grant select on tables to analytics_reader;
revoke execute on function mart.refresh() from public;

-- Các role của API Supabase (anon / authenticated) không được thấy 2 schema này. Chúng
-- vốn không được mở qua REST, đây là lớp thứ hai. Bọc trong kiểm tra tồn tại để migration
-- chạy được cả trên Postgres trơn (bộ test cục bộ).
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema raw, mart from %I', r);
      execute format('revoke all on all tables in schema raw, mart from %I', r);
    end if;
  end loop;
end
$$;

-- Bật RLS cho mọi bảng raw (không policy nào ⇒ role API không đọc được dù có lỡ cấp quyền).
-- Role sở hữu (postgres) và service_role vẫn ghi được để nạp dữ liệu.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'raw' loop
    execute format('alter table raw.%I enable row level security', t);
  end loop;
end
$$;
