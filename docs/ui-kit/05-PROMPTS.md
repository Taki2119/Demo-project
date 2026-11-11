# 05 · Prompt cho Claude Code và mẫu CLAUDE.md

Giả định ở repo mới đã có thư mục `docs/ui-kit/` chứa các file của bộ kit này (`README.md`, `00`–`05`).
Dùng VS Code thì chạy **P1-VSCode** ở `00-HUONG-DAN-VSCODE.md` thay cho P1 bên dưới.
Mọi prompt bên dưới đều tham chiếu tới thư mục đó.
Phần trong `<...>` là chỗ bạn phải thay giá trị trước khi dán.

---

## P0 · Mẫu `CLAUDE.md` cho repo mới

Dán vào file `CLAUDE.md` ở gốc repo mới, rồi sửa các phần `<...>`.

```markdown
# CLAUDE.md: <Tên dự án>

Dashboard tĩnh trên GitHub Pages. UI/UX và logic vẽ biểu đồ/bảng theo bộ kit `docs/ui-kit/`.
Luật chi tiết nằm ở `docs/ui-kit/` (01 kiến trúc · 02 hệ thiết kế · 03 biểu đồ & bảng · 04 bẫy & checklist).
**Trước khi dựng hoặc sửa board, biểu đồ hay CSS, đọc file tương ứng trong thư mục đó.**

## Tech stack (KHOÁ, không tự đổi)
Vite 6 · React 18 + TypeScript strict (không `any`) · zustand · Tailwind CSS v4 · **Recharts 2.x** (chỉ một
thư viện biểu đồ, nạp ĐỘNG qua `lazy`) · vitest (`environment: node`, `pool: threads`) · GitHub Pages · route hash.

## Luật không thương lượng
1. Không có dữ liệu bịa trong `src/`. Chưa có nguồn thì để board ở `status: 'ready'` và hiện `NoData`.
2. Mỗi biểu đồ chỉ có MỘT trục Y. Không dùng `<Funnel>` của Recharts.
3. Mọi byte trong `dist/` coi như đã công khai: không đưa dữ liệu thật, SQL hay secret vào bundle.
4. Component biểu đồ không tự định dạng số. `goodWhen` không có mặc định. Không có số thì hiện `—`, không hiện `0`.
5. Chỉ dùng token màu (`var(--series-n)`…), không gõ hex trong component. `--accent` chỉ dành cho lớp tương tác.
6. `backdrop-filter` chỉ được khai trong `.ui-glass`. Overlay (popover, menu, dialog, toast) phải portal ra `body`.
7. Board không tự vẽ H1 và không tự khai `ui-board`. Thêm board = 1 file parser + 1 file board + 1 dòng registry + 1 mục catalog.
8. Typecheck bằng `npm run typecheck`, KHÔNG dùng `npx tsc --noEmit`. Sau khi build, grep `dist/` để xác nhận CSS mới có trong bản ship.

## Quy trình
Không commit thẳng vào `main`. Tạo nhánh `feat/*` · `fix/*` · `chore/*` · `docs/*`, push nhánh rồi DỪNG chờ duyệt.
Agent không tự mở PR và không tự merge.

## Bản đồ src/
| Thư mục | Việc |
|---|---|
| `src/data/` | Parser thuần + loader + glossary |
| `src/boards/` | `registry.tsx` (lazy + boardChunk) + `*Board.tsx` |
| `src/nav/` | `catalog.ts` · `route.ts` (hash) · `resolve.ts` |
| `src/screens/` | Vỏ màn (DashboardScreen, Home, side panel) |
| `src/ui/` | Theme / palette / i18n / format / toast / dialog / tooltip / bảng |
| `src/ui/viz/` | Mark, trục, màu chuỗi, motion + `charts/` (12 khuôn) |
| `src/ui/filters/` | Bộ lọc dùng chung (board không tự dựng bộ lọc riêng) |
| `src/styles/` | CSS trích từ index.css gốc, chia theo khối |
```

---

## P1 · Chép file từ repo nguồn sang repo mới

Chạy prompt này **trong repo nguồn** `<ĐƯỜNG_DẪN_REPO_NGUỒN>`, vì ở đó có sẵn code.

```
Đọc <THƯ_MỤC_KIT>/README.md, mục "Bản đồ file". Chép sang repo đích <ĐƯỜNG_DẪN_REPO_MỚI>:
- nhóm A (bê nguyên): chép nguyên văn, giữ nguyên cấu trúc thư mục dưới src/;
- nhóm B (cắt dây): chép sang rồi CHƯA sửa; ghi danh sách vào <ĐƯỜNG_DẪN_REPO_MỚI>/docs/ui-kit/TODO-cut.md,
  mỗi file một dòng ghi dây nào cần cắt;
- KHÔNG chép nhóm C và KHÔNG chép src/index.css.
- Chép thư mục <THƯ_MỤC_KIT>/ vào <ĐƯỜNG_DẪN_REPO_MỚI>/docs/ui-kit/.
- Trên các file VỪA CHÉP sang repo đích:
  · đổi tiền tố `jw-` thành `ui-` (class, id SVG, biến CSS);
  · đổi STORAGE_KEY trong theme.ts, palette.ts, i18n.ts sang '<app>.theme' / '<app>.palette' / '<app>.lang';
  · grep -i tên sản phẩm/công ty nguồn trong chuỗi lẫn comment rồi gỡ hoặc viết lại trung tính,
    xoá import tới logo/wordmark thương hiệu. Báo lại số chỗ đã sửa ở mỗi file.
Không commit gì ở repo nguồn. Báo lại danh sách đã chép, kèm số file của từng nhóm.
```

---

## P2 · Dựng khung repo mới

Chạy **trong repo mới**.

```
Repo này là một dashboard GitHub Pages mới. Đọc CLAUDE.md và docs/ui-kit/01-ARCHITECTURE.md (§5, §7),
rồi dựng khung:
1. package.json theo đúng stack ở CLAUDE.md, với các script: dev, build (tsc -b && vite build), typecheck
   (tsc --noEmit -p tsconfig.app.json), test (vitest run), privacy:bundle, check:glass, check:viewport.
2. vite.config.ts: base = command === 'build' ? (process.env.VITE_BASE_PATH || '/<TÊN_REPO>/') : '/';
   plugin react + @tailwindcss/vite; define __APP_VERSION__ đọc từ package.json; vitest với environment 'node', pool 'threads'.
3. index.html: script prePaint (thẻ script thường, đặt trong <head>) set data-theme và data-palette từ localStorage
   trước khi body được vẽ; khoá localStorage dùng tiền tố '<app>.'; tải Google Fonts Space Grotesk, Noto Sans JP,
   Zen Kaku Gothic New, Outfit.
4. src/main.tsx gọi initTheme(), initPalette(), initRouter() rồi mới render. App.tsx dựng vỏ
   .ui-app > [Ambient][AppSide][.ui-body > .ui-topbars + .ui-main > .ui-screen key={hash}].
5. .github/workflows/deploy.yml (chỉ chạy trên main, có quyền pages: write) và checks.yml (chạy trên pull_request,
   chỉ có contents: read), với CÙNG bộ cổng và CÙNG thứ tự; checks.yml thêm cổng grep activeTooltipIndex trong
   chunk đầu phải bằng 0.
6. Tạo nhánh chore/bootstrap, chạy npm test, typecheck và build; nếu xanh thì push nhánh rồi DỪNG.
Tuân thủ docs/ui-kit/04-PITFALLS-CHECKLIST.md (mục A, B).
```

---

## P3 · Port hệ thiết kế (CSS + theme)

```
Đọc docs/ui-kit/02-DESIGN-SYSTEM.md, đọc hết. Trích CSS từ <ĐƯỜNG_DẪN_REPO_NGUỒN>/src/index.css theo
bảng ở §9. CHỈ đọc đúng các khoảng dòng ghi trong bảng; không đọc cả file vì file rất lớn.
- Chia thành src/styles/{tokens,palettes,base,ambient,controls,motion,shell,viz,overlays,hover}.css.
  src/index.css chỉ còn @import "tailwindcss", @custom-variant dark, và @import các file trên.
- Giữ nguyên tên token. Đổi tiền tố class/id/biến `jw-` của CSS nguồn thành `ui-`.
- Bỏ mọi khối CSS chỉ phục vụ một board hay tính năng riêng của repo nguồn (tức những khối không có trong bảng §9).
- Thay logo và màu thương hiệu bằng <MÔ_TẢ_THƯƠNG_HIỆU_MỚI>. Giữ nguyên 3 bộ màu Ember/Rime/Aurora,
  trừ khi tôi bảo đổi.
- Thêm các test cssSource.test.ts (bắt chuỗi đóng comment nằm ngoài comment), prePaint.test.ts và
  markContrast.test.ts (sàn tương phản ở 03-CHARTS-TABLES.md §5).
- Sau khi build, grep dist/assets/*.css để xác nhận có .ui-glass, .ui-app, @supports not (height:100dvh)
  và đủ 2 dòng backdrop-filter (một dòng có tiền tố -webkit-).
Dựng một trang /#/home tạm có 3 thẻ .ui-card.ui-glass và một nút đổi theme/palette, rồi chụp ảnh ở
1440 và 430 × sáng/tối. Nhánh: feat/design-system. Push rồi DỪNG.
```

---

## P4 · Port tầng biểu đồ và bảng

```
Đọc docs/ui-kit/03-CHARTS-TABLES.md và docs/ui-kit/TODO-cut.md.
1. Cắt dây cho các file nhóm B: format.ts (dùng locale cố định '<ja-JP|vi-VN>' và khai type Bucket tại chỗ),
   StatTile.tsx và stats.tsx (dùng i18n của repo này; InfoTip đọc src/data/glossary.ts mới), TablePager.tsx
   và SortHead.tsx (thay SolarIcon bằng bộ icon của repo này, hoặc chép SolarIcon + solarIcons nếu cần).
2. KHÔNG đổi các hằng số trong axis.ts, nodes.tsx, marks.tsx, motion.ts, donutCorner.ts. Đó là kết quả đo
   qua nhiều vòng chỉnh.
3. Dựng một trang demo #/dashboard/demo/charts, nạp lazy, vẽ đủ 12 khuôn chart bằng dữ liệu SINH TRONG
   FILE TEST (không đưa vào src/). Nếu luật "không bịa dữ liệu" khiến trang demo không có số thì chỉ bày
   NoData, và chụp ảnh từ harness test.
4. Chạy đủ checklist máy ở 04-PITFALLS-CHECKLIST.md. Nhánh: feat/viz-port. Push rồi DỪNG.
```

---

## P5 · Thêm một board mới (dùng lặp lại cho mỗi board)

```
Thêm board "<TÊN_BOARD>" vào khối/nhóm "<KHỐI> › <NHÓM>".
Nguồn: <file CSV ở URL/Drive/BigQuery proxy>, grain = một dòng là <…>. Các cột: <cột:kiểu:ý nghĩa…>.
Câu hỏi nghiệp vụ board phải trả lời: <…>. Chỉ số cần có: <tên — công thức — luồng hay tồn kho — goodWhen>.

Làm theo checklist ở docs/ui-kit/01-ARCHITECTURE.md §3:
1. src/data/<tên>.ts: kiểu dữ liệu + EMPTY + parseX (ném lỗi khi thiếu cột, đối chiếu cột dẫn xuất nếu có)
   + các hàm tổng hợp thuần (luồng cộng dồn, tồn kho lấy cuối kỳ, prevSpan, delta trả null khi không tính được).
2. src/data/<tên>.test.ts chạy ở env node, dựng dữ liệu ngay trong test.
3. Thêm mục vào glossary cho mỗi chỉ số (ⓘ).
4. Thêm mục catalog (status 'live', board, icon) và một dòng lazy(boardChunk(...)) trong registry.
5. Board theo khuôn ở 01 §1c: XBoard → Connected → XCharts. Thứ tự khối: FilterBar + khối nó điều khiển →
   .ui-kpis (StatTile) → .ui-charts (2 cột, số thẻ chẵn) → bảng (SortHead + TablePager).
6. Chọn hình theo bảng ở 03 §3. Trước khi code, giải thích cho tôi vì sao chọn hình đó.
7. Chạy checklist máy + mắt ở 04. Nhánh feat/<tên>. Push rồi DỪNG, gửi 4 ảnh chụp.
```

---

## P6 · Thêm hoặc đổi một biểu đồ trong board có sẵn

```
Trong board <TÊN_BOARD>, tôi muốn thấy <câu hỏi dữ liệu>. Trước khi code:
(a) nói rõ dữ liệu này làm VIỆC gì (so sánh / cơ cấu / xu hướng / bậc / quan hệ…);
(b) chọn khuôn theo docs/ui-kit/03-CHARTS-TABLES.md §3, và nêu cột "KHÔNG dùng khi" của khuôn đó;
(c) liệt kê token màu sẽ dùng.
Chờ tôi duyệt rồi mới code. Không thêm trục Y thứ hai, không tự chọn cỡ chữ, không gõ hex.
```

---

## P7 · Review một nhánh theo bộ luật

```
Review diff của nhánh hiện tại so với main, theo docs/ui-kit/04-PITFALLS-CHECKLIST.md và các luật ở CLAUDE.md.
Với mỗi vi phạm, ghi: file:dòng · luật bị phạm · vì sao sai (kịch bản cụ thể) · cách sửa.
Chạy luôn các cổng máy và báo SỐ file/test (không chỉ chữ "passed"). Không sửa gì, chỉ báo cáo.
```

---

## P8 · Hỏi nhanh khi đang làm (một dòng)

- `Theo docs/ui-kit/03 §3, dữ liệu <…> nên vẽ bằng khuôn nào? Nêu cả lý do loại các khuôn khác.`
- `Mark này có đạt sàn tương phản ở 03 §5 trên nền tệ nhất của cả theme sáng lẫn tối không? Đo bằng số.`
- `Kiểm xem rule CSS vừa thêm có thật trong dist/ không, và có tạo backdrop root đè lên kính nào không.`
