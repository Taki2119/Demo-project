-- ─────────────────────────────────────────────────────────────────────────────
-- ja / vi LABEL DICTIONARY — ONE source for both the web app and the AI.
--
-- The DB keeps column names + value codes in ENGLISH (stable, easy to write SQL). What users SEE
-- comes from here:
--   · mart.column_labels — column names (and units) in Japanese / Vietnamese;
--   · mart.labels        — coded values (plan, industry, churn reason, risk band…) + metric names.
-- UI text (buttons, filters, messages) is NOT here — it belongs to the frontend's i18n dictionary.
-- ⚠ Add a new column / code and forget the label ⇒ the test "every user-facing column has ja + vi labels" in `supabase/tests/generate.test.mjs` goes red.
-- ─────────────────────────────────────────────────────────────────────────────

create table mart.column_labels (
  column_name text primary key,
  ja          text not null,
  vi          text not null,
  unit        text            -- 'JPY' | '件' | '人' | '日' | '分' | '%' | null
);

create table mart.labels (
  domain     text not null,
  code       text not null,
  ja         text not null,
  vi         text not null,
  sort_order integer not null default 0,
  primary key (domain, code)
);

insert into mart.column_labels (column_name, ja, vi, unit) values
  -- time
  ('month',               '月',                   'Tháng',                        null),
  ('month_end',           '月末日',               'Ngày cuối tháng',              null),
  ('measure_date',        '集計基準日',           'Ngày chốt số',                 null),
  ('is_closed',           '確定済み',             'Đã chốt',                      null),
  ('days_in_period',      '期間日数',             'Số ngày trong kỳ',             '日'),
  ('snapshot_date',       'スナップショット日',   'Ngày chụp',                    null),
  -- catalogs
  ('plan_id',             'プラン',               'Gói',                          null),
  ('plan_prev',           '前月のプラン',         'Gói tháng trước',              null),
  ('name',                '名称',                 'Tên',                          null),
  ('tier',                'ランク',               'Hạng',                         null),
  ('base_price',          '基本料金',             'Phí cơ bản',                   'JPY'),
  ('seat_price',          '追加シート単価',       'Đơn giá ghế thêm',             'JPY'),
  ('included_seats',      '基本料金内シート数',   'Số ghế trong phí cơ bản',      '席'),
  ('currency',            '通貨',                 'Tiền tệ',                      null),
  ('is_active',           '提供中',               'Đang cung cấp',                null),
  ('feature_id',          '機能',                 'Tính năng',                    null),
  ('is_key',              '重要機能',             'Tính năng chính',              null),
  ('min_tier',            '利用可能な最低ランク', 'Hạng thấp nhất được dùng',     null),
  ('staff_id',            '担当者ID',             'Mã nhân viên',                 null),
  ('full_name',           '氏名',                 'Họ tên',                       null),
  ('team',                'チーム',               'Nhóm',                         null),
  -- company
  ('company_id',          '企業ID',               'Mã công ty',                   null),
  ('company_name',        '企業名',               'Tên công ty',                  null),
  ('industry',            '業種',                 'Ngành',                        null),
  ('region',              '地域',                 'Khu vực',                      null),
  ('size_band',           '従業員規模',           'Quy mô nhân sự',               null),
  ('owner_staff_id',      '担当者ID',             'Mã người phụ trách',           null),
  ('owner_name',          '担当者',               'Người phụ trách',              null),
  -- MRR
  ('mrr',                 'MRR',                  'MRR',                          'JPY'),
  ('mrr_prev',            '前月MRR',              'MRR tháng trước',              'JPY'),
  ('mrr_end',             '月末MRR',              'MRR cuối tháng',               'JPY'),
  ('mrr_delta',           'MRR増減',              'Biến động MRR',                'JPY'),
  ('movement',            'MRR変動区分',          'Loại biến động MRR',           null),
  ('plan_change',         'プラン変更',           'Đổi gói',                      null),
  ('new_mrr',             '新規MRR',              'MRR mới',                      'JPY'),
  ('reactivation_mrr',    '復帰MRR',              'MRR quay lại',                 'JPY'),
  ('expansion_mrr',       '拡大MRR',              'MRR mở rộng',                  'JPY'),
  ('contraction_mrr',     '縮小MRR',              'MRR thu hẹp',                  'JPY'),
  ('churned_mrr',         '解約MRR',              'MRR huỷ',                      'JPY'),
  ('plan_in_mrr',         'プラン変更（流入）',   'Đổi gói (vào)',                'JPY'),
  ('plan_out_mrr',        'プラン変更（流出）',   'Đổi gói (ra)',                 'JPY'),
  ('paying_companies',    '有料企業数',           'Số công ty trả tiền',          '社'),
  ('trial_companies',     'トライアル企業数',     'Số công ty dùng thử',          '社'),
  ('new_companies',       '新規企業数',           'Số công ty mới',               '社'),
  ('reactivated_companies','復帰企業数',          'Số công ty quay lại',          '社'),
  ('churned_companies',   '解約企業数',           'Số công ty huỷ',               '社'),
  ('seats',               '契約シート数',         'Số ghế hợp đồng',              '席'),
  ('seats_end',           '月末契約シート数',     'Số ghế hợp đồng cuối tháng',   '席'),
  -- invoices
  ('invoiced_amount',     '請求額',               'Số tiền xuất hoá đơn',         'JPY'),
  ('paid_amount',         '入金額',               'Số tiền đã thu',               'JPY'),
  ('unpaid_amount',       '未入金額',             'Số tiền chưa thu',             'JPY'),
  ('overdue_invoices',    '支払期限超過の請求書', 'Hoá đơn quá hạn',              '件'),
  -- user
  ('user_id',             'ユーザーID',           'Mã người dùng',                null),
  ('is_seat',             '有効ユーザー',         'Đang là ghế',                  null),
  ('is_new',              '当月追加',             'Thêm trong tháng',             null),
  ('is_deactivated',      '当月停止',             'Bị tắt trong tháng',           null),
  ('seat_users_end',      '月末有効ユーザー数',   'Số người dùng cuối tháng',     '人'),
  ('new_users',           '新規ユーザー数',       'Người dùng mới',               '人'),
  ('deactivated_users',   '停止ユーザー数',       'Người dùng bị tắt',            '人'),
  ('mau',                 'MAU',                  'MAU',                          '人'),
  ('active_days',         '利用日数',             'Số ngày sử dụng',              '日'),
  ('active_user_days',    '延べ利用日数',         'Tổng ngày-người sử dụng',      '人日'),
  ('sessions',            'セッション数',         'Số phiên',                     '回'),
  ('active_minutes',      '利用時間',             'Thời gian sử dụng',            '分'),
  ('last_active_date',    '最終利用日',           'Ngày dùng gần nhất',           null),
  ('feature_events',      '機能利用回数',         'Lượt dùng tính năng',          '回'),
  ('key_feature_events',  '重要機能の利用回数',   'Lượt dùng tính năng chính',    '回'),
  -- churn risk
  ('days_since_last_active','最終利用からの日数', 'Số ngày từ lần dùng cuối',     '日'),
  ('active_users_28d',    '直近28日の利用者数',   'Người dùng 28 ngày gần nhất',  '人'),
  ('active_users_7d',     '直近7日の利用者数',    'Người dùng 7 ngày gần nhất',   '人'),
  ('seat_utilization',    'シート利用率（週次）', 'Tỉ lệ dùng ghế (theo tuần)',   '%'),
  ('active_user_days_28d',      '延べ利用日数（直近28日）', 'Ngày-người sử dụng (28 ngày gần nhất)', '人日'),
  ('active_user_days_prev_28d', '延べ利用日数（前28日）',   'Ngày-người sử dụng (28 ngày trước đó)', '人日'),
  ('activity_trend',      '利用の増減率',         'Tăng giảm mức sử dụng',        '%'),
  ('key_events_28d',      '重要機能利用（直近28日）', 'Tính năng chính (28 ngày gần nhất)', '回'),
  ('key_events_prev_28d', '重要機能利用（前28日）',   'Tính năng chính (28 ngày trước đó)', '回'),
  ('key_trend',           '重要機能の増減率',     'Tăng giảm tính năng chính',    '%'),
  ('cancel_scheduled',    '解約予約あり',         'Đang hẹn huỷ',                 null),
  ('pts_usage',           '利用減少スコア',       'Điểm giảm sử dụng',            '点'),
  ('pts_seats',           'シート利用スコア',     'Điểm dùng ghế',                '点'),
  ('pts_key_features',    '重要機能スコア',       'Điểm tính năng chính',         '点'),
  ('pts_billing',         '支払いスコア',         'Điểm thanh toán',              '点'),
  ('risk_score',          '解約リスクスコア',     'Điểm rủi ro huỷ',              '点'),
  ('risk_band',           'リスク区分',           'Mức rủi ro',                   null),
  ('top_reason',          '主な要因',             'Nguyên nhân chính',            null),
  ('churned_within_90d',  '90日以内に解約',       'Huỷ trong 90 ngày',            null),
  -- care
  ('last_intervention_at',      '最終フォロー日',     'Lần chăm sóc gần nhất',      null),
  ('last_intervention_channel', '最終フォロー手段',   'Kênh chăm sóc gần nhất',     null),
  ('last_intervention_outcome', '最終フォロー結果',   'Kết quả chăm sóc gần nhất',  null),
  ('trigger',             'きっかけ',             'Nguồn kích hoạt',              null),
  ('channel',             '手段',                 'Kênh',                         null),
  ('interventions',       'フォロー件数',         'Số lượt chăm sóc',             '件'),
  ('saved',               '継続',                 'Giữ được',                     '件'),
  ('churned',             '解約',                 'Đã huỷ',                       '件'),
  ('no_response',         '応答なし',             'Không phản hồi',               '件'),
  ('pending',             '対応中',               'Đang xử lý',                   '件'),
  -- quality checks
  ('check_name',          'チェック項目',         'Hạng mục kiểm tra',            null),
  ('failed_rows',         '不整合件数',           'Số dòng lỗi',                  '件');

insert into mart.labels (domain, code, ja, vi, sort_order) values
  ('plan', 'starter', 'スターター', 'Khởi đầu',   1),
  ('plan', 'growth',  'グロース',   'Tăng trưởng', 2),
  ('plan', 'scale',   'スケール',   'Mở rộng',    3),

  ('feature', 'dashboard',    'ダッシュボード', 'Bảng điều khiển', 1),
  ('feature', 'reports',      'レポート',       'Báo cáo',         2),
  ('feature', 'automation',   'ワークフロー自動化', 'Tự động hoá quy trình', 3),
  ('feature', 'integrations', '外部サービス連携', 'Kết nối dịch vụ ngoài', 4),
  ('feature', 'export',       'データ出力',     'Xuất dữ liệu',    5),
  ('feature', 'chat',         'チャット',       'Trò chuyện',      6),
  ('feature', 'mobile',       'モバイルアプリ', 'Ứng dụng di động', 7),
  ('feature', 'api',          'API',            'API',             8),

  ('industry', 'it',                    'IT・ソフトウェア', 'CNTT – phần mềm',      1),
  ('industry', 'manufacturing',         '製造',             'Sản xuất',             2),
  ('industry', 'retail',                '小売',             'Bán lẻ',               3),
  ('industry', 'healthcare',            '医療・介護',       'Y tế – chăm sóc',      4),
  ('industry', 'finance',               '金融・保険',       'Tài chính – bảo hiểm', 5),
  ('industry', 'education',             '教育',             'Giáo dục',             6),
  ('industry', 'logistics',             '物流',             'Logistics',            7),
  ('industry', 'construction',          '建設・不動産',     'Xây dựng – bất động sản', 8),
  ('industry', 'hospitality',           '飲食・宿泊',       'Ăn uống – lưu trú',    9),
  ('industry', 'professional_services', '専門サービス',     'Dịch vụ chuyên môn',   10),

  ('region', 'hokkaido', '北海道', 'Hokkaido', 1),
  ('region', 'tohoku',   '東北',   'Tohoku',   2),
  ('region', 'kanto',    '関東',   'Kanto',    3),
  ('region', 'chubu',    '中部',   'Chubu',    4),
  ('region', 'kansai',   '関西',   'Kansai',   5),
  ('region', 'chugoku',  '中国',   'Chugoku',  6),
  ('region', 'shikoku',  '四国',   'Shikoku',  7),
  ('region', 'kyushu',   '九州・沖縄', 'Kyushu – Okinawa', 8),

  ('size_band', '1-10',     '1〜10名',     '1–10 người',      1),
  ('size_band', '11-50',    '11〜50名',    '11–50 người',     2),
  ('size_band', '51-200',   '51〜200名',   '51–200 người',    3),
  ('size_band', '201-1000', '201〜1000名', '201–1000 người',  4),
  ('size_band', '1000+',    '1001名以上',  'Trên 1000 người', 5),

  ('acquisition_channel', 'inbound',    'インバウンド',   'Khách tự tìm đến', 1),
  ('acquisition_channel', 'outbound',   'アウトバウンド', 'Chủ động tiếp cận', 2),
  ('acquisition_channel', 'partner',    'パートナー経由', 'Qua đối tác',      3),
  ('acquisition_channel', 'self_serve', 'セルフサーブ',   'Tự đăng ký',       4),

  ('team', 'sales',   '営業',               'Kinh doanh',   1),
  ('team', 'cs',      'カスタマーサクセス', 'Chăm sóc khách hàng', 2),
  ('team', 'support', 'サポート',           'Hỗ trợ',       3),

  ('user_role', 'owner',  'オーナー', 'Chủ sở hữu', 1),
  ('user_role', 'admin',  '管理者',   'Quản trị',   2),
  ('user_role', 'member', 'メンバー', 'Thành viên', 3),

  ('cancel_reason', 'price',               '価格',             'Giá',                   1),
  ('cancel_reason', 'missing_feature',     '機能不足',         'Thiếu tính năng',       2),
  ('cancel_reason', 'low_usage',           '利用頻度が低い',   'Ít sử dụng',            3),
  ('cancel_reason', 'switched_competitor', '他社サービスへ移行', 'Chuyển sang dịch vụ khác', 4),
  ('cancel_reason', 'business_closed',     '事業終了',         'Ngừng kinh doanh',      5),
  ('cancel_reason', 'other',               'その他',           'Khác',                  6),

  ('invoice_status', 'paid',          '入金済み', 'Đã thu',      1),
  ('invoice_status', 'open',          '未入金',   'Chưa thu',    2),
  ('invoice_status', 'void',          '取消',     'Đã huỷ',      3),
  ('invoice_status', 'uncollectible', '回収不能', 'Không thu được', 4),

  ('movement', 'new',          '新規',             'Mới',          1),
  ('movement', 'reactivation', '復帰',             'Quay lại',     2),
  ('movement', 'expansion',    '拡大',             'Mở rộng',      3),
  ('movement', 'contraction',  '縮小',             'Thu hẹp',      4),
  ('movement', 'churn',        '解約',             'Huỷ',          5),
  ('movement', 'plan_in',      'プラン変更（流入）', 'Đổi gói (vào)', 6),
  ('movement', 'plan_out',     'プラン変更（流出）', 'Đổi gói (ra)',  7),
  ('movement', 'flat',         '変動なし',         'Không đổi',    8),

  ('plan_change', 'upgrade',   'アップグレード', 'Nâng gói', 1),
  ('plan_change', 'downgrade', 'ダウングレード', 'Hạ gói',   2),

  ('risk_band', 'cancel_scheduled', '解約予約', 'Đang hẹn huỷ', 1),
  ('risk_band', 'high',             '高',       'Cao',          2),
  ('risk_band', 'medium',           '中',       'Trung bình',   3),
  ('risk_band', 'low',              '低',       'Thấp',         4),

  ('top_reason', 'usage_drop',     '利用が減少・停止',     'Giảm hoặc ngừng sử dụng', 1),
  ('top_reason', 'key_features',   '重要機能の利用が減少', 'Giảm dùng tính năng chính', 2),
  ('top_reason', 'low_seat_usage', 'シートが使われていない', 'Ít người dùng so với số ghế', 3),
  ('top_reason', 'billing',        '支払い遅延',           'Chậm thanh toán',       4),

  ('intervention_trigger', 'risk_score',     'リスクスコア', 'Điểm rủi ro', 1),
  ('intervention_trigger', 'cancel_request', '解約予約',     'Hẹn huỷ',     2),
  ('intervention_trigger', 'manual',         '担当者判断',   'Người phụ trách tự đánh giá', 3),

  ('intervention_channel', 'call',    '電話',       'Gọi điện', 1),
  ('intervention_channel', 'email',   'メール',     'Email',    2),
  ('intervention_channel', 'meeting', '打ち合わせ', 'Họp',      3),

  ('intervention_outcome', 'saved',       '継続',     'Giữ được',       1),
  ('intervention_outcome', 'churned',     '解約',     'Đã huỷ',         2),
  ('intervention_outcome', 'no_response', '応答なし', 'Không phản hồi', 3),
  ('intervention_outcome', 'pending',     '対応中',   'Đang xử lý',     4),

  -- METRICS computed on the client (docs/SCHEMA.md §4.2) — display names kept in the same place as column labels.
  ('metric', 'arpa',             'ARPA（1社あたり平均MRR）', 'ARPA (MRR trung bình mỗi công ty)', 1),
  ('metric', 'gross_mrr_churn',  'グロスMRRチャーン率',      'Tỉ lệ mất MRR gộp',     2),
  ('metric', 'nrr',              'NRR（売上継続率）',        'NRR (tỉ lệ giữ doanh thu)', 3),
  ('metric', 'logo_churn',       '解約率（社数）',           'Tỉ lệ huỷ (số công ty)', 4),
  ('metric', 'dau_avg',          '平均DAU',                  'DAU trung bình',        5),
  ('metric', 'stickiness',       'DAU/MAU',                  'DAU/MAU',               6),
  ('metric', 'seat_usage_rate',  'シート利用率',             'Tỉ lệ dùng ghế',        7),
  ('metric', 'collection_rate',  '回収率',                   'Tỉ lệ thu tiền',        8);
