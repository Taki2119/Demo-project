# 04 · Bẫy đã sập thật và checklist nghiệm thu

Các bẫy dưới đây đều đã xảy ra thật ở repo nguồn. Đặc điểm chung: **build xanh, test xanh mà sản phẩm vẫn sai.**
Nên mỗi bẫy đi kèm một cổng (test hoặc script) để bắt nó, thay vì chỉ ghi chú cho người đọc.

## A. Bẫy build / CSS

| # | Bẫy | Cách chặn |
|---|---|---|
| 1 | **Nguồn đúng chưa chắc bản ship đúng.** Lightning CSS (Tailwind v4) gộp khai báo trùng, viết lại `@supports`, và gập `color-mix` hằng số thành `#0000` | Sau khi build, grep `dist/`. Dùng 2 script mẫu `check-bundle-glass.mjs` và `check-bundle-viewport.mjs` |
| 2 | **Comment CSS đóng sớm.** Chữ đậm markdown đứng trước phép chia, ví dụ hai dấu sao rồi `/765`, ghép lại thành đúng chuỗi đóng comment. Rule ngay sau biến mất khỏi `dist/` | Test `cssSource.test.ts` quét một lượt toàn file, bắt mọi chuỗi đóng comment nằm ngoài comment |
| 3 | `height:100vh; height:100dvh;` bị gộp, mất đường lui. Trình duyệt không hiểu `dvh` thì cột flex sập (đo được 563px trên khung 900px) | Viết đường lui riêng: `@supports not (height:100dvh)` |
| 4 | `-webkit-backdrop-filter` chứa `url()` hoặc `var()` không hợp lệ thì Safari mất trắng kính | Không đưa `url()` vào `backdrop-filter`. Không bọc kính trong `@supports` |
| 5 | **Backdrop root.** Tổ tiên có `filter`, `opacity<1` hoặc `mask`, hoặc animation dùng `fill-mode: forwards/both`, làm kính bên trong chỉ còn nhoè nền rỗng | Animation dùng `backwards`. Overlay portal ra `body` |
| 6 | Hai rule cùng specificity thì rule đứng sau thắng. `transition` viết tắt ở rule chung đặt sau sẽ xoá transition riêng của biến thể | Biến thể chỉ khai biến. Rule vặn núm đặt **sau** rule gốc |
| 7 | `text-transform` đổi glyph nhưng `textContent` vẫn như cũ, nên test so chuỗi không phát hiện. Ví dụ `Acme.io` hiển thị thành `ACME.IO` | Cấm `text-transform` trên khoá nghiệp vụ và tên thương hiệu |
| 8 | Hai file trùng tên khi bỏ phân biệt hoa thường và bỏ đuôi (`Toast.tsx` và `toast.ts`): trên Windows import nhầm, trắng trang, trong khi CI Linux vẫn xanh | Test `fileCase.test.ts`. File store đặt hậu tố, ví dụ `toastStore.ts` |
| 9 | Sửa file bằng script mà không đếm số chỗ thay. Phép `replace` không khớp gì vẫn chạy êm | Mỗi phép thay phải có assert số lần khớp |

## B. Bẫy test / công cụ

| # | Bẫy | Cách chặn |
|---|---|---|
| 10 | `npx tsc --noEmit` chạy ở gốc một solution tsconfig (`"files": []`) thì **không kiểm file nào** mà vẫn in kết quả sạch | Dùng `npm run typecheck` = `tsc --noEmit -p tsconfig.app.json` |
| 11 | Vitest pool `forks` làm rơi im lặng một file test trên Windows; báo cáo vẫn ghi "15 passed" | Đặt `pool: 'threads'`. Kiểm **số lượng** file/test so với lần chạy trước, đừng chỉ nhìn chữ "passed" |
| 12 | Test quét thư mục bằng `readdirSync` không đệ quy. Dời code vào thư mục con thì cổng vẫn xanh nhưng không còn kiểm gì | Dùng `readdirSync(dir, { recursive: true })` |
| 13 | Hàm thuần đọc thẳng biến môi trường (`import.meta.env`), nên test xanh hay đỏ tuỳ máy | Truyền giá trị env vào qua tham số |
| 14 | Chụp ảnh để đo trong khi icon SMIL đang chạy, mỗi ảnh ra một khung khác nhau | Gọi `svg.pauseAnimations()` trước khi chụp. Đổi tham số qua biến CSS, không gán inline |

## C. Bẫy Recharts / viz

| # | Bẫy | Cách chặn |
|---|---|---|
| 15 | `margin` của chart là phần chừa chỗ cho mark nằm ở mốc biên (pill, node, quầng). Thiếu chỗ thì mark bị cắt | `margin.top = PILL_TOP` hoặc `HOVER_GLOW.room`, `margin.right = 34`. Đo đủ 4 mép ở cả 1440px và 430px |
| 16 | Recharts lọc `children` theo loại component và bỏ đi không báo. `<defs>` bọc trong component tự viết sẽ mất | Đặt def ngay trong `shape`, hoặc viết `<defs>` trực tiếp trong chart |
| 17 | Prop của chuỗi rò sang dot (`fillOpacity`, dash) | Ghim lại trong `DOT_RING`. Dùng `'none'`, không dùng `undefined` |
| 18 | `dot` dạng hàm nhận `cy: null` ở mốc trống | Chặn trường hợp null. Không spread props của Recharts vào `<circle>` |
| 19 | `margin.left` âm cộng nhãn Y dài làm mất chữ số đầu: `14000` hiển thị thành `4000` | Đổi `tickFormatter` thì đo lại. Nhãn từ 5 chữ số dùng `AXIS_GUTTER_WIDE` |
| 20 | `interval="preserveEnd"` xoá nhãn ở giữa trục khi màn hẹp | Nhãn dài thì dùng `HBars` (DOM) |
| 21 | `style={{ background: color }}` inline xoá mất `background-image` (gradient phủ) | Dùng `backgroundColor` |
| 22 | Cột xếp lớp có lát cuối bằng 0 thì đỉnh cột thành góc vuông | Xác định mép từ giá trị (`stackEdges`) |
| 23 | Recharts lọt vào chunk đầu | Dùng `lazy()` và cổng `activeTooltipIndex` |
| 24 | Deploy xong, tab cũ gọi `import()` chunk đã bị xoá thì ra màn đen | `boardChunk()` và `ErrorBoundary` bọc ngoài `Suspense` |

## D. Bẫy dữ liệu / nghiệp vụ

| # | Bẫy | Cách chặn |
|---|---|---|
| 25 | Bịa số liệu, kể cả trong fixture | Loader trả rỗng ⇒ hiện `NoData`. Mock dùng `@example.com` |
| 26 | `?? 0` biến "không tính được" thành 0 | Trả `null` và hiện `—` |
| 27 | `new Date('YYYY-MM-DD')` bị lệch múi giờ | So sánh chuỗi `YYYY-MM`, hoặc dùng `Date.UTC` (`lib/day.ts`) |
| 28 | Cộng dồn một đại lượng tồn kho, ra con số đúng cỡ mà sai | Đại lượng luồng thì cộng, tồn kho thì lấy giá trị cuối kỳ. Bảng thưa thì dùng LOCF |
| 29 | Nhãn không đổi theo bộ lọc (vẫn ghi "tháng này" khi đang xem 3 tháng) | Nhãn gọi đúng tên khoảng đang xem. `deltaNote` đổi theo độ dài khoảng |
| 30 | Ghim `fileId` của Drive; ghi đè file là id đổi | Tra file theo **tên** trong folder |
| 31 | Mốc "cập nhật lúc" lấy `Date.now()` | Lấy `modifiedTime` của nguồn |
| 32 | `dist/` chứa dữ liệu thật, SQL hoặc tên dataset (Pages công khai kể cả khi repo private) | `check-bundle-privacy.mjs` và hook pre-commit |
| 33 | Thiếu `VITE_*` lúc build: build xanh, nhưng trang không dùng được | Cổng soi `dist/` xem chuỗi đó có thật sự nằm trong bundle hay không |

## Checklist nghiệm thu một board

**Máy:**
- [ ] `npm test`: số file và số test khớp với lần chạy trước, cộng thêm phần test mới
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run privacy:bundle` (và `check:clientid` nếu có OAuth)
- [ ] `grep -c activeTooltipIndex dist/assets/index-*.js` ra `0`
- [ ] Grep `dist/assets/*.css` thấy các class mới

**Mắt:**
- [ ] Tên nghiệp vụ đúng ngôn ngữ đã chốt; giải thích ⓘ khớp với công thức trong code
- [ ] Mỗi biểu đồ chỉ có 1 trục Y; hình chọn đúng theo bảng ở `03` §3
- [ ] Đã chụp 4 ảnh: **1440px và 430px × sáng và tối**; không có cuộn ngang
- [ ] Nhãn không đè lên nhau; mark ở mép không bị cắt; rê chuột được lên mọi mark
- [ ] Đổi bộ lọc thì nhãn, delta và sparkline cùng đổi; nút đặt lại đưa về mặc định
- [ ] Không có dữ liệu thì hiện `NoData`, khối giữ nguyên chiều cao (không nhảy layout)
- [ ] Bật `prefers-reduced-motion` thì không còn chuyển động; số nhảy thẳng tới giá trị cuối

## Quy trình git (nên giữ nguyên ở repo mới)

1. Không commit thẳng vào `main`. Tạo nhánh `feat/*`, `fix/*`, `chore/*` hoặc `docs/*`.
   Có thể dùng 2 hook `pre-commit` / `pre-push` để chặn.
2. Agent làm xong thì push **nhánh** rồi dừng. Người duyệt mới là người bảo mở PR, và sau đó là người bảo merge.
3. `checks.yml` (chạy trên PR) và `deploy.yml` (chạy trên `main`) phải có **cùng bộ cổng, cùng thứ tự**.
