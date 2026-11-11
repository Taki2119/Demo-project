// Sample questions — USERS group. Sources: users-monthly (month × plan) · user-monthly (1 month, per user).
import type { Row } from '../../data/api';
import { dauAvg, seatUsage, stickiness } from '../../data/metrics';
import { dayLabel } from '../../ui/format';
import {
  applied, count, deltaText, lastN, monthly, monthLabel, monthText, n, pct, planParam, rowsOf, scopeOf, series,
  snapshotText, topOf, tx, ymRow, type Ctx, type Question,
} from '../kit';

const USERS = 'users-monthly' as const;
const needUsers = () => [{ source: USERS, params: {} }];
const PLANS = ['starter', 'growth', 'scale'] as const;

const basisUsers = (ctx: Ctx, ja: string, vi: string) =>
  tx(ctx.lang, `ユーザー数ボード：${ja}${ctx.slots.plan ? '' : '全プラン合計。'}`, `Bảng Số lượng người dùng: ${vi}${ctx.slots.plan ? '' : ' Cộng mọi gói.'}`);

function latestUsersByPlan(ctx: Ctx): { plan: string; row: Row }[] | null {
  const rows = rowsOf(ctx, USERS);
  if (!rows || rows.length === 0) return null;
  const latest = rows.map(ymRow).sort().at(-1)!;
  return PLANS.map((plan) => ({ plan, row: rows.find((r) => r.plan_id === plan && ymRow(r) === latest) })).filter(
    (x): x is { plan: (typeof PLANS)[number]; row: Row } => x.row != null,
  );
}

const mau: Question = {
  id: 'mau',
  group: 'users',
  ask: {
    ja: ['今月のMAU（月間アクティブユーザー）は？', 'アクティブユーザーは何人？', 'MAUは先月より増えた？'],
    vi: ['MAU (người dùng hoạt động trong tháng) tháng này?', 'Có bao nhiêu người dùng đang hoạt động?', 'MAU tăng hay giảm so với tháng trước?'],
  },
  keywords: ['mau', 'アクティブ', 'hoat dong', 'active'],
  uses: { plan: true },
  related: ['stickiness', 'seat_usage', 'top_users'],
  needs: needUsers,
  build(ctx) {
    const rows = monthly(ctx, USERS);
    if (!rows) return null;
    const L = rows.at(-1)!;
    const P = rows.at(-2) ?? null;
    const d = deltaText(ctx.lang, n(L.mau), P ? n(P.mau) : null, 'count');
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}${s}のMAUは ${count(n(L.mau), 'ja')} 人（前月比 ${d}）です。${L.is_closed === false ? '月の途中のため、月末までにさらに増える見込みです。' : ''}`,
        `MAU${s} ${monthText('vi', L)}: ${count(n(L.mau), 'vi')} người (so với tháng trước ${d}).${L.is_closed === false ? ' Tháng chưa hết nên con số còn tăng tới cuối tháng.' : ''}`,
      ),
      figures: [
        { label: 'MAU', value: count(n(L.mau), ctx.lang) },
        { label: tx(ctx.lang, '前月比', 'So với tháng trước'), value: d },
        { label: tx(ctx.lang, 'ユーザー数（シート）', 'Người dùng (ghế)'), value: count(n(L.seat_users_end), ctx.lang) },
      ],
      chart: { kind: 'line', unit: 'count', goodWhen: 'up', label: 'MAU', points: series(ctx.lang, lastN(rows, 12), (r) => n(r.mau)) },
      basis: basisUsers(ctx, 'MAU＝その月に1日以上利用したユーザー数。', 'MAU = số người dùng có ít nhất 1 ngày hoạt động trong tháng.'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

const stick: Question = {
  id: 'stickiness',
  group: 'users',
  ask: {
    ja: ['DAU/MAUはどれくらい？', 'ユーザーは毎日使っている？', 'プラン別の利用頻度（DAU/MAU）を比べて'],
    vi: ['DAU/MAU là bao nhiêu?', 'Người dùng có dùng hằng ngày không?', 'So sánh mức độ dùng thường xuyên (DAU/MAU) giữa các gói'],
  },
  keywords: ['dau', 'dau/mau', '頻度', '毎日', 'stickiness', 'hang ngay', 'thuong xuyen'],
  uses: {},
  related: ['mau', 'seat_usage', 'top_users'],
  needs: needUsers,
  build(ctx) {
    const all = monthly(ctx, USERS, 'all');
    const by = latestUsersByPlan(ctx);
    if (!all || !by) return null;
    const L = all.at(-1)!;
    const st = (r: Row) => stickiness(n(r.active_user_days), n(r.days_in_period), n(r.mau));
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}の全プランDAU/MAUは ${pct(st(L), 'ja')}、平均DAUは ${count(dauAvg(n(L.active_user_days), n(L.days_in_period)), 'ja')} 人です。`,
        `${monthText('vi', L)}: DAU/MAU mọi gói ${pct(st(L), 'vi')}, DAU trung bình ${count(dauAvg(n(L.active_user_days), n(L.days_in_period)), 'vi')} người.`,
      ),
      figures: [{ label: 'DAU/MAU', value: pct(st(L), ctx.lang) }],
      table: {
        head: [tx(ctx.lang, 'プラン', 'Gói'), 'MAU', tx(ctx.lang, '平均DAU', 'DAU TB'), 'DAU/MAU'],
        numeric: [false, true, true, true],
        rows: by.map(({ plan, row }) => [
          ctx.label('plan', plan),
          count(n(row.mau), ctx.lang),
          count(dauAvg(n(row.active_user_days), n(row.days_in_period)), ctx.lang),
          pct(st(row), ctx.lang),
        ]),
      },
      chart: { kind: 'line', unit: 'pct', goodWhen: 'up', label: 'DAU/MAU', points: series(ctx.lang, lastN(all, 12), st) },
      basis: tx(ctx.lang, 'ユーザー数ボード：平均DAU＝延べ利用日数÷期間の日数、DAU/MAU＝平均DAU÷MAU。', 'Bảng Số lượng người dùng: DAU TB = tổng ngày-người ÷ số ngày của kỳ; DAU/MAU = DAU TB ÷ MAU.'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

const newUsers: Question = {
  id: 'new_users',
  group: 'users',
  ask: {
    ja: ['今月増えたユーザーは何人？', '新規ユーザーと停止されたユーザーの数は？', 'ユーザーの増減を教えて', '新しいユーザー数は？'],
    vi: ['Tháng này có bao nhiêu người dùng mới?', 'Bao nhiêu người dùng mới, bao nhiêu bị tắt?', 'Người dùng tăng giảm thế nào?'],
  },
  keywords: ['新規ユーザー', '新しいユーザー', '停止', '増えた', 'nguoi dung moi', 'bi tat', 'user moi'],
  uses: { plan: true },
  related: ['users_total', 'mau', 'seat_usage'],
  needs: needUsers,
  build(ctx) {
    const rows = monthly(ctx, USERS);
    if (!rows) return null;
    const L = rows.at(-1)!;
    const P = rows.at(-2) ?? null;
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}${s}の新規ユーザーは ${count(n(L.new_users), 'ja')} 人、停止されたユーザーは ${count(n(L.deactivated_users), 'ja')} 人です。${P ? `前月は新規 ${count(n(P.new_users), 'ja')} 人。` : ''}`,
        `${monthText('vi', L)}${s}: ${count(n(L.new_users), 'vi')} người dùng mới, ${count(n(L.deactivated_users), 'vi')} người bị tắt.${P ? ` Tháng trước: ${count(n(P.new_users), 'vi')} người mới.` : ''}`,
      ),
      figures: [
        { label: tx(ctx.lang, '新規ユーザー', 'Người dùng mới'), value: count(n(L.new_users), ctx.lang) },
        { label: tx(ctx.lang, '停止ユーザー', 'Bị tắt'), value: count(n(L.deactivated_users), ctx.lang) },
      ],
      chart: { kind: 'bar', unit: 'count', points: series(ctx.lang, lastN(rows, 12), (r) => n(r.new_users)) },
      basis: basisUsers(ctx, '新規＝その月に作成されたユーザー、停止＝その月に無効化されたユーザー。', 'Mới = tài khoản tạo trong tháng; bị tắt = tài khoản bị vô hiệu hoá trong tháng.'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

const seatUse: Question = {
  id: 'seat_usage',
  group: 'users',
  ask: {
    ja: ['シート利用率は？', '契約したシートのうち実際に使っているのは何割？', 'プラン別のシート利用率'],
    vi: ['Tỉ lệ dùng ghế là bao nhiêu?', 'Trong số ghế đã mua, bao nhiêu phần trăm thật sự được dùng?', 'Tỉ lệ dùng ghế theo từng gói'],
  },
  keywords: ['シート', '利用率', 'ghe', 'ti le dung', 'seat'],
  uses: {},
  related: ['low_seat_companies', 'mau', 'stickiness'],
  needs: needUsers,
  build(ctx) {
    const all = monthly(ctx, USERS, 'all');
    const by = latestUsersByPlan(ctx);
    if (!all || !by) return null;
    const L = all.at(-1)!;
    const su = (r: Row) => seatUsage(n(r.mau), n(r.seat_users_end));
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}は ${count(n(L.seat_users_end), 'ja')} 人分のシートのうち ${count(n(L.mau), 'ja')} 人が利用し、シート利用率は ${pct(su(L), 'ja')} です。`,
        `${monthText('vi', L)}: ${count(n(L.mau), 'vi')} / ${count(n(L.seat_users_end), 'vi')} người giữ ghế có hoạt động, tỉ lệ dùng ghế ${pct(su(L), 'vi')}.`,
      ),
      figures: [{ label: tx(ctx.lang, 'シート利用率', 'Tỉ lệ dùng ghế'), value: pct(su(L), ctx.lang) }],
      table: {
        head: [tx(ctx.lang, 'プラン', 'Gói'), tx(ctx.lang, 'ユーザー数', 'Người dùng'), 'MAU', tx(ctx.lang, '利用率', 'Tỉ lệ')],
        numeric: [false, true, true, true],
        rows: by.map(({ plan, row }) => [ctx.label('plan', plan), count(n(row.seat_users_end), ctx.lang), count(n(row.mau), ctx.lang), pct(su(row), ctx.lang)]),
      },
      basis: tx(ctx.lang, 'ユーザー数ボード：シート利用率＝MAU÷月末のユーザー数（シート）。', 'Bảng Số lượng người dùng: tỉ lệ dùng ghế = MAU ÷ số người dùng (ghế) cuối tháng.'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

const usersTotal: Question = {
  id: 'users_total',
  group: 'users',
  ask: {
    ja: ['ユーザーは全部で何人？', 'ユーザー数の1年間の推移', '登録ユーザー数はどれくらい増えた？'],
    vi: ['Tổng cộng có bao nhiêu người dùng?', 'Số người dùng thay đổi thế nào trong một năm?', 'Số người dùng đã tăng bao nhiêu?'],
  },
  keywords: ['ユーザー数', '全部', 'tong', 'so nguoi dung', 'tai khoan'],
  uses: { plan: true },
  related: ['new_users', 'mau', 'seat_usage'],
  needs: needUsers,
  build(ctx) {
    const rows = monthly(ctx, USERS);
    if (!rows) return null;
    const win = lastN(rows, 12);
    const L = win.at(-1)!;
    const F = win[0]!;
    const d = deltaText(ctx.lang, n(L.seat_users_end), n(F.seat_users_end), 'count');
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${monthText('ja', L)}${s}のユーザー数（シート）は ${count(n(L.seat_users_end), 'ja')} 人です。${monthLabel(ymRow(F), 'ja')} からの増減は ${d}。`,
        `${monthText('vi', L)}${s}: ${count(n(L.seat_users_end), 'vi')} người dùng (ghế). So với ${monthLabel(ymRow(F), 'vi')}: ${d}.`,
      ),
      figures: [
        { label: tx(ctx.lang, 'ユーザー数', 'Người dùng'), value: count(n(L.seat_users_end), ctx.lang) },
        { label: tx(ctx.lang, '12か月の増減', 'Thay đổi 12 tháng'), value: d },
      ],
      chart: { kind: 'line', unit: 'count', goodWhen: 'up', label: tx(ctx.lang, 'ユーザー数', 'Người dùng'), points: series(ctx.lang, win, (r) => n(r.seat_users_end)) },
      basis: basisUsers(ctx, 'ユーザー数＝月末時点で有効なアカウント（シート）。', 'Người dùng = tài khoản còn hiệu lực (ghế) tại cuối tháng.'),
      period: monthText(ctx.lang, L),
      applied: applied(ctx, this),
    };
  },
};

// ── user-monthly: latest month, per user ────────────────────────────────────
const UM = 'user-monthly' as const;
const needUm = (s: Parameters<Question['needs']>[0]) => [{ source: UM, params: planParam(s) }];

function umSnapshot(ctx: Ctx): { rows: Row[]; ym: string; period: string } | null {
  const rows = rowsOf(ctx, UM);
  if (!rows || rows.length === 0) return null;
  const ym = ymRow(rows[0]!);
  return { rows, ym, period: snapshotText(ctx.lang, ym, ctx.data[UM]?.updatedAt) };
}

const topUsers: Question = {
  id: 'top_users',
  group: 'users',
  ask: {
    ja: ['今月一番使っているユーザーは誰？', '利用時間が長いユーザー上位10人', 'ヘビーユーザーを教えて'],
    vi: ['Ai là người dùng hoạt động nhiều nhất tháng này?', 'Top 10 người dùng có thời gian sử dụng dài nhất', 'Những người dùng tích cực nhất là ai?'],
  },
  keywords: ['ヘビーユーザー', '利用時間', '上位', 'tich cuc', 'nhieu nhat', 'top', 'nguoi dung'],
  uses: { plan: true, topN: true },
  related: ['inactive_users', 'top_active_companies', 'mau'],
  needs: needUm,
  build(ctx) {
    const snap = umSnapshot(ctx);
    if (!snap) return null;
    const k = topOf(ctx);
    const list = [...snap.rows].sort((a, b) => n(b.active_minutes) - n(a.active_minutes)).slice(0, k);
    const top = list[0];
    if (!top) return null;
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${snap.period}${s}の利用時間トップは ${top.full_name}（${top.company_name}）で、${count(n(top.active_minutes), 'ja')} 分・${count(n(top.active_days), 'ja')} 日利用しています。上位 ${k} 人を表にしました。`,
        `${snap.period}${s}: người dùng nhiều nhất là ${top.full_name} (${top.company_name}) với ${count(n(top.active_minutes), 'vi')} phút trong ${count(n(top.active_days), 'vi')} ngày. Bảng dưới là top ${k}.`,
      ),
      figures: [],
      table: {
        head: [tx(ctx.lang, '氏名', 'Họ tên'), tx(ctx.lang, '企業', 'Công ty'), tx(ctx.lang, 'プラン', 'Gói'), tx(ctx.lang, '利用日数', 'Ngày dùng'), tx(ctx.lang, '利用時間（分）', 'Phút dùng')],
        numeric: [false, false, false, true, true],
        rows: list.map((r) => [String(r.full_name ?? ''), String(r.company_name ?? ''), r.plan_id ? ctx.label('plan', String(r.plan_id)) : '—', count(n(r.active_days), ctx.lang), count(n(r.active_minutes), ctx.lang)]),
      },
      basis: tx(ctx.lang, 'ユーザー別ボード：最新月の利用時間（分）が長い順。', 'Bảng Theo người dùng: tháng mới nhất, xếp theo số phút sử dụng giảm dần.'),
      period: snap.period,
      applied: applied(ctx, this),
    };
  },
};

const inactive: Question = {
  id: 'inactive_users',
  group: 'users',
  ask: {
    ja: ['今月まだ一度も使っていないユーザーは？', '利用していないユーザーは何人？', '休眠ユーザーを教えて'],
    vi: ['Người dùng nào tháng này chưa đăng nhập lần nào?', 'Có bao nhiêu người dùng không hoạt động?', 'Danh sách người dùng "ngủ đông"'],
  },
  keywords: ['休眠', '使っていない', '未利用', 'khong hoat dong', 'chua dang nhap', 'ngu dong', 'inactive'],
  uses: { plan: true, topN: true },
  related: ['seat_usage', 'low_seat_companies', 'top_users'],
  needs: needUm,
  build(ctx) {
    const snap = umSnapshot(ctx);
    if (!snap) return null;
    const idle = snap.rows.filter((r) => r.is_seat === true && n(r.active_days) === 0);
    const seats = snap.rows.filter((r) => r.is_seat === true).length;
    const k = topOf(ctx);
    // Longest since last visit first; never visited (null) comes at the very top.
    const list = [...idle].sort((a, b) => String(a.last_active_date ?? '').localeCompare(String(b.last_active_date ?? ''))).slice(0, k);
    const s = scopeOf(ctx);
    return {
      text: tx(
        ctx.lang,
        `${snap.period}${s}、シートを持つ ${count(seats, 'ja')} 人のうち ${count(idle.length, 'ja')} 人（${pct(seats ? idle.length / seats : null, 'ja')}）が今月まだ利用していません。最終利用日が古い順に ${list.length} 人を表示します。`,
        `${snap.period}${s}: ${count(idle.length, 'vi')} / ${count(seats, 'vi')} người giữ ghế (${pct(seats ? idle.length / seats : null, 'vi')}) chưa hoạt động tháng này. Dưới đây là ${list.length} người lâu không vào nhất.`,
      ),
      figures: [{ label: tx(ctx.lang, '未利用ユーザー', 'Chưa hoạt động'), value: count(idle.length, ctx.lang) }],
      table: {
        head: [tx(ctx.lang, '氏名', 'Họ tên'), tx(ctx.lang, '企業', 'Công ty'), tx(ctx.lang, '最終利用日', 'Lần cuối hoạt động')],
        numeric: [false, false, false],
        rows: list.map((r) => [
          String(r.full_name ?? ''),
          String(r.company_name ?? ''),
          typeof r.last_active_date === 'string' ? dayLabel(r.last_active_date, ctx.lang) : tx(ctx.lang, '利用履歴なし', 'Chưa từng dùng'),
        ]),
      },
      basis: tx(ctx.lang, 'ユーザー別ボード：最新月にシートを持ち、利用日数が0のユーザー。', 'Bảng Theo người dùng: tháng mới nhất, người giữ ghế có 0 ngày hoạt động.'),
      period: snap.period,
      applied: applied(ctx, this),
    };
  },
};

export const USER_QUESTIONS: readonly Question[] = [mau, stick, newUsers, seatUse, usersTotal, topUsers, inactive];
