# 02 · Hệ thiết kế: token, liquid glass, vỏ app, motion

Số dòng `index.css:N` trỏ vào file `src/index.css` của repo gốc, tại thời điểm 2026-11-11.

## 1. Hai trục theme, ghi bằng attribute trên `<html>`

| Trục | Attribute | Store | Khoá localStorage | Mặc định |
|---|---|---|---|---|
| Sáng/tối | `data-theme="light\|dark"` | `ui/theme.ts` (`light \| dark \| system`) | `<app>.theme` | `system` |
| Bộ màu | `data-palette="ember\|rime\|aurora"` | `ui/palette.ts` (khai `PALETTES` ở MỘT chỗ) | `<app>.palette` | `ember` |

**Quy ước:**
- Attribute luôn ghi giá trị **đã giải**, không bao giờ ghi `system`.
- `initTheme()` nghe `prefers-color-scheme`, nhưng chỉ đổi theme khi người dùng đang chọn `system`.
- Bộ màu mặc định **không có block CSS riêng**: nó chính là `:root` + `[data-theme='dark']`.
- Tailwind v4 dark variant cũng đọc attribute này:
  `@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));`

**Chống loé màu trước lần vẽ đầu (prePaint):**
- Đặt một `<script>` **thường**, không phải `type=module`, trong `<head>` của `index.html`.
- Script đọc 2 khoá localStorage và set cả 2 attribute trước khi `<body>` được vẽ.
- Module script là defer, nên nếu chờ tới `main.tsx` thì người dùng theme tối sẽ thấy màn loé trắng.
- Có test (`prePaint.test.ts`) khoá để script này và store dùng cùng khoá, cùng tập giá trị.

**Chuyển theme / bộ màu bằng View Transitions** (`ui/viewSwitch.ts`):
- `::view-transition-old/new(root)` chỉ animate **opacity**:
  `--switch-dur: .34s`, `--switch-ease: cubic-bezier(.25,.46,.45,.94)`.
- Không dùng `transition` toàn trang, vì nó buộc tính lại `backdrop-filter` ở mỗi khung hình.

## 2. Bảng token (3 bộ × sáng/tối)

| Token | Ember sáng | Ember tối | Rime sáng | Rime tối | Aurora sáng | Aurora tối |
|---|---|---|---|---|---|---|
| `--ground` | #e7e3db | #252220 | #dde5eb | #202325 | #e6e1eb | #232129 |
| `--surface` | #fdfcfa | #302b28 | #fbfcfe | #282d30 | #fdfbfe | #2c2b33 |
| `--surface-2` | #dcd6cb | #3a3430 | #ced8e1 | #31363b | #d9d4e1 | #36343e |
| `--line` | #cdc5b8 | #453e39 | #bcc8d2 | #3a4046 | #c9c3d2 | #403d49 |
| `--line-soft` | #ded7cc | #372f2b | #cfdae2 | #2b3237 | #dbd5e2 | #312f3a |
| `--ink` | #1c1917 | #ede8e4 | #171a1c | #e5eaee | #2f2145 | #ece3f8 |
| `--ink-2` | #4d453f | #c3b8b0 | #40484e | #b2bcc5 | #504268 | #c7b8da |
| `--ink-3` | #7c716a | #a2958c | #69737b | #8e9aa4 | #6d6085 | #a999be |
| `--accent` (đồ hoạ, ≥3:1) | #c2571a | #ff943d | #0082c7 | #61bcff | #b446d3 | #e38bfe |
| `--accent-text` (chữ, ≥4.5:1) | #9c400c | #ffb370 | #00669d | #8fcdff | #9328b0 | #e7aff8 |
| `--accent-hover` | #a44712 | #ffab3d | #006da8 | #8fcdff | #923daa | #e7aff8 |
| `--accent-fill` (nút đặc) | #bd5417 | #ff9a1f | #0079ba | #61bcff | #a145bb | #e38bfe |
| `--on-accent` | #fff | #2a1c0e | #fff | #11212e | #fff | #210b27 |
| `--glass-fill-panel` | rgba(253,252,250,.55) | rgba(48,43,40,.48) | rgba(251,252,254,.55) | rgba(40,45,48,.48) | rgba(253,251,254,.55) | rgba(44,43,51,.48) |
| `--glass-fill-viz` | α .42 | α .28 | α .42 | α .28 | α .42 | α .28 |
| `--net-line` | #a8480f | #ffb370 | #006fab | #8fcdff | #0e8a6c | #70e9b9 |

**Token chung** (khai ở `:root`, các bộ màu kế thừa trừ khi khai lại):

- **Kính, theme sáng:**
  - `--glass-fill` rgba(255,255,255,.32)
  - `--glass-edge` .78
  - `--glass-spec` .95
  - `--glass-spec-lo` .22
  - `--glass-fill-ctl` .62
  - `--glass-shadow: 0 10px 34px -12px rgba(28,25,23,.30)`
- **Kính, theme tối:** fill .10 · edge .20 · spec .34 · spec-lo .07 · shadow dùng `rgba(0,0,0,.6)`.
- **Trạng thái** (không đổi theo bộ màu):
  - `--ok / --warn / --crit`: sáng #15803d / #b45309 / #b91c1c; tối #4ade80 / #fbbf24 / #fca5a5.
  - Nút nguy hiểm dùng `--btn-danger #dc2626`, hover #c81e1e. **Không** dùng `--crit` cho nút, vì bản tối của nó là màu hồng nhạt dành cho chữ.
- **Ô nhập / công tắc** (pha bằng `color-mix`, một dòng đúng cho cả 3 bộ):
  - `--field-fill`: surface 62%
  - `--field-line`: ink 16%
  - `--toggle-track`: ink 6.5%
- **Thanh cuộn:** `--scroll-thumb` ink 26%, `--scroll-thumb-hi` ink 42%.
- **Nhịp chuyển động:**
  - `--menu-open-dur .32s` / `cubic-bezier(.25,.46,.45,.94)`
  - `--menu-close-dur .2s` / `cubic-bezier(.4,0,1,1)`
  - `--pop-item-dur .26s` / `cubic-bezier(.2,.9,.3,1.35)`
  - `--screen-dur .26s`
- **Bố cục:**
  - `--screen-pad 1.25rem`
  - `--main-bleed 9rem`
  - `--sidenav-w 16.25rem`
  - `--sidenav-rail-w 3.4rem`
  - `--blk-in 12px`
  - `--blk-out 24px`
- **Mark dữ liệu** (`--series-*`, `--ord-*`, …): xem `03-CHARTS-TABLES.md` §4. Nhóm này **đổi theo bộ màu**.

**Luật màu:**
1. Tách accent cho **đồ hoạ** (`--accent`, sàn 3:1) khỏi accent cho **chữ** (`--accent-text`, sàn 4.5:1).
2. Nền sáng không dùng trắng tinh, nền tối không dùng đen tuyền. Kính cần một nền có tông để đọc ra.
3. Mọi block `[data-palette='x'][data-theme='dark']` phải khai **đủ đúng tập token** như block sáng tương ứng.
   Thiếu token nào thì giá trị sáng của nó rò sang theme tối mà không có cảnh báo.
4. `--accent` chỉ dùng cho **lớp tương tác** (hover, focus, pill tooltip), không bao giờ dùng để tô dữ liệu.

**Font** (tải từ Google Fonts trong `index.html`):
```css
--font-text:    'Space Grotesk','Zen Kaku Gothic New','Noto Sans JP',system-ui,sans-serif; /* mọi chữ */
--font-display: 'Outfit','Zen Kaku Gothic New',system-ui,sans-serif; /* CHỈ logo + số lớn scoreboard */
```

**Thang chữ:**

| Vị trí | Cỡ |
|---|---|
| H1 | 1.62rem |
| H2 thẻ | 1.02rem |
| Phụ đề | 0.82rem |
| Số KPI | 1.9rem |
| Tooltip | 0.84rem |
| Bảng | 0.86rem |

**Cỡ khác:**
- Bán kính: nút 999px (dạng viên thuốc) · thẻ 16 · panel 20 · menu 16 · dialog 14 · ô nhập 8.
- `body`: nền `--ground`, chữ `--ink`, 16px, `line-height: 1.6`.
- `h1–h4`: `letter-spacing: -0.02em`, `text-wrap: balance`.
- `:focus-visible`: outline 2px `--focus`, offset 2, bo 6.
- `.ui-num { font-variant-numeric: tabular-nums }`.
- `button { user-select: none; -webkit-user-select: none }`. **Chỉ áp cho nút**, để chữ nội dung vẫn copy được.

## 3. Liquid glass: `backdrop-filter` khai ở đúng MỘT chỗ

```css
.ui-glass {
  --glass-blur: 16px; --glass-sat: 180%;
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  border: 1px solid var(--glass-edge);
  box-shadow: inset 0 1px 0 var(--glass-spec), inset 0 -1px 0 var(--glass-spec-lo), var(--glass-shadow);
}
```

Mỗi bề mặt chỉ vặn 2 núm, và **rule vặn phải đứng SAU `.ui-glass` trong file**, vì các rule này có cùng specificity:

| Bề mặt | blur | saturate | fill |
|---|---|---|---|
| Mặc định (tooltip, pill) | 16px | 180% | `--glass-fill` |
| Header / thẻ login | 12px | 170% | |
| `.ui-viz` (thẻ KPI/chart) | 20px | **120%** | `--glass-fill-viz` |
| Menu / popover / dialog | 26px | 180% | `--glass-fill-panel` |
| Side panel / panel lớn / NoData | 28px | 150% | |

**Luật dùng kính:**
- Thêm panel mới thì chỉ cần thêm class `.ui-glass`.
- Thẻ dữ liệu để `saturate` thấp, để nền không tranh màu với mark.
- **Không lồng kính.** Nút hoặc công tắc nằm trong panel kính phải dùng thân đục.
- Có `backdrop-filter` thì mỗi khung hình tốn khoảng gấp 2–3 lần. Chi phí đến từ việc *có* filter, không đến từ bán kính blur,
  nên **đừng tối ưu bằng cách hạ blur**.
- Khi mở menu hoặc modal, đặt cờ `[data-menu-open]` / `[data-modal-open]` trên `<html>`.
  Lúc đó `.ui-main` nhận `opacity: .45; filter: blur(12px)`. Nền ambient giữ nguyên.
  **Không** dùng màn che có màu nền, vì làm vậy xoá mất nền và kính trông thành tấm đục.

**Bẫy về kính:**
1. **Backdrop root.** Kính bên trong một tổ tiên có `filter`, `opacity<1`, `mask`, `mix-blend-mode`, `contain:paint`
   hoặc `backdrop-filter` sẽ chỉ nhoè được nền rỗng. Animation còn giữ `opacity` sau khi chạy xong
   (`fill-mode: both/forwards`) cũng gây ra lỗi này. Cách xử lý:
   - animation hiện vào dùng `animation-fill-mode: backwards`;
   - popover, menu, dialog, toast **portal ra `document.body`**.
2. **`backdrop-filter` và `filter` tạo containing block** cho phần tử con `position: fixed`. Đây là lý do thứ hai phải portal.
3. **IACVT + Safari.** Một khai báo có `var()` cho ra giá trị không hợp lệ thì rơi về `none`,
   **không** rơi về khai báo đứng trước. WebKit coi `-webkit-backdrop-filter` là bí danh, nên mất trắng kính.
   Hệ quả: đừng đưa `url(#svg-filter)` vào `backdrop-filter`.
4. **Lightning CSS (Tailwind v4) viết lại `@supports`** lúc build. Vì vậy không đặt khai báo kính trong `@supports`,
   và luôn grep `dist/` sau khi build.

## 4. Vỏ app và vùng cuộn

```
.ui-app  (display:flex row; height:100dvh; overflow:hidden; position:relative)
 ├─ .ui-sidenav  (cột kính; bung 16.25rem / gập 3.4rem)
 └─ .ui-body     (flex:1 1 0; min-height:0; min-width:0; flex column)
     ├─ .ui-topbars (flex:none; z-index:10)
     └─ .ui-main    (ô cuộn DUY NHẤT: flex:1 1 0; min-height:0; min-width:0; overflow-y:auto; z-index:1;
                     margin-top:calc(-1*var(--main-bleed)); padding-top:var(--main-bleed);
                     scroll-padding-top:var(--main-bleed))
         └─ .ui-screen (max-width:84rem; margin:0 auto; padding:1.5rem var(--screen-pad) 3rem)
.ui-ambient  (position:fixed; inset:0; z-index:0; pointer-events:none)
```

**Vì sao vỏ được dựng như trên:**
- **Ô cuộn là `.ui-main`, không phải document.** Thanh cuộn không vắt qua header. Cặp `margin-top` âm và
  `padding-top` dương cùng đọc `--main-bleed` để nội dung trèo được ra sau dải kính phía trên mà không cần đo bằng JS.
- `flex: 1 1 0` **và** `min-height: 0` chặn hai lỗi khác nhau. Cả hai lỗi đều không báo gì, nên phải giữ đủ hai khai báo.
- Đặt `max-width` ở `.ui-screen`, **không** đặt ở ô cuộn. Đặt ở ô cuộn thì thanh cuộn mọc giữa màn hình.
- Khi đổi route, cuộn về đầu bằng `useLayoutEffect` trên chính ô cuộn. Gọi `window.scrollTo` sẽ không có tác dụng gì.
- Sự kiện `scroll` của element **không nổi bọt** lên window. Popover nào cần đặt lại vị trí khi cuộn phải nghe
  `addEventListener('scroll', fn, true)` (capture).
- **Đường lui cho `100dvh`:** dùng `@supports not (height:100dvh) { .ui-app { height:100vh } }`.
  Không viết cặp `height:100vh; height:100dvh;` liền nhau, vì Lightning CSS sẽ gộp hai dòng và đường lui mất theo.

**Breakpoint ≤640px:**
- Side panel thành dải icon kèm **ngăn kéo**: `position: fixed; z-index: 40`, rộng `min(var(--sidenav-w), 100vw - 2.5rem)`.
- Lớp phủ (scrim) dùng z-index 39, màu `rgba(12,10,8,.28)`.
- Khi mở ngăn kéo, gắn `inert` cho `.ui-body`.
- Dưới `pointer: coarse`, nút nhỏ hơn 24px được nới vùng bấm bằng `::after` trong suốt.

**Thứ tự lớp (z-index):**

| Lớp | z-index |
|---|---|
| Rail | 2 |
| Scrim | 5 |
| Topbars | 10 |
| Menu | 30 |
| Ngăn kéo | 40 |
| Dialog | 60 |

**Thanh cuộn: một kiểu cho toàn app**
```css
@supports not selector(::-webkit-scrollbar){ *{scrollbar-width:thin; scrollbar-color:var(--scroll-thumb) transparent} }
::-webkit-scrollbar{width:11px;height:11px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--scroll-thumb);border-radius:9999px;border:3px solid transparent;background-clip:padding-box}
::-webkit-scrollbar-thumb:hover{background:var(--scroll-thumb-hi);background-clip:padding-box}
```
Nhánh chuẩn (`scrollbar-color`) phải nằm trong `@supports not`. Nếu khai thẳng, Chromium sẽ bỏ cả khối `::-webkit-scrollbar`.

## 5. Hover và chuyển động

**Nút phẳng** (mọi nút đều là nút phẳng; kính chỉ dành cho thẻ, panel và popover):

| Trạng thái | Cách hiển thị |
|---|---|
| Nghỉ | Thân đục `--surface`, vành `0 0 0 1px` ink 11% |
| Hover, theme sáng | `translateY(-2px)` + bóng đổ xuống, không có quầng |
| Hover, theme tối | Nhấc 1px + quầng 18px màu `--accent-fill` |
| Nhấn | `scale(.97)` |

```css
transition: background-color .16s ease, box-shadow .2s ease, color .16s ease,
            transform .2s cubic-bezier(.2,.9,.3,1), z-index 0s linear .2s;
```

Biến thể nút (`--solid`, `--danger`) chỉ khai **biến cục bộ** (`--btn-fill`, `--btn-glow`…) trong rule của riêng nó.
Rule nút chung đứng cuối file, nên nếu biến thể khai `background` trực tiếp thì sẽ bị rule chung đè mà không ai thấy.

**Đèn theo con trỏ** (`ui/reveal.ts`):
- Gọi `installReveal(document)` **một lần**.
- Mỗi khung `pointermove` (chỉ với chuột, gom qua rAF), các phần tử thuộc `REVEAL_TARGETS` nằm cách con trỏ
  không quá `REVEAL_RADIUS = 96px` sẽ được gắn `data-rv` và hai biến `--mx` / `--my`.
- CSS dùng `::before` vẽ `radial-gradient(... at var(--mx) var(--my))`, rồi mask XOR để chỉ giữ lại vành 1px.
  Kết quả là viền sáng lan cả sang phần tử lân cận.
- Bật: `opacity .2s`. Tắt: `.3s`.
- Tắt hẳn khi `prefers-reduced-motion`.

**Phóng ra lần lượt** (`ui/staggerIn.ts` + `useStaggerIn(ref, screenKey)`):
- Dùng khi đổi màn, đổi tab hoặc mở panel.
- Mục hiện ra từ `translateY(18px) scale(.96)`, opacity 0 → 1, chạy 620ms `cubic-bezier(.2,.8,.2,1)`, `fill: 'backwards'`.
- Độ trễ giữa các mục: `min(55, max(18, 700/n))` ms. Tối đa 28 mục. Thứ tự theo chiều đọc (gom hàng theo dung sai 8px, rồi trái sang phải).
- **Khung kính không bao giờ animate opacity** (danh sách `GLASS_SELF`), để tránh tạo backdrop root.
- Khi `reduce`: chỉ mờ vào trong 180ms.

**Nhịp khác:**
- **Menu** dùng `transition`, không dùng keyframes. Lý do: đóng giữa chừng thì không bị bật ngược lại.
  - Mở: 0.32s, từ `scale(.94) translateY(-6px)`. Đóng: 0.2s.
  - Gỡ DOM bằng hẹn giờ đọc từ CSS (`cssMotion.longestTransitionMs`). **Không** dựa vào `animationend`, vì dưới chế độ reduce sự kiện này không bắn.
- **Popover:** `scale(.96) translateY(±6px)`.
- **Dialog:** vào 0.2s, ra 0.14s.
- **Toast:** vào .25s, ra .35s.
- **Quầng hover dùng `drop-shadow`:** ở trạng thái nghỉ, khai đủ số lớp với alpha 0 qua `color-mix(in srgb, var(--x) 0%, transparent)`.
  **Không** để `none`, vì Chrome nội suy từ `none` sẽ ra quầng đen trong suốt nhịp chuyển.
- **Quầng không bị cắt:** lúc nghỉ đặt `z-index: 0` (phải là số, không dùng `auto`), hover thì lên 2.
  `<svg>` mặc định `overflow: hidden`, cần mở ra.
- **`prefers-reduced-motion: reduce`:** mọi selector hover có `transform` đều cần một bản `transform: none` tương ứng.

## 6. Component dùng chung

| Component | API và luật |
|---|---|
| `Toast` + `toastStore` | `okToast` / `errorToast` / `warnToast(text)`. Chỉ có **một** khe, không có hàng đợi. Tự tắt sau 2500ms. `<ToastHost/>` portal ra body, `role="status"`, phải mount ở **mọi** vỏ màn. Viên toast đảo tông (nền ink 80%, chữ `--ground`). |
| `Loading` | `<Loading size? className?/>`, vòng xoay `role="status" aria-busy`. `LoadingGlyph` dùng bên trong nút. |
| `NoData` | `<NoData message?/>`: thẻ kính cao 18rem để layout không nhảy khi dữ liệu về. **Không** hiển thị lỗi kỹ thuật. |
| `ConfirmDialog` | `open, title, body, confirmLabel, cancelLabel, danger?, onConfirm, onCancel`. Portal, z-index 60. Focus mặc định vào nút **Huỷ**; Tab quay vòng trong dialog; Esc để huỷ; đóng thì trả focus về chỗ cũ. |
| `SlideToggle` | `value, options[], onChange, ariaLabel`. 2 nấc dùng `role="switch"`; từ 3 nấc dùng `radiogroup`, phím ←/→, roving tabindex. |
| `HoverTip` | Chữ tooltip đặt trong `data-tip` (**cấm** dùng `title`). `<HoverTipHost/>` mount một lần và bắt sự kiện ủy quyền. Trễ 150ms; trong vòng 400ms sau tooltip trước thì mở ngay. |
| `InfoTip` | Nút ⓘ mở popover giải thích chỉ số (tổng quan / công thức / đơn vị / lưu ý) theo khoá glossary. |
| `popoverFocus` | `usePopoverFocus(open, ref)` đưa focus vào và trả focus ra. Đóng khi bấm ra ngoài bằng **`pointerdown`**. |
| `i18n` | `DICT.vi` / `DICT.ja` là hợp đồng 2 chiều. Có test khoá để hai bên dùng cùng một bộ key. |

## 7. Nền ambient

`<Ambient/>` gồm hai lớp:
- 3 quầng `radial-gradient` (`--bloom-1/2/3`);
- một SVG nét ribbon `ribbon.svg?raw`, `preserveAspectRatio="xMidYMid slice"`, `opacity: var(--net-opacity)` (.22 ở theme sáng, .28 ở theme tối).

**Vì sao cần nền có nét:** kính chỉ đọc ra được khi phía sau có chi tiết. Nhoè một gradient trơn thì kết quả vẫn là gradient trơn đó.

Hợp đồng của file SVG:
- id có tiền tố `ui-net-`;
- cấm `<style>`, `<script>`, `<image>`, `<use>`;
- màu nét đi qua class và đọc `--net-line`.

## 8. Thương hiệu

- Kit **không kèm logo nào**. Logo, wordmark, màu logo và favicon `public/logo.svg` là phần riêng của mỗi repo.
- Mọi cỡ trong lockup suy từ `--lockup` (cạnh logo): chữ `0.64×`, khoảng hở `0.31×`.
- Không cho tên thương hiệu đi qua `text-transform`. Thuộc tính này đổi glyph trên màn hình nhưng không đổi `textContent`, nên mọi test so chuỗi đều không phát hiện ra.

## 9. Trích CSS từ `index.css` (KHÔNG chép nguyên file)

Tạo các file CSS nhỏ trong repo mới và trích các khối sau. Số dòng là xấp xỉ.

| Khối | Dòng `index.css` | File đích gợi ý |
|---|---|---|
| Bảng cỡ chữ (comment) | 7–52 | `styles/tokens.css` (dạng comment) |
| Token Ember sáng / tối | 76–1072 | `styles/tokens.css` |
| Token Rime / Aurora | 1130–1460 | `styles/palettes.css` |
| Base + `.ui-glass` + `.ui-solid` | 1463–1702 | `styles/base.css` |
| Ambient | 1719–1821 | `styles/ambient.css` |
| Nút + công tắc `.ui-slide` | 1924–2100 | `styles/controls.css` |
| Token chuyển động + menu + scrim + lớp nội dung lùi | 2162–2337 | `styles/motion.css` |
| View transition | 3281–3320 | `styles/motion.css` |
| Vỏ app | 2961–3181 | `styles/shell.css` |
| Card / chart / KPI / tooltip / legend / bảng | ~3584–3913 | `styles/viz.css` |
| Mép vùng cuộn mờ dần | 6361–6420 | `styles/shell.css` |
| Thanh cuộn | 9998–10029 | `styles/base.css` |
| Toast + dialog | 11024–11222 | `styles/overlays.css` |
| §HIỆU ỨNG HOVER + khối reduce | 15924–~16800 | `styles/hover.css` |

Sau khi trích, grep tên class `.ui-` trong các component đã chép sang. Class nào chưa có rule thì quay lại `index.css` tìm và lấy thêm.
