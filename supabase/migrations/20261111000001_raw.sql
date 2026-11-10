-- ─────────────────────────────────────────────────────────────────────────────
-- Tầng RAW — dữ liệu "nghiệp vụ" của một SaaS giả lập. Toàn bộ do script sinh ra
-- (tên công ty / người / email đều là dữ liệu tổng hợp), không có dữ liệu thật.
--
-- Luật của tầng này (chi tiết + lý do ở docs/SCHEMA.md):
--   · Ngày giờ nghiệp vụ lưu kiểu `date` theo MÚI GIỜ KINH DOANH (docs/SCHEMA.md §1).
--   · Mọi khoảng thời gian là NỬA MỞ [valid_from, valid_to): `valid_to` là ngày ĐẦU TIÊN
--     không còn hiệu lực. `null` = còn hiệu lực.
--   · Bảng hoạt động là bảng THƯA: không có dòng = không hoạt động (một số 0 thật),
--     KHÔNG phải thiếu dữ liệu.
--   · Schema `raw` và `mart` KHÔNG mở qua API REST của Supabase (chỉ `public` mở) — client
--     không bao giờ đọc thẳng; đường đọc duy nhất là role `analytics_reader` trên `mart`.
-- ─────────────────────────────────────────────────────────────────────────────

create schema if not exists raw;
create schema if not exists mart;

-- Thông tin của lượt sinh dữ liệu. `as_of_date` = "hôm nay" của bộ dữ liệu: mart tính mọi
-- tháng/tuần tới mốc này, nên dữ liệu tĩnh vẫn nhất quán dù mở ra vào ngày nào.
create table raw.dataset_meta (
  key   text primary key,
  value text not null
);

create table raw.plans (
  plan_id        text primary key,                 -- 'starter' | 'growth' | 'scale'
  name           text not null,
  tier           smallint not null unique check (tier >= 1),  -- 1 = thấp nhất; phân upgrade/downgrade
  base_price     numeric(14,0) not null check (base_price >= 0),
  seat_price     numeric(14,0) not null check (seat_price >= 0),
  included_seats integer not null default 0 check (included_seats >= 0),
  currency       char(3) not null default 'JPY',   -- tiền yên: số nguyên, không có phần lẻ
  is_active      boolean not null default true
);

create table raw.features (
  feature_id text primary key,                     -- 'reports' | 'automation' | …
  name       text not null,
  is_key     boolean not null default false,       -- tính năng "giữ chân" — tín hiệu rủi ro huỷ
  min_tier   smallint not null default 1 check (min_tier >= 1)
);

-- Nhân viên phụ trách (sales / CS) — người nhận danh sách cần chăm sóc ở trang dự án.
create table raw.staff (
  staff_id  text primary key,
  full_name text not null,
  team      text not null check (team in ('sales', 'cs', 'support'))
);

create table raw.companies (
  company_id          text primary key,           -- 'C0001'
  name                text not null,              -- KHÔNG duy nhất — đừng dùng làm khoá
  industry            text not null,
  region              text not null,
  size_band           text not null check (size_band in ('1-10', '11-50', '51-200', '201-1000', '1000+')),
  acquisition_channel text not null check (acquisition_channel in ('inbound', 'outbound', 'partner', 'self_serve')),
  owner_staff_id      text references raw.staff (staff_id),
  created_at          date not null
);

create table raw.users (
  user_id        text primary key,                -- 'U00001'
  company_id     text not null references raw.companies (company_id),
  full_name      text not null,
  email          text not null unique,            -- miền giả (example.com / *.test)
  role           text not null check (role in ('owner', 'admin', 'member')),
  created_at     date not null,
  deactivated_at date,                             -- ngày ĐẦU TIÊN không còn là ghế
  check (deactivated_at is null or deactivated_at > created_at)
);
create index users_company_idx on raw.users (company_id);

-- Một vòng đời thuê bao. Công ty huỷ rồi quay lại = một subscription MỚI (để đếm reactivation).
create table raw.subscriptions (
  subscription_id text primary key,               -- 'S00001'
  company_id      text not null references raw.companies (company_id),
  started_at      date not null,
  trial_ends_at   date,                           -- null = không dùng thử
  canceled_at     date,                           -- ngày huỷ CÓ HIỆU LỰC (hết tính tiền); null = còn
  check (trial_ends_at is null or trial_ends_at >= started_at),
  check (canceled_at is null or canceled_at > started_at)
);
create index subscriptions_company_idx on raw.subscriptions (company_id);

-- NGUỒN SỰ THẬT của gói · số ghế · MRR theo thời gian (SCD loại 2).
-- Giai đoạn dùng thử = một dòng có mrr = 0.
-- Bất biến (khoá ở mart.dq_checks): các dòng của một subscription không chồng nhau, và
-- dòng cuối có valid_to = subscriptions.canceled_at khi đã huỷ.
create table raw.subscription_periods (
  subscription_id text not null references raw.subscriptions (subscription_id),
  valid_from      date not null,
  valid_to        date,
  plan_id         text not null references raw.plans (plan_id),
  seats           integer not null check (seats >= 1),
  mrr             numeric(14,0) not null check (mrr >= 0),   -- đã trừ giảm giá
  primary key (subscription_id, valid_from),
  check (valid_to is null or valid_to > valid_from)
);
create index subscription_periods_range_idx on raw.subscription_periods (valid_from, valid_to);

-- "Hẹn huỷ": khách bấm huỷ, hiệu lực ở cuối kỳ. Rút lại = withdrawn_at (khách được giữ chân).
create table raw.cancel_requests (
  request_id             text primary key,
  subscription_id        text not null references raw.subscriptions (subscription_id),
  requested_at           date not null,
  scheduled_effective_at date not null,
  reason                 text not null check (reason in (
                           'price', 'missing_feature', 'low_usage', 'switched_competitor',
                           'business_closed', 'other')),
  withdrawn_at           date,
  check (scheduled_effective_at >= requested_at),
  check (withdrawn_at is null or withdrawn_at >= requested_at)
);
create index cancel_requests_sub_idx on raw.cancel_requests (subscription_id);

create table raw.invoices (
  invoice_id      text primary key,
  subscription_id text not null references raw.subscriptions (subscription_id),
  company_id      text not null references raw.companies (company_id),
  plan_id         text not null references raw.plans (plan_id),  -- gói được tính tiền trên hoá đơn
  period_month    date not null check (extract(day from period_month) = 1),
  amount          numeric(14,0) not null check (amount >= 0),
  status          text not null check (status in ('paid', 'open', 'void', 'uncollectible')),
  issued_at       date not null,
  due_at          date not null,
  paid_at         date,
  check (due_at >= issued_at),
  check ((status = 'paid') = (paid_at is not null))
);
create index invoices_company_idx on raw.invoices (company_id, period_month);

-- Hoạt động theo NGÀY × USER (thưa: chỉ ngày có dùng mới có dòng).
-- `company_id` chép xuống để lọc nhanh — khớp users.company_id (khoá ở mart.dq_checks).
create table raw.user_activity_daily (
  activity_date  date not null,
  user_id        text not null references raw.users (user_id),
  company_id     text not null references raw.companies (company_id),
  sessions       integer not null check (sessions >= 1),
  active_minutes integer not null check (active_minutes >= 0),
  primary key (activity_date, user_id)
);
create index user_activity_company_idx on raw.user_activity_daily (company_id, activity_date);

-- Dùng tính năng theo NGÀY × CÔNG TY × TÍNH NĂNG (thưa như trên).
create table raw.feature_usage_daily (
  activity_date date not null,
  company_id    text not null references raw.companies (company_id),
  feature_id    text not null references raw.features (feature_id),
  events        integer not null check (events >= 1),
  users         integer not null check (users >= 1),
  primary key (activity_date, company_id, feature_id)
);
create index feature_usage_company_idx on raw.feature_usage_daily (company_id, activity_date);

-- Lượt chăm sóc của trang dự án "chống huỷ sớm".
create table raw.interventions (
  intervention_id text primary key,
  company_id      text not null references raw.companies (company_id),
  staff_id        text not null references raw.staff (staff_id),
  created_at      date not null,
  trigger         text not null check (trigger in ('risk_score', 'cancel_request', 'manual')),
  channel         text not null check (channel in ('call', 'email', 'meeting')),
  outcome         text not null check (outcome in ('pending', 'saved', 'churned', 'no_response')),
  outcome_at      date,
  check ((outcome = 'pending') = (outcome_at is null)),
  check (outcome_at is null or outcome_at >= created_at)
);
create index interventions_company_idx on raw.interventions (company_id, created_at);
