// ─────────────────────────────────────────────────────────────────────────────
// GLOSSARY — MỘT nguồn giải thích chỉ số cho nút ⓘ VÀ bảng chỉ số ở trang Giới thiệu.
//
// Luật:
//   · TÊN chỉ số KHÔNG ghi ở đây: `name` chỉ TRỎ tới nhãn trong DB (mart.column_labels /
//     mart.labels, CLAUDE.md §2.4). glossary.test.ts đỏ nếu nhãn được trỏ tới không có trong
//     migration nhãn.
//   · Chỉ ghi điều mà SQL / code HIỆN làm. Mỗi mục có comment trỏ tới file:dòng nguồn để soát.
//     Không chắc ⇒ để TODO (hiện "chưa xác nhận"), không bịa.
//   · Mỗi trường chữ có đủ ja + vi (test khoá).
// ─────────────────────────────────────────────────────────────────────────────
import type { LocalStr } from '../nav/catalog';

/** Trỏ tới nhãn trong DB: tên cột (mart.column_labels) hoặc (domain, code) của mart.labels. */
export type NameRef = { col: string } | { label: readonly [domain: string, code: string] };

/** Chưa xác nhận được từ code / SQL — người dùng điền sau. */
export const TODO = 'TODO' as const;
export type Text = LocalStr | typeof TODO;

export interface GlossaryEntry {
  /** Tên hiện ra = các nhãn được trỏ tới, nối bằng " · ". */
  name: readonly NameRef[];
  /** Định nghĩa một câu. */
  what: Text;
  formula: Text;
  unit: Text;
  /** View mart mà số đi ra (tên SQL, không dịch). */
  source: string;
  /** Phạm vi riêng của chỉ số (không kể các câu chung ở COMMON_SCOPE). */
  scope: Text;
  /** Tháng đang chạy là số tạm ⇒ thêm câu COMMON_SCOPE.partialMonth. */
  partialMonth: boolean;
}

const s = (ja: string, vi: string): LocalStr => ({ ja, vi });

/** Câu phạm vi CHUNG cho mọi chỉ số (hiện ở mọi popover + một lần ở trang Giới thiệu). */
export const COMMON_SCOPE = {
  // Không có cột / cờ nào đánh dấu tài khoản test hay nội bộ: raw.sql:51-69 (companies, users).
  testInternal: s('データはテスト・社内アカウントを区別していません。', 'Dữ liệu không phân biệt tài khoản test/nội bộ.'),
  // Cột thời gian đều là `date` (raw.sql:58,67-68,135,160); múi giờ chỉ là một dòng meta: generate.mjs:108.
  timezone: s(
    '時刻はなく日付単位です。raw.dataset_meta のタイムゾーン欄は Asia/Ho_Chi_Minh。',
    'Mốc thời gian là NGÀY (không có giờ). raw.dataset_meta ghi múi giờ Asia/Ho_Chi_Minh.',
  ),
  // mart.sql:10,27-28 · SCHEMA.md:65-67.
  partialMonth: s(
    '当月は暫定値：データ日（as_of）までの集計で、月全体ではありません。',
    'Tháng đang chạy là số tạm: đo tới ngày dữ liệu (as_of), chưa phải cả tháng.',
  ),
} as const satisfies Record<string, LocalStr>;

const YEN = s('円', 'yên (¥)');
const COMPANIES = s('社', 'công ty');
const PEOPLE = s('人', 'người');
const RATE = s('%', '%');

export const GLOSSARY = {
  // mart.sql:37-50 (MRR tại measure_date, cộng các subscription) · :136,152 (Σ theo gói)
  // raw.sql:85-95 (subscription_periods là nguồn sự thật; mrr đã trừ giảm giá; dùng thử = 0)
  // Số phụ ở ô: deltaRate — metrics.ts:63-67; kỳ so sánh: data/period.ts prevRange.
  mrr_end: {
    name: [{ col: 'mrr_end' }],
    what: s('締め日時点で有効な契約のMRR合計。', 'Tổng MRR của các thuê bao còn hiệu lực tại ngày chốt số của tháng.'),
    formula: s(
      'Σ subscription_periods.mrr（measure_date に有効な行）。補足の増減率 =（期間末月 − 同じ長さの前期間の末月）÷ |前期間の末月|。',
      'Σ subscription_periods.mrr (dòng còn hiệu lực tại measure_date). Số phụ ở ô = (tháng cuối kỳ đang xem − tháng cuối kỳ trước dài bằng nhau) ÷ |tháng cuối kỳ trước|.',
    ),
    unit: YEN,
    source: 'mart.revenue_monthly ← mart.company_mrr_monthly',
    scope: s('割引後の金額。トライアル期間は MRR 0。', 'Đã trừ giảm giá. Giai đoạn dùng thử có MRR = 0.'),
    partialMonth: true,
  },
  // mart.sql:137 (count filter mrr > 0), :153
  paying_companies: {
    name: [{ col: 'paying_companies' }],
    what: s('締め日時点で MRR > 0 の企業数。', 'Số công ty có MRR > 0 tại ngày chốt số.'),
    formula: s('count(企業) where mrr > 0', 'count(công ty) where mrr > 0'),
    unit: COMPANIES,
    source: 'mart.revenue_monthly ← mart.company_mrr_monthly',
    scope: s('トライアル中（MRR 0）の企業は含まない。', 'Không tính công ty đang dùng thử (MRR = 0).'),
    partialMonth: true,
  },
  // metrics.ts:21-22 · SCHEMA.md:109
  arpa: {
    name: [{ label: ['metric', 'arpa'] }],
    what: s('有料企業1社あたりの平均MRR。', 'MRR trung bình của mỗi công ty trả tiền.'),
    formula: s('mrr_end ÷ paying_companies', 'mrr_end ÷ paying_companies'),
    unit: YEN,
    source: 'mart.revenue_monthly',
    scope: s('mart の列からブラウザで計算。分母が 0 のときは「—」。', 'Tính ở trình duyệt từ các cột của mart. Mẫu số = 0 thì hiện "—".'),
    partialMonth: true,
  },
  // mart.sql:82-89 (phân loại) · :101-115 (đổi gói = 2 dòng) · :121-127 · SCHEMA.md:84-103
  // Biểu đồ vẽ new · expansion (trên) · contraction · churned (dưới): RevenueCharts.tsx
  mrr_delta: {
    name: [{ col: 'mrr_delta' }],
    what: s('前月からの MRR の増減を種類別に分けたもの。', 'Thay đổi MRR so với tháng trước, tách theo loại biến động.'),
    formula: s(
      '新規・再開・拡大・縮小・解約・プラン変更（入/出）の合計 = 当月 mrr_end − 前月 mrr_end。',
      'new + reactivation + expansion + contraction + churn + plan_in + plan_out = mrr_end tháng này − mrr_end tháng trước.',
    ),
    unit: YEN,
    source: 'mart.revenue_monthly ← mart.mrr_movements',
    scope: s(
      'グラフは新規・拡大・縮小・解約の4種のみ。再開とプラン変更は表にだけ表示。解約は前月のプランに計上。',
      'Biểu đồ chỉ vẽ 4 loại: mới, mở rộng, thu hẹp, huỷ. Quay lại và đổi gói chỉ có trong bảng. Huỷ được tính vào gói của tháng trước.',
    ),
    partialMonth: true,
  },
  // mart.sql:83 (movement 'new' = tháng trước MRR 0, tháng này > 0, CHƯA từng trả tiền) · :121 (Σ mrr_delta) · :156
  // Ô số ở trang Doanh thu CỘNG các tháng của khoảng đang lọc (data/period.ts sumFlow).
  new_mrr: {
    name: [{ col: 'new_mrr' }],
    what: s('初めて有料になった企業が加えた MRR。', 'MRR do công ty lần đầu trả tiền mang lại.'),
    formula: s(
      "Σ mrr_delta where movement = 'new'（前月 MRR 0 → 当月 > 0、過去に支払いなし）",
      "Σ mrr_delta where movement = 'new' (MRR tháng trước 0 → tháng này > 0, chưa từng trả tiền)",
    ),
    unit: YEN,
    source: 'mart.revenue_monthly ← mart.mrr_movements',
    scope: s(
      '一度解約して戻った企業は「再開」で、ここには入らない。期間で絞ると選んだ月の合計。',
      'Công ty huỷ rồi quay lại tính là "quay lại", không vào đây. Khi lọc theo kỳ, ô số là tổng các tháng đã chọn.',
    ),
    partialMonth: true,
  },
  // mart.sql:143-146 (theo period_month; status <> 'void') · generate.mjs:392-415 (amount = MRR lúc phát hành)
  invoiced_amount: {
    name: [{ col: 'invoiced_amount' }],
    what: s('対象月（period_month）の請求額合計。', 'Tổng tiền xuất hoá đơn của kỳ (period_month).'),
    formula: s("Σ invoices.amount where status <> 'void'", "Σ invoices.amount where status <> 'void'"),
    unit: YEN,
    source: 'mart.revenue_monthly ← raw.invoices',
    scope: s(
      '請求額は発行日時点の MRR（税・日割りなし）。',
      'Số tiền hoá đơn = MRR tại ngày phát hành (không thuế, không chia theo ngày).',
    ),
    partialMonth: true,
  },
  // mart.sql:146 (status = 'paid', vẫn gom theo period_month) · generate.mjs:400-411
  paid_amount: {
    name: [{ col: 'paid_amount' }],
    what: s('対象月の請求のうち、入金済みの金額。', 'Phần đã thu của các hoá đơn thuộc kỳ đó.'),
    formula: s("Σ invoices.amount where status = 'paid'", "Σ invoices.amount where status = 'paid'"),
    unit: YEN,
    source: 'mart.revenue_monthly ← raw.invoices',
    scope: s(
      '入金日ではなく請求の対象月で集計。データ日以降の入金はまだ未入金扱い。',
      'Gom theo kỳ hoá đơn, KHÔNG theo ngày thu. Tiền thu sau ngày dữ liệu vẫn tính là chưa thu.',
    ),
    partialMonth: true,
  },
  // mart.sql:190,196 (is_seat tại measure_date) · :220,228 (chỉ công ty có gói)
  seat_users_end: {
    name: [{ col: 'seat_users_end' }],
    what: s('締め日時点でシートを持つユーザー数。', 'Số người dùng đang giữ ghế tại ngày chốt số.'),
    formula: s(
      'created_at ≤ measure_date かつ（deactivated_at が空 または > measure_date）のユーザー数',
      'Số user có created_at ≤ measure_date và (deactivated_at trống hoặc > measure_date)',
    ),
    unit: PEOPLE,
    source: 'mart.users_monthly ← mart.user_monthly',
    scope: s('その月にプランのある企業のユーザーのみ。', 'Chỉ user của công ty có gói trong tháng đó.'),
    partialMonth: true,
  },
  // mart.sql:216,223 (active_days > 0) · :181,203 · raw.sql:132-139 (dòng hoạt động: sessions ≥ 1)
  mau: {
    name: [{ col: 'mau' }],
    what: s('月内に1日以上利用したユーザー数。', 'Số người dùng có ít nhất 1 ngày hoạt động trong tháng.'),
    formula: s(
      'count(user) where active_days > 0。利用日 = user_activity_daily に行がある日（sessions ≥ 1）。',
      'count(user) where active_days > 0. Ngày hoạt động = ngày có dòng trong user_activity_daily (sessions ≥ 1).',
    ),
    unit: PEOPLE,
    source: 'mart.users_monthly / mart.company_monthly ← mart.user_monthly',
    scope: s(
      '月内に停止されたユーザーも、その月に利用があれば含む。',
      'Có tính cả user bị tắt trong tháng nếu tháng đó họ có hoạt động.',
    ),
    partialMonth: true,
  },
  // metrics.ts:48-55 · mart.sql:224,232 (days_in_period = measure_date − month + 1) · SCHEMA.md:113-114
  stickiness: {
    name: [{ label: ['metric', 'stickiness'] }],
    what: s('月間利用者のうち、平均して1日に何割が利用したか。', 'Trong số người dùng của tháng, trung bình mỗi ngày có bao nhiêu phần dùng.'),
    formula: s('(active_user_days ÷ days_in_period) ÷ mau', '(active_user_days ÷ days_in_period) ÷ mau'),
    unit: RATE,
    source: 'mart.users_monthly',
    scope: s('mart の列からブラウザで計算。当月の days_in_period はデータ日まで。分母が 0 なら「—」。', 'Tính ở trình duyệt từ các cột của mart. Tháng đang chạy: days_in_period chỉ tới ngày dữ liệu. Mẫu số = 0 thì hiện "—".'),
    partialMonth: true,
  },
  // metrics.ts:57-58 · SCHEMA.md:115
  seat_usage_rate: {
    name: [{ label: ['metric', 'seat_usage_rate'] }],
    what: s('シート保有者のうち、その月に利用した割合。', 'Tỉ lệ người dùng của tháng so với số ghế.'),
    formula: s('mau ÷ seat_users_end', 'mau ÷ seat_users_end'),
    unit: RATE,
    source: 'mart.users_monthly',
    scope: s(
      'mart の列からブラウザで計算。分子（MAU）は月内停止ユーザーを含み、分母（月末シート）は含まない。',
      'Tính ở trình duyệt từ các cột của mart. Tử số (MAU) có tính user bị tắt trong tháng, mẫu số (ghế cuối tháng) thì không.',
    ),
    partialMonth: true,
  },
  // mart.sql:191 (date_trunc('month', created_at) = month) · :221
  new_users: {
    name: [{ col: 'new_users' }],
    what: s('その月に作成されたユーザー数。', 'Số người dùng được tạo trong tháng.'),
    formula: s('count(user) where created_at の月 = 対象月', 'count(user) where tháng của created_at = tháng đang xét'),
    unit: PEOPLE,
    source: 'mart.users_monthly ← mart.user_monthly',
    scope: s('その月にプランのある企業のユーザーのみ。', 'Chỉ user của công ty có gói trong tháng đó.'),
    partialMonth: true,
  },
  // raw.sql:68 (deactivated_at = ngày ĐẦU TIÊN không còn là ghế) · mart.sql:192-193,222
  deactivated_users: {
    name: [{ col: 'deactivated_users' }],
    what: s('その月に停止されたユーザー数。', 'Số người dùng bị tắt trong tháng.'),
    formula: s('count(user) where deactivated_at の月 = 対象月', 'count(user) where tháng của deactivated_at = tháng đang xét'),
    unit: PEOPLE,
    source: 'mart.users_monthly ← mart.user_monthly',
    scope: s(
      'deactivated_at はシートでなくなった最初の日。グラフでは 0 の下に描くが、値は正の人数。',
      'deactivated_at là ngày ĐẦU TIÊN không còn là ghế. Biểu đồ vẽ dưới mốc 0, nhưng giá trị là số người (dương).',
    ),
    partialMonth: true,
  },
  // mart.sql:179-186 (đếm ngày có dòng hoạt động) · :203 · biểu đồ: ByUserCharts.tsx (chỉ is_seat; nhóm 0 · 1–4 · 5–9 · 10–19 · 20+)
  // Tháng hiển thị = tháng mới nhất: server/lib/sources.js:25-37
  active_days: {
    name: [{ col: 'active_days' }],
    what: s('ユーザーがその月に利用した日数。', 'Số ngày trong tháng mà người dùng có hoạt động.'),
    formula: s('count(user_activity_daily の行) / ユーザー × 月', 'count(dòng user_activity_daily) theo user × tháng'),
    unit: s('日', 'ngày'),
    source: 'mart.user_monthly',
    scope: s(
      'グラフはシート保有者のみ、最新月を表示。',
      'Biểu đồ chỉ tính người đang giữ ghế, ở tháng mới nhất.',
    ),
    partialMonth: true,
  },
  // mart.sql:41,79 (MRR công ty tại measure_date) · company_monthly :265-267 · top 10: ByCompanyCharts.tsx
  mrr: {
    name: [{ col: 'mrr' }],
    what: s('企業ごとの、締め日時点の MRR。', 'MRR của từng công ty tại ngày chốt số.'),
    formula: s('Σ subscription_periods.mrr / 企業（同時に複数契約なら合算）', 'Σ subscription_periods.mrr theo công ty (nhiều thuê bao cùng lúc thì cộng lại)'),
    unit: YEN,
    source: 'mart.company_monthly ← mart.company_mrr_monthly',
    scope: s('最新月を表示。複数契約の企業のプラン = 最上位のプラン。', 'Hiện tháng mới nhất. Công ty có nhiều thuê bao: gói = gói hạng cao nhất.'),
    partialMonth: true,
  },
  // mart.sql:280-399 (điểm v2, band) · :292-293 (ảnh chụp Chủ nhật ≤ as_of) · :403-419 (watchlist = ảnh mới nhất)
  // SCHEMA.md:134-162 · ô đếm: ChurnScreen.tsx · biểu đồ bỏ band "low": ChurnCharts.tsx
  risk_band: {
    name: [{ col: 'risk_band' }],
    what: s(
      '有料企業ごとに毎週日曜時点で付ける解約リスクの区分。',
      'Mức rủi ro huỷ gán cho mỗi công ty đang trả tiền, ở ảnh chụp mỗi Chủ nhật.',
    ),
    formula: s(
      '解約予約が有効 ⇒ 解約予約。それ以外は点数 = 利用減(≤40) + シート低利用(≤20) + 重要機能減(≤30) + 未払い(10)、上限100。≥60 高・≥30 中・それ以外 低。',
      'Có hẹn huỷ đang mở ⇒ "Đang hẹn huỷ". Còn lại: điểm = giảm sử dụng (≤40) + ghế ít dùng (≤20) + giảm tính năng chính (≤30) + nợ hoá đơn (10), trần 100. ≥60 Cao · ≥30 Trung bình · còn lại Thấp.',
    ),
    unit: COMPANIES,
    source: 'mart.churn_risk_snapshot / mart.churn_watchlist',
    scope: s(
      'しきい値は経験則（heuristic）。直近28日と前の28日を比較。件数はデータ日以前の直近の日曜時点。',
      'Ngưỡng là heuristic. So 28 ngày gần nhất với 28 ngày trước đó. Số đếm lấy ở Chủ nhật gần nhất trước hoặc bằng ngày dữ liệu.',
    ),
    partialMonth: false,
  },
  // mart.sql:394-398 (nhãn: canceled_at trong (ngày chụp, ngày chụp + 90]; null khi chưa đủ 90 ngày) · churn.ts:7-13
  churned_within_90d: {
    name: [{ col: 'churned_within_90d' }],
    what: s(
      'その区分だった時点から90日以内に実際に解約した割合（スコアの精度）。',
      'Tỉ lệ thật sự huỷ trong 90 ngày sau khi được xếp vào mức đó (độ chính xác của điểm).',
    ),
    formula: s(
      '90日以内に解約したスナップショット数 ÷ 90日経過済みのスナップショット数',
      'Số ảnh chụp có huỷ trong 90 ngày ÷ số ảnh chụp đã đủ 90 ngày',
    ),
    unit: RATE,
    source: 'mart.churn_risk_snapshot',
    scope: s(
      'n は「企業 × 週」の数で、企業数ではない（同じ企業が複数週に入る）。90日未経過のスナップショットは除外。',
      'n là số (công ty × tuần), không phải số công ty — một công ty được đếm ở nhiều tuần. Ảnh chụp chưa đủ 90 ngày bị loại.',
    ),
    partialMonth: false,
  },
  // mart.sql:421-430 (theo tháng created_at; đếm theo outcome) · tháng trống = 0: ChurnCharts.tsx (fillMonths)
  interventions: {
    name: [{ col: 'interventions' }],
    what: s('フォロー対応の件数を作成月・結果別に数えたもの。', 'Số lượt chăm sóc theo tháng tạo, chia theo kết quả.'),
    formula: s('count(interventions) / 作成月 × outcome', 'count(interventions) theo tháng tạo × outcome'),
    unit: s('件', 'lượt'),
    source: 'mart.interventions_monthly ← raw.interventions',
    scope: s(
      '結果はデータ読込時点の状態（「対応中」は後で変わり得る）。対応のない月は 0 件。',
      'Kết quả là trạng thái tại lúc nạp dữ liệu ("Đang xử lý" có thể đổi sau). Tháng không có lượt nào = 0.',
    ),
    partialMonth: true,
  },
  // mart.sql:388-393 (thành phần nặng điểm nhất; hoà thì usage → key features → seats → billing)
  top_reason: {
    name: [{ col: 'top_reason' }],
    what: s('リスク点数の中で最も大きい要素。', 'Thành phần chiếm nhiều điểm rủi ro nhất.'),
    formula: s(
      'max(利用減, 重要機能減, シート低利用, 未払い)。同点は 利用減 → 重要機能 → シート → 未払い の順。',
      'max(giảm sử dụng, giảm tính năng chính, ghế ít dùng, nợ hoá đơn). Bằng điểm thì ưu tiên: sử dụng → tính năng chính → ghế → hoá đơn.',
    ),
    unit: COMPANIES,
    source: 'mart.churn_watchlist',
    scope: s('グラフは「低」を除く、直近の日曜時点の企業。', 'Biểu đồ không tính mức "Thấp", lấy ở Chủ nhật gần nhất.'),
    partialMonth: false,
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
export const GLOSSARY_KEYS = Object.keys(GLOSSARY) as GlossaryKey[];

export function textOf(t: Text, lang: 'ja' | 'vi'): string | null {
  return t === TODO ? null : t[lang];
}
