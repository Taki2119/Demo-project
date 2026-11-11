# 00 · Áp dụng kit vào repo GitHub Pages mới bằng VS Code + Claude Code

Tài liệu này hướng dẫn từng bước: từ một repo trống đến một dashboard chạy trên GitHub Pages, có giao diện và luật
vẽ bảng theo bộ kit. Mọi thao tác code đều làm trong VS Code, với extension **Claude Code**.

## 0. Chuẩn bị

| Cần có | Ghi chú |
|---|---|
| Node.js 20 trở lên, git | Kiểm tra bằng `node -v`, `git --version` |
| VS Code + extension **Claude Code** (nhà phát hành Anthropic) | Cài từ Marketplace, rồi đăng nhập bằng tài khoản Claude |
| Một repo GitHub mới | GitHub Pages trên repo **private** cần gói trả phí (Pro/Team/Enterprise). Repo public thì miễn phí |
| (Tuỳ chọn) bản clone của repo nguồn | Cần có thì Claude mới chép được code gốc. Không có thì xem cách 2 ở bước 3 |

## 1. Tạo repo và mở trong VS Code

```bash
git clone https://github.com/<owner>/<ten-repo>.git
```

```bash
code <ten-repo>
```

Mở panel Claude Code trong VS Code bằng icon Claude ở thanh bên hoặc ở góc trên bên phải của editor.

## 2. Đưa bộ kit vào repo

1. Giải nén `dashboard-ui-kit.zip`.
2. Chép **6 file `.md`** vào thư mục `docs/ui-kit/` của repo mới.
3. Mở `docs/ui-kit/05-PROMPTS.md`, lấy khối **P0**, dán vào file `CLAUDE.md` ở gốc repo.
4. Sửa các chỗ `<...>` trong file vừa dán, gồm tên dự án và tên repo.

Claude Code tự đọc `CLAUDE.md` ở gốc repo mỗi phiên. Vì vậy các luật trong kit sẽ áp dụng cho mọi việc về sau.

## 3. Cho Claude đọc được code nguồn (chọn 1 trong 2 cách)

### Cách 1: có repo nguồn trên máy (khuyên dùng)

Tạo file `.claude/settings.json` trong repo mới. File này cho phép Claude đọc thêm một thư mục ngoài repo:

```json
{
  "permissions": {
    "additionalDirectories": ["C:/duong/dan/toi/repo-nguon"]
  }
}
```

- Trên Windows, viết đường dẫn bằng dấu `/` (hoặc `\\`).
- Nếu chỉ muốn thêm tạm cho phiên đang chạy, gõ `/add-dir <đường dẫn>` trong khung chat Claude.
- Sau khi bước 4 chép xong code, có thể xoá dòng `additionalDirectories` đi để repo mới đứng độc lập.

### Cách 2: không có repo nguồn

Bỏ qua bước chép code. Claude sẽ dựng lại các module từ chính tài liệu: kit đã ghi đủ hằng số, công thức và API.

- Ở các prompt P3/P4, thay câu "trích từ repo nguồn" bằng *"dựng theo đặc tả ở docs/ui-kit/…"*.
- Kết quả sẽ không giống từng pixel với bản gốc, nhưng vẫn theo đúng luật.

## 4. Chạy các prompt theo thứ tự

Dán từng prompt vào panel Claude Code. Mỗi prompt chạy trên **một nhánh riêng**. Duyệt xong và merge rồi mới
chạy prompt kế tiếp.

| # | Prompt | Kết quả |
|---|---|---|
| 1 | **P1-VSCode** (ngay dưới) | Code nguồn đã chép vào repo mới và đã gỡ tên sản phẩm |
| 2 | P2 (`05-PROMPTS.md`) | Khung Vite + React + vitest, `deploy.yml` / `checks.yml` |
| 3 | P3 | CSS đã tách thành `src/styles/*`, có theme/palette, trang demo |
| 4 | P4 | Tầng biểu đồ và bảng đã cắt dây, có trang demo chart |
| 5 | P5 (lặp lại mỗi board) | Board thật: parser + test + catalog + registry |
| — | P6 / P7 / P8 | Thêm biểu đồ, review nhánh, hỏi nhanh |

**P1-VSCode** dùng thay cho P1 trong `05-PROMPTS.md`, vì ở đây bạn làm việc trong repo **mới**, không phải repo nguồn:

```
Repo nguồn nằm ở <ĐƯỜNG_DẪN_REPO_NGUỒN> (đã khai trong additionalDirectories). Repo hiện tại là repo đích.
Đọc docs/ui-kit/README.md, mục "Bản đồ file". Tạo nhánh chore/import-kit, rồi:
- nhóm A: chép nguyên văn từ <ĐƯỜNG_DẪN_REPO_NGUỒN>/src/... sang src/... của repo này, giữ nguyên cấu trúc thư mục;
- nhóm B: chép sang nhưng CHƯA sửa; ghi vào docs/ui-kit/TODO-cut.md mỗi file một dòng, nói rõ dây nào cần cắt;
- KHÔNG chép nhóm C, KHÔNG chép src/index.css;
- trên mọi file vừa chép: đổi tiền tố `jw-` thành `ui-`; đổi STORAGE_KEY trong theme.ts / palette.ts / i18n.ts
  thành '<app>.theme' / '<app>.palette' / '<app>.lang'; grep -i tên sản phẩm/công ty nguồn trong chuỗi lẫn
  comment rồi viết lại cho trung tính; xoá import tới logo hay wordmark thương hiệu.
KHÔNG sửa gì trong repo nguồn. Báo lại số file theo từng nhóm và số chỗ đã sửa ở mỗi file.
```

**Mẹo khi làm việc với Claude Code trong VS Code:**

- Gõ `@` để gắn một file vào câu hỏi, ví dụ `@docs/ui-kit/03-CHARTS-TABLES.md`. Như vậy Claude đọc đúng file đó.
- Với việc lớn (P2–P5), hãy bảo Claude **lập kế hoạch trước** (dùng chế độ Plan, hoặc viết "lập kế hoạch,
  chờ tôi duyệt rồi mới code"). Duyệt kế hoạch xong mới cho sửa file.
- Claude đề xuất sửa file nào thì VS Code hiện diff của file đó. Đọc diff trước khi chấp nhận, nhất là file CSS và workflow.
- Nếu thấy Claude bắt đầu làm sai luật, hãy nhắc lại bằng `@CLAUDE.md`.

## 5. Bật GitHub Pages

1. Vào GitHub, mở repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Kiểm tra `vite.config.ts`: `base` phải là `'/<ten-repo>/'`, đúng tên repo, có `/` ở hai đầu.
   Nếu dùng domain riêng thì đặt `VITE_BASE_PATH=/` lúc build.
3. Merge vào `main`. Workflow `deploy.yml` sẽ chạy. Theo dõi ở tab **Actions**.
4. Trang có địa chỉ `https://<owner>.github.io/<ten-repo>/`.

Nên làm thêm (tuỳ chọn): tạo ruleset bảo vệ `main` trong **Settings → Rules → Rulesets** với các mục sau:

- Bắt buộc đi qua PR, Required approvals = 0 nếu bạn làm một mình.
- Chặn force push.
- **Không** tích "Require branches to be up to date".

## 6. Kiểm tra ở máy trước khi push

Chạy dev server rồi mở `http://localhost:5173/#/home`:

```bash
npm run dev
```

Chạy test và kiểm tra kiểu. Lưu ý: kiểm tra kiểu phải dùng `npm run typecheck`, không dùng `npx tsc --noEmit`:

```bash
npm test
```

```bash
npm run typecheck
```

Build xong thì kiểm tra Recharts không lọt vào chunk đầu. Lệnh grep phải trả về `0`:

```bash
npm run build
```

```bash
grep -c activeTooltipIndex dist/assets/index-*.js
```

Cuối cùng, xem bản build giống hệt Pages tại `http://localhost:4173/<ten-repo>/`:

```bash
npm run preview
```

Checklist đầy đủ (máy + mắt) nằm ở `04-PITFALLS-CHECKLIST.md`.

## 7. Sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| Pages ra trang trắng, console báo 404 các file `.js` | `base` trong `vite.config.ts` sai tên repo | Đặt `base: '/<ten-repo>/'` |
| Bấm F5 ở một trang con bị 404 | Router dùng path thay vì hash | Dùng route hash `#/...` (`01-ARCHITECTURE.md` §4) |
| Sau một lần deploy, tab đang mở thành màn đen | Chunk cũ đã bị xoá | Bọc mọi `import()` bằng `boardChunk()` và đặt `ErrorBoundary` |
| CSS có trong nguồn nhưng mất trên Pages | Lightning CSS viết lại rule, hoặc một comment đóng sớm | Grep `dist/assets/*.css` rồi xem `04` mục A |
| Hiệu ứng kính mất trên Safari | `backdrop-filter` có `url()`, hoặc nằm trong `@supports` | `02-DESIGN-SYSTEM.md` §3 |
| Claude báo không đọc được repo nguồn | Đường dẫn `additionalDirectories` sai, hoặc phiên chưa nạp lại settings | Sửa đường dẫn rồi mở phiên Claude mới, hoặc dùng `/add-dir` |
| `npm test` báo xanh nhưng số test ít hơn lần trước | Vitest đang chạy pool `forks` | Đặt `pool: 'threads'` trong `vite.config.ts` |
| Workflow Pages báo lỗi quyền | Pages Source chưa chọn GitHub Actions | Quay lại bước 5.1 |
