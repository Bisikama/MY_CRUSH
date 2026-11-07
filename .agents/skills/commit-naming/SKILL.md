---
name: commit-naming
description: >-
  Quy chuẩn và quy trình đặt tên git commit dựa trên các thay đổi tính năng mới hoặc cập nhật trong dự án DuoQuest.
  Kích hoạt skill này khi người dùng yêu cầu tạo commit, gợi ý tên commit, viết commit message, hoặc đóng gói các thay đổi tính năng mới vào git.
---

# Quản Lý Đặt Tên Commit (Commit Naming Skill)

Skill này hướng dẫn cách phân tích thay đổi trong workspace và đặt tên commit chuẩn xác, nhất quán với kiến trúc Monorepo của **DuoQuest**.

---

## 1. Cấu trúc chuẩn của Commit Message

Sử dụng định dạng **Conventional Commits**:

```text
<type>(<scope>): <mô tả ngắn gọn thay đổi>

[body - tùy chọn: giải thích chi tiết các thay đổi chính]

[footer - tùy chọn: BREAKING CHANGE, tham chiếu issue/PR]
```

### Quy tắc dòng tiêu đề (Header)
- **Độ dài**: Tối đa **72 ký tự**.
- **Ngôn ngữ**: Tiếng Việt (ưu tiên theo lịch sử repo) hoặc Tiếng Anh, thống nhất trong cùng một đợt commit.
- **Phong cách**: Bắt đầu bằng động từ nguyên mẫu (ví dụ: `thêm`, `cập nhật`, `sửa lỗi`, `tách`, `hoàn thiện`), **không** viết hoa chữ cái đầu sau dấu `: `, **không** có dấu chấm `.` ở cuối câu.

---

## 2. Phân loại `<type>`

| Type | Khi nào sử dụng |
| :--- | :--- |
| `feat` | Thêm tính năng mới (API mới, màn hình mới, luật game mới, luồng người dùng mới). |
| `fix` | Sửa lỗi (bug logic, lỗi UI, lỗi race condition, lỗi validation/auth). |
| `refactor` | Tái cấu trúc code mà không làm thay đổi hành vi nghiệp vụ bên ngoài. |
| `db` | Thay đổi Prisma schema, thêm migration hoặc cập nhật dữ liệu seed. |
| `docs` | Thêm mới hoặc cập nhật tài liệu (`README.md`, `docs/*`, Swagger descriptions). |
| `test` | Thêm hoặc cập nhật unit test, integration test, e2e test (`*.test.ts`, `e2e/*.spec.ts`). |
| `chore` | Cập nhật cấu hình build, dependencies (`package.json`, `pnpm-lock.yaml`, scripts, `.env.example`). |
| `ci` | Thay đổi cấu hình GitHub Actions (`.github/workflows/*`). |
| `style` | Chỉnh sửa định dạng code, lint, prettier, UI/CSS nhỏ không ảnh hưởng logic. |
| `perf` | Tối ưu hiệu năng truy vấn, realtime socket hoặc render UI. |

---

## 3. Phân loại `<scope>` theo ranh giới kiến trúc DuoQuest

Chọn `<scope>` phản ánh đúng module hoặc package chịu tác động chính:

- **Domain / Backend (`apps/api`)**:
  - `auth`: Đăng ký, đăng nhập, OTP, session cookie, CSRF, phân quyền (`PLAYER`/`ADMIN`).
  - `rooms`: Tạo/đóng phòng, join/ready/leave, trạng thái phòng.
  - `sessions`: Lifecycle trận đấu, deadline, snapshot/recovery.
  - `realtime`: Socket.IO gateway, events, đồng bộ client-server.
  - `packs`: Question packs, import/preview JSON bộ đề.
  - `rewards`: Tính toán và cấp thưởng sau trận.
  - `shop`: Mua vật phẩm, trang bị inventory/cosmetics.
  - `players`: Hồ sơ người chơi, lịch sử đấu, nâng cấp guest.
  - `swagger`: Tài liệu OpenAPI / Swagger UI.
- **Game Packages (`packages/*`)**:
  - `game-quiz`: Luật chơi Quiz (Solo, Duel, Co-op), tính điểm, validation.
  - `game-core`: Hàng xử lý chung, domain errors.
  - `shared-types`: Zod schemas, DTOs, REST/Socket contracts.
- **Frontend & Hạ tầng**:
  - `web`: Giao diện Next.js (`apps/web`), giao diện phòng chơi, trang hồ sơ/cửa hàng.
  - `prisma`: Schema database, migrations, seed (`prisma/*`).
  - `e2e`: Kiểm thử Playwright (`e2e/*`).
  - `docs`: Tài liệu kiến trúc và quyết định (`docs/*`).

> **Lưu ý**: Nếu một tính năng mới trải dài toàn bộ luồng (full-stack end-to-end từ `prisma` -> `api` -> `web` -> `docs`), hãy ưu tiên đặt `<scope>` theo **tên miền tính năng** (ví dụ: `feat(auth): ...`, `feat(shop): ...`, `feat(quiz): ...`) thay vì liệt kê tất cả các thư mục.

---

## 4. Quy trình thực hiện khi đặt tên Commit

Khi được yêu cầu tạo commit hoặc gợi ý tên commit cho tính năng mới, thực hiện lần lượt các bước sau:

### Bước 1: Khảo sát các file thay đổi
Chạy lệnh kiểm tra trạng thái và diff:
```powershell
git status --short
git diff --stat
```

### Bước 2: Phân nhóm thay đổi theo tính năng
- Kiểm tra xem các file đang sửa thuộc **một tính năng duy nhất** (ví dụ: toàn bộ luồng Auth + Swagger + E2E của Auth) hay **nhiều tính năng độc lập**.
- Nếu có các file nháp/tạm thời không thuộc tính năng (ví dụ file thử nghiệm cá nhân), cảnh báo cho người dùng để loại trừ khỏi `git add`.
- Nếu có nhiều tính năng độc lập, đề xuất tách thành các **atomic commits** theo thứ tự:
  1. `db` / `shared-types` (Schema & Contracts)
  2. `feat(<domain>)` (Logic Backend & Frontend của tính năng)
  3. `test(<domain>)` (Unit / Integration / E2E tests)
  4. `docs(<domain>)` (Cập nhật `README.md`, `docs/09-DECISIONS.md`, tài liệu chuyên ngành)

### Bước 3: Soạn thảo Commit Message
1. Viết dòng tiêu đề ngắn gọn, nêu bật **giá trị tính năng mới** thay vì chỉ liệt kê tên file sửa.
2. Nếu thay đổi lớn (nhiều hơn 5 file hoặc thêm tính năng trọn gói), thêm phần **Body** gạch đầu dòng tóm tắt các mảng thay đổi chính (Schema/API, Web UI, Tests, Docs).

---

## 5. Ví dụ mẫu chuẩn cho DuoQuest

### Ví dụ 1: Commit một tính năng lớn trọn gói (Full-stack Feature)
```text
feat(auth): thêm hệ thống xác thực tài khoản email OTP, phân quyền và Swagger

- Bổ sung Prisma migration và model cho Account, Session, xác minh OTP 6 số
- Triển khai module auth trên API (register, login, forgot-password, CSRF, role PLAYER/ADMIN)
- Thêm giao diện đăng ký, đăng nhập, quên mật khẩu và nâng cấp guest trên web
- Tích hợp Swagger REST API tại /api/docs cùng kiểm thử auth database và e2e
```

### Ví dụ 2: Commit tách theo từng phần (Atomic Commits)
- `db(auth): thêm bảng account, session và migration xác thực người dùng`
- `feat(auth): triển khai luồng đăng ký OTP, đăng nhập và phân quyền role`
- `feat(swagger): tích hợp tài liệu OpenAPI và xác thực CSRF trên Swagger UI`
- `feat(web): thêm trang đăng nhập, đăng ký và quên mật khẩu`
- `test(auth): bổ sung integration test database và playwright e2e cho luồng auth`
- `docs(auth): cập nhật đặc tả phân quyền 13-AUTH-PHAN-QUYEN và hướng dẫn README`

