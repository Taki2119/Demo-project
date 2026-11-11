// Tests of the bundle GATES on a hand-typed FAKE bundle (npm run check:test). The real case (manualChunks) was
// rebuilt and the gate went red — recorded in the phase 4 report.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkCss, checkEnv, checkPrivacy, checkRecharts, parseDeny, staticImports } from './bundle-checks.mjs';

const RC = 'function f(s){return s.activeTooltipIndex}';
const page = (extra = '') => `<script type="module" crossorigin src="/Demo-project/assets/index-A.js"></script>${extra}`;
const bundle = (files, extra) => ({ html: page(extra), files: new Map(Object.entries(files)) });

test('staticImports: static yes, dynamic NO', () => {
  const code = 'import{a as b}from"./x.js";import"./y.js";export{c}from"./z.js";const q=()=>import("./lazy.js");a.import("./no.js")';
  assert.deepEqual(staticImports(code), ['./x.js', './y.js', './z.js']);
});

test('recharts: dynamic loading only ⇒ pass', () => {
  const b = bundle({ 'assets/index-A.js': 'const m=()=>import("./nodes-B.js");', 'assets/nodes-B.js': RC });
  assert.deepEqual(checkRecharts(b), []);
});

test('recharts: entry chunk imports statically (via 1 intermediate chunk) ⇒ red, file name does not matter', () => {
  const b = bundle({ 'assets/index-A.js': 'import{r}from"./vendor-C.js";', 'assets/vendor-C.js': 'import"./whatever-D.js";', 'assets/whatever-D.js': RC });
  const e = checkRecharts(b);
  assert.equal(e.length, 1);
  assert.match(e[0], /STATICALLY imports assets\/whatever-D\.js/);
});

test('recharts: modulepreload of the Recharts chunk ⇒ red', () => {
  const b = bundle({ 'assets/index-A.js': '', 'assets/nodes-B.js': RC }, '<link rel="modulepreload" crossorigin href="/Demo-project/assets/nodes-B.js">');
  assert.match(checkRecharts(b).join('\n'), /modulepreload assets\/nodes-B\.js/);
});

test('recharts: no Recharts chunk recognized ⇒ red (the gate must not go green by being blind)', () => {
  assert.match(checkRecharts(bundle({ 'assets/index-A.js': '' })).join('\n'), /no Recharts chunk recognized/);
});

test('css: glass once + dvh + fallback ⇒ pass; lost fallback / glass twice ⇒ red', () => {
  const ok = '.g{-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px)}.app{height:100dvh}@supports not (height: 100dvh){.app{height:100vh}}';
  assert.deepEqual(checkCss({ files: new Map([['assets/a.css', ok]]) }), []);
  const bad = '.g{-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px)}.h{backdrop-filter:none}.app{height:100dvh}';
  assert.equal(checkCss({ files: new Map([['assets/a.css', bad]]) }).length, 2);
});

test('privacy: missing PRIVACY_DENY — CI ⇒ red, local ⇒ warning', () => {
  const b = bundle({ 'assets/index-A.js': '' });
  assert.equal(checkPrivacy(b, { deny: null, ci: true }).errors.length, 1);
  const local = checkPrivacy(b, { deny: null, ci: false });
  assert.equal(local.errors.length, 0);
  assert.equal(local.warnings.length, 1);
});

test('privacy: deny item matches (case-insensitive) ⇒ red, log does NOT print the denied string back', () => {
  const b = bundle({ 'assets/index-A.js': 'const t="Acme Widgets";' });
  const { errors } = checkPrivacy(b, { deny: parseDeny('foo,\n acme widgets '), ci: true });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /item #2/);
  assert.doesNotMatch(errors[0], /acme/i);
});

test('privacy: fixed deny strings + email outside *.example.com', () => {
  const b = bundle({ 'assets/index-A.js': 'u="http://localhost:3001";m="a@b.example.com";n="x@corp.test"' });
  const { errors } = checkPrivacy(b, { deny: ['zzz'], ci: true });
  assert.deepEqual(errors.map((e) => e.replace(/^.*?contains /, '')), ['"localhost".', 'an email outside *.example.com (domain corp.test).']);
});

test('env: URL set but not in the bundle ⇒ red; present ⇒ pass; empty ⇒ warning', () => {
  const b = bundle({ 'assets/index-A.js': 'const u="https://api.test";' });
  assert.deepEqual(checkEnv(b, { apiUrl: 'https://api.test/' }).errors, []);
  assert.equal(checkEnv(b, { apiUrl: 'https://other.test' }).errors.length, 1);
  assert.equal(checkEnv(b, { apiUrl: '' }).warnings.length, 1);
});
