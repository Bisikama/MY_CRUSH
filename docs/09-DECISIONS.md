# Quyết định

## LOCKED theo Blueprint V1.0

- Monorepo, Next.js/React/TypeScript, Tailwind/shadcn idiom, Zustand, NestJS Modular Monolith, PostgreSQL/Prisma, Socket.IO.
- Chỉ Quiz trước; Solo/Duel/Co-op; SHARED_SCREEN/MULTI_DEVICE dùng chung engine.
- Một API instance/DB; server-authoritative; game package không I/O; shared shop; JSON QuestionPack v1.
- Chưa xác định game 2–3, rank hoặc Internet deployment; không thêm Redis/BullMQ/microservices.

## PROPOSAL được hiện thực để khung chạy được

- Guest bearer token 32 random bytes, DB chỉ SHA-256 hash; browser localStorage lưu token để refresh; chưa expiry/rotation/recovery. Có thể thay qua PlayersService mà không đổi Quiz engine.
- Shared screen slot thứ hai là guest server tạo, thuộc controller host, chưa có cách đăng nhập riêng/claim tiến trình slot đó. Không hứa giữ tiến trình của người chơi 2 qua các room mới.
- Room trong RAM, 30s grace tiếp tục clock rồi cancel/no reward; Leave hủy cả room; idle TTL 15m; max128 rooms.
- Restart hủy session dang dở, không resume; kết quả đã commit giữ nguyên. DB lỗi lúc kết toán không công bố FINISHED, timer thử lại.
- Điểm/timer/lives/reward/prices là thông số playtest. Trusted pack reward cap 10 sessions/player/ngày UTC; imported pack không thưởng.
- Pack JSON trong một model có version/snapshot, chưa chuẩn hóa thành bảng QuizQuestion riêng. Không tạo abstract repository cho từng model khi chưa có nhu cầu.
- Internal packages được web transpile/API bundle từ source; không cần Turborepo.
- REST docs dùng `@nestjs/swagger` tại `/api/docs`, JSON tại `/api/docs-json`; chuyển Zod hiện có bằng `zod-to-json-schema` để mô tả request, không thay validation/auth. Swagger cho local/LAN tin cậy, không lưu bearer token qua reload; Socket.IO giữ tài liệu riêng. Không thay database hoặc luật game.

## OPEN cần quyết định trước module liên quan

- Guest recovery/account linking và quyền sở hữu tiến trình người chơi 2 chung màn hình.
- Mục tiêu từng ải Co-op, inventory tiêu hao và luật power-up cụ thể.
- Guest nickname moderation/anti-abuse khi mở Internet.
- Game 2–3, rank, deployment Internet, durable room recovery.

Các lựa chọn PROPOSAL được ghi nhận để tránh agent tự xem là quyết định sản phẩm bất biến. Nếu đổi, cập nhật file này, contracts, tests và domain docs cùng task.
