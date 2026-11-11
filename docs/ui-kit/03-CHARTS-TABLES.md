# 03 · Biểu đồ và bảng số

Toàn bộ tầng này nằm trong `src/ui/viz/` và `src/ui/table*.ts` của repo gốc. Nó chỉ phụ thuộc React 18,
Recharts 2.x và các token CSS. Khi tài liệu gốc và code nói khác nhau, file này **theo code**.

## 1. Ba luật chung (áp cho mọi khuôn)

1. **Component không tự định dạng số.** Chỗ gọi truyền vào `format: (v) => string` hoặc một chuỗi đã định dạng sẵn.
2. **`goodWhen: 'up' | 'down'` không có giá trị mặc định.** Nếu để mặc định `'up'`, một chỉ số như churn tăng sẽ bị tô xanh.
3. **Không tự đặt cỡ chữ riêng.** Cỡ chữ lấy từ thang chung (`02-DESIGN-SYSTEM.md` §2).

Mọi khuôn lấy prop animation từ `useChartAnim()` (`motion.ts`).

## 2. Mười hai khuôn chart

| File | Dùng cho | Props chính | Cách vẽ |
|---|---|---|---|
| `charts/SimpleBars.tsx` | So độ cao giữa các hạng mục rời, hoặc chuỗi thời gian ngắn có 1 chuỗi | `data, xKey, valueKey, label, color, format, head?, maxBarSize=26` | Recharts `BarChart` |
| `charts/ComboCharts.tsx › BarLineChart` | Cột + 1 đường, **cùng đơn vị** | `data, xKey, bar, line{key,label,color,dashed?}, format, xTickFormat?, maxBarSize=22` | Recharts `ComposedChart` |
| `ComboCharts.tsx › StackedBarLineChart` | Cột xếp lớp (phân hoạch), có thể kèm đường | `stacks: BarSpec[]` (phần tử đầu ở đáy), `line?`, `wideAxis?`, `maxBarSize=26` | Recharts |
| `charts/MultiLines.tsx` | 2–6 chuỗi cùng đơn vị theo thời gian | `data, xKey, series[{key,label,color}], format` (`MULTI_LINES_MAX=6`) | Recharts `LineChart` |
| `charts/LayeredArea.tsx` | 2–3 chuỗi **bao nhau** (gửi ≥ mở ≥ bấm) | `data, xKey, layers[{key,label}]` (phần tử đầu là lớp ngoài cùng), `format`; không có prop màu | Recharts `AreaChart` |
| `charts/DonutList.tsx` | Cơ cấu tại **một thời điểm**, 2–5 lát | `slices[{key,label,value,color}], total, totalUnit?, format, formatPct, aside?` (`DONUT_MAX_SLICES=5`) | Recharts `Pie` |
| `charts/FunnelChart.tsx` | Tỉ lệ đi tiếp qua 3–5 bậc lồng nhau | `rows[{key,label,value}], formatValue, formatPct, stepLabel, topLabel, valueLabel` | **SVG tay** (dải cubic) |
| `charts/RadarChart.tsx` | Hồ sơ của 1 chủ thể trên ≤ 8 tiêu chí cùng thang | `data[{key,label,subject,reference}], subjectLabel, referenceLabel, color, max=100, format` | Recharts `RadarChart` (circle) |
| `charts/RangeBars.tsx` | Mức thực đạt so với trần (dạng bullet) | `rows[{key,label,value,track}], color, format, formatPct, …` | Recharts, lát đệm `track − value` |
| `charts/ScatterPlot.tsx` | Quan hệ 2 biến, ≤ 3 nhóm | `data[{id,name,x,y,series}], series, xLabel, yLabel, formatX, formatY` | Recharts `ScatterChart` |
| `charts/HBars.tsx › HBars` | Xếp hạng, nhãn tiếng Nhật dài | `rows[{key,label,value,text,note?,color?}], max?, labelW=7` (rem) | **DOM thuần** |
| `HBars.tsx › SplitBars` | Phần trên tổng, mỗi hàng **khác đơn vị** (chuẩn hoá về 100%) | `rows[{key,label,pct,lead,trail,text}], labelW=9` | **DOM thuần** |
| `charts/HeatGrid.tsx` | Một đại lượng trải trên 2 chiều hạng mục | `cols, rows[{label,values}], top, formatCell, formatTip, valueLabel, emptyLabel` | DOM/table + `FloatTip` |
| `charts/TickSparkline.tsx` | Hình dáng của nhiều mốc rời (≥ ~20 mốc) | `values, color='var(--line-solo)', tick=3, gap=2, emphasizeLast=1` | **SVG tay** |

Khuôn chữ/số:
- `StatTile` (thẻ KPI): `label, value, format, unit?, delta, goodWhen, spark?, info?, deltaNote?, deltaCount?`
- `stats.tsx`: `RingStat` (chỉ cho tỉ lệ 0–100 có mẫu số thật; `size=74`, `stroke=6`), `DeltaRow`, `MiniStat`, `ValueList`, `ChipRow`
- `CellBar` (thanh trong ô bảng): `pct, color, text`

## 3. Chọn hình theo việc của dữ liệu

| Dữ liệu cần làm gì | Hình |
|---|---|
| 3–5 con số đầu bài | Một hàng `StatTile`. **Không** dùng biểu đồ chỉ có 1 cột |
| 1 chuỗi theo thời gian | Vùng hoặc đường. Chỉ 1 mốc (mốc tốt nhất) được gắn pill |
| Vào/ra quanh mốc 0 | Cột phân cực, tô bằng token status (`--ok-fill` / `--crit-fill`) |
| Cơ cấu thay đổi theo thời gian | Cột xếp lớp, 3–4 lớp |
| Cơ cấu tại một thời điểm | Donut (≤ 5 lát; nhiều hơn thì kèm bảng ở `aside`) |
| Cột + đường cùng đơn vị | `BarLineChart` / `StackedBarLineChart` |
| Phần còn lại qua từng bậc | Phễu (≤ 5 bậc) |
| Quan hệ 2 biến | Scatter (≤ 3 nhóm) |
| Hồ sơ đa tiêu chí | Radar: 1 chủ thể + 1 tham chiếu, ≤ 8 trục, thang 0–100 |
| Hạng mục có nhãn dài | `HBars` (ngang) |
| Thang có thứ tự, nhãn ngắn | `SimpleBars` (dọc) |
| Nhiều đại lượng khác đơn vị | `SplitBars` |
| Nhiều nhóm có cỡ mẫu lệch mạnh | **Bảng**: cột cỡ mẫu đặt ngay sau tên, sort cỡ mẫu giảm dần |
| Cần đọc số mà không phải rê chuột | **Bảng** |
| Dưới ~12 mốc / trên ~20 mốc | Sparkline đường / `TickSparkline` |

**Cấm tuyệt đối:**
- Biểu đồ 2 trục Y. Mỗi biểu đồ chỉ có 1 trục Y.
- `<Funnel>` hình thang của Recharts, vì mắt người đọc theo diện tích.
- Dữ liệu bịa trong `src/`.

## 4. Ngôn ngữ mark: NODE – VÀNH – PILL

Mỗi mốc dữ liệu là **một chấm có vành**. Con số đáng đọc nằm trên **một pill** đặt ngay cạnh mốc đó.

### Trục và lưới (`axis.ts`)

```ts
AXIS = { fill: 'var(--ink-3)', fontSize: 12.5 }   // dùng fill, KHÔNG dùng stroke (stroke làm chữ nhoè)
GRID = 'var(--grid)'                              // hairline liền, vertical={false}; không nét đứt
AXIS_PAD = { left: 16, right: 16 }                // padding của <XAxis> category (không phải margin)
AXIS_GUTTER = -8      // margin.left khi nhãn Y dài 2–4 ký tự
AXIS_GUTTER_WIDE = 4  // khi nhãn Y từ 5 chữ số trở lên
AXIS_TICK_GAP = 52    // minTickGap cho chuỗi dài
// YAxis width={44} ở mọi khuôn
```

### Node (`nodes.tsx`)

```ts
DOT_RING = { stroke: 'var(--node-ring)', strokeWidth: 2, fillOpacity: 1, strokeOpacity: 1, strokeDasharray: 'none' }
NODE = { r: 4, hotR: 5, sparkR: 3, sparkRing: 1.5, pillEdge: 34 }
HOT_NODE  // activeDot r 5, tô --accent (cam = lớp tương tác)
SOLO_HOT  // đường đơn: activeDot tô --line-solo, chấm --line-solo-hot (tránh cam chồng lên cam)
seriesNode({ color, r?, ring?, lastOnly?, pill?: { at, value, text, title } })
```

- `seriesNode` tự bỏ qua mốc trống (`cy: null`).
- Với `<Area>`, `value` có dạng `[đáy, giá trị]`.
- `pill.value` đóng vai trò **assertion**: nếu không khớp giá trị của mốc thì pill không hiện, thay vì gắn nhầm sang mốc khác.

### Pill

```ts
VALUE_PILL = { h: 22, font: 12.5, padX: 10, gap: 6, ch: 7.5 }   // rx = h/2
// bề rộng ≈ max(h*1.4, len*ch + 2*padX); nền --pill-flat, chữ --on-pill-flat, 600, tabular-nums
PILL_TOP = 34          // margin.top của chart
margin.right = 34      // NODE.pillEdge
```

Cả biểu đồ đường lẫn phễu dùng chung **một cỡ pill**.
`bestIn(values, start, end, goodWhen)` chọn mốc tốt nhất để gắn pill.

### Cột (`marks.tsx`)

- `BAR_R = 6`: bo ở **mép tự do** của cột. `BAR_R_PILL = 999` chỉ dùng cho `RangeBars`.
- Cột xếp lớp:
  - khe giữa các lát 0.5px;
  - hai mép giáp nhau bo 0, chỉ lát trên cùng bo `[6, 6, 0, 0]`;
  - mép thật của cột tính từ **giá trị** (`stackEdges`), không tính từ chỉ số mảng, vì lát cuối có thể bằng 0.
- `barShape(opts)` được truyền vào prop `shape` dưới dạng **hàm**. `activeBar` dùng **cùng object** đó.
- Lớp phủ gradient của cột:
  - Dùng chung một `linearGradient` id `ui-bar-shade`. Def phải đặt **ngay trong shape**: nếu bọc trong component con, Recharts lọc mất mà không báo lỗi.
  - Theme sáng: `--mark-shade: #000`, top 0 → bot 0.2 (tối ở chân cột).
  - Theme tối: `#fff`, top 0.2 → bot 0 (sáng ở đỉnh).
  - Phần tử DOM dùng `--mark-shade-grad` (180deg) và `--mark-shade-grad-x` (90deg, đảo stop).
  - Không áp gradient cho đường, vùng, phễu, donut.

### Hover cột (`axis.ts`)

```ts
HOVER_GLOW = { lift: 3, near: 1.5, far: 5, dim: 0.45, room: 16 }
```

- Vẽ 2 path. Path dưới có `filter: drop-shadow(0 0 1.5px <fill>) drop-shadow(0 0 5px <fill>)` và `opacity .45`. Path trên là cột đục.
- Cột được nhấc lên bằng thuộc tính SVG `transform="translate(0 -3)"`.
- `margin.top` phải lớn hơn hoặc bằng `room`.
- Tooltip của cột đặt `cursor={false}`.
- Đường **không có quầng**, chỉ có `activeDot`.
- Mark dạng DOM dùng `box-shadow` với bán kính **gấp đôi** để trông khớp `drop-shadow`: 1.5 → 3, 5 → 10.
- Vùng bắt chuột tối thiểu 24px.

### Đường, vùng, sparkline

- Đường: `type="monotone"`, `strokeWidth={2}`, `strokeLinecap="round"`.
- Đường tham chiếu: `strokeDasharray='5 4'`, **không có node**.
- Sparkline:
  - `strokeWidth 1.5`, `fillOpacity .14`;
  - chỉ có node ở mốc cuối;
  - `domain={['dataMin','dataMax']}`;
  - cao 34px.

### Donut (`donutCorner.ts`)

```ts
DONUT_INNER = 0.62, OUTER = 0.92, PAD_ANGLE = 3, CORNER = 8, CORNER_MIN = 0.25
```

- `cornerRadius` tính **cho từng lát** (`sliceCorner`). Lý do: Recharts bỏ hẳn bo góc khi lát quá hẹp.
- Lát đang hover chuyển sang vân sọc chéo: `<pattern>` 8×8, `rotate(45)`, nét `--slice-hatch` 3.5px.
- Số tổng ở giữa là lớp HTML `.ui-donut-center` với `pointer-events: none`.

### Phễu

```ts
HEAD = 30, FILL = 0.64, MIN_HH = 1.25, BEND = 1
HALO = [{ px: 14, alpha: .34 }, { px: 14, alpha: .16 }]
FONT = { stage: 12, value: 13, drop: 11.5 }
```

- Pill % hiện ở mọi bậc.
- Màu đi từ đậm sang nhạt theo `funnelSteps`.

### Các khuôn còn lại

- `LayeredArea`:
  - tối đa 3 lớp;
  - fill từ .18 đến .48;
  - chỉ lớp trong cùng có node.
- `ScatterPlot`:
  - chấm R 4.5;
  - vùng bắt chuột HIT 12.
- `RadarChart`:
  - viền 2px;
  - chỉ chủ thể được tô (.07);
  - tham chiếu loại "mục tiêu" vẽ `--ink-3` nét đứt.

## 5. Màu chuỗi và mark

**Chỉ dùng tên token, không gõ hex trong component.**

```ts
SERIES  = ['var(--series-1)', …, 'var(--series-6)']   // seriesColors(n) NÉM nếu n > 6
ORDINAL = ['var(--ord-1)', …, 'var(--ord-5)']
FUNNEL_RAMP = ORDINAL đảo        // bậc đầu đậm nhất
LAYER_RAMP  = ['var(--layer-1)', …]  // sáng = ord-1/3/5, tối = ord-5/3/1 (đảo ở CSS)
rampSteps / layerSteps / funnelSteps  // rải ĐỀU n bậc, không slice
```

**Giá trị Ember:**
- Sáng: `--series-1..6 = #a49c26 #8a6e4d #892d0a #741337 #a15598 #472678`
- Tối: `#fcf264 #cfab7f #da623b #c1466c #f08de4 #845dc8`

Rime và Aurora có bộ riêng (index.css 1130–1460). Riêng `--ok` / `--crit` **không đổi** theo bộ màu.

**Token phụ:**

| Token | Giá trị / vai trò |
|---|---|
| `--node-ring` | Sáng #f8f6f1, tối #453427 |
| `--pill-flat` / `--on-pill-flat` | Sáng #3f3733 / #faf7f3, tối #e8ded4 / #2b2521 |
| `--grid` | Sáng #e6e1d8, tối #3a332f |
| `--bar-fill` | Thanh ngang một màu |
| `--slice-hatch` | Sáng `rgb(255 255 255 / .62)`, tối `rgb(0 0 0 / .3)` |
| `--heat-1..5` | `color-mix` cam 14 / 30 / 48 / 66 / 85% |
| `--series-total` | Chuỗi tổng |
| `--line-solo` / `--line-solo-hot` | Đường đơn |

**Sàn kiểm định** (test `markContrast.test.ts` đọc hex trực tiếp từ CSS):

| Phép đo | Sàn |
|---|---|
| Tương phản mark ↔ **nền tệ nhất** của thẻ kính | ≥ 2:1 |
| ΔE2000 giữa 6 chuỗi | ≥ 15 |
| ΔE khi mô phỏng mù màu (D + P) | ≥ 6 |
| ΔE giữa chuỗi và `--accent-fill` | ≥ 10 |
| ΔE giữa status và chuỗi | ≥ 10 |
| Chữ | ≥ 4.5 |
| Đường kẻ bảng | ≥ 2:1 |

**"Nền tệ nhất" đổi chiều theo theme:**
- Theme sáng: mark phải tối hơn nền, nên ca khó là điểm **tối nhất** của nền.
- Theme tối: ngược lại, ca khó là điểm **sáng nhất**.
- Ember: `#e8dbd0` / `#543a25` · Rime: `#dce4ea` / `#2f3d46` · Aurora: `#e2e0f2` / `#283e3c`.

**Luật đi kèm:**
- Chữ chú giải dùng token **chữ**, không dùng màu chuỗi.
- Ô màu trong chú giải phải mô phỏng đúng hình của mark: `Swatch kind 'bar' | 'dot' | 'line' | 'dash'`, kích thước 11×11, `border-radius: 30%`.
- Mark mang nghĩa tốt/xấu cần thêm một kênh mã hoá thứ hai (vị trí, icon hoặc nhãn), không chỉ dựa vào màu.

## 6. Định dạng số (`ui/format.ts`)

- Mọi hàm nhận `null` và trả về `'—'`. **Không bao giờ trả "0".** Viết `?? 0` tức là bịa số.
- Hàm chính:
  - `jpy`, `count`: in đủ chữ số, dùng trong bảng;
  - `pct`;
  - `pctSigned`: tự thêm dấu `+` / `−` (U+2212);
  - `monthLabel`: đọc chuỗi `YYYY-MM`, không qua `new Date`.
- **Hai hệ đếm:**
  - Tiếng Nhật: 万 (10⁴), 億 (10⁸).
  - Tiếng Việt: nghìn, tr (10⁶), tỷ (10⁹).
  - `moneyScale(target, lang)`:
    - JA: ≥ 1e8 thì `億円` với 2 số lẻ; ≥ 1e4 thì `万円`.
    - VI: ≥ 1e9 thì `tỷ <tiền tệ>`; ≥ 1e6 thì `tr <tiền tệ>`.
  - Ký hiệu tiền tệ trong code nguồn cố định (`円` / `¥`). Đổi theo tiền tệ của repo mới.
- **Đơn vị chọn theo ĐÍCH của hiệu ứng đếm**, không theo giá trị đang hiển thị ở khung hiện tại. Nếu chọn theo khung hiện tại, đơn vị sẽ nhảy từ 万円 sang 億円 giữa chừng.
- `toneOf(delta, goodWhen)` trả 4 tông:

  | Tông | Khi nào | Màu |
  |---|---|---|
  | `good` | Biến động theo hướng tốt | Theo token status |
  | `bad` | Biến động theo hướng xấu | Theo token status |
  | `flat` | delta = 0 | Cam |
  | `none` | delta = null | Xám |

- Icon mũi tên mang **hướng**, màu mang **ý nghĩa** tốt/xấu.

## 7. Tooltip, animation, nạp động

**Tooltip:**
- `Tip` (nhiều dòng): `.ui-tip.ui-glass` trên nền `--glass-fill-panel`, `min-width 9.5rem`, bo 12, chữ .84rem, giá trị `tabular-nums` đậm 600.
- `Pill`: chỉ dùng khi có **đúng 1 chuỗi**. Ô giá trị nền `--accent-fill`.
- Cột xếp lớp: thứ tự dòng trong tooltip **đảo lại** để khớp với hình (lát trên cùng đứng trước).
- Phần nổi lên (`FloatTip`, popover) portal ra body, `position: fixed`, giữ trong khung nhìn và cách mép 8px.

**Animation:**
- `CHART_ANIM_MS = 1000`, `animationEasing: 'ease-out'`, `isAnimationActive = !prefers-reduced-motion`. Recharts không tự đọc cờ reduced-motion nên phải truyền vào.
- `useCountUp` (đếm số):
  - `easeOutCubic = 1 - (1 - t)^3`, chạy bằng rAF;
  - lần mount đầu đếm từ 0, các lần sau đếm từ giá trị đang hiện;
  - `null` thì không đếm; khi reduced-motion thì nhảy thẳng tới giá trị cuối.
- Ô số **bắt buộc** `tabular-nums`.
- Nhịp animation truyền sang CSS qua biến inline `--x-anim: ${CHART_ANIM_MS}ms`.
- Thẻ hiện ra bằng animation thì dùng `fill-mode: backwards` (xem `02` §3, bẫy backdrop root).

**Recharts nạp động:**
- Mọi board đi qua `lazy(boardChunk(...))`.
- Đã đo: nếu import tĩnh, bundle đầu tăng từ 170 lên **578 kB** (gzip từ 55 lên 169).
- Cổng kiểm: `grep -c activeTooltipIndex dist/assets/index-*.js` phải ra 0.

**Brush/zoom (`ChartZoom.tsx`, hiện chưa board nào dùng):**
- Board giữ state `startIndex` / `endIndex`.
- `MIN_WINDOW = 3`.
- 2 nút zoom đóng vai trò đường điều khiển bằng bàn phím.
- Đổi bộ lọc thì reset cửa sổ.

**Khung thẻ biểu đồ:**
- `.ui-chart` cao 15rem; biến thể `--tall` / `--brush` cao 17rem.
- `.ui-card` bắt buộc có `min-width: 0`.

## 8. Bảng số

```html
<div class="ui-tablewrap"><table class="ui-table">
  <thead><tr><SortHead …/></tr></thead>
  <tbody><tr><th scope="row">Tên</th><td class="ui-num">1,234</td></tr></tbody>
</table></div>
<TablePager …/>
```

**CSS:**
- `.ui-tablewrap { position: relative; overflow-x: auto }`.
  - `relative` là bắt buộc. Thiếu nó, phần tử con `absolute` sẽ làm cả trang cuộn ngang.
- `.ui-table`: chữ .86rem, ô `padding: .5rem .6rem`, `white-space: nowrap`.
- `thead th`: .72rem, đậm 600, `letter-spacing: .03em`, màu `--ink-2`. **Không** viết hoa toàn bộ.
- Đường kẻ pha từ `--ink`: giữa các hàng 34%, dưới header 42%.
- `.ui-num`: căn phải và `tabular-nums`.
- Selector phải ghi rõ `thead` / `tbody`. Không viết `.ui-table th` hay `tr:last-child` không kèm ngữ cảnh.
- Ô chứa khoá nghiệp vụ không được dùng `text-transform`.
- Không có sticky header. Bảng rộng cuộn ngang trong thẻ.

**Chia trang (`tablePage.ts`, hàm thuần):**
- `PAGE_SIZES = [20, 50, 100]`.
- Các hàm: `pageCount`, `clampPage`, `pageSlice` (trang đánh số từ 1).
- `pageKeepingRow`: đổi cỡ trang mà vẫn giữ hàng đang ở đầu trong tầm nhìn.
- `pageItems`:
  - ≤ 7 trang thì liệt kê hết;
  - nhiều hơn thì hiện trang đầu, trang cuối, ±1 quanh trang hiện tại, còn lại thay bằng `'gap'`;
  - không dùng `…` để thay cho đúng một trang.
- `TablePager`: `<nav aria-label>`, `aria-current="page"`, chọn cỡ trang bằng `SegmentFilter`. Bảng ≤ 20 hàng thì không hiện thanh chia trang.

**Sắp xếp (`tableSort.ts`, hàm thuần):**
- `sortRows(rows, valueFn, dir)`:
  - sort **ổn định**;
  - ô `null` **luôn nằm cuối** ở cả hai chiều;
  - chuỗi so bằng `Intl.Collator('ja')`.
- `toggleSort`: bấm lần đầu vào cột số thì `desc`, cột chữ thì `asc`.
- `SortHead`: `<th aria-sort>` bọc một `<button>`. Ở cột số, icon nằm bên trái chữ.
- Đổi cách sort thì `setPage(1)`.
- Bảng đã có cột sort được thì bỏ bộ lọc thứ tự riêng.
- Mẫu ghép (board giữ state, phần thuần làm hết việc):
  ```tsx
  const [sort, setSort] = useState<SortState>({ key: 'total', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(20);
  const sorted = sortRows(rows, r => r[sort.key], sort.dir);
  const cur = clampPage(page, sorted.length, size);
  const { from, to } = pageSlice(cur, sorted.length, size);
  const shown = sorted.slice(from, to);
  // SortHead onClick: setSort(s => toggleSort(s, key, isNumeric ? 'desc' : 'asc')); setPage(1);
  ```

**CellBar:** thanh tỉ lệ nằm **cùng ô** với con số, không thay thế con số.
- Rãnh cao .5rem, bo 999, nền ink 9%.
- Thanh có `min-width: 2px`.
- Phần số có `min-width: 3.4rem`.
