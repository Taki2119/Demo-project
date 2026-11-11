# 02 · Design system: tokens, liquid glass, app shell, motion

Line numbers `index.css:N` point into the original repo's `src/index.css`, as of 2026-11-11.

## 1. Two theme axes, written as attributes on `<html>`

| Axis | Attribute | Store | localStorage key | Default |
|---|---|---|---|---|
| Light/dark | `data-theme="light\|dark"` | `ui/theme.ts` (`light \| dark \| system`) | `<app>.theme` | `system` |
| Palette | `data-palette="ember\|rime\|aurora"` | `ui/palette.ts` (`PALETTES` declared in ONE place) | `<app>.palette` | `ember` |

**Conventions:**
- The attribute always holds the **resolved** value, never `system`.
- `initTheme()` listens to `prefers-color-scheme`, but only switches the theme when the user has chosen `system`.
- The default palette **has no CSS block of its own**: it is simply `:root` + `[data-theme='dark']`.
- The Tailwind v4 dark variant reads this attribute too:
  `@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));`

**Preventing a color flash before first paint (prePaint):**
- Put a **classic** `<script>`, not `type=module`, in the `<head>` of `index.html`.
- The script reads the 2 localStorage keys and sets both attributes before `<body>` is painted.
- Module scripts are deferred, so waiting for `main.tsx` would make dark-theme users see a white flash.
- A test (`prePaint.test.ts`) locks this script and the store to the same keys and the same value sets.

**Switching theme / palette with View Transitions** (`ui/viewSwitch.ts`):
- `::view-transition-old/new(root)` animates **opacity** only:
  `--switch-dur: .34s`, `--switch-ease: cubic-bezier(.25,.46,.45,.94)`.
- Do not use a page-wide `transition`, because it forces `backdrop-filter` to be recomputed on every frame.

## 2. Token table (3 palettes × light/dark)

| Token | Ember light | Ember dark | Rime light | Rime dark | Aurora light | Aurora dark |
|---|---|---|---|---|---|---|
| `--ground` | #e7e3db | #252220 | #dde5eb | #202325 | #e6e1eb | #232129 |
| `--surface` | #fdfcfa | #302b28 | #fbfcfe | #282d30 | #fdfbfe | #2c2b33 |
| `--surface-2` | #dcd6cb | #3a3430 | #ced8e1 | #31363b | #d9d4e1 | #36343e |
| `--line` | #cdc5b8 | #453e39 | #bcc8d2 | #3a4046 | #c9c3d2 | #403d49 |
| `--line-soft` | #ded7cc | #372f2b | #cfdae2 | #2b3237 | #dbd5e2 | #312f3a |
| `--ink` | #1c1917 | #ede8e4 | #171a1c | #e5eaee | #2f2145 | #ece3f8 |
| `--ink-2` | #4d453f | #c3b8b0 | #40484e | #b2bcc5 | #504268 | #c7b8da |
| `--ink-3` | #7c716a | #a2958c | #69737b | #8e9aa4 | #6d6085 | #a999be |
| `--accent` (graphics, ≥3:1) | #c2571a | #ff943d | #0082c7 | #61bcff | #b446d3 | #e38bfe |
| `--accent-text` (text, ≥4.5:1) | #9c400c | #ffb370 | #00669d | #8fcdff | #9328b0 | #e7aff8 |
| `--accent-hover` | #a44712 | #ffab3d | #006da8 | #8fcdff | #923daa | #e7aff8 |
| `--accent-fill` (solid button) | #bd5417 | #ff9a1f | #0079ba | #61bcff | #a145bb | #e38bfe |
| `--on-accent` | #fff | #2a1c0e | #fff | #11212e | #fff | #210b27 |
| `--glass-fill-panel` | rgba(253,252,250,.55) | rgba(48,43,40,.48) | rgba(251,252,254,.55) | rgba(40,45,48,.48) | rgba(253,251,254,.55) | rgba(44,43,51,.48) |
| `--glass-fill-viz` | α .42 | α .28 | α .42 | α .28 | α .42 | α .28 |
| `--net-line` | #a8480f | #ffb370 | #006fab | #8fcdff | #0e8a6c | #70e9b9 |

**Shared tokens** (declared on `:root`; palettes inherit them unless they redeclare):

- **Glass, light theme:**
  - `--glass-fill` rgba(255,255,255,.32)
  - `--glass-edge` .78
  - `--glass-spec` .95
  - `--glass-spec-lo` .22
  - `--glass-fill-ctl` .62
  - `--glass-shadow: 0 10px 34px -12px rgba(28,25,23,.30)`
- **Glass, dark theme:** fill .10 · edge .20 · spec .34 · spec-lo .07 · shadow uses `rgba(0,0,0,.6)`.
- **Status** (does not change with the palette):
  - `--ok / --warn / --crit`: light #15803d / #b45309 / #b91c1c; dark #4ade80 / #fbbf24 / #fca5a5.
  - Danger buttons use `--btn-danger #dc2626`, hover #c81e1e. Do **not** use `--crit` for buttons, because its dark version is a light pink meant for text.
- **Inputs / toggles** (mixed with `color-mix`, one line valid for all 3 palettes):
  - `--field-fill`: surface 62%
  - `--field-line`: ink 16%
  - `--toggle-track`: ink 6.5%
- **Scrollbar:** `--scroll-thumb` ink 26%, `--scroll-thumb-hi` ink 42%.
- **Motion timing:**
  - `--menu-open-dur .32s` / `cubic-bezier(.25,.46,.45,.94)`
  - `--menu-close-dur .2s` / `cubic-bezier(.4,0,1,1)`
  - `--pop-item-dur .26s` / `cubic-bezier(.2,.9,.3,1.35)`
  - `--screen-dur .26s`
- **Layout:**
  - `--screen-pad 1.25rem`
  - `--main-bleed 9rem`
  - `--sidenav-w 16.25rem`
  - `--sidenav-rail-w 3.4rem`
  - `--blk-in 12px`
  - `--blk-out 24px`
- **Data marks** (`--series-*`, `--ord-*`, …): see `03-CHARTS-TABLES.md` §4. This group **changes with the palette**.

**Color rules:**
1. Separate the accent for **graphics** (`--accent`, floor 3:1) from the accent for **text** (`--accent-text`, floor 4.5:1).
2. Light backgrounds are never pure white, dark backgrounds never pure black. Glass needs a toned background to read.
3. Every `[data-palette='x'][data-theme='dark']` block must declare **exactly the same token set** as the matching light block.
   Any missing token leaks its light value into the dark theme with no warning.
4. `--accent` is only for the **interaction layer** (hover, focus, tooltip pill), never for coloring data.

**Fonts** (loaded from Google Fonts in `index.html`):
```css
--font-text:    'Space Grotesk','Zen Kaku Gothic New','Noto Sans JP',system-ui,sans-serif; /* all text */
--font-display: 'Outfit','Zen Kaku Gothic New',system-ui,sans-serif; /* ONLY logo + big scoreboard numbers */
```

**Type scale:**

| Position | Size |
|---|---|
| H1 | 1.62rem |
| Card H2 | 1.02rem |
| Subtitle | 0.82rem |
| KPI number | 1.9rem |
| Tooltip | 0.84rem |
| Table | 0.86rem |

**Other sizes:**
- Radius: button 999px (pill shape) · card 16 · panel 20 · menu 16 · dialog 14 · input 8.
- `body`: background `--ground`, text `--ink`, 16px, `line-height: 1.6`.
- `h1–h4`: `letter-spacing: -0.02em`, `text-wrap: balance`.
- `:focus-visible`: outline 2px `--focus`, offset 2, radius 6.
- `.ui-num { font-variant-numeric: tabular-nums }`.
- `button { user-select: none; -webkit-user-select: none }`. **Buttons only**, so content text stays copyable.

## 3. Liquid glass: `backdrop-filter` declared in exactly ONE place

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

Each surface only turns 2 knobs, and **the tuning rule must come AFTER `.ui-glass` in the file**, because these rules have the same specificity:

| Surface | blur | saturate | fill |
|---|---|---|---|
| Default (tooltip, pill) | 16px | 180% | `--glass-fill` |
| Header / login card | 12px | 170% | |
| `.ui-viz` (KPI/chart card) | 20px | **120%** | `--glass-fill-viz` |
| Menu / popover / dialog | 26px | 180% | `--glass-fill-panel` |
| Side panel / large panel / NoData | 28px | 150% | |

**Rules for using glass:**
- A new panel only needs the `.ui-glass` class.
- Data cards keep `saturate` low, so the background does not compete with the marks.
- **Do not nest glass.** A button or toggle inside a glass panel must use an opaque surface.
- With `backdrop-filter`, each frame costs about 2–3×. The cost comes from *having* the filter, not from the blur radius,
  so **do not optimize by lowering the blur**.
- When a menu or modal opens, set the flag `[data-menu-open]` / `[data-modal-open]` on `<html>`.
  `.ui-main` then gets `opacity: .45; filter: blur(12px)`. The ambient background stays as is.
  Do **not** use a colored overlay, because that wipes out the background and the glass looks like an opaque slab.

**Glass pitfalls:**
1. **Backdrop root.** Glass inside an ancestor with `filter`, `opacity<1`, `mask`, `mix-blend-mode`, `contain:paint`
   or `backdrop-filter` can only blur an empty backdrop. An animation that keeps `opacity` after it finishes
   (`fill-mode: both/forwards`) causes this too. The fix:
   - entrance animations use `animation-fill-mode: backwards`;
   - popovers, menus, dialogs, toasts **portal to `document.body`**.
2. **`backdrop-filter` and `filter` create a containing block** for `position: fixed` descendants. That is the second reason to portal.
3. **IACVT + Safari.** A declaration with `var()` that yields an invalid value falls back to `none`,
   **not** to the preceding declaration. WebKit treats `-webkit-backdrop-filter` as an alias, so the glass vanishes entirely.
   Consequence: never put `url(#svg-filter)` into `backdrop-filter`.
4. **Lightning CSS (Tailwind v4) rewrites `@supports`** at build time. So do not put glass declarations inside `@supports`,
   and always grep `dist/` after building.

## 4. App shell and scroll areas

```
.ui-app  (display:flex row; height:100dvh; overflow:hidden; position:relative)
 ├─ .ui-sidenav  (glass column; expanded 16.25rem / collapsed 3.4rem)
 └─ .ui-body     (flex:1 1 0; min-height:0; min-width:0; flex column)
     ├─ .ui-topbars (flex:none; z-index:10)
     └─ .ui-main    (the ONLY scroll container: flex:1 1 0; min-height:0; min-width:0; overflow-y:auto; z-index:1;
                     margin-top:calc(-1*var(--main-bleed)); padding-top:var(--main-bleed);
                     scroll-padding-top:var(--main-bleed))
         └─ .ui-screen (max-width:84rem; margin:0 auto; padding:1.5rem var(--screen-pad) 3rem)
.ui-ambient  (position:fixed; inset:0; z-index:0; pointer-events:none)
```

**Why the shell is built this way:**
- **The scroll container is `.ui-main`, not the document.** The scrollbar does not run across the header. The negative `margin-top` and
  positive `padding-top` pair both read `--main-bleed`, so content can slide behind the top glass strip without measuring in JS.
- `flex: 1 1 0` **and** `min-height: 0` prevent two different bugs. Both bugs are silent, so keep both declarations.
- Put `max-width` on `.ui-screen`, **not** on the scroll container. On the scroll container, the scrollbar would appear mid-screen.
- On route change, scroll to top with `useLayoutEffect` on the scroll container itself. Calling `window.scrollTo` does nothing.
- An element's `scroll` event **does not bubble** to window. Any popover that must reposition on scroll has to listen with
  `addEventListener('scroll', fn, true)` (capture).
- **Fallback for `100dvh`:** use `@supports not (height:100dvh) { .ui-app { height:100vh } }`.
  Do not write the pair `height:100vh; height:100dvh;` back to back, because Lightning CSS merges the two lines and the fallback disappears.

**Breakpoint ≤640px:**
- The side panel becomes an icon strip plus a **drawer**: `position: fixed; z-index: 40`, width `min(var(--sidenav-w), 100vw - 2.5rem)`.
- The overlay (scrim) uses z-index 39, color `rgba(12,10,8,.28)`.
- When the drawer is open, set `inert` on `.ui-body`.
- Under `pointer: coarse`, buttons smaller than 24px get a larger hit area via a transparent `::after`.

**Layer order (z-index):**

| Layer | z-index |
|---|---|
| Rail | 2 |
| Scrim | 5 |
| Topbars | 10 |
| Menu | 30 |
| Drawer | 40 |
| Dialog | 60 |

**Scrollbar: one style for the whole app**
```css
@supports not selector(::-webkit-scrollbar){ *{scrollbar-width:thin; scrollbar-color:var(--scroll-thumb) transparent} }
::-webkit-scrollbar{width:11px;height:11px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--scroll-thumb);border-radius:9999px;border:3px solid transparent;background-clip:padding-box}
::-webkit-scrollbar-thumb:hover{background:var(--scroll-thumb-hi);background-clip:padding-box}
```
The standard branch (`scrollbar-color`) must sit inside `@supports not`. Declared directly, Chromium drops the whole `::-webkit-scrollbar` block.

## 5. Hover and motion

**Flat buttons** (every button is a flat button; glass is only for cards, panels and popovers):

| State | Appearance |
|---|---|
| Rest | Opaque surface `--surface`, ring `0 0 0 1px` ink 11% |
| Hover, light theme | `translateY(-2px)` + a downward drop shadow, no glow |
| Hover, dark theme | Lift 1px + an 18px glow in `--accent-fill` |
| Press | `scale(.97)` |

```css
transition: background-color .16s ease, box-shadow .2s ease, color .16s ease,
            transform .2s cubic-bezier(.2,.9,.3,1), z-index 0s linear .2s;
```

Button variants (`--solid`, `--danger`) only declare **local variables** (`--btn-fill`, `--btn-glow`…) inside their own rule.
The shared button rule sits at the end of the file, so if a variant declared `background` directly it would be silently overridden by the shared rule.

**Cursor-following light** (`ui/reveal.ts`):
- Call `installReveal(document)` **once**.
- On each `pointermove` frame (mouse only, batched via rAF), elements in `REVEAL_TARGETS` within
  `REVEAL_RADIUS = 96px` of the cursor get `data-rv` and the two variables `--mx` / `--my`.
- CSS uses `::before` to draw `radial-gradient(... at var(--mx) var(--my))`, then an XOR mask keeps only a 1px ring.
  The result is a lit border that also spills onto neighboring elements.
- On: `opacity .2s`. Off: `.3s`.
- Fully disabled under `prefers-reduced-motion`.

**Staggered fan-out** (`ui/staggerIn.ts` + `useStaggerIn(ref, screenKey)`):
- Used on screen change, tab change or panel open.
- Items appear from `translateY(18px) scale(.96)`, opacity 0 → 1, over 620ms `cubic-bezier(.2,.8,.2,1)`, `fill: 'backwards'`.
- Delay between items: `min(55, max(18, 700/n))` ms. At most 28 items. Reading order (rows grouped with an 8px tolerance, then left to right).
- **Glass frames never animate opacity** (the `GLASS_SELF` list), to avoid creating a backdrop root.
- Under `reduce`: only a 180ms fade-in.

**Other timings:**
- **Menus** use `transition`, not keyframes. Reason: closing midway does not snap back.
  - Open: 0.32s, from `scale(.94) translateY(-6px)`. Close: 0.2s.
  - DOM removal uses a timer read from CSS (`cssMotion.longestTransitionMs`). Do **not** rely on `animationend`, because it does not fire under reduce mode.
- **Popover:** `scale(.96) translateY(±6px)`.
- **Dialog:** in 0.2s, out 0.14s.
- **Toast:** in .25s, out .35s.
- **Hover glow with `drop-shadow`:** at rest, declare the full number of layers with alpha 0 via `color-mix(in srgb, var(--x) 0%, transparent)`.
  Do **not** leave it as `none`, because Chrome interpolating from `none` yields a black glow throughout the transition.
- **Glow not clipped:** at rest set `z-index: 0` (must be a number, not `auto`), raise to 2 on hover.
  `<svg>` defaults to `overflow: hidden`; open it up.
- **`prefers-reduced-motion: reduce`:** every hover selector with a `transform` needs a matching `transform: none` version.

## 6. Shared components

| Component | API and rules |
|---|---|
| `Toast` + `toastStore` | `okToast` / `errorToast` / `warnToast(text)`. Only **one** slot, no queue. Auto-dismisses after 2500ms. `<ToastHost/>` portals to body, `role="status"`, and must be mounted in **every** screen shell. The toast pill uses inverted tones (ink 80% background, `--ground` text). |
| `Loading` | `<Loading size? className?/>`, a spinner with `role="status" aria-busy`. `LoadingGlyph` is used inside buttons. |
| `NoData` | `<NoData message?/>`: an 18rem-tall glass card so the layout does not jump when data arrives. **Never** shows technical errors. |
| `ConfirmDialog` | `open, title, body, confirmLabel, cancelLabel, danger?, onConfirm, onCancel`. Portal, z-index 60. Default focus on the **Cancel** button; Tab cycles inside the dialog; Esc cancels; on close, focus returns to where it was. |
| `SlideToggle` | `value, options[], onChange, ariaLabel`. 2 steps use `role="switch"`; 3 or more use `radiogroup`, ←/→ keys, roving tabindex. |
| `HoverTip` | Tooltip text goes in `data-tip` (`title` is **forbidden**). `<HoverTipHost/>` mounts once and uses event delegation. 150ms delay; within 400ms of the previous tooltip it opens immediately. |
| `InfoTip` | An ⓘ button opening a popover explaining a metric (overview / formula / unit / note) by glossary key. |
| `popoverFocus` | `usePopoverFocus(open, ref)` moves focus in and returns it. Closes on outside click via **`pointerdown`**. |
| `i18n` | `DICT.vi` / `DICT.ja` are a two-way contract. A test locks both sides to the same key set. |

## 7. Ambient background

`<Ambient/>` has two layers:
- 3 `radial-gradient` blooms (`--bloom-1/2/3`);
- a ribbon line-art SVG `ribbon.svg?raw`, `preserveAspectRatio="xMidYMid slice"`, `opacity: var(--net-opacity)` (.22 in the light theme, .28 in the dark theme).

**Why the background needs line art:** glass only reads when there is detail behind it. Blurring a plain gradient just gives back that plain gradient.

The SVG file's contract:
- ids are prefixed `ui-net-`;
- `<style>`, `<script>`, `<image>`, `<use>` are forbidden;
- stroke color goes through a class and reads `--net-line`.

## 8. Branding

- The kit **ships no logo**. Logo, wordmark, logo colors and the favicon `public/logo.svg` belong to each repo.
- Every size in the lockup derives from `--lockup` (the logo's side): text `0.64×`, gap `0.31×`.
- Never pass the brand name through `text-transform`. That property changes on-screen glyphs but not `textContent`, so no string-comparing test can catch it.

## 9. Extracting CSS from `index.css` (do NOT copy the whole file)

Create small CSS files in the new repo and extract the following blocks. Line numbers are approximate.

| Block | `index.css` lines | Suggested target file |
|---|---|---|
| Type-size table (comment) | 7–52 | `styles/tokens.css` (as a comment) |
| Ember light / dark tokens | 76–1072 | `styles/tokens.css` |
| Rime / Aurora tokens | 1130–1460 | `styles/palettes.css` |
| Base + `.ui-glass` + `.ui-solid` | 1463–1702 | `styles/base.css` |
| Ambient | 1719–1821 | `styles/ambient.css` |
| Buttons + `.ui-slide` toggle | 1924–2100 | `styles/controls.css` |
| Motion tokens + menu + scrim + receding content layer | 2162–2337 | `styles/motion.css` |
| View transition | 3281–3320 | `styles/motion.css` |
| App shell | 2961–3181 | `styles/shell.css` |
| Card / chart / KPI / tooltip / legend / table | ~3584–3913 | `styles/viz.css` |
| Fading scroll-area edges | 6361–6420 | `styles/shell.css` |
| Scrollbar | 9998–10029 | `styles/base.css` |
| Toast + dialog | 11024–11222 | `styles/overlays.css` |
| §HIỆU ỨNG HOVER (hover effects) section + reduce block | 15924–~16800 | `styles/hover.css` |

After extracting, grep the `.ui-` class names in the copied components. For any class without a rule, go back to `index.css`, find it and take it too.
