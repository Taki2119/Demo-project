// Test của CỔNG bundle trên bundle GIẢ tự gõ (npm run check:test). Ca thật (manualChunks) đã
// dựng lại và cổng đỏ — ghi ở báo cáo giai đoạn 4.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkCss, checkEnv, checkPrivacy, checkRecharts, parseDeny, staticImports } from './bundle-checks.mjs';

const RC = 'function f(s){return s.activeTooltipIndex}';
const page = (extra = '') => `<script type="module" crossorigin src="/Demo-project/assets/index-A.js"></script>${extra}`;
const bundle = (files, extra) => ({ html: page(extra), files: new Map(Object.entries(files)) });

test('staticImports: tĩnh có, động KHÔNG', () => {
  const code = 'import{a as b}from"./x.js";import"./y.js";export{c}from"./z.js";const q=()=>import("./lazy.js");a.import("./no.js")';
  assert.deepEqual(staticImports(code), ['./x.js', './y.js', './z.js']);
});

test('recharts: chỉ nạp động ⇒ qua', () => {
  const b = bundle({ 'assets/index-A.js': 'const m=()=>import("./nodes-B.js");', 'assets/nodes-B.js': RC });
  assert.deepEqual(checkRecharts(b), []);
});

test('recharts: chunk đầu import tĩnh (qua 1 chunk trung gian) ⇒ đỏ, tên file không quan trọng', () => {
  const b = bundle({ 'assets/index-A.js': 'import{r}from"./vendor-C.js";', 'assets/vendor-C.js': 'import"./whatever-D.js";', 'assets/whatever-D.js': RC });
  const e = checkRecharts(b);
  assert.equal(e.length, 1);
  assert.match(e[0], /import TĨNH assets\/whatever-D\.js/);
});

test('recharts: modulepreload tới chunk Recharts ⇒ đỏ', () => {
  const b = bundle({ 'assets/index-A.js': '', 'assets/nodes-B.js': RC }, '<link rel="modulepreload" crossorigin href="/Demo-project/assets/nodes-B.js">');
  assert.match(checkRecharts(b).join('\n'), /modulepreload assets\/nodes-B\.js/);
});

test('recharts: không nhận ra chunk Recharts nào ⇒ đỏ (cổng không được xanh vì mù)', () => {
  assert.match(checkRecharts(bundle({ 'assets/index-A.js': '' })).join('\n'), /không nhận ra chunk Recharts/);
});

test('css: đủ kính 1 lần + dvh + đường lui ⇒ qua; mất đường lui / kính 2 lần ⇒ đỏ', () => {
  const ok = '.g{-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px)}.app{height:100dvh}@supports not (height: 100dvh){.app{height:100vh}}';
  assert.deepEqual(checkCss({ files: new Map([['assets/a.css', ok]]) }), []);
  const bad = '.g{-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px)}.h{backdrop-filter:none}.app{height:100dvh}';
  assert.equal(checkCss({ files: new Map([['assets/a.css', bad]]) }).length, 2);
});

test('privacy: thiếu PRIVACY_DENY — CI ⇒ đỏ, máy ⇒ cảnh báo', () => {
  const b = bundle({ 'assets/index-A.js': '' });
  assert.equal(checkPrivacy(b, { deny: null, ci: true }).errors.length, 1);
  const local = checkPrivacy(b, { deny: null, ci: false });
  assert.equal(local.errors.length, 0);
  assert.equal(local.warnings.length, 1);
});

test('privacy: mục cấm khớp (không phân biệt hoa thường) ⇒ đỏ, log KHÔNG in lại chuỗi cấm', () => {
  const b = bundle({ 'assets/index-A.js': 'const t="Acme Widgets";' });
  const { errors } = checkPrivacy(b, { deny: parseDeny('foo,\n acme widgets '), ci: true });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /mục #2/);
  assert.doesNotMatch(errors[0], /acme/i);
});

test('privacy: chuỗi cấm cố định + email ngoài *.example.com', () => {
  const b = bundle({ 'assets/index-A.js': 'u="http://localhost:3001";m="a@b.example.com";n="x@corp.test"' });
  const { errors } = checkPrivacy(b, { deny: ['zzz'], ci: true });
  assert.deepEqual(errors.map((e) => e.replace(/^.*?chứa /, '')), ['"localhost".', 'email ngoài *.example.com (miền corp.test).']);
});

test('env: URL đặt mà không vào bundle ⇒ đỏ; có ⇒ qua; trống ⇒ cảnh báo', () => {
  const b = bundle({ 'assets/index-A.js': 'const u="https://api.test";' });
  assert.deepEqual(checkEnv(b, { apiUrl: 'https://api.test/' }).errors, []);
  assert.equal(checkEnv(b, { apiUrl: 'https://other.test' }).errors.length, 1);
  assert.equal(checkEnv(b, { apiUrl: '' }).warnings.length, 1);
});
