# DuoQuest

Web game hub học và chơi, ưu tiên **Quiz Battle** với Solo, Duel, Co-op; chơi chung màn hình hoặc trên hai trình duyệt cùng LAN. Source này triển khai nền tảng theo Blueprint V1.0 trong `doc/`, thay cho phạm vi 3 game của concept v0.1.

## Chạy local

Tra cứu tài liệu theo mục đích tại [mục lục docs](docs/README.md). Khi tạo hoặc cập nhật tài liệu, làm theo [quy định quản lý](docs/documentation-guide.md).

Yêu cầu Node.js >=22.12, pnpm 11.25.0 và Docker Desktop đang chạy (hoặc PostgreSQL có sẵn).

```powershell
Copy-Item .env.example .env
pnpm install
pnpm db:up
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Mở http://localhost:3000. API: http://localhost:4000/api/health; readiness: `/api/health/ready`. Chạy các lệnh từ thư mục gốc. Không chép đè `.env` đã cấu hình. Nếu dùng PostgreSQL có sẵn, sửa `DATABASE_URL` và bỏ `db:up`.

API yêu cầu database/migration sẵn sàng trước khi khởi động. Không tự rơi về database giả khi PostgreSQL lỗi. `db:deploy` áp dụng migration đã commit; khi sửa schema, dùng `pnpm db:migrate --name <ten-thay-doi>` rồi review SQL. `db:seed` có thể chạy lại mà không ghi đè phiên bản bộ đề cũ.

## Auth và phân quyền

Dừng dev server cũ. Chọn đúng database trong `.env`, sau đó chạy từ root:

```powershell
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm dev
```

Docker Compose hiện publish PostgreSQL ở `127.0.0.1:55432`. Nếu lấy cấu hình từ `.env.example` và dùng Compose, đổi cổng trong `DATABASE_URL` cho khớp.

Mở http://localhost:3000/register để đăng ký theo ba bước email → mã sáu số → nickname và mật khẩu. Trang Chơi vẫn cho tạo guest. Có thể nâng cấp guest trên localhost để giữ tiến trình. Rời phòng đang mở trước khi nâng cấp hoặc chuyển danh tính.

Điền `AUTH_SECRET` và nhóm `SMTP_*`/`MAIL_FROM` theo `.env.example` để gửi OTP thật. Secret gồm ít nhất 32 byte ngẫu nhiên mã hóa base64url. API development có thể sinh secret theo process nếu thiếu cấu hình, nên restart sẽ làm mất hiệu lực flow xác minh đang mở. Dùng cùng hostname localhost giữa web và API.

Role mặc định là `PLAYER`. Cấp hoặc gỡ Admin qua `pnpm auth:role <email> ADMIN` hoặc `pnpm auth:role <email> PLAYER`. Xem [đặc tả Auth và phân quyền](docs/features/auth.md).

## Swagger REST API

Sau khi chạy `pnpm dev`, mở http://localhost:4000/api/docs. OpenAPI JSON: http://localhost:4000/api/docs-json.

Tạo guest hoặc đăng nhập qua **Try it out** để browser nhận cookie phiên. Swagger lấy CSRF token trước request ghi. Các thao tác mua/trang bị/lưu bộ đề thay đổi dữ liệu thật. Retry mua hàng phải giữ cùng `requestId` UUID. Xem [contract Socket.IO](docs/architecture/contracts.md).

## Chơi qua LAN

1. Máy host chạy PostgreSQL, API và Next.js. Cả web/API bind `0.0.0.0`.
2. Dùng `ipconfig` tìm IPv4 của adapter Wi-Fi/Ethernet đang sử dụng.
3. Thêm origin chính xác vào `.env`, ví dụ `WEB_ORIGINS=http://localhost:3000,http://192.168.1.20:3000`; khởi động lại API. IP ở đây chỉ là minh họa.
4. Cho phép Node.js/cổng 3000 và 4000 trên Windows Firewall **Private network** nếu bị chặn. Repo không tự đổi firewall.
5. Máy thứ hai mở `http://<IP-host>:3000`, tạo guest riêng rồi nhập mã phòng. Nếu mở link mời, bấm tham gia sau khi tạo guest.

Browser tự lấy hostname trang web rồi gọi API cùng hostname, cổng 4000; không hard-code `localhost` cho máy B. Nếu đổi địa chỉ API, đặt `NEXT_PUBLIC_API_URL` trong `apps/web/.env.local` rồi restart web. PostgreSQL Compose chỉ publish `127.0.0.1:5432`.

## Những gì có trong source

- pnpm monorepo, strict TypeScript, lint kiểm soát import boundary, format và lockfile.
- Next.js App Router, Tailwind, UI primitives theo cách tổ chức shadcn, Zustand lưu snapshot hiển thị.
- NestJS modules: players, rooms, sessions, realtime, question-packs, rewards, shop/inventory, persistence, health.
- Quiz engine thuần cho 3 mode và 2 layout: deadline server, buzzer/steal, captain luân phiên, mạng chung và reveal.
- Guest token ngẫu nhiên, chỉ lưu hash trên server; server cấp quyền slot, kiểm tra input, ACK và chống action lặp.
- Room Ready/Start/Sync/Rematch/Leave; snapshot khi reconnect; hàng xử lý chung cho action/timer/disconnect.
- Prisma schema, migration đầu tiên, pack JSON mẫu/JSON Schema, seed; snapshot câu hỏi bất biến theo session.
- Lưu câu trả lời, kết quả/lịch sử; kết quả và thưởng cùng transaction; cosmetic purchase/equip API.
- Web: chọn mode/layout, phòng chờ, chơi Quiz, kết quả/tái đấu, JSON preview/import, hồ sơ/lịch sử, shop tối thiểu.

Đây là **codebase nền tảng có luồng Quiz thực**, chưa phải V1 hoàn thiện. Gift/reaction, power-up gameplay, ôn câu sai có màn hình riêng, âm thanh và khôi phục guest chưa được triển khai. Xem `docs/project/roadmap-quality.md` để nhận task tiếp theo.

## Ranh giới package

```text
apps/web                 UI và Socket.IO client
apps/api                 Domain orchestration và persistence
packages/shared-types    Zod schemas, public views, REST/socket contracts
packages/game-sdk        Server engine interface
packages/game-core       Domain errors và hàng xử lý chung
packages/game-quiz       Quiz rules/state; không I/O hoặc database
packages/ui              UI primitives dùng chung
prisma                   Một schema, migration stream và seed
infra                    PostgreSQL local
examples                 QuestionPack và JSON Schema sinh từ Zod
docs                     Đặc tả kỹ thuật, quyết định và kiểm chứng
```

## Kiểm tra

```powershell
pnpm db:generate
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm test:e2e
```

Unit/orchestration tests chạy không cần DB. Socket integration mở Nest + Socket.IO thật và hai client, nhưng dùng store trong RAM **chỉ trong test**. Database integration là một nhóm riêng, chạy trên DB test dùng một lần; xem hướng dẫn trong `docs/project/roadmap-quality.md`. Hai thiết bị LAN thật vẫn cần nghiệm thu thủ công.

Browser e2e cần DB đã migrate/seed, production build và Chrome có sẵn (hoặc cấu hình Chromium theo tài liệu chất lượng). CI mẫu ở `.github/workflows/ci.yml`. Kết quả kiểm chứng khi dựng source được lưu trong `docs/quality/verification.md`.

Để chạy riêng browser E2E cho Auth, dùng database có tên kết thúc `_test`, migrate/seed/build trước rồi đặt `$env:RUN_AUTH_E2E='1'` và chạy `pnpm test:e2e e2e/auth.spec.ts`. Fixture chỉ lắng nghe trên loopback và dùng SMTP giả. Sau khi chạy, bỏ biến bằng `Remove-Item Env:RUN_AUTH_E2E`.

## Hướng đọc cho agent

Đọc `AGENTS.md` → [mục lục tài liệu](docs/README.md) → `docs/architecture/decisions.md` → tài liệu domain liên quan → code/tests hiện tại. Mỗi task triển khai theo một luồng người dùng, ghi rõ tiêu chí nghiệm thu và cập nhật trạng thái thực tế. Không tự tạo game 2/game 3, microservices hoặc thêm Redis.
