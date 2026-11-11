# 00 · Applying the kit to a new GitHub Pages repo with VS Code + Claude Code

This document walks you step by step from an empty repo to a dashboard running on GitHub Pages, with the UI and
table-drawing rules of the kit. All coding happens in VS Code, with the **Claude Code** extension.

## 0. Prerequisites

| You need | Notes |
|---|---|
| Node.js 20 or later, git | Check with `node -v`, `git --version` |
| VS Code + the **Claude Code** extension (publisher Anthropic) | Install from the Marketplace, then sign in with your Claude account |
| A new GitHub repo | GitHub Pages on a **private** repo needs a paid plan (Pro/Team/Enterprise). Public repos are free |
| (Optional) a clone of the source repo | Needed for Claude to copy the original code. Without it, see option 2 in step 3 |

## 1. Create the repo and open it in VS Code

```bash
git clone https://github.com/<owner>/<repo-name>.git
```

```bash
code <repo-name>
```

Open the Claude Code panel in VS Code via the Claude icon in the side bar or in the top-right corner of the editor.

## 2. Put the kit into the repo

1. Unzip `dashboard-ui-kit.zip`.
2. Copy the **6 `.md` files** into the new repo's `docs/ui-kit/` folder.
3. Open `docs/ui-kit/05-PROMPTS.md`, take the **P0** block, and paste it into `CLAUDE.md` at the repo root.
4. Fill in the `<...>` spots in the pasted file, including the project name and repo name.

Claude Code reads `CLAUDE.md` at the repo root automatically every session. So the kit's rules apply to all later work.

## 3. Let Claude read the source code (pick 1 of 2 options)

### Option 1: the source repo is on your machine (recommended)

Create `.claude/settings.json` in the new repo. This file lets Claude read one extra folder outside the repo:

```json
{
  "permissions": {
    "additionalDirectories": ["C:/path/to/source-repo"]
  }
}
```

- On Windows, write the path with `/` (or `\\`).
- To add it only for the current session, type `/add-dir <path>` in the Claude chat box.
- After step 4 has finished copying the code, you can delete the `additionalDirectories` line so the new repo stands on its own.

### Option 2: no source repo

Skip the copy step. Claude will rebuild the modules from the docs themselves: the kit records enough constants, formulas and APIs.

- In prompts P3/P4, replace the phrase "extract from the source repo" with *"build per the spec in docs/ui-kit/…"*.
- The result will not be pixel-identical to the original, but it will still follow the rules.

## 4. Run the prompts in order

Paste each prompt into the Claude Code panel. Each prompt runs on **its own branch**. Review and merge before
running the next prompt.

| # | Prompt | Result |
|---|---|---|
| 1 | **P1-VSCode** (just below) | Source code copied into the new repo, product names removed |
| 2 | P2 (`05-PROMPTS.md`) | Vite + React + vitest skeleton, `deploy.yml` / `checks.yml` |
| 3 | P3 | CSS split into `src/styles/*`, theme/palette in place, demo page |
| 4 | P4 | Chart and table layer with wires cut, chart demo page |
| 5 | P5 (repeat per board) | Real board: parser + test + catalog + registry |
| — | P6 / P7 / P8 | Add a chart, review a branch, quick questions |

**P1-VSCode** replaces P1 in `05-PROMPTS.md`, because here you work in the **new** repo, not the source repo:

```
The source repo is at <SOURCE_REPO_PATH> (declared in additionalDirectories). The current repo is the target repo.
Read docs/ui-kit/README.md, section "File map". Create branch chore/import-kit, then:
- group A: copy verbatim from <SOURCE_REPO_PATH>/src/... to src/... of this repo, keeping the folder structure;
- group B: copy over but DO NOT edit YET; write one line per file into docs/ui-kit/TODO-cut.md, stating which wires must be cut;
- DO NOT copy group C, DO NOT copy src/index.css;
- on every copied file: rename the prefix `jw-` to `ui-`; rename STORAGE_KEY in theme.ts / palette.ts / i18n.ts
  to '<app>.theme' / '<app>.palette' / '<app>.lang'; grep -i the source product/company name in strings and
  comments and rewrite them neutrally; delete imports of brand logos or wordmarks.
DO NOT change anything in the source repo. Report the number of files per group and the number of edits in each file.
```

**Tips for working with Claude Code in VS Code:**

- Type `@` to attach a file to your question, e.g. `@docs/ui-kit/03-CHARTS-TABLES.md`. That way Claude reads exactly that file.
- For big jobs (P2–P5), have Claude **plan first** (use Plan mode, or write "make a plan,
  wait for my approval before coding"). Only allow file edits after you approve the plan.
- When Claude proposes editing a file, VS Code shows that file's diff. Read the diff before accepting, especially CSS and workflow files.
- If Claude starts breaking the rules, remind it with `@CLAUDE.md`.

## 5. Enable GitHub Pages

1. On GitHub, open the repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Check `vite.config.ts`: `base` must be `'/<repo-name>/'`, matching the repo name, with `/` at both ends.
   If you use a custom domain, set `VITE_BASE_PATH=/` at build time.
3. Merge into `main`. The `deploy.yml` workflow runs. Watch it in the **Actions** tab.
4. The site lives at `https://<owner>.github.io/<repo-name>/`.

Recommended (optional): create a ruleset protecting `main` under **Settings → Rules → Rulesets** with:

- Require a PR, Required approvals = 0 if you work alone.
- Block force pushes.
- Do **not** tick "Require branches to be up to date".

## 6. Check locally before pushing

Run the dev server and open `http://localhost:5173/#/home`:

```bash
npm run dev
```

Run the tests and the type check. Note: the type check must use `npm run typecheck`, not `npx tsc --noEmit`:

```bash
npm test
```

```bash
npm run typecheck
```

After building, check that Recharts did not leak into the initial chunk. The grep must return `0`:

```bash
npm run build
```

```bash
grep -c activeTooltipIndex dist/assets/index-*.js
```

Finally, view the build exactly as Pages serves it at `http://localhost:4173/<repo-name>/`:

```bash
npm run preview
```

The full checklist (machine + eyes) is in `04-PITFALLS-CHECKLIST.md`.

## 7. Common problems

| Symptom | Usual cause | Fix |
|---|---|---|
| Pages shows a blank page, console reports 404 for the `.js` files | `base` in `vite.config.ts` has the wrong repo name | Set `base: '/<repo-name>/'` |
| Pressing F5 on a subpage gives 404 | The router uses paths instead of the hash | Use hash routes `#/...` (`01-ARCHITECTURE.md` §4) |
| After a deploy, an open tab turns into a black screen | The old chunk was deleted | Wrap every `import()` in `boardChunk()` and add an `ErrorBoundary` |
| CSS is in the source but missing on Pages | Lightning CSS rewrote the rule, or a comment closed early | Grep `dist/assets/*.css` and see `04` section A |
| The glass effect is missing on Safari | `backdrop-filter` has `url()`, or sits inside `@supports` | `02-DESIGN-SYSTEM.md` §3 |
| Claude says it cannot read the source repo | Wrong `additionalDirectories` path, or the session has not reloaded settings | Fix the path and open a new Claude session, or use `/add-dir` |
| `npm test` is green but has fewer tests than last time | Vitest is running the `forks` pool | Set `pool: 'threads'` in `vite.config.ts` |
| The Pages workflow reports a permission error | Pages Source is not set to GitHub Actions | Go back to step 5.1 |
