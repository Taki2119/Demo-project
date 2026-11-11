# 03 · Charts and number tables

This whole layer lives in the original repo's `src/ui/viz/` and `src/ui/table*.ts`. It depends only on React 18,
Recharts 2.x and the CSS tokens. Where the original docs and the code disagree, this file **follows the code**.

## 1. Three general rules (apply to every template)

1. **Components do not format numbers themselves.** The caller passes `format: (v) => string` or an already formatted string.
2. **`goodWhen: 'up' | 'down'` has no default value.** With a default of `'up'`, a rising metric like churn would be colored green.
3. **No ad-hoc font sizes.** Font sizes come from the shared scale (`02-DESIGN-SYSTEM.md` §2).

Every template takes its animation props from `useChartAnim()` (`motion.ts`).

## 2. Twelve chart templates

| File | Used for | Main props | How it draws |
|---|---|---|---|
| `charts/SimpleBars.tsx` | Comparing heights across discrete categories, or a short time series with 1 series | `data, xKey, valueKey, label, color, format, head?, maxBarSize=26` | Recharts `BarChart` |
| `charts/ComboCharts.tsx › BarLineChart` | Bars + 1 line, **same unit** | `data, xKey, bar, line{key,label,color,dashed?}, format, xTickFormat?, maxBarSize=22` | Recharts `ComposedChart` |
| `ComboCharts.tsx › StackedBarLineChart` | Stacked bars (a partition), optionally with a line | `stacks: BarSpec[]` (first element at the bottom), `line?`, `wideAxis?`, `maxBarSize=26` | Recharts |
| `charts/MultiLines.tsx` | 2–6 series of the same unit over time | `data, xKey, series[{key,label,color}], format` (`MULTI_LINES_MAX=6`) | Recharts `LineChart` |
| `charts/LayeredArea.tsx` | 2–3 **nested** series (sent ≥ opened ≥ clicked) | `data, xKey, layers[{key,label}]` (first element is the outermost layer), `format`; no color prop | Recharts `AreaChart` |
| `charts/DonutList.tsx` | Composition at **one point in time**, 2–5 slices | `slices[{key,label,value,color}], total, totalUnit?, format, formatPct, aside?` (`DONUT_MAX_SLICES=5`) | Recharts `Pie` |
| `charts/FunnelChart.tsx` | Pass-through rate across 3–5 nested steps | `rows[{key,label,value}], formatValue, formatPct, stepLabel, topLabel, valueLabel` | **Hand-drawn SVG** (cubic bands) |
| `charts/RadarChart.tsx` | Profile of 1 subject on ≤ 8 criteria on the same scale | `data[{key,label,subject,reference}], subjectLabel, referenceLabel, color, max=100, format` | Recharts `RadarChart` (circle) |
| `charts/RangeBars.tsx` | Actual level against a ceiling (bullet style) | `rows[{key,label,value,track}], color, format, formatPct, …` | Recharts, padding slice `track − value` |
| `charts/ScatterPlot.tsx` | Relationship between 2 variables, ≤ 3 groups | `data[{id,name,x,y,series}], series, xLabel, yLabel, formatX, formatY` | Recharts `ScatterChart` |
| `charts/HBars.tsx › HBars` | Rankings, long Japanese labels | `rows[{key,label,value,text,note?,color?}], max?, labelW=7` (rem) | **Plain DOM** |
| `HBars.tsx › SplitBars` | Part of a total, each row in a **different unit** (normalized to 100%) | `rows[{key,label,pct,lead,trail,text}], labelW=9` | **Plain DOM** |
| `charts/HeatGrid.tsx` | One quantity spread over 2 category dimensions | `cols, rows[{label,values}], top, formatCell, formatTip, valueLabel, emptyLabel` | DOM/table + `FloatTip` |
| `charts/TickSparkline.tsx` | The shape of many discrete points (≥ ~20 points) | `values, color='var(--line-solo)', tick=3, gap=2, emphasizeLast=1` | **Hand-drawn SVG** |

Text/number templates:
- `StatTile` (KPI tile): `label, value, format, unit?, delta, goodWhen, spark?, info?, deltaNote?, deltaCount?`
- `stats.tsx`: `RingStat` (only for 0–100 ratios with a real denominator; `size=74`, `stroke=6`), `DeltaRow`, `MiniStat`, `ValueList`, `ChipRow`
- `CellBar` (bar inside a table cell): `pct, color, text`

## 3. Choosing a form by what the data has to do

| What the data needs to do | Form |
|---|---|
| 3–5 headline numbers | A row of `StatTile`s. Do **not** use a chart with just 1 bar |
| 1 series over time | Area or line. Only 1 point (the best point) gets a pill |
| In/out around zero | Diverging bars, colored with status tokens (`--ok-fill` / `--crit-fill`) |
| Composition changing over time | Stacked bars, 3–4 layers |
| Composition at one point in time | Donut (≤ 5 slices; more than that, add a table in `aside`) |
| Bars + line in the same unit | `BarLineChart` / `StackedBarLineChart` |
| What remains through each step | Funnel (≤ 5 steps) |
| Relationship between 2 variables | Scatter (≤ 3 groups) |
| Multi-criteria profile | Radar: 1 subject + 1 reference, ≤ 8 axes, 0–100 scale |
| Categories with long labels | `HBars` (horizontal) |
| Ordered scale, short labels | `SimpleBars` (vertical) |
| Several quantities in different units | `SplitBars` |
| Many groups with highly uneven sample sizes | **Table**: sample-size column right after the name, sorted by sample size descending |
| Numbers must be readable without hovering | **Table** |
| Under ~12 points / over ~20 points | Line sparkline / `TickSparkline` |

**Strictly forbidden:**
- Dual-Y-axis charts. Each chart has only 1 Y axis.
- Recharts' trapezoid `<Funnel>`, because the eye reads area.
- Made-up data in `src/`.

## 4. Mark language: NODE – RING – PILL

Every data point is **a dot with a ring**. The number worth reading sits on **a pill** placed right next to that point.

### Axes and grid (`axis.ts`)

```ts
AXIS = { fill: 'var(--ink-3)', fontSize: 12.5 }   // use fill, NOT stroke (stroke blurs the text)
GRID = 'var(--grid)'                              // solid hairline, vertical={false}; no dashes
AXIS_PAD = { left: 16, right: 16 }                // padding of the category <XAxis> (not margin)
AXIS_GUTTER = -8      // margin.left when Y labels are 2–4 characters long
AXIS_GUTTER_WIDE = 4  // when Y labels have 5 or more digits
AXIS_TICK_GAP = 52    // minTickGap for long series
// YAxis width={44} in every template
```

### Node (`nodes.tsx`)

```ts
DOT_RING = { stroke: 'var(--node-ring)', strokeWidth: 2, fillOpacity: 1, strokeOpacity: 1, strokeDasharray: 'none' }
NODE = { r: 4, hotR: 5, sparkR: 3, sparkRing: 1.5, pillEdge: 34 }
HOT_NODE  // activeDot r 5, filled --accent (orange = interaction layer)
SOLO_HOT  // single line: activeDot filled --line-solo, dot --line-solo-hot (avoids orange on orange)
seriesNode({ color, r?, ring?, lastOnly?, pill?: { at, value, text, title } })
```

- `seriesNode` skips empty points automatically (`cy: null`).
- For `<Area>`, `value` has the form `[base, value]`.
- `pill.value` acts as an **assertion**: if it does not match the point's value, the pill is not shown, rather than being attached to the wrong point.

### Pill

```ts
VALUE_PILL = { h: 22, font: 12.5, padX: 10, gap: 6, ch: 7.5 }   // rx = h/2
// width ≈ max(h*1.4, len*ch + 2*padX); background --pill-flat, text --on-pill-flat, 600, tabular-nums
PILL_TOP = 34          // chart margin.top
margin.right = 34      // NODE.pillEdge
```

Line charts and funnels share **one pill size**.
`bestIn(values, start, end, goodWhen)` picks the best point to attach the pill to.

### Bars (`marks.tsx`)

- `BAR_R = 6`: rounding on the bar's **free edge**. `BAR_R_PILL = 999` is only for `RangeBars`.
- Stacked bars:
  - 0.5px gap between slices;
  - touching edges have radius 0, only the top slice is rounded `[6, 6, 0, 0]`;
  - the bar's real edge is computed from the **values** (`stackEdges`), not from the array index, because the last slice can be 0.
- `barShape(opts)` is passed to the `shape` prop as a **function**. `activeBar` uses **the same object**.
- Bar gradient overlay:
  - Shares one `linearGradient` with id `ui-bar-shade`. The def must sit **directly in the shape**: wrapped in a child component, Recharts silently filters it out.
  - Light theme: `--mark-shade: #000`, top 0 → bot 0.2 (darker at the bar's foot).
  - Dark theme: `#fff`, top 0.2 → bot 0 (brighter at the top).
  - DOM elements use `--mark-shade-grad` (180deg) and `--mark-shade-grad-x` (90deg, stops reversed).
  - No gradient on lines, areas, funnels, donuts.

### Bar hover (`axis.ts`)

```ts
HOVER_GLOW = { lift: 3, near: 1.5, far: 5, dim: 0.45, room: 16 }
```

- Draw 2 paths. The lower path has `filter: drop-shadow(0 0 1.5px <fill>) drop-shadow(0 0 5px <fill>)` and `opacity .45`. The upper path is the opaque bar.
- The bar is lifted with the SVG attribute `transform="translate(0 -3)"`.
- `margin.top` must be greater than or equal to `room`.
- Bar tooltips set `cursor={false}`.
- Lines have **no glow**, only `activeDot`.
- DOM marks use `box-shadow` with **double** the radius to visually match `drop-shadow`: 1.5 → 3, 5 → 10.
- Minimum hit area 24px.

### Lines, areas, sparklines

- Lines: `type="monotone"`, `strokeWidth={2}`, `strokeLinecap="round"`.
- Reference lines: `strokeDasharray='5 4'`, **no nodes**.
- Sparklines:
  - `strokeWidth 1.5`, `fillOpacity .14`;
  - a node on the last point only;
  - `domain={['dataMin','dataMax']}`;
  - 34px tall.

### Donut (`donutCorner.ts`)

```ts
DONUT_INNER = 0.62, OUTER = 0.92, PAD_ANGLE = 3, CORNER = 8, CORNER_MIN = 0.25
```

- `cornerRadius` is computed **per slice** (`sliceCorner`). Reason: Recharts drops rounding entirely when a slice is too narrow.
- The hovered slice switches to diagonal hatching: `<pattern>` 8×8, `rotate(45)`, stroke `--slice-hatch` 3.5px.
- The total in the center is an HTML layer `.ui-donut-center` with `pointer-events: none`.

### Funnel

```ts
HEAD = 30, FILL = 0.64, MIN_HH = 1.25, BEND = 1
HALO = [{ px: 14, alpha: .34 }, { px: 14, alpha: .16 }]
FONT = { stage: 12, value: 13, drop: 11.5 }
```

- A % pill is shown at every step.
- Colors go from dark to light following `funnelSteps`.

### Remaining templates

- `LayeredArea`:
  - at most 3 layers;
  - fill from .18 to .48;
  - only the innermost layer has nodes.
- `ScatterPlot`:
  - dot R 4.5;
  - hit area HIT 12.
- `RadarChart`:
  - 2px outline;
  - only the subject is filled (.07);
  - a "target"-type reference is drawn in `--ink-3`, dashed.

## 5. Series and mark colors

**Use token names only; never type hex in a component.**

```ts
SERIES  = ['var(--series-1)', …, 'var(--series-6)']   // seriesColors(n) THROWS if n > 6
ORDINAL = ['var(--ord-1)', …, 'var(--ord-5)']
FUNNEL_RAMP = ORDINAL reversed        // the first step is the darkest
LAYER_RAMP  = ['var(--layer-1)', …]  // light = ord-1/3/5, dark = ord-5/3/1 (reversed in CSS)
rampSteps / layerSteps / funnelSteps  // spread n steps EVENLY, no slicing
```

**Ember values:**
- Light: `--series-1..6 = #a49c26 #8a6e4d #892d0a #741337 #a15598 #472678`
- Dark: `#fcf264 #cfab7f #da623b #c1466c #f08de4 #845dc8`

Rime and Aurora have their own sets (index.css 1130–1460). Only `--ok` / `--crit` **do not change** with the palette.

**Secondary tokens:**

| Token | Value / role |
|---|---|
| `--node-ring` | Light #f8f6f1, dark #453427 |
| `--pill-flat` / `--on-pill-flat` | Light #3f3733 / #faf7f3, dark #e8ded4 / #2b2521 |
| `--grid` | Light #e6e1d8, dark #3a332f |
| `--bar-fill` | Single-color horizontal bar |
| `--slice-hatch` | Light `rgb(255 255 255 / .62)`, dark `rgb(0 0 0 / .3)` |
| `--heat-1..5` | `color-mix` orange 14 / 30 / 48 / 66 / 85% |
| `--series-total` | Total series |
| `--line-solo` / `--line-solo-hot` | Single line |

**Verification floors** (the `markContrast.test.ts` test reads hex directly from the CSS):

| Measure | Floor |
|---|---|
| Contrast mark ↔ **worst background** of a glass card | ≥ 2:1 |
| ΔE2000 between the 6 series | ≥ 15 |
| ΔE under color-blindness simulation (D + P) | ≥ 6 |
| ΔE between a series and `--accent-fill` | ≥ 10 |
| ΔE between status and series | ≥ 10 |
| Text | ≥ 4.5 |
| Table rules | ≥ 2:1 |

**The "worst background" flips with the theme:**
- Light theme: marks must be darker than the background, so the hard case is the background's **darkest** point.
- Dark theme: the reverse; the hard case is the **brightest** point.
- Ember: `#e8dbd0` / `#543a25` · Rime: `#dce4ea` / `#2f3d46` · Aurora: `#e2e0f2` / `#283e3c`.

**Accompanying rules:**
- Legend text uses **text** tokens, not series colors.
- A legend swatch must mimic the mark's shape: `Swatch kind 'bar' | 'dot' | 'line' | 'dash'`, size 11×11, `border-radius: 30%`.
- Marks carrying a good/bad meaning need a second encoding channel (position, icon or label), not color alone.

## 6. Number formatting (`ui/format.ts`)

- Every function accepts `null` and returns `'—'`. **Never return "0".** Writing `?? 0` means making up a number.
- Main functions:
  - `jpy`, `count`: print all digits, used in tables;
  - `pct`;
  - `pctSigned`: adds the `+` / `−` sign (U+2212) itself;
  - `monthLabel`: reads a `YYYY-MM` string, not via `new Date`.
- **Two counting systems:**
  - Japanese: 万 (10⁴), 億 (10⁸).
  - Vietnamese: nghìn, tr (10⁶), tỷ (10⁹).
  - `moneyScale(target, lang)`:
    - JA: ≥ 1e8 gives `億円` with 2 decimals; ≥ 1e4 gives `万円`.
    - VI: ≥ 1e9 gives `tỷ <currency>`; ≥ 1e6 gives `tr <currency>`.
  - The currency symbol is hard-coded in the source code (`円` / `¥`). Change it to the new repo's currency.
- **The unit is chosen from the TARGET of the count-up effect**, not from the value shown in the current frame. Choosing from the current frame makes the unit jump from 万円 to 億円 midway.
- `toneOf(delta, goodWhen)` returns 4 tones:

  | Tone | When | Color |
  |---|---|---|
  | `good` | Change in the good direction | Per status token |
  | `bad` | Change in the bad direction | Per status token |
  | `flat` | delta = 0 | Orange |
  | `none` | delta = null | Gray |

- The arrow icon carries the **direction**; the color carries the good/bad **meaning**.

## 7. Tooltip, animation, lazy-loading

**Tooltip:**
- `Tip` (multi-line): `.ui-tip.ui-glass` on a `--glass-fill-panel` background, `min-width 9.5rem`, radius 12, text .84rem, values `tabular-nums` weight 600.
- `Pill`: only when there is **exactly 1 series**. The value cell has an `--accent-fill` background.
- Stacked bars: the tooltip's row order is **reversed** to match the picture (top slice first).
- Floating parts (`FloatTip`, popover) portal to body, `position: fixed`, stay within the viewport with an 8px margin from the edges.

**Animation:**
- `CHART_ANIM_MS = 1000`, `animationEasing: 'ease-out'`, `isAnimationActive = !prefers-reduced-motion`. Recharts does not read the reduced-motion flag itself, so it must be passed in.
- `useCountUp` (number count-up):
  - `easeOutCubic = 1 - (1 - t)^3`, driven by rAF;
  - the first mount counts from 0, later updates count from the value currently shown;
  - `null` does not count; under reduced-motion it jumps straight to the final value.
- Number cells **must** use `tabular-nums`.
- The animation timing is passed to CSS via the inline variable `--x-anim: ${CHART_ANIM_MS}ms`.
- Cards that appear via animation use `fill-mode: backwards` (see `02` §3, the backdrop root pitfall).

**Recharts lazy-loaded (dynamic import):**
- Every board goes through `lazy(boardChunk(...))`.
- Measured: with a static import, the initial bundle grows from 170 to **578 kB** (gzip from 55 to 169).
- Gate: `grep -c activeTooltipIndex dist/assets/index-*.js` must return 0.

**Brush/zoom (`ChartZoom.tsx`, not used by any board yet):**
- The board holds the `startIndex` / `endIndex` state.
- `MIN_WINDOW = 3`.
- 2 zoom buttons serve as the keyboard control path.
- Changing a filter resets the window.

**Chart card frame:**
- `.ui-chart` is 15rem tall; the `--tall` / `--brush` variants are 17rem.
- `.ui-card` must have `min-width: 0`.

## 8. Number tables

```html
<div class="ui-tablewrap"><table class="ui-table">
  <thead><tr><SortHead …/></tr></thead>
  <tbody><tr><th scope="row">Name</th><td class="ui-num">1,234</td></tr></tbody>
</table></div>
<TablePager …/>
```

**CSS:**
- `.ui-tablewrap { position: relative; overflow-x: auto }`.
  - `relative` is mandatory. Without it, an `absolute` child makes the whole page scroll horizontally.
- `.ui-table`: text .86rem, cells `padding: .5rem .6rem`, `white-space: nowrap`.
- `thead th`: .72rem, weight 600, `letter-spacing: .03em`, color `--ink-2`. **No** all-caps.
- Rules mixed from `--ink`: between rows 34%, under the header 42%.
- `.ui-num`: right-aligned and `tabular-nums`.
- Selectors must name `thead` / `tbody` explicitly. Do not write `.ui-table th` or `tr:last-child` without context.
- Cells holding business keys must not use `text-transform`.
- No sticky header. Wide tables scroll horizontally inside the card.

**Pagination (`tablePage.ts`, pure functions):**
- `PAGE_SIZES = [20, 50, 100]`.
- Functions: `pageCount`, `clampPage`, `pageSlice` (pages numbered from 1).
- `pageKeepingRow`: changes the page size while keeping the current top row in view.
- `pageItems`:
  - ≤ 7 pages: list them all;
  - more: show the first page, the last page, ±1 around the current page, and replace the rest with `'gap'`;
  - never use `…` to stand in for exactly one page.
- `TablePager`: `<nav aria-label>`, `aria-current="page"`, page size picked with `SegmentFilter`. Tables with ≤ 20 rows do not show the pager.

**Sorting (`tableSort.ts`, pure functions):**
- `sortRows(rows, valueFn, dir)`:
  - **stable** sort;
  - `null` cells **always go last** in both directions;
  - strings compared with `Intl.Collator('ja')`.
- `toggleSort`: the first click on a numeric column gives `desc`, on a text column `asc`.
- `SortHead`: `<th aria-sort>` wrapping a `<button>`. In numeric columns, the icon sits left of the text.
- Changing the sort calls `setPage(1)`.
- A table that already has sortable columns drops any separate ordering filter.
- Wiring pattern (the board holds state, the pure part does all the work):
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

**CellBar:** the ratio bar sits **in the same cell** as the number; it does not replace the number.
- Track .5rem tall, radius 999, ink 9% background.
- The bar has `min-width: 2px`.
- The number part has `min-width: 3.4rem`.
