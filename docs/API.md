# Hợp đồng API dữ liệu — thứ web app đang chờ phía Vercel trả về

Web app chỉ gọi **một** endpoint (`src/data/api.ts`). Bước Vercel phải dựng đúng hợp đồng này;
đổi hợp đồng thì sửa cả hai phía.

```
POST {VITE_API_URL}/api/board-data
content-type: application/json

{ "source": "<mã nguồn>", ...tham số }
```

Phản hồi `200`:

```json
{ "source": "revenue-monthly", "updatedAt": "2026-11-10", "rows": [ { "month": "2026-10-01", "plan_id": "growth", "mrr_end": 1234000 } ] }
```

- `rows` là mảng object, khoá = **tên cột tiếng Anh** của view `mart`. Số `numeric` của Postgres
  được phép trả dạng chuỗi, vì client ép lại (`numericRows`).
- `updatedAt` = `mart.as_of()`.
- Còn trả thêm `rowCount`. Ngày là chuỗi `YYYY-MM-DD`; số là number.
- Lỗi:

| Mã | Khi nào |
|---|---|
| `400 bad_json` | body không đọc được |
| `400 bad_source` | mã nguồn lạ |
| `400 bad_params` | tham số sai dạng, hoặc có khoá lạ |
| `403 forbidden_origin` | origin không có trong danh sách |
| `405` | không phải `POST` |
| `413 too_large` | phản hồi vượt trần dung lượng |
| `429 rate_limited` | gọi quá nhịp |
| `502 db_error` | DB lỗi; chi tiết chỉ ghi vào log |

  Gặp lỗi, client hiện "không tải được dữ liệu", không vẽ gì.
- Code: `server/lib/sources.js` (registry) · `server/lib/handler.js`. Triển khai:
  [`server/README.md`](../server/README.md).
- CORS: chỉ cho origin của GitHub Pages (và `http://localhost:5180` khi phát triển).

| `source` | View | Tham số | Ghi chú |
|---|---|---|---|
| `revenue-monthly` | `mart.revenue_monthly` | — | mọi tháng × mọi gói; client tự gộp "tất cả gói" |
| `users-monthly` | `mart.users_monthly` | — | như trên |
| `user-monthly` | `mart.user_monthly` | `plan?`, `month?` | nhiều dòng ⇒ server lọc; không có `month` thì lấy tháng mới nhất |
| `company-monthly` | `mart.company_monthly` | `plan?`, `month?` | như trên |
| `churn-watchlist` | `mart.churn_watchlist` | — | ảnh chụp mới nhất |
| `churn-history` | `mart.churn_risk_snapshot` | — | 52 tuần, cho bảng độ chính xác |
| `interventions-monthly` | `mart.interventions_monthly` | — | |
| `labels` | `mart.labels` | — | nhãn ja/vi của giá trị mã hoá |
| `column-labels` | `mart.column_labels` | — | nhãn ja/vi + đơn vị của cột |

⚠ **SQL cố định theo `source` ở phía server**, client không gửi SQL. Tham số đi qua
placeholder, không ghép chuỗi. Server chạy bằng role `analytics_reader` (chỉ đọc, chỉ `mart`).
