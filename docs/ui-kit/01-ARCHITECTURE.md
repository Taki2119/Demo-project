# 01 · Kiến trúc: từ dữ liệu tới màn hình

Đường dẫn trong file này tính từ `src/` của repo nguồn (nơi chép code sang).

## 1. Luồng end-to-end

```
Nguồn (file CSV/csv.gz | API qua proxy)
  → fetch text            data/driveSource.ts   (gunzip theo magic byte 1f 8b)
  → parseX(text)          data/<tên>.ts         (PARSER THUẦN, test ở env node)
  → useDriveData()        data/driveData.ts     (cache zustand trong bộ nhớ, phase)
  → gate / NoData         ui/DriveConnect.tsx · ui/NoData.tsx
  → <XCharts data/>       nửa TRÌNH BÀY, nhận data qua prop
  → ui/viz/charts/* · StatTile · bảng
```

**Nguyên tắc cốt lõi: parser không biết nguồn.** Kho file (URL tĩnh, Google Drive…) trả CSV. Proxy dữ liệu (`data/boardData.ts`)
trả `{csv, updatedAt}`, tức đúng CSV đó. Vì vậy đổi nguồn không phải sửa dòng nào trong parser.

### 1a. Parser thuần (`data/<tên>.ts`)

- Khai kiểu dữ liệu (`XRow`, `XData`) và hằng `EMPTY_X`.
- `parseX(text)`:
  - **ném lỗi** khi thiếu cột ở header, khi số ô sai, hoặc khi khoá thời gian không khớp `YYYY-MM`;
  - **đối chiếu cột dẫn xuất**, ví dụ `net == insert − remove`; lệch thì ném lỗi;
  - sort theo chuỗi `YYYY-MM`, **không** qua `new Date`.
- Hàm tổng hợp phải thuần và có test:
  - `flowSum` dùng cho đại lượng **luồng** (cộng dồn);
  - `totalIndexFor` dùng cho đại lượng **tồn kho** (lấy giá trị cuối kỳ);
  - `prevSpan` trả khoảng liền trước dài bằng khoảng đang xét, thiếu dữ liệu thì trả `null`;
  - `deltaPct` / `deltaBetween` lan truyền `null`.
- Loader `loadX(fetchText)` nhận hàm đọc qua tham số, nên test không cần mạng.
- CSV có dấu phẩy trong ô thì dùng `data/csv.ts › parseCsvRows`.

### 1b. Hook nạp chung (`data/driveData.ts`)

- `useDriveData({fileId, tag, empty, parse, locate?, bq?})`.
- `fileId` là **khoá cache**.
- Cache nằm trong zustand ở cấp module, **chỉ trong bộ nhớ, không persist**. Khi đăng xuất phải gọi `clearDriveData()`.
- `parse` / `locate` đi qua `useRef`. Nếu để chúng trong deps của effect thì mỗi lần render sẽ fetch lại.
- Effect có cờ `alive` để chặn kết quả trả về muộn.
- Phase có 4 giá trị: `need-token | loading | failed | ready`. **Đã có cache thì luôn là `ready`**, xét trước cả `failed`.
- `failReason` có 3 giá trị: `missing` (404 / NOT_FOUND), `forbidden` (403), `other`.

### 1c. Khuôn chuẩn của một board

```tsx
export function XBoard() {
  if (!GOOGLE_CLIENT_ID) return <NoData />;      // tránh gọi hook khi không có OAuth provider
  return <Connected />;
}
function Connected() {
  const d = useDriveData({ fileId, tag, empty: EMPTY_X, parse: parseX, locate });
  const gate = driveGate(d); if (gate) return gate;      // need-token / loading ⇒ vòng chờ
  if (d.phase === 'failed')
    return <NoData message={d.failReason === 'missing' ? `${t('noDriveFile')} ${FILE}` : t('dataFailed')} />;
  return d.data.months.length === 0 ? <NoData /> : <XCharts data={d.data} />;
}
export function XCharts({ data, now }: { data: XData; now?: Date }) { /* thuần trình bày */ }
```

Tách `XCharts` ra như trên thì test và chụp ảnh được mà không cần đăng nhập.
Ở repo mới không có OAuth thì bỏ dòng `GOOGLE_CLIENT_ID` và `driveGate`, thay bằng `fetch` JSON/CSV tĩnh.
Khuôn còn lại giữ nguyên.

### 1d. Lưới reload chunk (`boards/chunkReload.ts`)

Mỗi lần deploy, GitHub Pages **xoá chunk cũ**. Tab đã mở từ trước gọi `import()` sẽ nhận 404 và React gỡ cả cây,
để lại màn đen. Hàm `boardChunk(key, load)` xử lý như sau:

- `import()` lỗi thì reload trang **đúng 1 lần**. Cờ đánh dấu lưu trong `sessionStorage`.
- Không reload khi offline, và không reload khi không có storage (nếu không sẽ thành vòng lặp vô hạn).
- Khi đã quyết reload, hàm trả về một promise không bao giờ resolve, để `<Suspense>` giữ vòng chờ.
- `ErrorBoundary` bọc **ngoài** `Suspense`, chỉ quanh phần board. Board hỏng thì tiêu đề và điều hướng vẫn còn.

## 2. Giải phẫu một board

Màn `DashboardScreen` dựng phần vỏ. Board **không** tự dựng vỏ:

```
<div class="ui-board">                         ← gap = --blk-out 24px
  <PageTitle crumbs title desc actions after/> ← H1 DUY NHẤT, lấy tên từ catalog
  <ErrorBoundary><Suspense><Board ref_/></Suspense></ErrorBoundary>
```

Board không vẽ H1. Tiêu đề thẻ là `<h2>`. Cổng `boardShell.test.ts` cấm file board tự khai `"ui-board"`.

**Thứ tự khối bên trong board:**

1. `<section class="ui-blk">` gồm `FilterBar` và **ngay dưới nó** là khối mà bộ lọc đó điều khiển.
   Không gom mọi bộ lọc lên đầu trang. Khe trong một khối là `--blk-in` 12px.
2. `<div class="ui-kpis">` chứa các `StatTile`. Lưới dùng `repeat(auto-fit, minmax(12.75rem, 1fr))`.
   Chọn số thẻ sao cho không có thẻ nằm lẻ ở hàng cuối.
3. `<div class="ui-charts">` chứa các `<figure class="ui-card ui-glass ui-viz [ui-card--wide]">`:
   ```html
   <h2 class="ui-card-title">Tên <InfoTip metric="key"/></h2>
   <p class="ui-card-sub">phụ đề</p>
   <div class="ui-chart"><ResponsiveContainer>…</ResponsiveContainer></div>
   ```
   Lưới khai **2 cột tường minh**, không dùng `auto-fit`. Số thẻ không-wide phải **chẵn**.
4. Bảng gồm `.ui-tablewrap > table.ui-table`, `SortHead` và `TablePager`. Xem `03-CHARTS-TABLES.md` §6.

## 3. Registry và catalog

```tsx
// boards/registry.tsx
export interface BoardProps { ref_: DashboardRef }
export const BOARDS: Record<BoardKey, ComponentType<BoardProps>> = {
  sales: lazy(boardChunk('sales', () => import('./SalesBoard').then(m => ({ default: m.SalesBoard })))),
};
```

`lazy()` là bắt buộc. Recharts nặng khoảng 400 kB và không được lọt vào chunk đầu.

```ts
// nav/catalog.ts (rút gọn)
type DashboardStatus = 'ready' | 'live' | 'stale' | 'planned';
interface DashboardDef { id: string; name: string; desc?: LocalStr; status: DashboardStatus;
  board?: BoardKey; preview?: PreviewKey; icon?: GroupIcon }
interface GroupDef    { id; name; desc; icon; dashboards: DashboardDef[] }
interface DivisionDef { id; name; short; desc; icon; groups: GroupDef[] }
interface SectionDef  { id; name; icon; divisions: DivisionDef[] }
export const CATALOG = SECTIONS.flatMap(s => s.divisions);
```

Ý nghĩa `status`:

| status | Ý nghĩa |
|---|---|
| `planned` | Ẩn ở mọi nơi |
| `ready` | Hiện tên; trang vẽ `NoData` |
| `live` | Đã nối dữ liệu |
| `stale` | Đã nối nhưng số đã cũ |

`catalog.test.ts` khoá các ràng buộc sau:

- `live` / `stale` **phải** có `board`;
- `planned` **không được** có `board`;
- id không trùng trong cùng một tầng.

**Thứ tự trong mảng chính là thứ tự hiển thị.** Đổi chỗ phần tử không làm hỏng URL của ai.

### Checklist thêm một board

1. `data/<tên>.ts`: khai kiểu, `EMPTY_X`, `parseX` (ném lỗi khi thiếu cột, có đối chiếu cột dẫn xuất),
   các hàm tổng hợp thuần và `loadX(fetchText)`.
2. `data/<tên>.test.ts`: tạo dữ liệu ngay trong test, chạy ở env `node`.
3. `data/glossary.ts`: thêm mục giải thích chỉ số (`what` có cả bản vi và ja, `formula`, `unit`, `note`) cho nút ⓘ.
4. Hằng nguồn (folder + **tên file**). Không ghim `fileId`, vì ghi đè file thì id đổi còn tên giữ nguyên.
5. `BoardKey` và mục trong catalog (`status: 'live'`, `board`, `icon`).
6. `boards/<Tên>Board.tsx` theo khuôn §1c, và **một dòng** trong `registry.tsx`.
7. Chỉ thêm CSS khi thật sự cần class mới. Grep tên class trước để chắc không trùng.

Không phải sửa `App.tsx`, thanh nhóm hay Home.

## 4. Route hash (`nav/route.ts`)

- Các kind: `login | home | dashboard{division, path[]}`. Hash có dạng `#/home`, `#/dashboard/<khối>/<nhóm>/<bảng>`.
- `parseHash` / `toHash` là hàm thuần. Có test khoá `toHash(parseHash(h)) === h`.
- `navigate(route, replace)`. Các bước chuyển tiếp tự động dùng `location.replace` để nút Back không bị kẹt.
- `route.ts` **không biết catalog**. `nav/resolve.ts` lo phần nối route với catalog:
  - rút gọn URL: nhóm duy nhất trùng tên khối thì bỏ segment nhóm;
  - dịch link cũ bằng các bảng `LEGACY_*` tường minh.
- **Lý do dùng hash:** host tĩnh không có rewrite, nên F5 ở path sâu sẽ 404. Hash giữ được deep link và bookmark.

## 5. Vỏ app

```
main.tsx: initTheme(); initPalette(); set lang; initRouter(); render <App/>
App: viewFor({loading, hasUser, ...}) → boot | login | app   (vẽ theo view, URL đi theo sau)
.ui-app = [<Ambient/>] [AppSide (side panel)] [.ui-body = .ui-topbars + .ui-main (ô cuộn DUY NHẤT)]
.ui-screen key={hash}  → đổi route thì dựng lại; useStaggerIn chạy hiệu ứng phóng ra
```

Bố cục CSS chi tiết ở `02-DESIGN-SYSTEM.md` §3.

## 6. Bộ lọc (`ui/filters/`)

Board chỉ import từ `ui/filters`, **không tự dựng bộ lọc**.

| Component | Việc |
|---|---|
| `DateRangeFilter` | Khoảng ngày, kèm cột chọn nhanh |
| `PeriodFilter` | Khoảng theo khối tuần / tháng / quý tài chính |
| `PickFilter` | Chọn một (tuỳ chọn ô tìm `search`) |
| `MultiPickFilter` | Chọn nhiều; tập rỗng = không lọc (`passesMulti`) |
| `SelectFilter` | `<select>` gốc cho danh sách dài |
| `RangeSliderFilter` | Khoảng số bằng thanh trượt |
| `NumberRangeFilter` | Ngưỡng `≥ > ≤ <`; ô trống = không chặn |
| `TextFilter` | Tìm trong hàng (NFKC, không phân biệt hoa/thường) |
| `SegmentFilter` | 2–4 nấc cố định |

```tsx
<FilterBar dirty={!samePeriodRange(range, def)} onReset={() => setRange(def)} aside={…}>
  <PeriodFilter value={range} onChange={setRange} label={t('period')} min max today clearable={false} />
</FilterBar>
```

**FilterBar:**
- Nút đặt lại (icon `filter-close`) chỉ hiện khi `dirty`.
- `aside` là phần dạt sang phải, không tính vào `dirty`.
- Panel được portal ra `body`.
- Toàn app chỉ cho **một panel mở** một lúc (`openPanel.ts`).

**Phần thuần `period.ts`:**
- `periodRangeDays` đổi khoảng thành ngày, nhờ đó board không cần biết đơn vị.
- `prevPeriodRange` lùi đúng số khối.
- `convertPeriodRange` luôn nở khoảng ra, không cắt bớt.

**`data/fiscal.ts`:**
- Năm tài chính bắt đầu ở tháng `FISCAL_START_MONTH` và có **một** mốc neo `ANCHOR` (kỳ số mấy bắt đầu năm nào). Ở repo mới, đặt lại cả hai.
- **Không** tự tính quý bằng `(month-1)/3`: kết quả lệch 2 tháng mà nhãn vẫn trông hợp lý.

**Cách cắm bộ lọc vào board:**
- Mặc định chọn tháng mới nhất **có trong file**, không lấy theo đồng hồ hệ thống.
- `min` / `max` lấy theo phạm vi của file.
- KPI dùng `clearable={false}`. Với biểu đồ, giá trị `null` nghĩa là xem cả chuỗi.
- Đại lượng **luồng** thì cộng. Đại lượng **tồn kho** thì lấy giá trị cuối kỳ (bảng thưa thì dùng LOCF, tức
  giá trị gần nhất của từng thực thể).
- Nhãn phải gọi đúng tên khoảng đang xem. `deltaNote` đổi theo độ dài khoảng ("so với tháng trước" / "so với khoảng trước").
- Sparkline dùng cùng cửa sổ thời gian với con số đi kèm.

## 7. Deploy GitHub Pages

- `vite.config.ts`: `base = command === 'build' ? (VITE_BASE_PATH || '/<tên-repo>/') : '/'`.
  - Dùng domain riêng thì đặt `VITE_BASE_PATH=/`.
  - Favicon dùng đường dẫn tương đối `./logo.svg`.
  - Phiên bản lấy từ `define: { __APP_VERSION__ }`, đọc từ `package.json`.
- Vitest: `environment: 'node'`, **`pool: 'threads'`**. Pool `forks` làm rơi file test một cách im lặng trên Windows.
- `deploy.yml`: chạy khi `push` lên `main` hoặc `workflow_dispatch`; quyền `pages: write`, `id-token: write`;
  `concurrency.cancel-in-progress: false`. Các bước:
  `npm ci → npm test → npm run build → check:clientid → privacy:bundle → check:glass → check:viewport → upload-pages-artifact(dist) → deploy-pages`.
- `checks.yml`:
  - chạy khi `pull_request`, **cùng bộ cổng và cùng thứ tự** với `deploy.yml`;
  - chỉ có quyền `contents: read`, nên không thể vô tình deploy;
  - thêm một cổng: `grep -c activeTooltipIndex dist/assets/index-*.js` phải trả về 0, tức Recharts không nằm trong chunk đầu.
- Việc ngoài repo:
  - Pages Source = **GitHub Actions**;
  - default branch = `main`;
  - ruleset bảo vệ `main` (bắt buộc PR, approvals = 0 nếu chỉ có một người, chặn force push);
  - **không** tích "Require branches to be up to date", vì mỗi lần merge sẽ chạy lại CI cho mọi PR đang mở.
