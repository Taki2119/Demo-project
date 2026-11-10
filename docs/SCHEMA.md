# Schema dữ liệu — SaaS Analytics Demo

> Nguồn sự thật của schema là `supabase/migrations/*.sql`. File này giải thích VÌ SAO và
> nói cách đọc số. Đổi schema thì sửa cả hai, và chạy `npm run db:test`.

Toàn bộ dữ liệu là **dữ liệu tổng hợp** do script sinh ra: tên công ty, tên người, email,
tên gói đều là hư cấu. Không có dữ liệu thật của bất kỳ tổ chức nào.

## 1. Các quyết định nền

| Quyết định | Chọn | Ghi chú |
|---|---|---|
| CSDL | **Supabase (Postgres)** thay BigQuery | Thay đổi kéo theo: xem §7 |
| Múi giờ kinh doanh | `Asia/Ho_Chi_Minh` | Mọi cột `date` là ngày theo múi giờ này. Đổi được, nhưng phải sinh lại dữ liệu |
| Tiền tệ | **Yên Nhật `JPY`**, kiểu `numeric(14,0)` | Số nguyên, không có phần lẻ. Một bộ dữ liệu = một tiền tệ, không quy đổi trong DB |
| Ngôn ngữ | DB: tên cột + mã giá trị **tiếng Anh** · hiển thị: **ja / vi** | Nhãn ở `mart.column_labels` + `mart.labels` (§4.3) |
| "Hôm nay" | `raw.dataset_meta.as_of_date` | Dữ liệu tĩnh vẫn nhất quán dù mở vào ngày nào |
| Khoảng thời gian | Nửa mở `[valid_from, valid_to)` | `valid_to` = ngày ĐẦU TIÊN hết hiệu lực; `null` = còn hiệu lực |
| Tháng | `date` ngày 1 (`2026-04-01`) | API trả ra `YYYY-MM`; client không đi qua `new Date(str)` |

## 2. Hai tầng

```
raw.*   (dữ liệu "nghiệp vụ" sinh ra)  ──refresh──▶  mart.*   (thứ DUY NHẤT app + AI đọc)
```

- `raw` và `mart` **không mở qua REST API của Supabase** (chỉ `public` được mở). Client
  không bao giờ đọc thẳng DB; đường đọc là Vercel dùng role `analytics_reader`.
- `mart` gồm view thường + 3 materialized view (`company_mrr_monthly`, `user_monthly`,
  `churn_risk_snapshot`). Sau mỗi lượt nạp dữ liệu: `select mart.refresh();`.

## 3. Tầng RAW

| Bảng | Một dòng là | Khoá | Ghi chú |
|---|---|---|---|
| `dataset_meta` | một thuộc tính của lượt sinh | `key` | `as_of_date`, `seed`, `generated_at` |
| `plans` | một gói | `plan_id` | `tier` 1→3 để phân nâng/hạ gói |
| `features` | một tính năng | `feature_id` | `is_key` = tính năng giữ chân, là tín hiệu rủi ro |
| `staff` | một nhân viên sales/CS | `staff_id` | người nhận danh sách chăm sóc |
| `companies` | một công ty khách hàng | `company_id` | ⚠ `name` KHÔNG duy nhất, đừng dùng làm khoá |
| `users` | một người dùng (ghế) | `user_id` | `deactivated_at` = ngày đầu không còn là ghế |
| `subscriptions` | một vòng đời thuê bao | `subscription_id` | Huỷ rồi quay lại = subscription MỚI |
| `subscription_periods` | một đoạn (gói, số ghế, MRR) | `(subscription_id, valid_from)` | **Nguồn sự thật của MRR.** Dùng thử = dòng `mrr = 0` |
| `cancel_requests` | một lần **hẹn huỷ** | `request_id` | `withdrawn_at` ⇒ khách được giữ lại |
| `invoices` | một hoá đơn tháng | `invoice_id` | `plan_id` = gói được tính tiền |
| `user_activity_daily` | ngày × user có dùng | `(activity_date, user_id)` | **Bảng THƯA:** không có dòng = không dùng (số 0 thật) |
| `feature_usage_daily` | ngày × công ty × tính năng | `(activity_date, company_id, feature_id)` | Bảng thưa, như trên |
| `interventions` | một lượt chăm sóc | `intervention_id` | Trang dự án đo hiệu quả bằng bảng này |

Bất biến không khai được bằng constraint thì nằm ở `mart.dq_checks` (mỗi luật một dòng,
`failed_rows` phải bằng 0): các đoạn của một subscription không chồng nhau · đoạn cuối kết
thúc đúng ngày huỷ · hoạt động nằm trong vòng đời user và đúng công ty · **đẳng thức MRR**
(§4.1).

## 4. Tầng MART — đọc số thế nào

**Luật 1: mart chỉ chở số CỘNG ĐƯỢC.** Tỉ lệ (ARPA, churn rate, stickiness, tỉ lệ dùng ghế…)
tính ở client từ các tổng. Lý do: "tất cả gói" = cộng các gói, mà cộng tỉ lệ là sai; một cột
tỉ lệ trong mart sớm muộn sẽ bị ai đó cộng.

**Luật 2: bảng (tháng × gói) là bảng DÀY.** Tháng không có gì vẫn có dòng với số 0 thật, nên
client không phải LOCF. Mỗi công ty ở đúng một gói trong một tháng ⇒ cộng các gói ra tổng
là đúng, kể cả với số tồn kho.

**Luật 3: tháng đang chạy là số TẠM.** Trạng thái tồn kho đo ở `measure_date` = cuối tháng,
hoặc `as_of` với tháng đang chạy. `is_closed = false` ⇒ không so kỳ với tháng này như một
tháng trọn vẹn.

| View | Grain | Dùng cho |
|---|---|---|
| `months` | tháng | trục thời gian, `measure_date`, `is_closed` |
| `company_mrr_monthly` | tháng × công ty | MRR, gói, loại biến động của từng công ty |
| `mrr_movements` | tháng × công ty × gói × loại | biến động MRR, có tách đổi gói |
| `revenue_monthly` | tháng × gói (dày) | trang **Doanh thu** |
| `user_monthly` | tháng × user | trang **Theo user** |
| `users_monthly` | tháng × gói (dày) | trang **Số lượng user** |
| `company_monthly` | tháng × công ty | trang **Theo công ty** |
| `churn_risk_snapshot` | Chủ nhật × công ty đang trả tiền | lịch sử điểm rủi ro (52 tuần) |
| `churn_watchlist` | công ty (ảnh chụp mới nhất) | trang **dự án chống huỷ** |
| `interventions_monthly` | tháng × nguồn kích hoạt × kênh | hiệu quả chăm sóc |
| `plans` / `features` / `staff` | danh mục | nhãn, bộ lọc |
| `dq_checks` | luật | kiểm tra sau mỗi lượt nạp |

### 4.1 Phân loại biến động MRR

So MRR của công ty ở tháng này với tháng trước:

| Loại | Điều kiện | `mrr_delta` |
|---|---|---|
| `new` | trước = 0, nay > 0, **chưa từng** trả tiền | + nay |
| `reactivation` | trước = 0, nay > 0, đã từng trả tiền | + nay |
| `expansion` / `contraction` | cùng gói, MRR tăng / giảm | nay − trước |
| `churn` | trước > 0, nay = 0 (gán về gói tháng trước) | − trước |
| `plan_out` + `plan_in` | **đổi gói**: một dòng ở gói cũ, một dòng ở gói mới | − trước / + nay |

Tách đổi gói thành hai dòng để đẳng thức sau đúng với **từng gói**, không chỉ với tổng:

```
mrr_end(tháng) − mrr_end(tháng trước) = new + reactivation + expansion + contraction + churn + plan_in + plan_out
```

Nếu gộp đổi gói vào `expansion` của gói mới, gói cũ sẽ mất MRR mà không có biến động nào
giải thích. `dq_checks.mrr_identity_per_plan` khoá đẳng thức này.

### 4.2 Công thức tính ở client (từ các cột của mart)

| Chỉ số | Công thức | Lưu ý |
|---|---|---|
| ARPA | `mrr_end ÷ paying_companies` | `null` khi mẫu = 0 |
| Gross MRR churn | `−(churned_mrr + contraction_mrr) ÷ mrr_end tháng TRƯỚC` | Mẫu số là ĐẦU kỳ |
| Net revenue retention | `(mrr_end tháng trước + expansion + contraction + churn + plan_in + plan_out) ÷ mrr_end tháng trước` | Chỉ tính trên khách cũ: bỏ new, reactivation. Có ý nghĩa ở mức TẤT CẢ GÓI (ở từng gói, đổi gói làm khách "rời" gói đó) |
| Logo churn | `churned_companies ÷ paying_companies tháng trước` | |
| DAU trung bình | `active_user_days ÷ days_in_period` | |
| Stickiness | `DAU trung bình ÷ mau` | |
| Tỉ lệ dùng ghế | `mau ÷ seat_users_end` | |
| Tỉ lệ thu tiền | `paid_amount ÷ invoiced_amount` | |

### 4.3 Nhãn ja / vi

DB giữ tên cột và mã giá trị bằng tiếng Anh, vì chúng ổn định và dễ viết SQL. Thứ người
dùng **thấy** lấy từ hai bảng trong `mart`, dùng chung cho cả web app lẫn AI:

| Bảng | Khoá | Chở |
|---|---|---|
| `column_labels` | `column_name` | `ja`, `vi`, `unit` (`JPY` · `人` · `社` · `日` · `%`…). Cùng tên cột = cùng nghĩa ở mọi view |
| `labels` | `(domain, code)` | `ja`, `vi`, `sort_order`, cho các domain `plan` · `feature` · `industry` · `region` · `size_band` · `acquisition_channel` · `team` · `user_role` · `cancel_reason` · `invoice_status` · `movement` · `plan_change` · `risk_band` · `top_reason` · `intervention_*` · `metric` (tên các chỉ số tính ở client) |

- Chữ **giao diện** (nút, bộ lọc, thông báo, nút đổi ngôn ngữ) KHÔNG ở đây: nó thuộc từ điển
  i18n của frontend.
- Tên riêng (công ty, người) chỉ có một dạng, không dịch.
- Thêm cột hay mã mới mà quên nhãn thì test đỏ: `generate.test.mjs` soát MỌI cột của view
  trong `mart` và MỌI mã xuất hiện trong dữ liệu.

## 5. Điểm rủi ro huỷ (v2)

Mỗi Chủ nhật, mỗi công ty **đang trả tiền**. So 28 ngày gần nhất với 28 ngày trước đó:

| Thành phần | Điểm |
|---|---|
| **Sử dụng:** không ai vào > 14 ngày, hoặc số user-ngày giảm ≥ 50% / ≥ 30% / ≥ 15% | 40 / 40 / 25 / 10 |
| **Ghế:** WAU (user vào trong 7 ngày) ÷ số ghế < 20% / < 40% | 20 / 10 |
| **Tính năng chính:** bỏ hẳn hoặc giảm ≥ 50% / giảm ≥ 25% / chưa từng dùng | 30 / 15 / 10 |
| **Thanh toán:** có hoá đơn quá hạn | 10 |

⚠ Bản v1 đo *"số ngày không ai vào"* và *"user có vào trong 28 ngày"*, và gần như không bao
giờ báo động: công ty nhiều user hiếm khi có 7 ngày trắng. Trên dữ liệu test, v1 xếp đa số
công ty sắp huỷ vào band `low`. Bản v2 đo **xu hướng**:

| Band | Tỉ lệ huỷ trong 90 ngày (dữ liệu test) |
|---|---|
| `low` | 1,4% |
| `medium` | 8,2% |
| `high` + `cancel_scheduled` | 44,1% |

- `risk_score` = tổng, trần 100. Band: **≥ 60 `high`** · **≥ 30 `medium`** · còn lại `low`.
- **Hẹn huỷ đang mở** ⇒ band `cancel_scheduled`, đứng trên mọi điểm: khách đã nói muốn đi.
- `top_reason` = thành phần nặng điểm nhất, dùng để gợi ý cách chăm sóc.
- `churned_within_90d` là **nhãn** để đo điểm có đúng không: có huỷ trong 90 ngày sau ngày
  chụp không. `null` khi chưa đủ 90 ngày.
  ⇒ Trang dự án báo được *"trong số công ty `high` 3 tháng trước, bao nhiêu % đã huỷ"*.
- Các ngưỡng là **heuristic**. Sửa thì sửa ở migration, rồi xem lại bảng trên: test in nó ra
  mỗi lần chạy, và chặn khi band rủi ro không huỷ nhiều hơn band thấp ít nhất 3 lần.

## 6. Quyền

- Role **`analytics_reader`**: chỉ `SELECT` trên `mart`. Mọi giao dịch mặc định READ ONLY,
  `statement_timeout = 15s`. Nên câu SQL do AI viết, nếu có sai, cũng không ghi được và không
  treo được DB. Hàng rào là quyền của Postgres, không phải regex trong code.
- `mart.as_of()` là `SECURITY DEFINER`. Hàm gọi trong view chạy bằng quyền **người gọi**,
  nên thiếu cờ này thì `analytics_reader` lỗi ngay ở `mart.months`.
- RLS bật trên mọi bảng `raw` (không có policy nào); `anon` / `authenticated` bị thu quyền
  trên cả hai schema.

**Việc làm tay một lần trên Supabase** (mật khẩu KHÔNG nằm trong repo):

```sql
alter role analytics_reader with login password '<mật khẩu mạnh>';
```

Chuỗi kết nối cho Vercel dùng pooler (Supavisor, transaction mode, cổng 6543), user dạng
`analytics_reader.<project-ref>`. Chỉ lưu nó ở biến môi trường của Vercel.

## 7. Supabase thay BigQuery: kế hoạch đổi gì

| Phần | Bản gốc (BigQuery) | Bản này (Supabase) |
|---|---|---|
| Tầng tổng hợp | scheduled query | view + materialized view, `mart.refresh()` (có thể chạy bằng `pg_cron`) |
| Endpoint đọc board | `board-data`: service account → `jobs.query` | `board-data`: role `analytics_reader` → `select * from mart.<view>` |
| Công cụ SQL của AI | dry-run + regex chỉ cho `SELECT` | giao dịch READ ONLY + quyền schema; `EXPLAIN` trước để chặn câu quá nặng |
| Giới hạn dung lượng | 4,5 MB / CSV | vẫn giữ trần cho mỗi phản hồi; lọc theo khoảng thời gian trong SQL |

## 8. Bộ sinh dữ liệu — `scripts/data/`

```bash
npm run data:generate            # → data/out/*.csv (một file mỗi bảng raw; data/ không vào git)
npm run data:load                # xoá sạch raw rồi COPY lại, mart.refresh(), in dq_checks
```

- Tham số: `-- --seed <chuỗi> --as-of YYYY-MM-DD --months <n> --arrivals <số công ty mới/tháng>`.
  Mặc định: `demo-2026` · `2026-11-10` · `24` · `8`.
- `data:load` đọc `DATABASE_URL` từ `.env` (đã nằm trong `.gitignore`). Dùng chuỗi **Session
  pooler** (cổng 5432, user `postgres.<project-ref>`) lấy ở *Supabase → Connect*. Không dùng
  `analytics_reader`, vì role đó chỉ đọc. Phần raw chạy trong MỘT giao dịch: lỗi giữa chừng thì
  DB giữ nguyên bộ cũ.
- **Hàm thuần, có seed:** cùng tham số ⇒ cùng CSV từng byte (test khoá). Không có
  `Math.random()` nào; mỗi công ty có một nhánh PRNG riêng, nên chỉnh một công ty không làm
  lệch các công ty khác.

**Lượt mặc định** (đo 2026-11-11):

| Bảng | Số dòng |
|---|---|
| `companies` | 261 |
| `users` | 5.103 |
| `subscriptions` | 263 |
| `subscription_periods` | 596 |
| `cancel_requests` | 24 |
| `invoices` | 2.425 |
| `user_activity_daily` | 509.203 |
| `feature_usage_daily` | 325.626 |
| `interventions` | 45 |

- CSV tổng cộng khoảng 26 MB; MRR hiện tại khoảng **¥11 triệu**, 198 thuê bao đang trả tiền.
- ⚠ Chưa đo dung lượng thật trên Supabase (bảng + index). Ước lượng 150–250 MB, trong trần
  500 MB của gói miễn phí.

**Câu chuyện được mô phỏng** (chi tiết ở đầu `generate.mjs`):

| Thành phần | Mô phỏng |
|---|---|
| Công ty mới | Tới theo tháng, tăng khoảng 3%/tháng. Mùa vụ kiểu Nhật: tháng 4 cao, tháng 12 và tháng 3 thấp |
| Sức khoẻ | Mỗi công ty có một **sức khoẻ ẩn** trôi theo tháng. Nó quyết định mức dùng, tăng ghế / nâng gói, trả chậm, và nguy cơ huỷ (khoảng 1,6%/tháng khi khoẻ, khoảng 6% khi yếu) |
| Trước khi huỷ | **Giảm dùng 35–90 ngày** (tính năng chính giảm nhanh hơn số người vào). Khoảng 65% hẹn huỷ trước 10–35 ngày. Khoảng 55% được chăm sóc, khoảng 30% trong số đó được giữ lại (hẹn huỷ được rút) |
| Nhiễu | Công ty khoẻ cũng có đợt giảm ngắn; kỳ nghỉ dài (Tết dương lịch, Golden Week, Obon) làm hoạt động lõm xuống; 12% user là "ghế ma" mua mà gần như không vào |
| Dùng thử | 14 ngày, cho kênh tự đăng ký và khách tự tìm đến. Tỉ lệ chuyển sang trả tiền phụ thuộc sức khoẻ |
| Quay lại | 15% khách đã huỷ quay lại sau 2–8 tháng |
| Tương lai | Không có ngày nào sau `as_of`. Huỷ hẹn sau `as_of` ⇒ thuê bao còn hiệu lực, chỉ có yêu cầu hẹn huỷ đang mở |

**Dữ liệu tên người và công ty:**
- Tên công ty và tên người là **tổ hợp ngẫu nhiên** của các mảnh trong `names.mjs` (họ, tên
  phổ biến, từ ghép tự đặt + đuôi theo ngành). Không lấy từ danh sách công ty hay người thật
  nào.
- Email luôn ở miền `*.example.com` (RFC 2606), không thể trỏ tới ai thật.

**Giá (JPY, số nguyên):** `MRR = phí cơ bản + max(0, ghế − ghế có sẵn) × đơn giá ghế`,
khách qua đối tác được giảm 10%.

| Gói | Phí cơ bản | Ghế có sẵn | Đơn giá ghế thêm |
|---|---|---|---|
| Starter | ¥9.800 | 3 | ¥1.200 |
| Growth | ¥29.800 | 10 | ¥1.800 |
| Scale | ¥98.000 | 30 | ¥2.400 |

## 9. Kiểm thử — `npm run db:test`

Chạy trên **PGlite** (Postgres chạy bằng WASM, không cần cài server). Lượt đo 2026-11-11:
16 bài xanh, khoảng 90 giây.

**`schema.test.mjs`** dùng một kịch bản 3 công ty đã tính tay đáp số: nâng gói, hạ gói, huỷ,
quay lại, hẹn huỷ, user bị tắt, ngừng dùng. Nó khoá:
- các số của `revenue_monthly` và `users_monthly`;
- điểm rủi ro;
- quyền của `analytics_reader`.

**`generate.test.mjs`** sinh dữ liệu (18 tháng), COPY vào DB, rồi kiểm:
- `dq_checks` = 0;
- không có ngày nào sau `as_of`;
- tái lập từng byte;
- tiền là số nguyên yên;
- mọi cột và mọi mã giá trị đều có nhãn ja/vi;
- tín hiệu huỷ là thật (bảng ở §5).
