# SaaS Analytics Demo

Dự án cá nhân: dashboard phân tích cho một SaaS **giả lập**. Dữ liệu là dữ liệu tổng hợp
hoàn toàn (tên công ty, tên người, email đều sinh ngẫu nhiên). Giao diện có hai ngôn ngữ,
tiếng Nhật và tiếng Việt, đổi bằng nút ở side panel. Tiền tệ là yên Nhật.

| Phần | Công nghệ | Trạng thái |
|---|---|---|
| Dữ liệu | Supabase (Postgres), `raw` → `mart` | ✅ schema + bộ sinh dữ liệu |
| Web app | Vite + React 18 + TypeScript, GitHub Pages | ✅ khung: điều hướng · ja/vi · lớp dữ liệu · trang trống |
| API | Vercel (`server/`, project riêng) | ✅ `POST /api/board-data` + `GET /api/health`. Hợp đồng ở [`docs/API.md`](docs/API.md), triển khai ở [`server/README.md`](server/README.md) |
| AI hỏi đáp dữ liệu | Claude CLI qua cầu nối chạy ở máy | ⏳ |
| Thiết kế, biểu đồ | | ⏳ lớp giao diện hiện là bản tạm (`src/ui/parts.tsx` + `src/index.css`) |

```bash
npm install
npm run dev              # http://localhost:5173/Demo-project/
npm run typecheck && npm test && npm run build
npm run db:test          # migration + bộ sinh trên Postgres WASM (PGlite)
npm run api:test         # toàn bộ API trên PGlite, bằng role chỉ đọc
npm run api:dev          # API cục bộ với DB demo trong bộ nhớ → VITE_API_URL=http://localhost:3001 npm run dev
npm run data:generate    # → data/out/*.csv
npm run data:load        # cần DATABASE_URL trong .env — xem docs/SCHEMA.md §8
```

Biến lúc build: `VITE_API_URL` (gốc API trên Vercel; để trống thì app chạy không có dữ liệu),
`VITE_BASE_PATH` (mặc định `/Demo-project/`).

## Cấu trúc `src/`

| Thư mục | Việc |
|---|---|
| `nav/` | `catalog.ts`: MỘT nguồn cho cây trang · `route.ts`: router hash |
| `data/` | `api.ts`: đường đọc duy nhất · `labels.ts`: nhãn ja/vi từ DB · `metrics.ts`: công thức tỉ lệ · `rollup.ts`: gộp gói · `churn.ts` |
| `ui/` | `i18n.ts`: chữ giao diện ja/vi · `format.ts`: số / yên / tháng · `parts.tsx`: mảnh giao diện tạm |
| `screens/` | Sidebar · Home · Board (4 bảng × 4 gói) · Dự án cảnh báo huỷ sớm |

**Hai luật:**
- Không có số mẫu nào trong bundle: chưa có API thì mọi trang nói thẳng là chưa có dữ liệu.
- Chữ **giao diện** nằm ở `ui/i18n.ts`; chữ **dữ liệu** (tên cột, tên gói, ngành…) lấy từ
  `mart.labels` / `mart.column_labels`.

Thiết kế dữ liệu, công thức chỉ số, điểm rủi ro huỷ: [`docs/SCHEMA.md`](docs/SCHEMA.md).
