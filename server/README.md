# API (Vercel) — triển khai

Một project Vercel **riêng**, Root Directory = `server/` (để Vercel không build app Vite ở gốc
repo). Hai endpoint:

| Endpoint | Việc |
|---|---|
| `POST /api/board-data` | đường đọc dữ liệu duy nhất của web app — hợp đồng ở [`../docs/API.md`](../docs/API.md) |
| `GET /api/health` | kiểm sau deploy: `{ ok, asOf }` |

## 1. Supabase — một lần

1. Chạy 4 migration trong `supabase/migrations/` theo thứ tự (SQL editor, hoặc `supabase db push`).
2. Đặt mật khẩu cho role chỉ đọc (SQL editor; **không** dán mật khẩu vào repo hay vào chat):
   ```sql
   alter role analytics_reader with login password '<mật khẩu mạnh>';
   ```
3. Nạp dữ liệu từ máy: `npm run data:generate && npm run data:load` (cần `DATABASE_URL` của
   user `postgres` trong `.env`, xem `docs/SCHEMA.md` §8).

## 2. Vercel — tạo project

1. *Add New → Project* → chọn repo `Demo-project` → **Root Directory = `server`**.
   Framework Preset: *Other*. Không có build command.
2. *Settings → Environment Variables* (Production):

| Biến | Giá trị | Ghi chú |
|---|---|---|
| `DATABASE_URL` | chuỗi **Transaction pooler** (cổng **6543**), user `analytics_reader.<project-ref>` | *Supabase → Connect → Transaction pooler*. Đánh dấu **Sensitive** |
| `ALLOWED_ORIGINS` | `https://taki2119.github.io` | nhiều origin ngăn bằng dấu phẩy; KHÔNG có path, KHÔNG có `/` cuối. Bỏ trống ⇒ mặc định (Pages + localhost) |
| `MAX_RESPONSE_BYTES` | (tuỳ chọn) | mặc định 4.000.000 |

3. *Region*: `vercel.json` đặt `hnd1` (Tokyo). **Chọn cùng vùng với project Supabase** (vd.
   Supabase `ap-northeast-1` ⇒ `hnd1`; `ap-southeast-1` ⇒ `sin1`), nếu không mỗi truy vấn sẽ đi
   vòng qua một vùng khác.
4. Deploy, rồi kiểm:
   ```bash
   curl https://<project>.vercel.app/api/health
   curl -X POST -H "content-type: application/json" -d '{"source":"labels"}' https://<project>.vercel.app/api/board-data
   ```

## 3. Nối web app

GitHub repo → *Settings → Secrets and variables → Actions → **Variables*** → `VITE_API_URL` =
`https://<project>.vercel.app` (không có `/` cuối). Đây không phải secret: nó nằm trong bundle.
Push lên `main` ⇒ `deploy.yml` build lại với biến này.

## Chạy cục bộ (không cần Supabase)

```bash
npm run api:dev                                   # DB demo trong bộ nhớ (PGlite) — dựng ~1–2 phút
VITE_API_URL=http://localhost:3001 npm run dev    # app đọc API cục bộ
npm run api:dev -- --supabase                     # hoặc: nối DATABASE_URL thật trong .env
npm run api:test                                  # test toàn bộ handler trên PGlite, bằng role analytics_reader
```

## Vì sao an toàn khi không có đăng nhập

Dữ liệu là dữ liệu tổng hợp, và đường này **chỉ đọc**. Có 4 lớp gác:

| Lớp | Gác gì |
|---|---|
| SQL cố định theo `source` | client không gửi SQL; tham số qua placeholder và được kiểm dạng |
| Role `analytics_reader` | chỉ `SELECT` trên `mart`, giao dịch READ ONLY, `statement_timeout = 15s` |
| Trần dung lượng phản hồi | 413 khi vượt trần |
| Giới hạn nhịp | 120 lượt / phút / IP / instance |

CORS chỉ chặn được trình duyệt từ origin lạ, không chặn được `curl`. Đừng coi nó là hàng rào.
