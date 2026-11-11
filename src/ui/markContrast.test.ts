// Mark colour floors (kit 03 §5) — reads hex DIRECTLY from styles/tokens.css, for both light and dark.
//   · mark ↔ the glass card's "worst background" ≥ 2:1   (Ember: light #e8dbd0 · dark #543a25)
//   · ΔE2000 between the 6 series ≥ 15 · under colour-blindness simulation (D + P) ≥ 6
//   · ΔE series ↔ --accent-fill ≥ 10 · ΔE status ↔ series ≥ 10
//   · text ≥ 4.5 · table rules ≥ 2:1
// RULE (user decided 2026-11-11): the "worst background" floor applies ONLY to MARKS (≥ 2:1); TEXT is measured ≥ 4.5:1 on the text's OWN REAL background (--surface, --pill-flat…), not on the worst glass background.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
function block(selector: string): Map<string, string> {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`missing block ${selector}`);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  return new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1] as string, (m[2] as string).trim()]));
}
const THEMES = {
  light: { tokens: block(":root,\n:root[data-theme='light']"), worst: '#e8dbd0' },
  dark: { tokens: block(":root[data-theme='dark']"), worst: '#543a25' },
};

type RGB = [number, number, number];
function hex(theme: Map<string, string>, name: string): RGB {
  const v = theme.get(name);
  const m = v?.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) throw new Error(`${name} is not hex: ${v}`);
  const h = (m[1] as string).length === 3 ? [...(m[1] as string)].map((c) => c + c).join('') : (m[1] as string);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
}
const parse = (h: string) => hex(new Map([['x', h]]), 'x');
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toLin = (c: RGB) => c.map(lin) as RGB;
const lum = (c: RGB) => { const [r, g, b] = toLin(c); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number]; return (x + 0.05) / (y + 0.05); };
const mix = (a: RGB, b: RGB, t: number) => a.map((v, i) => v * t + (b[i] as number) * (1 - t)) as RGB;

// linear sRGB → Lab (D65)
function labOfLin([r, g, b]: RGB): RGB {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
// CIEDE2000
function dE([L1, a1, b1]: RGB, [L2, a2, b2]: RGB): number {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (b: number, a: number) => { const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v; };
  const h1 = h(b1, a1p), h2 = h(b2, a2p);
  const dL = L2 - L1, dC = C2p - C1p;
  let dh = h2 - h1;
  if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = h1 + h2;
  if (C1p * C2p !== 0) hb = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T;
  const Rt = -2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}
// Colour-blindness simulation (Machado 2009, severity 1.0) on linear sRGB.
const CVD: Record<string, number[][]> = {
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
};
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const sim = (c: RGB, m: number[][]) => { const l = toLin(c); return m.map((row) => clamp(row.reduce((s, k, i) => s + k * (l[i] as number), 0))) as RGB; };
const labOf = (c: RGB) => labOfLin(toLin(c));
const pairs = <T,>(xs: readonly T[]) => xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b] as const));

const SERIES = [1, 2, 3, 4, 5, 6].map((i) => `--series-${i}`);
const MARKS = [...SERIES, ...[1, 2, 3, 4, 5].map((i) => `--ord-${i}`), '--ok-fill', '--ok-fill-2', '--crit-fill', '--crit-fill-2', '--line-solo', '--bar-fill'];
const STATUS = ['--ok', '--warn', '--crit'];

describe('measures', () => {
  it('ΔE2000 matches the Sharma 2005 test table (pair 1 = 2.0425, pair 17 = 27.1492)', () => {
    expect(dE([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
    expect(dE([22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619])).toBeCloseTo(2.0373, 4);
    expect(dE([50, 2.5, 0], [73, 25, -18])).toBeCloseTo(27.1492, 4);
  });
  it('black–white contrast = 21', () => {
    expect(contrast(parse('#000000'), parse('#ffffff'))).toBeCloseTo(21, 5);
  });
});

for (const [name, { tokens: t, worst }] of Object.entries(THEMES)) {
  describe(`mark · Ember ${name}`, () => {
    const bg = parse(worst);
    it('every mark ≥ 2:1 on the worst glass background', () => {
      for (const m of MARKS) expect(contrast(hex(t, m), bg), m).toBeGreaterThanOrEqual(2);
    });
    it('ΔE2000 between the 6 series ≥ 15', () => {
      for (const [a, b] of pairs(SERIES)) expect(dE(labOf(hex(t, a)), labOf(hex(t, b))), `${a}~${b}`).toBeGreaterThanOrEqual(15);
    });
    it('ΔE between the 6 series under colour-blindness simulation D + P ≥ 6', () => {
      for (const [kind, m] of Object.entries(CVD))
        for (const [a, b] of pairs(SERIES))
          expect(dE(labOfLin(sim(hex(t, a), m)), labOfLin(sim(hex(t, b), m))), `${kind} ${a}~${b}`).toBeGreaterThanOrEqual(6);
    });
    it('ΔE series ↔ --accent-fill ≥ 10; status ↔ series ≥ 10', () => {
      for (const s of SERIES) expect(dE(labOf(hex(t, s)), labOf(hex(t, '--accent-fill'))), s).toBeGreaterThanOrEqual(10);
      for (const st of STATUS) for (const s of SERIES) expect(dE(labOf(hex(t, st)), labOf(hex(t, s))), `${st}~${s}`).toBeGreaterThanOrEqual(10);
    });
    it('text ≥ 4.5 (text on --surface; pill text on --pill-flat)', () => {
      for (const c of ['--ink', '--ink-2', '--ink-3', '--accent-text']) expect(contrast(hex(t, c), hex(t, '--surface')), c).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hex(t, '--on-pill-flat'), hex(t, '--pill-flat'))).toBeGreaterThanOrEqual(4.5);
    });
    it('table rules (ink 34%) ≥ 2:1 on the worst glass background', () => {
      expect(contrast(mix(hex(t, '--ink'), bg, 0.34), bg)).toBeGreaterThanOrEqual(2);
    });
  });
}
