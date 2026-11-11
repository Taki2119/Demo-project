# Dashboard UI Kit

Bộ kit để dựng một site dashboard tĩnh trên **GitHub Pages**. Nó cho bạn:

- một hệ thiết kế (token màu, hiệu ứng kính, vỏ app, chuyển động);
- logic vẽ biểu đồ và bảng số;
- quy trình dựng một board từ dữ liệu ra giao diện.

Bộ kit được rút từ một repo dashboard đang chạy thật, nhưng đã gỡ mọi tên, logo và ví dụ gắn với sản phẩm gốc. Vì vậy repo nào cũng dùng được.

## Bộ kit gồm gì

| File | Đọc khi |
|---|---|
| [`00-HUONG-DAN-VSCODE.md`](00-HUONG-DAN-VSCODE.md) | **Bắt đầu ở đây**: từng bước áp dụng kit vào repo mới bằng VS Code + Claude Code, tới khi lên GitHub Pages |
| [`01-ARCHITECTURE.md`](01-ARCHITECTURE.md) | Dựng khung app: luồng dữ liệu → board, catalog, route hash, bộ lọc, deploy Pages |
| [`02-DESIGN-SYSTEM.md`](02-DESIGN-SYSTEM.md) | Dựng giao diện: token màu (3 bộ × sáng/tối), liquid glass, vỏ app, hover/motion, component chung |
| [`03-CHARTS-TABLES.md`](03-CHARTS-TABLES.md) | Vẽ biểu đồ và bảng: 12 khuôn chart, luật chọn hình, mark node–vành–pill, màu chuỗi, định dạng số, bảng có sort và chia trang |
| [`04-PITFALLS-CHECKLIST.md`](04-PITFALLS-CHECKLIST.md) | Trước khi merge: các bẫy đã gặp thật, checklist nghiệm thu, các cổng CI |
| [`05-PROMPTS.md`](05-PROMPTS.md) | Prompt dán cho Claude Code, kèm mẫu `CLAUDE.md` cho repo mới |

## Cách dùng: 4 bước

> Dùng VS Code + Claude Code thì làm theo `00-HUONG-DAN-VSCODE.md`. Tài liệu đó đi chi tiết hơn 4 bước dưới đây.

1. **Tạo repo mới** với đúng stack sau: Vite 6, React 18, TypeScript strict, Tailwind CSS v4
   (`@tailwindcss/vite`), Recharts 2.x, zustand 5, vitest 2.
2. **Chép code từ repo nguồn** theo *Bản đồ file* ở dưới. Có thể dùng prompt P1 trong `05-PROMPTS.md`. Khi chép:
   - đổi tiền tố class `jw-` thành `ui-`;
   - đổi khoá localStorage sang tên app của bạn;
   - gỡ mọi tên hoặc logo của sản phẩm nguồn còn sót trong chuỗi và comment.
3. **Chép mẫu CLAUDE.md** (`05-PROMPTS.md`, mục P0) vào gốc repo mới. Chép 6 file của kit vào `docs/ui-kit/`.
4. **Chạy các prompt** P2 → P3 → P4, rồi dùng P5 cho từng board.

> Kit này chỉ ghi những gì code đang làm. Ở chỗ tài liệu cũ của repo nguồn nói khác code, kit theo **code**.
> Ví dụ: donut tối đa 5 lát, animation biểu đồ 1000ms.

## Bản đồ file: lấy gì từ `src/` của repo nguồn

### A. Chép nguyên được (chỉ cần React, Recharts và token CSS)

| Nhóm | File |
|---|---|
| Viz: hằng số và mark | `ui/viz/axis.ts` · `marks.tsx` · `nodes.tsx` · `series.ts` · `motion.ts` · `donutCorner.ts` · `heat.ts` · `beeswarm.ts` |
| Viz: phụ trợ | `ui/viz/Tip.tsx` · `FloatTip.tsx` · `TrendArrow.tsx` · `CellBar.tsx` · `ChartZoom.tsx` |
| Viz: 12 khuôn chart | `ui/viz/charts/*.tsx` (không import gì ngoài `ui/viz`) |
| Bảng (phần thuần) | `ui/tablePage.ts` · `ui/tableSort.ts` |
| Theme / bộ màu | `ui/theme.ts` · `ui/palette.ts` (đổi `STORAGE_KEY`) · `ui/viewSwitch.ts`, cộng script prePaint trong `index.html` |
| Motion | `ui/reveal.ts` · `ui/staggerIn.ts` · `ui/useStaggerIn.ts` · `ui/cssMotion.ts` · `ui/usePresence.ts` |
| Hạ tầng UI | `ui/useEscape.ts` · `useMediaQuery.ts` · `popoverFocus.ts` · `popoverPlace.ts` · `tipPlace.ts` |
| Component | `ui/SlideToggle.tsx` · `ConfirmDialog.tsx` · `HoverTip.tsx` · `Toast.tsx` + `toastStore.ts` · `Loading.tsx` · `NoData.tsx` · `ErrorBoundary.tsx` |
| Bộ lọc | `ui/filters/*` (cả phần thuần lẫn component) |
| Dữ liệu (thuần) | `data/csv.ts` · `lib/day.ts` · `data/fiscal.ts` (đặt lại `FISCAL_START_MONTH`, `ANCHOR`) |
| Điều hướng | `nav/route.ts` (đổi tên segment) · `boards/chunkReload.ts` |
| Nền | `ui/ambient/` (`Ambient.tsx`, `svgFile.ts`, `ribbon.svg`; có thể thay bằng hình khác) |
| CI | `.github/workflows/deploy.yml` · `checks.yml` · `scripts/check-bundle-*.mjs` · `scripts/check-branch.mjs` · `privacy-rules.mjs` |
| Test làm mẫu | `boards/boardShell.test.ts` · `ui/cssSource.test.ts` · `ui/markContrast.test.ts` · `ui/i18n.test.ts` · `ui/prePaint.test.ts` |

### B. Chép được nhưng phải CẮT DÂY

| File | Dây cần cắt |
|---|---|
| `ui/format.ts` | `numberLocaleNow` (store định dạng vùng) → locale cố định; type `Bucket` import từ một module dữ liệu → khai tại chỗ; type `Lang`; ký hiệu tiền tệ |
| `ui/viz/StatTile.tsx` · `stats.tsx` | `useT` / `useLangStore` (i18n) · `InfoTip` (dính glossary + catalog) |
| `ui/TablePager.tsx` | `SegmentFilter` (đã có trong `ui/filters`) · `SolarIcon` + `solarIcons` (bộ icon Solar mã nguồn mở) · các key i18n `pager*`, `pageSize` |
| `ui/SortHead.tsx` | `SolarIcon` · key `sortHint` |
| `ui/i18n.ts` | Giữ khung (`Lang`, `DICT`, `useT`, `fill`), thay toàn bộ nội dung |
| `ui/InfoTip.tsx` | Giữ UI popover, thay nguồn glossary bằng glossary của repo mới |
| `data/driveData.ts` · `driveSource.ts` | Lấy token của kho file → adapter của repo mới; bỏ hằng id thư mục/file |
| `data/boardData.ts` | Danh sách mã board |
| `nav/catalog.ts` · `resolve.ts` | Giữ **kiểu** và hàm tiện ích, bỏ cây danh mục cụ thể và các bảng `LEGACY_*` |
| `src/index.css` | **Không chép nguyên** (khoảng 1 MB). Chỉ trích các khối liệt kê ở `02-DESIGN-SYSTEM.md` §9 |

### C. Không mang sang

- Các board, parser và glossary cụ thể của sản phẩm nguồn.
- Đăng nhập (`auth/`) và proxy server.
- Màn Home, side panel cụ thể.
- Các module riêng: chat AI, telemetry, settings.
- Mọi logo, wordmark, icon thương hiệu.
- `GlassDefs.tsx` (bản backup đã bỏ).

Logo, tên và favicon của repo mới thì bạn tự dựng.

## Ba quyết định nên giữ nguyên

1. **Route hash** (`#/dashboard/...`). Host tĩnh không có rewrite, nên bấm F5 ở một path sâu sẽ ra 404.
2. **Recharts nạp động** qua `lazy(boardChunk(...))`. Cách này giảm bundle đầu từ 578 kB xuống 170 kB.
3. **Mọi byte trong `dist/` coi như đã công khai.** Pages vẫn công khai kể cả khi repo để private, nên không
   được đưa dữ liệu thật, SQL hay secret vào bundle.
