# SaaS Analytics Demo

Dự án cá nhân: dashboard phân tích cho một SaaS **giả lập**. Dữ liệu là dữ liệu tổng hợp
hoàn toàn (tên công ty, tên người, email đều sinh ngẫu nhiên). Giao diện có hai ngôn ngữ,
tiếng Nhật và tiếng Việt, đổi bằng nút ở side panel. Tiền tệ là yên Nhật.

| Phần | Công nghệ | Trạng thái |
|---|---|---|
| Dữ liệu | Supabase (Postgres), `raw` → `mart` | ✅ schema + bộ sinh dữ liệu |
| Web app | Vite + React 18 + TypeScript, GitHub Pages | ✅ khung: điều hướng · ja/vi · lớp dữ liệu · trang trống |
| API | Vercel (`server/`, project riêng) | ✅ `POST /api/board-data` + `GET /api/health`. Hợp đồng ở [`docs/API.md`](docs/API.md), triển khai ở [`server/README.md`](server/README.md) |
| Thiết kế, biểu đồ | theo [`docs/ui-kit/`](docs/ui-kit/README.md), Recharts 2 (nạp động) | ✅ |
| Hỏi AI | **bản demo**: cửa sổ chat (nút góc trên phải, mọi màn), câu hỏi mẫu + so khớp gần đúng, KHÔNG gọi AI thật | ✅ xem mục dưới |

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
| `data/` | `api.ts`: đường đọc duy nhất · `labels.ts`: nhãn ja/vi từ DB · `metrics.ts`: công thức tỉ lệ · `rollup.ts`: gộp gói · `churn.ts` · `period.ts`: bộ lọc tháng · `glossary.ts`: giải thích chỉ số |
| `ask/` | Hỏi AI bản demo: `match.ts` (so khớp) · `q/*.ts` (37 câu hỏi mẫu) · `questions.ts` · `chat.ts` |
| `ui/` | `i18n.ts`: chữ giao diện ja/vi · `format.ts`: số / yên / tháng · `parts.tsx` · `viz/` (biểu đồ) · `filters/` · `ask/` (nút + cửa sổ chat Hỏi AI) |
| `screens/` | Sidebar · Home · Board (4 bảng × 4 gói) · Cảnh báo huỷ sớm · Giới thiệu |

**Hai luật:**
- Không có số mẫu nào trong bundle: chưa có API thì mọi trang nói thẳng là chưa có dữ liệu.
- Chữ **giao diện** nằm ở `ui/i18n.ts`; chữ **dữ liệu** (tên cột, tên gói, ngành…) lấy từ
  `mart.labels` / `mart.column_labels`.

Thiết kế dữ liệu, công thức chỉ số, điểm rủi ro huỷ: [`docs/SCHEMA.md`](docs/SCHEMA.md).

## Hỏi AI — bản demo

Nút **Hỏi AI** ở góc trên bên phải, có ở mọi màn hình, mở một cửa sổ chat. Trên desktop cửa sổ
nổi cạnh trang đang xem; ở ≤640px nó phủ toàn màn hình. Cuộc trò chuyện giữ nguyên khi chuyển
trang.

Cửa sổ này **không gọi AI nào**: không có Claude CLI, không có API key, không có endpoint mới.
Cửa sổ ghi rõ điều đó (chip "Demo" + ghi chú lúc mở).

1. Người dùng gõ câu hỏi, bằng tiếng Nhật hay tiếng Việt, có dấu hay không dấu đều được.
   - Đang gõ: hiện tối đa 3 câu hỏi mẫu gần nhất (↑↓ chọn, Enter hỏi, Tab điền vào ô).
   - Ô còn trống: hiện 3 câu gợi ý. Danh sách câu mẫu đầy đủ KHÔNG bày ra.
2. `src/ask/match.ts` so câu đó **gần đúng** với 37 câu hỏi mẫu:
   - tiếng Việt so theo từ;
   - tiếng Nhật so theo cặp ký tự;
   - từ nào câu hỏi nào cũng có thì nhẹ ký.

   Nó cũng nhận ra tham số gói ("gói Tăng trưởng", "グロース") và top N ("top 5", "上位20社").
3. Đủ gần thì trả lời câu mẫu gần nhất, kèm 3 câu liên quan. Không đủ gần thì chỉ gợi ý 4 câu.
4. Số lấy từ các nguồn **sẵn có** của `POST /api/board-data`, nên khớp với dashboard. Câu trả
   lời là hàm thuần của dữ liệu và ngôn ngữ (`src/ask/q/*.ts`); tỉ lệ tính bằng
   `src/data/metrics.ts`. Mỗi câu trả lời có mục "dữ liệu dùng và cách tính".

**Thêm một câu hỏi:**
- Thêm một mục vào `src/ask/q/<nhóm>.ts`, gồm: ≥ 2 cách hỏi mỗi ngôn ngữ, `needs`, `build`,
  `related`.
- `npm test` sẽ kiểm:
  - mọi cách hỏi tự khớp về đúng câu đó;
  - câu trả lời dựng được ở cả ja và vi;
  - không có `undefined`/`NaN`;
  - có dữ liệu rỗng thì trả `null`.
- Một câu hỏi diễn đạt khác mà bị trượt thì thêm cách hỏi hoặc từ khoá cho câu mẫu. Đừng hạ ngưỡng
  `ANSWER_MIN`.
