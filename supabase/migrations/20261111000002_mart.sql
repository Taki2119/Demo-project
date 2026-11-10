-- ─────────────────────────────────────────────────────────────────────────────
-- Tầng MART — thứ DUY NHẤT web app (qua Vercel) và AI được đọc.
--
-- Luật (docs/SCHEMA.md §4):
--   · Mart chỉ chở số CỘNG ĐƯỢC (dòng chảy, tồn kho của một phân hoạch). Tỉ lệ (ARPA,
--     churn rate, stickiness…) tính ở CLIENT từ các tổng — cộng tỉ lệ là sai, và cột tỉ lệ
--     trong mart sẽ có ngày bị ai đó cộng.
--   · Bảng theo (tháng × gói) là bảng DÀY: tháng không có gì vẫn có dòng với số 0 thật ⇒
--     client không phải LOCF.
--   · Tháng đang chạy đo tới `as_of` (số tạm); cột `is_closed` nói tháng đã chốt chưa.
--   · Mỗi công ty ở ĐÚNG một gói trong một tháng ⇒ cộng các gói ra "tất cả gói" là đúng.
-- ─────────────────────────────────────────────────────────────────────────────

-- "Hôm nay" của bộ dữ liệu — xem raw.dataset_meta.
-- ⚠ SECURITY DEFINER là bắt buộc: view chạy bằng quyền của chủ view, nhưng HÀM gọi trong
--   view chạy bằng quyền của người gọi ⇒ analytics_reader (không có quyền trên raw) sẽ lỗi
--   ngay ở mart.months. `search_path = ''` để hàm definer không bị đánh tráo bảng.
create or replace function mart.as_of() returns date
language sql stable security definer set search_path = '' as $$
  select coalesce((select value::date from raw.dataset_meta where key = 'as_of_date'), current_date)
$$;

-- Trục tháng: từ tháng của subscription đầu tiên tới tháng chứa as_of.
create or replace view mart.months as
select m::date                                                        as month,
       (m + interval '1 month' - interval '1 day')::date               as month_end,
       least((m + interval '1 month' - interval '1 day')::date, mart.as_of()) as measure_date,
       (m + interval '1 month' - interval '1 day')::date < mart.as_of() as is_closed
from generate_series(
       (select date_trunc('month', min(started_at))::timestamp from raw.subscriptions),
       date_trunc('month', mart.as_of())::timestamp,
       interval '1 month') as m;

-- ── MRR theo CÔNG TY × THÁNG ────────────────────────────────────────────────
-- Trạng thái lấy tại `measure_date` (cuối tháng, hoặc as_of với tháng đang chạy).
-- Công ty có nhiều subscription cùng lúc: cộng MRR, gói = gói tier cao nhất.
create materialized view mart.company_mrr_monthly as
with state as (
  select mo.month,
         s.company_id,
         sum(p.mrr)                                     as mrr,
         sum(p.seats)                                   as seats,
         (array_agg(p.plan_id order by pl.tier desc))[1] as plan_id
  from mart.months mo
  join raw.subscription_periods p
    on p.valid_from <= mo.measure_date
   and (p.valid_to is null or p.valid_to > mo.measure_date)
  join raw.subscriptions s on s.subscription_id = p.subscription_id
  join raw.plans pl on pl.plan_id = p.plan_id
  group by mo.month, s.company_id
),
grid as (
  select mo.month, c.company_id
  from mart.months mo
  cross join (select distinct company_id from state) c
),
filled as (
  select g.month, g.company_id,
         coalesce(st.mrr, 0)   as mrr,
         coalesce(st.seats, 0) as seats,
         st.plan_id
  from grid g
  left join state st on st.month = g.month and st.company_id = g.company_id
),
lagged as (
  select f.*,
         lag(f.mrr, 1, 0::numeric) over w  as mrr_prev,
         lag(f.plan_id)            over w  as plan_prev,
         coalesce(max(case when f.mrr > 0 then 1 else 0 end) over (
           partition by f.company_id order by f.month
           rows between unbounded preceding and 1 preceding), 0) as paid_before
  from filled f
  window w as (partition by f.company_id order by f.month)
)
select l.month,
       l.company_id,
       coalesce(l.plan_id, l.plan_prev) as plan_id,      -- tháng huỷ: gán về gói tháng trước
       l.plan_prev,
       l.mrr,
       l.mrr_prev,
       l.seats,
       case
         when l.mrr_prev = 0 and l.mrr > 0 and l.paid_before = 0 then 'new'
         when l.mrr_prev = 0 and l.mrr > 0                       then 'reactivation'
         when l.mrr_prev > 0 and l.mrr = 0                       then 'churn'
         when l.mrr > l.mrr_prev                                 then 'expansion'
         when l.mrr < l.mrr_prev                                 then 'contraction'
         else 'flat'
       end as movement,
       case
         when l.mrr > 0 and l.mrr_prev > 0 and l.plan_id is distinct from l.plan_prev then
           case when pc.tier > pp.tier then 'upgrade' else 'downgrade' end
       end as plan_change
from lagged l
left join raw.plans pc on pc.plan_id = l.plan_id
left join raw.plans pp on pp.plan_id = l.plan_prev
where l.plan_id is not null or l.mrr_prev > 0;          -- bỏ các tháng công ty không có gì

create unique index company_mrr_monthly_pk on mart.company_mrr_monthly (month, company_id);

-- ── Biến động MRR theo GÓI ──────────────────────────────────────────────────
-- Đổi gói = một dòng RA ở gói cũ (−mrr_prev) + một dòng VÀO ở gói mới (+mrr).
-- Nhờ vậy, với MỌI gói: Σ mrr_delta(tháng) = mrr_end(tháng) − mrr_end(tháng trước).
create or replace view mart.mrr_movements as
select month, company_id, plan_prev as plan_id, 'plan_out'::text as movement, -mrr_prev as mrr_delta
from mart.company_mrr_monthly
where plan_change is not null
union all
select month, company_id, plan_id, 'plan_in', mrr
from mart.company_mrr_monthly
where plan_change is not null
union all
select month, company_id, plan_id, movement, mrr - mrr_prev
from mart.company_mrr_monthly
where plan_change is null and movement <> 'flat';

-- ── DOANH THU theo THÁNG × GÓI (bảng DÀY) ───────────────────────────────────
create or replace view mart.revenue_monthly as
with mv as (
  select month, plan_id,
         sum(mrr_delta) filter (where movement = 'new')          as new_mrr,
         sum(mrr_delta) filter (where movement = 'reactivation') as reactivation_mrr,
         sum(mrr_delta) filter (where movement = 'expansion')    as expansion_mrr,
         sum(mrr_delta) filter (where movement = 'contraction')  as contraction_mrr,
         sum(mrr_delta) filter (where movement = 'churn')        as churned_mrr,
         sum(mrr_delta) filter (where movement = 'plan_in')      as plan_in_mrr,
         sum(mrr_delta) filter (where movement = 'plan_out')     as plan_out_mrr,
         count(*) filter (where movement = 'new')                as new_companies,
         count(*) filter (where movement = 'reactivation')       as reactivated_companies,
         count(*) filter (where movement = 'churn')              as churned_companies
  from mart.mrr_movements
  group by month, plan_id
),
st as (
  select month, plan_id,
         sum(mrr)                         as mrr_end,
         count(*) filter (where mrr > 0)  as paying_companies,
         count(*) filter (where mrr = 0 and plan_id is not null and movement <> 'churn') as trial_companies,
         sum(seats)                       as seats_end
  from mart.company_mrr_monthly
  group by month, plan_id
),
inv as (
  select period_month as month, plan_id,
         sum(amount) filter (where status <> 'void')  as invoiced_amount,
         sum(amount) filter (where status = 'paid')   as paid_amount,
         sum(amount) filter (where status in ('open', 'uncollectible')) as unpaid_amount
  from raw.invoices
  group by period_month, plan_id
)
select mo.month, mo.measure_date, mo.is_closed, pl.plan_id,
       coalesce(st.mrr_end, 0)                 as mrr_end,
       coalesce(st.paying_companies, 0)        as paying_companies,
       coalesce(st.trial_companies, 0)         as trial_companies,
       coalesce(st.seats_end, 0)               as seats_end,
       coalesce(mv.new_mrr, 0)                 as new_mrr,
       coalesce(mv.reactivation_mrr, 0)        as reactivation_mrr,
       coalesce(mv.expansion_mrr, 0)           as expansion_mrr,
       coalesce(mv.contraction_mrr, 0)         as contraction_mrr,
       coalesce(mv.churned_mrr, 0)             as churned_mrr,
       coalesce(mv.plan_in_mrr, 0)             as plan_in_mrr,
       coalesce(mv.plan_out_mrr, 0)            as plan_out_mrr,
       coalesce(mv.new_companies, 0)           as new_companies,
       coalesce(mv.reactivated_companies, 0)   as reactivated_companies,
       coalesce(mv.churned_companies, 0)       as churned_companies,
       coalesce(inv.invoiced_amount, 0)        as invoiced_amount,
       coalesce(inv.paid_amount, 0)            as paid_amount,
       coalesce(inv.unpaid_amount, 0)          as unpaid_amount
from mart.months mo
cross join raw.plans pl
left join st  on st.month  = mo.month and st.plan_id  = pl.plan_id
left join mv  on mv.month  = mo.month and mv.plan_id  = pl.plan_id
left join inv on inv.month = mo.month and inv.plan_id = pl.plan_id;

-- ── USER × THÁNG ────────────────────────────────────────────────────────────
-- Một dòng cho mỗi tháng user còn là GHẾ (tạo trước measure_date, chưa bị tắt) hoặc
-- bị tắt TRONG tháng đó. Gói = gói của công ty tháng đó (null nếu công ty không có gói).
create materialized view mart.user_monthly as
with act as (
  select date_trunc('month', activity_date)::date as month, user_id,
         count(*)            as active_days,
         sum(sessions)       as sessions,
         sum(active_minutes) as active_minutes,
         max(activity_date)  as last_active_in_month
  from raw.user_activity_daily
  group by 1, 2
),
base as (
  select mo.month, mo.measure_date, u.user_id, u.full_name, u.company_id,
         (u.deactivated_at is null or u.deactivated_at > mo.measure_date) as is_seat,
         date_trunc('month', u.created_at) = mo.month                        as is_new,
         u.deactivated_at is not null
           and date_trunc('month', u.deactivated_at) = mo.month             as is_deactivated
  from mart.months mo
  join raw.users u
    on u.created_at <= mo.measure_date
   and (u.deactivated_at is null or u.deactivated_at >= mo.month)
)
-- full_name / company_name chép sẵn vào đây: role analytics_reader không đọc được raw, mà
-- bảng "theo người dùng" phải bày được tên.
select b.month, b.user_id, b.full_name, b.company_id, co.name as company_name, c.plan_id,
       b.is_seat, b.is_new, b.is_deactivated,
       coalesce(a.active_days, 0)    as active_days,
       coalesce(a.sessions, 0)       as sessions,
       coalesce(a.active_minutes, 0) as active_minutes,
       (select max(d.activity_date) from raw.user_activity_daily d
         where d.user_id = b.user_id and d.activity_date <= b.measure_date) as last_active_date
from base b
join raw.companies co on co.company_id = b.company_id
left join act a on a.month = b.month and a.user_id = b.user_id
left join mart.company_mrr_monthly c on c.month = b.month and c.company_id = b.company_id;

create unique index user_monthly_pk on mart.user_monthly (month, user_id);

-- ── SỐ USER theo THÁNG × GÓI (bảng DÀY) ─────────────────────────────────────
-- dau_avg = active_user_days / days_in_period (tính ở client); mau = user có ≥ 1 ngày hoạt động.
create or replace view mart.users_monthly as
with agg as (
  select month, plan_id,
         count(*) filter (where is_seat)                    as seat_users_end,
         count(*) filter (where is_new)                     as new_users,
         count(*) filter (where is_deactivated)             as deactivated_users,
         count(*) filter (where active_days > 0)            as mau,
         sum(active_days)                                   as active_user_days,
         sum(sessions)                                      as sessions,
         sum(active_minutes)                                as active_minutes
  from mart.user_monthly
  where plan_id is not null
  group by month, plan_id
)
select mo.month, mo.measure_date, mo.is_closed,
       (mo.measure_date - mo.month + 1)  as days_in_period,
       pl.plan_id,
       coalesce(a.seat_users_end, 0)     as seat_users_end,
       coalesce(a.new_users, 0)          as new_users,
       coalesce(a.deactivated_users, 0)  as deactivated_users,
       coalesce(a.mau, 0)                as mau,
       coalesce(a.active_user_days, 0)   as active_user_days,
       coalesce(a.sessions, 0)           as sessions,
       coalesce(a.active_minutes, 0)     as active_minutes
from mart.months mo
cross join raw.plans pl
left join agg a on a.month = mo.month and a.plan_id = pl.plan_id;

-- ── CÔNG TY × THÁNG (cho bảng "theo công ty") ──────────────────────────────
create or replace view mart.company_monthly as
with u as (
  select month, company_id,
         count(*) filter (where is_seat)          as seat_users_end,
         count(*) filter (where active_days > 0)  as mau,
         sum(active_days)                         as active_user_days,
         sum(active_minutes)                      as active_minutes,
         max(last_active_date)                    as last_active_date
  from mart.user_monthly
  group by month, company_id
),
f as (
  select date_trunc('month', fu.activity_date)::date as month, fu.company_id,
         sum(fu.events)                              as feature_events,
         sum(fu.events) filter (where ft.is_key)     as key_feature_events
  from raw.feature_usage_daily fu
  join raw.features ft on ft.feature_id = fu.feature_id
  group by 1, 2
)
select c.month, c.company_id, co.name as company_name, co.industry, co.region, co.size_band,
       co.owner_staff_id, c.plan_id, c.movement, c.plan_change,
       c.mrr, c.mrr_prev, c.seats,
       coalesce(u.seat_users_end, 0)     as seat_users_end,
       coalesce(u.mau, 0)                as mau,
       coalesce(u.active_user_days, 0)   as active_user_days,
       coalesce(u.active_minutes, 0)     as active_minutes,
       coalesce(f.feature_events, 0)     as feature_events,
       coalesce(f.key_feature_events, 0) as key_feature_events,
       u.last_active_date
from mart.company_mrr_monthly c
join raw.companies co on co.company_id = c.company_id
left join u on u.month = c.month and u.company_id = c.company_id
left join f on f.month = c.month and f.company_id = c.company_id;

-- ── RỦI RO HUỶ: ảnh chụp mỗi CHỦ NHẬT, 52 tuần gần nhất ─────────────────────
-- Chỉ công ty ĐANG TRẢ TIỀN tại ngày chụp. Công thức điểm (v2, heuristic — xem
-- docs/SCHEMA.md §5): sử dụng giảm / ngừng (≤40) + ghế ít dùng (≤20) + tính năng chính giảm
-- (≤30) + nợ hoá đơn (10), trần 100. Hẹn huỷ đang mở là một BAND riêng, đứng trên điểm.
-- ⚠ v1 đo "số ngày không ai vào" + "user có vào trong 28 ngày" và gần như KHÔNG BAO GIỜ báo
--   động: công ty nhiều user hiếm khi có 7 ngày trắng. v2 đo XU HƯỚNG (28 ngày so với 28 ngày
--   trước) + WAU so với ghế — đo bằng nhãn churned_within_90d trong generate.test.mjs.
-- `churned_within_90d` là NHÃN để đo độ chính xác của điểm (null khi chưa đủ 90 ngày sau).
create materialized view mart.churn_risk_snapshot as
with snaps as (
  select d::date as snapshot_date
  from generate_series(
         ((date_trunc('week', mart.as_of() + 1) - interval '1 day')::date - 7 * 51)::timestamp,
         (date_trunc('week', mart.as_of() + 1) - interval '1 day')::timestamp,
         interval '7 day') as d
),
paying as (
  select sn.snapshot_date, s.company_id,
         sum(p.mrr)   as mrr,
         sum(p.seats) as seats,
         (array_agg(p.plan_id order by pl.tier desc))[1] as plan_id,
         min(s.started_at) as customer_since
  from snaps sn
  join raw.subscription_periods p
    on p.valid_from <= sn.snapshot_date
   and (p.valid_to is null or p.valid_to > sn.snapshot_date)
  join raw.subscriptions s on s.subscription_id = p.subscription_id
  join raw.plans pl on pl.plan_id = p.plan_id
  group by sn.snapshot_date, s.company_id
  having sum(p.mrr) > 0
),
m as (
  select pa.*,
         (select max(a.activity_date) from raw.user_activity_daily a
           where a.company_id = pa.company_id and a.activity_date <= pa.snapshot_date) as last_active_date,
         (select count(distinct a.user_id) from raw.user_activity_daily a
           where a.company_id = pa.company_id
             and a.activity_date between pa.snapshot_date - 27 and pa.snapshot_date) as active_users_28d,
         (select count(distinct a.user_id) from raw.user_activity_daily a
           where a.company_id = pa.company_id
             and a.activity_date between pa.snapshot_date - 6 and pa.snapshot_date) as active_users_7d,
         (select count(*) from raw.user_activity_daily a
           where a.company_id = pa.company_id
             and a.activity_date between pa.snapshot_date - 27 and pa.snapshot_date) as active_user_days_28d,
         (select count(*) from raw.user_activity_daily a
           where a.company_id = pa.company_id
             and a.activity_date between pa.snapshot_date - 55 and pa.snapshot_date - 28) as active_user_days_prev_28d,
         (select coalesce(sum(fu.events), 0) from raw.feature_usage_daily fu
           join raw.features ft on ft.feature_id = fu.feature_id and ft.is_key
           where fu.company_id = pa.company_id
             and fu.activity_date between pa.snapshot_date - 27 and pa.snapshot_date) as key_events_28d,
         (select coalesce(sum(fu.events), 0) from raw.feature_usage_daily fu
           join raw.features ft on ft.feature_id = fu.feature_id and ft.is_key
           where fu.company_id = pa.company_id
             and fu.activity_date between pa.snapshot_date - 55 and pa.snapshot_date - 28) as key_events_prev_28d,
         exists (select 1 from raw.cancel_requests r
                   join raw.subscriptions s on s.subscription_id = r.subscription_id
                  where s.company_id = pa.company_id
                    and r.requested_at <= pa.snapshot_date
                    and (r.withdrawn_at is null or r.withdrawn_at > pa.snapshot_date)
                    and r.scheduled_effective_at > pa.snapshot_date) as cancel_scheduled,
         (select count(*) from raw.invoices i
           where i.company_id = pa.company_id
             and i.status <> 'void'
             and i.due_at < pa.snapshot_date
             and (i.paid_at is null or i.paid_at > pa.snapshot_date)) as overdue_invoices
  from paying pa
),
scored as (
  select m.*,
         m.snapshot_date - coalesce(m.last_active_date, m.customer_since) as days_since_last_active,
         m.active_users_7d::numeric / nullif(m.seats, 0)                  as seat_utilization,
         case when m.active_user_days_prev_28d > 0
              then m.active_user_days_28d::numeric / m.active_user_days_prev_28d - 1 end as activity_trend,
         case when m.key_events_prev_28d > 0
              then m.key_events_28d::numeric / m.key_events_prev_28d - 1 end as key_trend
  from m
),
points as (
  select s.*,
         case when s.days_since_last_active > 14 then 40                          -- ngừng hẳn
              when s.activity_trend <= -0.5  then 40
              when s.activity_trend <= -0.3  then 25
              when s.activity_trend <= -0.15 then 10
              else 0 end as pts_usage,
         case when s.seat_utilization < 0.2 then 20
              when s.seat_utilization < 0.4 then 10
              else 0 end as pts_seats,
         case when s.key_events_28d = 0 and s.key_events_prev_28d > 0 then 30   -- bỏ hẳn tính năng chính
              when s.key_trend <= -0.5  then 30
              when s.key_trend <= -0.25 then 15
              when s.key_events_28d = 0 then 10                                   -- chưa từng dùng
              else 0 end as pts_key_features,
         case when s.overdue_invoices > 0 then 10 else 0 end as pts_billing
  from scored s
)
select p.snapshot_date, p.company_id, p.plan_id, p.mrr, p.seats,
       p.last_active_date, p.days_since_last_active,
       p.active_users_28d, p.active_users_7d, p.seat_utilization,
       p.active_user_days_28d, p.active_user_days_prev_28d, p.activity_trend,
       p.key_events_28d, p.key_events_prev_28d, p.key_trend,
       p.cancel_scheduled, p.overdue_invoices,
       p.pts_usage, p.pts_seats, p.pts_key_features, p.pts_billing,
       least(100, p.pts_usage + p.pts_seats + p.pts_key_features + p.pts_billing) as risk_score,
       case when p.cancel_scheduled then 'cancel_scheduled'
            when p.pts_usage + p.pts_seats + p.pts_key_features + p.pts_billing >= 60 then 'high'
            when p.pts_usage + p.pts_seats + p.pts_key_features + p.pts_billing >= 30 then 'medium'
            else 'low' end as risk_band,
       case greatest(p.pts_usage, p.pts_seats, p.pts_key_features, p.pts_billing)
            when 0                  then null
            when p.pts_usage        then 'usage_drop'
            when p.pts_key_features then 'key_features'
            when p.pts_seats        then 'low_seat_usage'
            else 'billing' end as top_reason,
       case when p.snapshot_date + 90 > mart.as_of() then null
            else exists (select 1 from raw.subscriptions s
                          where s.company_id = p.company_id
                            and s.canceled_at > p.snapshot_date
                            and s.canceled_at <= p.snapshot_date + 90) end as churned_within_90d
from points p;

create unique index churn_risk_snapshot_pk on mart.churn_risk_snapshot (snapshot_date, company_id);

-- Danh sách cần chăm sóc = ảnh chụp MỚI NHẤT + thông tin công ty + lượt chăm sóc gần nhất.
create or replace view mart.churn_watchlist as
select r.*, co.name as company_name, co.industry, co.size_band,
       co.owner_staff_id, st.full_name as owner_name,
       li.created_at as last_intervention_at, li.channel as last_intervention_channel,
       li.outcome as last_intervention_outcome
from mart.churn_risk_snapshot r
join raw.companies co on co.company_id = r.company_id
left join raw.staff st on st.staff_id = co.owner_staff_id
left join lateral (
  select i.created_at, i.channel, i.outcome
  from raw.interventions i
  where i.company_id = r.company_id and i.created_at <= r.snapshot_date
  order by i.created_at desc
  limit 1
) li on true
where r.snapshot_date = (select max(snapshot_date) from mart.churn_risk_snapshot);

-- Hiệu quả chăm sóc theo tháng tạo lượt × kênh × nguồn kích hoạt.
create or replace view mart.interventions_monthly as
select date_trunc('month', created_at)::date as month, trigger, channel,
       count(*)                                     as interventions,
       count(*) filter (where outcome = 'saved')       as saved,
       count(*) filter (where outcome = 'churned')     as churned,
       count(*) filter (where outcome = 'no_response') as no_response,
       count(*) filter (where outcome = 'pending')     as pending
from raw.interventions
group by 1, 2, 3;

-- Danh mục cho bộ lọc / nhãn (đọc được qua mart, không cần mở raw).
create or replace view mart.plans as
select plan_id, name, tier, base_price, seat_price, included_seats, currency, is_active from raw.plans;
create or replace view mart.features as
select feature_id, name, is_key, min_tier from raw.features;
create or replace view mart.staff as
select staff_id, full_name, team from raw.staff;

-- ── KIỂM TRA CHẤT LƯỢNG: mỗi dòng là một luật, failed_rows phải = 0 ─────────
create or replace view mart.dq_checks as
select 'periods_overlap' as check_name, count(*) as failed_rows
from raw.subscription_periods a
join raw.subscription_periods b
  on a.subscription_id = b.subscription_id and a.valid_from < b.valid_from
 and (a.valid_to is null or a.valid_to > b.valid_from)
union all
select 'last_period_matches_cancel', count(*)
from raw.subscriptions s
join lateral (select p.valid_to from raw.subscription_periods p
               where p.subscription_id = s.subscription_id
               order by p.valid_from desc limit 1) lp on true
where lp.valid_to is distinct from s.canceled_at
union all
select 'activity_company_mismatch', count(*)
from raw.user_activity_daily a join raw.users u on u.user_id = a.user_id
where a.company_id <> u.company_id
union all
select 'activity_outside_user_life', count(*)
from raw.user_activity_daily a join raw.users u on u.user_id = a.user_id
where a.activity_date < u.created_at
   or (u.deactivated_at is not null and a.activity_date >= u.deactivated_at)
union all
select 'mrr_identity_per_plan', count(*)
from (
  select r.plan_id, r.month,
         r.mrr_end - coalesce(lag(r.mrr_end) over (partition by r.plan_id order by r.month), 0) as d_stock,
         r.new_mrr + r.reactivation_mrr + r.expansion_mrr + r.contraction_mrr
           + r.churned_mrr + r.plan_in_mrr + r.plan_out_mrr as d_flow
  from mart.revenue_monthly r
) x
where x.d_stock <> x.d_flow;

-- Làm mới các materialized view (theo thứ tự phụ thuộc). Gọi sau mỗi lượt nạp dữ liệu.
create or replace function mart.refresh() returns void
language plpgsql as $$
begin
  refresh materialized view mart.company_mrr_monthly;
  refresh materialized view mart.user_monthly;
  refresh materialized view mart.churn_risk_snapshot;
end
$$;
