# 04 · Pitfalls actually hit and the acceptance checklist

Every pitfall below actually happened in the source repo. What they have in common: **build green, tests green, product still wrong.**
So each pitfall comes with a gate (a test or a script) that catches it, rather than just a note for the reader.

## A. Build / CSS pitfalls

| # | Pitfall | How to block it |
|---|---|---|
| 1 | **Correct source does not guarantee a correct shipped build.** Lightning CSS (Tailwind v4) merges duplicate declarations, rewrites `@supports`, and folds constant `color-mix` into `#0000` | After building, grep `dist/`. Use the 2 sample scripts `check-bundle-glass.mjs` and `check-bundle-viewport.mjs` |
| 2 | **A CSS comment closes early.** Markdown bold placed before a division, e.g. two asterisks then `/765`, combines into exactly the comment-close sequence. The rule right after vanishes from `dist/` | The `cssSource.test.ts` test scans the whole file in one pass, catching any comment-close sequence outside a comment |
| 3 | `height:100vh; height:100dvh;` gets merged and the fallback is lost. A browser that does not understand `dvh` collapses the flex column (measured 563px in a 900px viewport) | Write a separate fallback: `@supports not (height:100dvh)` |
| 4 | `-webkit-backdrop-filter` containing `url()` or an invalid `var()` makes Safari lose the glass entirely | Never put `url()` into `backdrop-filter`. Never wrap glass in `@supports` |
| 5 | **Backdrop root.** An ancestor with `filter`, `opacity<1` or `mask`, or an animation using `fill-mode: forwards/both`, leaves the glass inside blurring only an empty backdrop | Animations use `backwards`. Overlays portal to `body` |
| 6 | With two rules of equal specificity, the later one wins. A shorthand `transition` in a shared rule placed later wipes out a variant's own transition | Variants only declare variables. Knob-tuning rules go **after** the base rule |
| 7 | `text-transform` changes the glyphs but `textContent` stays the same, so string-comparing tests do not notice. E.g. `Acme.io` displays as `ACME.IO` | Forbid `text-transform` on business keys and brand names |
| 8 | Two files with the same name once case and extension are ignored (`Toast.tsx` and `toast.ts`): on Windows the wrong one is imported and the page goes blank, while Linux CI stays green | The `fileCase.test.ts` test. Store files get a suffix, e.g. `toastStore.ts` |
| 9 | Editing files with a script without counting replacements. A `replace` that matches nothing still runs quietly | Every replacement must assert its match count |

## B. Test / tooling pitfalls

| # | Pitfall | How to block it |
|---|---|---|
| 10 | `npx tsc --noEmit` run at the root of a solution tsconfig (`"files": []`) **checks no files at all** yet prints a clean result | Use `npm run typecheck` = `tsc --noEmit -p tsconfig.app.json` |
| 11 | The Vitest `forks` pool silently drops a test file on Windows; the report still says "15 passed" | Set `pool: 'threads'`. Check the **count** of files/tests against the previous run, not just the word "passed" |
| 12 | A test scanning a folder with non-recursive `readdirSync`. Move code into a subfolder and the gate stays green but no longer checks anything | Use `readdirSync(dir, { recursive: true })` |
| 13 | A pure function reads environment variables directly (`import.meta.env`), so tests pass or fail depending on the machine | Pass env values in as parameters |
| 14 | Taking screenshots for measurement while SMIL icons are animating; every shot captures a different frame | Call `svg.pauseAnimations()` before capturing. Change parameters via CSS variables, not inline assignment |

## C. Recharts / viz pitfalls

| # | Pitfall | How to block it |
|---|---|---|
| 15 | A chart's `margin` is the room reserved for marks at edge points (pill, node, glow). Without enough room, marks get clipped | `margin.top = PILL_TOP` or `HOVER_GLOW.room`, `margin.right = 34`. Measure all 4 edges at both 1440px and 430px |
| 16 | Recharts filters `children` by component type and drops them silently. `<defs>` wrapped in a custom component disappear | Put the def directly in `shape`, or write `<defs>` directly in the chart |
| 17 | Series props leak into the dot (`fillOpacity`, dash) | Pin them in `DOT_RING`. Use `'none'`, not `undefined` |
| 18 | A function-style `dot` receives `cy: null` at empty points | Guard the null case. Do not spread Recharts props into `<circle>` |
| 19 | A negative `margin.left` plus long Y labels drops the leading digit: `14000` displays as `4000` | Re-measure after changing `tickFormatter`. Labels of 5+ digits use `AXIS_GUTTER_WIDE` |
| 20 | `interval="preserveEnd"` removes labels in the middle of the axis on narrow screens | For long labels use `HBars` (DOM) |
| 21 | An inline `style={{ background: color }}` wipes out `background-image` (the gradient overlay) | Use `backgroundColor` |
| 22 | A stacked bar whose last slice is 0 gets a square top | Determine edges from values (`stackEdges`) |
| 23 | Recharts leaks into the initial chunk | Use `lazy()` and the `activeTooltipIndex` gate |
| 24 | After a deploy, an old tab calling `import()` on a deleted chunk shows a black screen | `boardChunk()` and an `ErrorBoundary` wrapped outside `Suspense` |

## D. Data / business pitfalls

| # | Pitfall | How to block it |
|---|---|---|
| 25 | Made-up numbers, even in fixtures | The loader returns empty ⇒ show `NoData`. Mocks use `@example.com` |
| 26 | `?? 0` turns "cannot be computed" into 0 | Return `null` and show `—` |
| 27 | `new Date('YYYY-MM-DD')` shifts by time zone | Compare `YYYY-MM` strings, or use `Date.UTC` (`lib/day.ts`) |
| 28 | Summing a stock quantity gives a number of the right magnitude but wrong | Flow quantities are summed, stock quantities take the end-of-period value. For sparse tables use LOCF |
| 29 | Labels do not follow the filter (still saying "this month" while viewing 3 months) | Labels name the range being viewed exactly. `deltaNote` changes with the range length |
| 30 | Pinning a Drive `fileId`; overwriting the file changes the id | Look the file up by **name** within the folder |
| 31 | The "updated at" timestamp uses `Date.now()` | Use the source's `modifiedTime` |
| 32 | `dist/` contains real data, SQL or dataset names (Pages is public even when the repo is private) | `check-bundle-privacy.mjs` and a pre-commit hook |
| 33 | `VITE_*` missing at build time: build is green, but the page is unusable | A gate inspecting `dist/` to see whether that string is actually in the bundle |

## Acceptance checklist for a board

**Machine:**
- [ ] `npm test`: file and test counts match the previous run, plus the new tests
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run privacy:bundle` (and `check:clientid` if there is OAuth)
- [ ] `grep -c activeTooltipIndex dist/assets/index-*.js` returns `0`
- [ ] Grepping `dist/assets/*.css` finds the new classes

**Eyes:**
- [ ] Business names are in the agreed language; the ⓘ explanations match the formulas in the code
- [ ] Each chart has only 1 Y axis; the form is chosen per the table in `03` §3
- [ ] 4 screenshots taken: **1440px and 430px × light and dark**; no horizontal scroll
- [ ] Labels do not overlap; marks at the edges are not clipped; every mark can be hovered
- [ ] Changing a filter changes labels, deltas and sparklines together; the reset button returns to the default
- [ ] With no data, `NoData` shows and the block keeps its height (no layout jump)
- [ ] With `prefers-reduced-motion` on, nothing moves; numbers jump straight to their final value

## Git workflow (worth keeping in the new repo)

1. Never commit directly to `main`. Create a `feat/*`, `fix/*`, `chore/*` or `docs/*` branch.
   The 2 hooks `pre-commit` / `pre-push` can enforce this.
2. When an agent finishes, it pushes the **branch** and stops. The reviewer is the one who says to open a PR, and then the one who says to merge.
3. `checks.yml` (runs on PRs) and `deploy.yml` (runs on `main`) must have **the same gates, in the same order**.
