# CLAUDE.md — bàn giao + ngữ cảnh lâu dài của SaaS Analytics Demo

> File này Claude Code tự nạp đầu mỗi phiên. Nó chở QUYẾT ĐỊNH + TRẠNG THÁI + BẪY đã gặp, để
> một phiên mới (kể cả phiên online đọc repo từ GitHub) làm tiếp mà không phải dò lại.
> Chi tiết kỹ thuật nằm ở: [`docs/SCHEMA.md`](docs/SCHEMA.md) (dữ liệu, công thức, điểm rủi ro) ·
> [`docs/API.md`](docs/API.md) (hợp đồng API) · [`server/README.md`](server/README.md) (deploy) ·
> [`README.md`](README.md) (lệnh chạy) · [`docs/ui-kit/`](docs/ui-kit/README.md) (hệ thiết kế +
> luật vẽ biểu đồ/bảng). Đừng chép lại nội dung các file đó vào đây.
> Người dùng giao tiếp bằng **tiếng Việt**. Cập nhật mục §5 TRẠNG THÁI mỗi khi xong một bước.

## 1. Dự án là gì

Dự án **cá nhân**: một web app dashboard cho một SaaS **giả lập** (bản giản lược của một nền
tảng dashboard nội bộ mà người dùng từng làm ở công ty). Có:
- trang Home (thẻ preview);
- 4 gói (Tất cả · Starter · Growth · Scale) × 4 bảng (Doanh thu · Số lượng người dùng ·
  Theo người dùng · Theo công ty);
- MỘT trang dự án tăng doanh thu: **cảnh báo huỷ sớm** (khách giảm dùng, bỏ ghế, bỏ tính năng
  chính, hẹn huỷ);
- **Hỏi AI (bản demo)**: cửa sổ chat mở từ nút góc trên bên phải ở mọi màn, trả lời từ bộ câu hỏi
  mẫu bằng số của API. KHÔNG gọi AI thật.

Kiến trúc: **Supabase (Postgres)** `raw → mart` · **Vercel** (`server/`, project riêng) ·
**GitHub Pages** (web app Vite + React). Repo: `Taki2119/Demo-project`, nhánh `main`.

## 2. Ràng buộc KHÔNG được phá

1. **Không dữ liệu thật, không dữ liệu của tổ chức nào.** Mọi tên công ty / người / email do bộ
   sinh tạo (`scripts/data/names.mjs` ghép mảnh, email chỉ ở `*.example.com`). Không có số mẫu
   nào trong bundle web: chưa có API thì mọi trang nói "chưa cấu hình".
2. **Code / thiết kế:. Nguồn duy nhất là bộ kit ở [`docs/ui-kit/`](docs/ui-kit/README.md); bắt đầu đọc
   từ `README.md` (bản đồ file) và `00-HUONG-DAN-VSCODE.md`. Lớp giao diện hiện tại
   (`src/ui/parts.tsx` + `src/index.css`) là bản TẠM do Claude tự viết. Bước "thiết kế" thay
   2 file đó (giữ props + tên class) và thêm module mới dưới `src/ui/`. Ngoại lệ (người dùng cho
   phép 2026-11-11): được sửa `src/screens/Sidebar.tsx` CHỈ để (a) làm ngăn kéo ≤640px và (b) thêm ĐÚNG
   1 link "Giới thiệu" (`#/about`) ở cuối danh sách (cho phép 2026-11-11, giai đoạn 5); giữ props. KHÔNG dựng lại trang,
   KHÔNG chạy P2 (dựng khung) của kit vì khung đã có. Vẫn giữ:
   - **không ghi tên công ty cũ vào repo này** — kể cả đường dẫn máy tới repo nguồn (đường dẫn
     đó chứa tên). Đường dẫn chỉ nằm ở `.claude/settings.local.json` hoặc `/add-dir`, không commit;
   - **không mang icon / logo / wordmark** của công ty thật (kit không kèm cái nào);
   - chép từ repo nguồn thì đổi tiền tố class `jw-` → `ui-`, và grep tên công ty trước khi commit (§7).
3. **Tiền tệ: yên Nhật**, `numeric(14,0)`, số nguyên.
4. **Song ngữ ja / vi**, nút đổi ở side panel. Hai nguồn chữ, đừng trộn:
   - chữ GIAO DIỆN → `src/ui/i18n.ts` (test khoá 2 bộ key bằng nhau);
   - chữ DỮ LIỆU (tên cột, tên gói, ngành, band rủi ro…) → `mart.labels` + `mart.column_labels`
     trong DB, đọc qua `src/data/labels.ts`. App và AI dùng CHUNG nguồn này.

   DB giữ tên cột + mã bằng tiếng Anh.
5. **Mart chỉ chở số CỘNG ĐƯỢC.** Tỉ lệ (ARPA, NRR, churn, DAU/MAU…) tính ở client
   (`src/data/metrics.ts`). Mẫu số 0 ⇒ `null` (hiện "—"), không bao giờ `0`.
6. **Bảo mật đường đọc:** trình duyệt không bao giờ nói thẳng với Supabase. Vercel đọc bằng role
   **`analytics_reader`** (chỉ SELECT trên `mart`, READ ONLY, `statement_timeout 15s`). SQL cố
   định theo `source` ở `server/lib/sources.js`; client không gửi SQL. API không đòi đăng nhập
   (dữ liệu tổng hợp + chỉ đọc). Đã nói với người dùng; muốn thêm đăng nhập Google thì làm sau.
7. **Không commit bí mật.** `.env` đã ignore. Mật khẩu DB / chuỗi kết nối chỉ ở `.env` (máy) và
   env của Vercel. Đừng xin người dùng dán mật khẩu vào chat.
8. **Mọi ngày ≤ `as_of`** (`raw.dataset_meta.as_of_date`, mặc định 2026-11-10). Dữ liệu tĩnh
   nhưng nhất quán vì mart tính tới mốc này, không tới `current_date`.

## 3. Bản đồ repo

| Đường dẫn | Việc |
|---|---|
| `supabase/migrations/*_raw.sql` | 13 bảng raw (SCD2 `subscription_periods` là nguồn sự thật MRR) |
| `supabase/migrations/*_mart.sql` | view + 3 materialized view, `mart.refresh()`, `mart.dq_checks`, điểm rủi ro v2 |
| `supabase/migrations/*_access.sql` | role `analytics_reader`, RLS, thu quyền anon/authenticated |
| `supabase/migrations/*_labels.sql` | từ điển ja/vi |
| `supabase/tests/` | `schema.test.mjs` (kịch bản tính tay) · `generate.test.mjs` (bộ sinh → DB) |
| `scripts/data/` | bộ sinh có seed (`generate.mjs` thuần) · `generate-cli.mjs` → `data/out/*.csv` · `load.mjs` (COPY vào Supabase) |
| `scripts/dev/` | `demo-db.mjs` (PGlite + migration + dữ liệu) · `api-dev.mjs` (API cục bộ) |
| `scripts/ci/` | cổng soi `dist/`: `bundle-checks.mjs` (luật, hàm thuần) · `check-bundle.mjs` (đọc `dist/` + env) · test |
| `server/` | project Vercel: `api/board-data.js` · `api/health.js` · `lib/{sources,handler,db}.js` · `test/` |
| `src/nav/` | `catalog.ts` (MỘT nguồn cho cây trang) · `route.ts` (hash router) |
| `src/ask/` | Hỏi AI bản demo (thuần): `match.ts` · `kit.ts` · `q/*.ts` (37 câu) · `questions.ts` (`resolve`, `autocomplete`) · `chat.ts` (store hội thoại) |
| `src/data/` | `api.ts` (đường đọc duy nhất + cache, `loadSource`) · `labels.ts` · `metrics.ts` · `rollup.ts` · `churn.ts` · `glossary.ts` (giải thích chỉ số; tên TRỎ tới nhãn DB) · `freshness.ts` |
| `src/screens/` | Sidebar · Home · Board (chung cho 4×4) · Churn · About (`#/about`) |
| `src/ui/ask/` | `ChatDock` (nút, chunk đầu) · `ChatPanel` (cửa sổ, nạp động) · `AnswerView` · `AskLine` |
| `.github/workflows/deploy.yml` | MỘT job `checks` cho cả PR lẫn `main`: typecheck → test → db:test → api:test → check:test → build → check:bundle → deploy Pages (chỉ `main`) |

## 4. Lệnh + con số đã đo (2026-11-11)

```bash
npm install
npm run typecheck && npm test && npm run build   # web: 17 file / 543 test (2026-11-12)
npm run check:test  # 10 test (luật cổng, bundle giả)
npm run check:bundle  # sau build: recharts · css · privacy · env (PRIVACY_DENY thiếu: máy ⇒ cảnh báo, CI=true ⇒ FAIL)
npm run db:test     # 16 test, ~90s (PGlite)
npm run api:test    # 7 test, ~10s, chạy bằng role analytics_reader
npm run data:generate                            # 261 công ty · 5.103 user · ~835k dòng hoạt động · ~26 MB CSV
npm run api:dev     # API cục bộ + DB demo trong bộ nhớ (~2 phút để dựng) → cổng 3001
VITE_API_URL=http://localhost:5173 npm run dev   # vite proxy /api → 3001 (cùng origin)
```

- Lượt chạy end-to-end ở máy: Home hiện MRR **¥10.980.820**, khớp tóm tắt của bộ sinh.
- Độ chính xác điểm rủi ro (huỷ trong 90 ngày), dữ liệu 24 tháng:

| Band | Tỉ lệ huỷ |
|---|---|
| hẹn huỷ | 93,8% |
| 高 | 45,7% |
| 中 | 13,8% |
| 低 | 3,2% |

## 5. TRẠNG THÁI

**Xong (đã push `main`):**
- schema + bộ sinh dữ liệu;
- khung web;
- API Vercel (code + test);
- workflow Pages.

**Đang chờ người dùng làm (ngoài repo):** theo [`server/README.md`](server/README.md).
1. ~~Supabase~~ **XONG 2026-11-11:** project `Demo` (ref `tozsokrpjfrpdokvoydo`, Tokyo).
   Đã chạy 4 migration, đặt mật khẩu `analytics_reader`, `data:load` (dq_checks 5/5 = 0,
   116,8s). `.env` ở máy đã có `DATABASE_URL` (Session pooler).
2. ~~Vercel~~ **XONG 2026-11-11:** `https://demo-project-server.vercel.app`, `/api/health`
   trả `{"ok":true,"asOf":"2026-11-10"}`. Cấu hình đã dùng (để tra lại):
   Root Directory = `server`. Env:
   - `DATABASE_URL` = Transaction pooler 6543 với user **`analytics_reader.<ref>`**, không
     phải `postgres`;
   - `ALLOWED_ORIGINS=https://taki2119.github.io`.

   Kiểm bằng `/api/health`.
3. GitHub: Settings → Pages → Source = **GitHub Actions**; Variables → `VITE_API_URL` = domain
   production của Vercel (`https://<tên>.vercel.app`, không `/` cuối).

**Việc tiếp theo (theo thứ tự đã bàn):**
1. ~~Hỗ trợ deploy~~ XONG (Pages + Vercel + Supabase chạy; `/` của Vercel trả 404 là đúng — chỉ có `api/`).
2. **Hỏi AI — BẢN DEMO, KHÔNG gọi AI thật. XONG D1–D3, người dùng đã duyệt từng giai đoạn (2026-11-12).
   Nhánh `ai-qa-demo`, ĐÃ MERGE vào `main` ở máy (2026-11-12, `--no-ff`).**
   Thay hẳn kế hoạch Claude CLI. Đã bỏ: cầu nối ở máy, `api/query` công khai, Cloudflare Tunnel,
   `setup-token`. Lý do: không tốn hạn mức, không mở endpoint nhận SQL, máy nào cũng dùng được. Dừng
   cho người dùng xem sau mỗi giai đoạn.
   - Cửa sổ chat, với một bộ câu hỏi mẫu (37 câu, đủ ja + vi).
   - Gõ tự do thì so GẦN ĐÚNG, không cần khớp 100%:
     - đủ gần ⇒ trả lời câu mẫu gần nhất, kèm gợi ý vài câu liên quan;
     - không đủ gần ⇒ chỉ gợi ý câu hỏi.
   - Ghi rõ trong cửa sổ "bản demo, chưa nối AI thật" (chip "Demo" + ghi chú lúc mở).
   - **Số lấy từ các nguồn SẴN CÓ của `board-data`:**
     - KHÔNG thêm SQL, KHÔNG sửa `server/`, KHÔNG deploy lại Vercel;
     - câu trả lời = mẫu câu ja/vi điền số; tỉ lệ tính ở client (`metrics.ts`);
     - KHÔNG có số nào trong bundle (§2.1);
     - mỗi câu trả lời ghi "dữ liệu dùng: nguồn + cách tính". KHÔNG giả vờ hiện SQL đã chạy.
   - **Đổi 2026-11-12 (người dùng):** KHÔNG làm trang riêng. Thay bằng cửa sổ chat mở từ nút góc trên
     bên phải ở MỌI màn; ẩn danh sách câu mẫu, chỉ gợi ý 2–3 câu + tự gợi ý khi gõ. Không còn route
     `#/ask`, không sửa `Sidebar.tsx`.
   - So khớp:
     - chuẩn hoá NFKC + chữ thường;
     - tiếng Việt bỏ dấu, nên gõ không dấu vẫn khớp;
     - tiếng Nhật so bigram ký tự, tách theo loại chữ (kanji/katakana riêng, hiragana riêng) để
       bigram không vắt qua trợ từ;
     - KHÔNG đưa từ phủ định ("không", "chưa") vào danh sách từ bỏ qua;
     - trích tham số đơn giản: gói (mã + nhãn DB), top N.
   - Giai đoạn:
     - **D1 XONG, đã duyệt** — lõi `src/ask/`:
       - `match.ts`: chuẩn hoá, đặc trưng, IDF, `ANSWER_MIN`;
       - `kit.ts`: kiểu + hàm phụ trợ;
       - `q/{revenue,users,companies,churn}.ts`: 37 câu (13 · 7 · 8 · 9);
       - `questions.ts`: `resolve` / `resolveId` / `STARTERS`;
       - test: `match.test.ts` (mọi cách hỏi tự khớp + 77 câu diễn đạt khác + câu lạc đề) ·
         `questions.test.ts` (dữ liệu giả tính tay);
       - đã chạy thử cả 37 câu × ja/vi × (mọi gói / growth) trên DB demo qua handler API thật (test
         tạm, không giữ trong repo vì ~50s).
       - Muốn thêm câu thì thêm vào `q/*.ts`. Câu diễn đạt khác bị trượt ⇒ thêm cách hỏi / từ khoá,
         ĐỪNG hạ `ANSWER_MIN`.
     - **D2 XONG (làm lại 2026-11-12 thành cửa sổ chat), đã duyệt** — cửa sổ chat:
       - `src/ui/ask/ChatDock.tsx`: nút `.ask-fab` fixed góc trên phải, gắn trong `App.tsx` NGOÀI
         `.main` (main dựng lại theo route) ⇒ cửa sổ + hội thoại giữ khi chuyển trang. Nút nằm trong
         chunk đầu (209 → 214 kB); `ChatPanel.tsx` (bộ câu hỏi, ~80 kB) nạp ĐỘNG lần mở đầu, sau đó
         chỉ ẩn bằng `hidden` (giữ chữ đang gõ + vị trí cuộn);
       - `ChatPanel.tsx`: portal ra body; desktop cửa sổ nổi KHÔNG chặn trang; ≤640px phủ toàn màn,
         `.main`/`.side`/`.side-bar` inert. Ô chat là combobox: `autocomplete()` (≤ 3 câu; câu mẫu
         CHỨA chữ đang gõ lên trước) · ↑↓ chọn · Enter hỏi · Tab điền · Esc lần 1 đóng gợi ý, lần 2 thu
         cửa sổ (focus về nút). Ô trống ⇒ 3 câu `WELCOME`;
       - `AnswerView.tsx` (ô số · HBars · bảng · "dữ liệu dùng") + `AskLine.tsx` (SoloLine, nạp động);
       - `src/ask/chat.ts`: hội thoại lưu MÃ câu + dữ liệu thô ⇒ đổi ja/vi dựng lại cả hội thoại;
       - `loadSource()` trong `src/data/api.ts`: nạp ngoài React, dùng chung cache với `useSource`;
       - `src/styles/ask.css`: kit KHÔNG có mẫu chat ⇒ ghép từ mảnh có sẵn. Cửa sổ là kính (bảng kính
         menu/popover/dialog); mọi khối bên trong là thân đục, ô số/bảng tắt kính bằng
         `--glass-blur: 0px` (không lồng kính, không khai thêm `backdrop-filter`). `hover.css` hạ
         z-index `.btn` khi hover ⇒ `.btn.ask-fab` giữ z 30;
       - `PAGE_ASK` trong catalog chỉ còn là tên nút + dòng ở trang Giới thiệu;
       - kiểm trình duyệt `Demo-project-shots/tools/ask.mjs` 86/86 (ảnh ở `Demo-project-shots/out/ask/`).
         404 `/favicon.ico` ở gốc server preview là của trình duyệt, tool bỏ qua riêng URL đó.
     - **D3 XONG 2026-11-12** — README (mục Hỏi AI + cách thêm câu hỏi) · `docs/API.md` (không endpoint
       mới) · §1/§2.2/§3/§4/§5. Kiểm cuối: typecheck sạch · 17 file / 543 test · build · check:test 10/10 ·
       check:bundle 4/4. Không đụng SQL / `server/` ⇒ không chạy db:test / api:test.
   - Ghi lại để khỏi dò lại, nếu sau này muốn nối AI thật: Claude CLI v2.1.322 có cờ
     `-p --tools "" --system-prompt --output-format json --model --no-session-persistence --json-schema`.
     `--bare` chỉ nhận API key. Máy hiện tại chưa cài `claude` trong PATH.
3. **Biểu đồ** cho từng bảng: chỗ cắm là `<section className="viz">` trong BoardScreen / ChurnScreen.
   Thư viện: **Recharts 2.x, nạp động** theo `docs/ui-kit/03-CHARTS-TABLES.md`. Làm chung với mục 4.
4. **Thiết kế + biểu đồ (gộp 3 vào đây):** đã được phép (§2.2), kế hoạch ĐÃ DUYỆT 2026-11-11, làm
   trên nhánh `feat/ui-kit`, dừng cho người dùng xem sau mỗi giai đoạn (kèm ảnh 1440/430 × sáng/tối).
   Quyết định đã chốt:
   - **Cách 2**: KHÔNG đọc repo nguồn, dựng lại từ đặc tả `docs/ui-kit/`. Hằng số lấy đúng số kit
     ghi; chỗ kit không ghi thì nói ra, không tự đặt rồi coi là luật;
   - chỉ bộ màu **Ember**, sáng/tối theo hệ thống (`data-theme` qua prePaint), chưa có nút đổi;
   - Google Fonts như kit; kiểm chữ Việt có dấu không rơi sang font dự phòng;
   - **không cài Tailwind**; cài Recharts 2.x;
   - giữ props + tên class của `parts.tsx` / `index.css`; CSS chia vào `src/styles/*`;
   - MRR 1 chuỗi = biểu đồ đường 1 chuỗi tự viết, đúng MỘT pill ở mốc tốt nhất (không dùng MultiLines);
   - cổng mới thêm vào `deploy.yml` (không thay file): `npm run check:bundle`. `bundle-privacy`
     đọc danh sách cấm từ `PRIVACY_DENY`: thiếu khi `CI=true` ⇒ FAIL, ở máy ⇒ cảnh báo.

   Giai đoạn: (1) cài Recharts → (2) CSS + parts.tsx + prePaint → (3) viz + chart từng trang →
   (4) cổng CI. **Đã merge cả 4 giai đoạn vào `main` (PR #1, `6f9b864`, 2026-11-11).**
   Việc của người dùng sau (4): GitHub → Settings → Secrets → Actions → **`PRIVACY_DENY`** (tên cấm,
   phẩy / xuống dòng). Thiếu secret này thì job `checks` ĐỎ ở `check:bundle`.
   Tháng chưa trọn (trang Theo người dùng): ngày X = `updatedAt` mà API trả kèm mỗi nguồn
   (= `mart.as_of()`), KHÔNG lấy đồng hồ máy người xem. Nguồn đã có ngày này nên không cần dự phòng
   "hôm nay"; `updatedAt` thiếu ⇒ không ghi gì (`monthProgress` trả null).
   Ảnh + công cụ chụp ở NGOÀI repo: `Desktop/Claude Workspace/Demo-project-shots/`
   (thư mục này KHÔNG theo repo: người dùng làm trên NHIỀU MÁY, pull repo về máy mới thì không có
  thư mục ảnh; tool cũ `shoot.mjs`, `fontcheck.mjs`… nằm ở máy trước; máy hiện tại có `tools/period.mjs`).
   Cổng Recharts (`bundle-recharts`) đi index.html → chunk đầu → bao đóng IMPORT TĨNH + mọi
   modulepreload, nhận chunk Recharts theo NỘI DUNG (`RECHARTS_MARKERS`); đã thử lại ca manualChunks ⇒ đỏ.
5. **Giai đoạn 5 — ĐÃ MERGE (PR #1, cùng giai đoạn 1–4):** glossary + ⓘ
   (`src/ui/InfoTip.tsx`, popover portal ra body, kính dùng chung rule duy nhất) · trang Giới thiệu ·
   chip "có số tới ngày …" (từ `updatedAt`; trang nhiều nguồn ⇒ ngày CŨ NHẤT, `oldestDate`) · nhãn
   "Dữ liệu mẫu" trong luồng. `glossary.test.ts` khoá: đủ ja/vi, nhãn trỏ tới có thật trong
   migration nhãn, mọi `StatTile`/`ChartCard` ở `src/screens/**` có `info=`.
   Điểm review chưa xử lý (không chặn, làm khi tiện):
   - chunk đầu 170 → 196 kB vì chữ glossary. Muốn giảm thì nạp CHỮ glossary lúc mở ⓘ (StatTile chỉ
     cần khoá), đừng tách trang Giới thiệu (chỉ bớt 4–5 kB);
   - `raw.dataset_meta.timezone = Asia/Ho_Chi_Minh` (`generate.mjs:108`) với SaaS thu yên: không làm
     sai số (dữ liệu chỉ có ngày). Đổi `Asia/Tokyo` = sinh + nạp lại Supabase;
   - tên view `mart.*` nằm trong bundle công khai (trường `source` của glossary): ổn với dữ liệu mẫu,
     bỏ khỏi bundle trước khi dùng dữ liệu thật;
   - tỉ lệ huỷ theo band ở `docs/SCHEMA.md:149-153` khác bảng §4 của file này — thống nhất lại;
   - ⓘ của thẻ biểu đồ MRR hiện cả dòng giải thích số phụ của ô số, mà biểu đồ không có số phụ đó.
6. **Giai đoạn 6 — BỘ LỌC THÁNG: người dùng ĐÃ DUYỆT, đã merge `feat/period-filter` vào `main`
   (2026-11-11, merge ở máy vì `gh` chưa đăng nhập).** Còn mở: trang Cảnh báo huỷ — bộ lọc chỉ áp cho 2
   biểu đồ lịch sử, có thể thêm ghi chú cạnh thanh lọc nếu người dùng muốn. Kế hoạch đã duyệt kèm 3 điểm: (a) THÊM ô luồng — MRR mới + Hoá đơn (Doanh thu), User
   mới (Người dùng), có glossary `new_mrr`; (b) chuyển trang ⇒ bộ lọc về mặc định (không đi theo);
   (c) KHÔNG có nút chọn nhanh 3/6/12 tháng. Đã làm:
   - `src/data/period.ts` (thuần) · query trong `src/nav/route.ts` (KHÔNG thuộc `Route`, vì App dựng lại
     trang theo `key={toHash(route)}`; đổi lọc = `replaceState`) · `src/ui/filters/*` · `src/styles/filters.css`;
   - `src/ui/usePopover.ts`: hành vi popover chung + store "một panel mở" — `InfoTip` cũng dùng;
   - `useSource(source, params, enabled)`: trang 1 tháng có `?month=` chờ danh sách tháng (từ
     `revenue-monthly`) rồi mới nạp ⇒ đúng 1 request;
   - số đo: 15 file / 94 test web · chunk đầu 196 → 209 kB · kiểm trình duyệt
     `Demo-project-shots/tools/period.mjs` 57/57 (ảnh ở `Demo-project-shots/out/`).
   Đặc tả gốc (giữ để soát):
   - Chỉ lọc theo THÁNG (dữ liệu mart chỉ tới tháng; lịch sử rủi ro theo tuần). KHÔNG lọc ngày, KHÔNG
     sửa `server/`, `supabase/`, `scripts/data`.
   - Dựng theo `docs/ui-kit/01-ARCHITECTURE.md` §6, chỉ phần cần: FilterBar + chọn khoảng tháng
     (từ – đến) + chọn 1 tháng. Không dựng các pattern khác, không quý/năm.
   - Doanh thu, Người dùng: khoảng tháng, lọc ở trình duyệt (API đã trả mọi tháng). Mặc định 12 tháng
     kết thúc ở tháng mới nhất CÓ TRONG DỮ LIỆU. Ô số: luồng (MRR mới, hoá đơn, user mới…) cộng cả
     khoảng; tồn kho (MRR cuối tháng, công ty trả tiền, user cuối tháng) lấy tháng cuối khoảng; MAU,
     DAU/MAU lấy tháng cuối. So với khoảng trước dài bằng nhau; thiếu ⇒ "—". Biểu đồ + bảng theo khoảng.
   - Theo người dùng, Theo công ty: chọn 1 tháng, truyền tham số `month` SẴN CÓ của API
     (`server/lib/sources.js`). Danh sách tháng lấy từ dữ liệu, không từ đồng hồ máy.
   - Cảnh báo huỷ: khoảng tháng chỉ áp cho 2 biểu đồ lịch sử (tuần lọc theo tháng chứa nó); danh sách
     theo dõi không đổi.
   - Nhãn gọi đúng khoảng đang xem; khoảng chứa tháng chưa trọn thì giữ cách ghi "tính đến ngày X".
   - Bộ lọc lưu trong URL hash (vd. `#/…?from=2026-01&to=2026-11`): F5 + link chia sẻ giữ nguyên; giá
     trị sai / ngoài phạm vi dữ liệu ⇒ về mặc định, không lỗi.
   - 1 panel mở mỗi lúc; panel portal ra body; Esc đóng + focus về nút; nút đặt lại chỉ hiện khi khác
     mặc định.
   - Test hàm thuần: cộng luồng / cuối kỳ tồn kho, khoảng trước ở mép dữ liệu, parse/serialize URL kèm
     giá trị rác, tháng mặc định từ dữ liệu. Ảnh 1440/430 × sáng/tối với panel mở; 430 không cuộn ngang.
7. **TODO riêng — `loaded_at` (KHÔNG làm ở `feat/about-glossary`):** chip mới chỉ ghi "có số tới ngày"
   vì DB không lưu GIỜ nạp. Muốn có "cập nhật lúc …": `scripts/data/load.mjs` ghi `loaded_at` vào
   `raw.dataset_meta` → `mart` đưa ra (hàm SECURITY DEFINER như `as_of`) → `server/` trả kèm
   `updatedAt`; người dùng nạp lại Supabase + deploy lại Vercel.
8. Vặt:
   - nền ambient lớp nét SVG (`ribbon.svg`), đèn theo con trỏ (`reveal.ts`), phóng ra lần lượt
     (`staggerIn.ts`) — cần sửa `App.tsx`, chưa làm (người dùng hoãn 2026-11-11);
   - tên gói hiện MÃ khi API chưa trả nhãn (đúng thiết kế, nhưng có thể cân nhắc).

## 6. BẪY đã gặp — đừng dẫm lại

- **`.gitignore` với `data/` (không có `/`) nuốt luôn `src/data/` và `scripts/data/`.** Đã sửa
  thành `/data/`. Thêm pattern ignore thì neo bằng `/` ở đầu.
- **`mart.as_of()` phải là `SECURITY DEFINER`** (+ `search_path = ''`). Hàm gọi trong view chạy
  bằng quyền NGƯỜI GỌI, nên thiếu cờ này thì `analytics_reader` lỗi ngay ở `mart.months`.
  Tương tự: muốn `analytics_reader` thấy cột nào của `raw` thì phải chép vào view/MV của `mart`
  (đã làm cho `full_name` / `company_name` ở `user_monthly`).
- **Điểm rủi ro v1 gần như không bao giờ báo động.** Nó đo "số ngày không ai vào" và "user có
  vào trong 28 ngày", mà công ty nhiều user hiếm khi có 7 ngày trắng. v2 đo XU HƯỚNG (28 ngày
  so với 28 ngày trước) + WAU/ghế. Sửa ngưỡng thì xem lại bảng band mà `generate.test.mjs` in ra;
  test chặn khi band rủi ro không huỷ nhiều hơn band thấp ít nhất 3 lần.
- **`vitest@2` kéo `vite@5` riêng ⇒ lỗi kiểu với `vite@6`.** Đã dùng `vitest@3`. Vitest chỉ quét
  `src/**`; `supabase/tests` và `server/test` chạy bằng `node --test`.
- **postgres.js + Supavisor transaction pooler cần `prepare: false`.** `numeric`/`bigint` parse
  về number, `date` giữ chuỗi (`server/lib/db.js`), để không lệch múi giờ.
- **Sinh / sửa dữ liệu thì không dùng `Math.random()`.** Mọi thứ đi qua `makeRng(seed)` +
  `fork(label)`; test khoá tái lập từng byte.
- **Máy Windows của người dùng:**
  - dừng `npm run dev` (task nền) KHÔNG dừng tiến trình con `node vite.js`, nên cổng vẫn bị giữ.
    Tìm PID theo cổng rồi dừng đúng tiến trình đó;
  - Credential Manager từng giữ tài khoản GitHub cũ `Taki-Thai`. Repo này đã đặt
    `credential.https://github.com.username Taki2119` cục bộ;
  - `gh` chưa đăng nhập (không xem được CI từ máy).
- **Trình duyệt preview của app desktop chỉ tới được origin đang preview**, nên gọi `localhost:3001`
  bị refused. Dùng proxy `/api` của Vite.
- **Supabase đặt `statement_timeout` (~2 phút) cho `postgres`**: `mart.refresh()` trên gói
  Free vượt mức này. `load.mjs` chạy `analyze` raw rồi refresh trong giao dịch có
  `set local statement_timeout = 0`.
- **Supabase đổi giao diện Connect:** Session / Transaction pooler nằm trong tab **Direct**
  (*Connection string*) → ô chọn Method.
- **Connector Supabase của phiên Claude** đăng nhập tài khoản khác (org công ty), không thấy
  project `Demo`: migration / SQL thì người dùng tự chạy ở SQL Editor.
- **Hobby plan Vercel:** chỉ dùng domain production (`<tên>.vercel.app`). URL của từng deployment
  bị Vercel Authentication chặn. Region đặt `hnd1` trong `server/vercel.json`, phải cùng vùng
  Supabase.
- **API cục bộ chặn Origin lạ (`403 forbidden_origin`)**: chỉ nhận `localhost:5180` / `5173`
  (`server/lib/handler.js`). Chạy `vite preview` để chụp ảnh thì dùng `--port 5180` và build với
  `VITE_API_URL=http://localhost:5180`, vào thư mục NGOÀI `dist/`. curl không gửi Origin nên vẫn qua
  — đừng lấy curl làm bằng chứng trình duyệt gọi được.
- **Cổng 5180 / 3001 có thể đang bị tiến trình khác giữ** (2026-11-11: 5180 = dev server của MỘT
  PROJECT KHÁC của người dùng — đừng dừng nó; 3001 = `api-dev.mjs` còn chạy từ phiên trước, dùng lại
  được). Tra PID + CommandLine trước khi dừng bất cứ gì; preview chụp ảnh thì dùng 5173 (API cũng nhận).
- **Người dùng làm trên nhiều máy (pull repo về máy khác):** những gì NGOÀI repo không đi theo —
  `Demo-project-shots/`, `.env`, `node_modules` (chạy `npm ci`). Thiếu thì dựng lại, đừng coi là "mất".
  Tool chụp dựng lại bằng `puppeteer-core` + Chrome có sẵn ở máy (không tải trình duyệt).
  Các bẫy "máy Windows" ở trên (Credential Manager, `gh`…) ghi cho máy cũ — kiểm lại ở máy mới.
- **Sửa file bằng Python trên Windows ghi CRLF** (`open(..., 'w')`). Repo dùng LF: ghi bằng
  `newline=''` hoặc chạy `sed -i 's/\r$//'` sau đó.
- **Chụp ảnh 430px bằng `chrome --headless --screenshot --window-size=430,…` SAI trên Windows**:
  cửa sổ có bề rộng tối thiểu ~500px nên trang dựng ở ~500 rồi bị cắt ⇒ trông như cuộn ngang. Dùng
  puppeteer `setViewport` và in `innerWidth`/`scrollWidth`.
- **`manualChunks: { recharts: ['recharts'] }` kéo cả React vào chunk `recharts-*.js`** ⇒ chunk đầu
  `import` tĩnh chunk đó + `index.html` preload nó: Recharts (573 kB) nạp ngay trang đầu, mà
  `grep -c activeTooltipIndex dist/assets/index-*.js` VẪN ra 0. Đã bỏ; để Rollup tự tách (chunk
  Recharts mang tên một module của mình, vd. `nodes-*.js`). Nhận chunk Recharts theo NỘI DUNG.
- **`--font-display` (Outfit) không có bộ chữ tiếng Việt** (Google Fonts chỉ có latin/latin-ext):
  đo thật thì ạ ữ ỗ rơi sang Segoe UI. Chỉ dùng cho logo + số; `i18n.test.ts` khoá logo không có
  chữ Latin có dấu.
- **`scrollIntoView` cuộn MỌI tổ tiên cuộn được, kể cả khung `overflow: hidden`** (người dùng không
  cuộn được nhưng code thì được). Lỗi đã gặp ở cửa sổ Hỏi AI: sau vài câu hỏi cả `.ask-dock` trượt lên,
  tiêu đề mất, khung chat bị đẩy lên giữa, nửa dưới trống. Sửa: cuộn đúng `.ask-dock-body` bằng
  `scrollTo` + `.ask-dock { overflow: clip }`. Tool `ask.mjs` đo tiêu đề / khung chat dính cạnh sau
  MỖI câu trả lời. Bài học kèm theo: xem ảnh thì soi cả đầu cửa sổ, ảnh cũ đã có lỗi mà bị bỏ sót.
- **Sàn tương phản (`markContrast.test.ts`):** sàn "nền kính tệ nhất" (#e8dbd0 / #543a25) CHỈ áp cho
  MARK (≥2:1). CHỮ đo ≥4.5:1 trên nền THẬT của chữ đó (`--surface`, `--pill-flat`…) — `--ink-3`
  trên nền tệ nhất chỉ ~3,5:1, đó không phải lỗi (người dùng chốt 2026-11-11).

## 7. Quy trình

- Dự án cá nhân, chủ repo là người dùng. **Commit/push chỉ khi người dùng bảo.** Commit message
  kết thúc bằng dòng `Co-Authored-By` theo hướng dẫn của phiên.
- Trước khi báo "xong": chạy `npm run typecheck`, `npm test`, `npm run build`, và `db:test` /
  `api:test` nếu đụng SQL hoặc server. Báo CON SỐ test, không chỉ chữ "pass".
- Quét trước khi push: không có chuỗi tên công ty thật, không có email/số điện thoại thật, không
  có `.env`.
