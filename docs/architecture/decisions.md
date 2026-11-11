# Quyết định

> **Mục đích:** Nguồn chính cho các quyết định LOCKED, PROPOSAL và OPEN.
> **Đối tượng:** Chủ dự án, lập trình viên và agent.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-11.
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../../AGENTS.md).

## LOCKED theo Blueprint V1.0

- Monorepo, Next.js/React/TypeScript, Tailwind/shadcn idiom, Zustand, NestJS Modular Monolith, PostgreSQL/Prisma, Socket.IO.
- Chỉ Quiz trước; Solo/Duel/Co-op; SHARED_SCREEN/MULTI_DEVICE dùng chung engine.
- Một API instance/DB; server-authoritative; game package không I/O; shared shop; JSON QuestionPack v1.
- Chưa xác định game 2–3, rank hoặc Internet deployment; không thêm Redis/BullMQ/microservices.

## PROPOSAL được hiện thực để khung chạy được

- Guest và Account dùng opaque session cookie có thể thu hồi. Legacy guest token chỉ dùng tại endpoint chuyển đổi một lần. Account liên kết một Player để giữ tiến trình khi nâng cấp.
- Shared screen slot thứ hai là guest server tạo, thuộc controller host, chưa có cách đăng nhập riêng/claim tiến trình slot đó. Không hứa giữ tiến trình của người chơi 2 qua các room mới.
- Room trong RAM, 30s grace tiếp tục clock rồi cancel/no reward; Leave hủy cả room; idle TTL 15m; max128 rooms.
- Restart hủy session dang dở, không resume; kết quả đã commit giữ nguyên. DB lỗi lúc kết toán không công bố FINISHED, timer thử lại.
- Điểm/timer/lives/reward/prices là thông số playtest. Trusted pack reward cap 10 sessions/player/ngày UTC; imported pack không thưởng.
- Pack JSON trong một model có version/snapshot, chưa chuẩn hóa thành bảng QuizQuestion riêng. Không tạo abstract repository cho từng model khi chưa có nhu cầu.
- Internal packages được web transpile/API bundle từ source; không cần Turborepo.
- REST docs dùng Swagger ở /api/docs và /api/docs-json. Swagger dùng cookie và CSRF cùng luồng với browser.
- Auth xác minh email bằng mã sáu số trước khi tạo tài khoản. Role cố định PLAYER/ADMIN. Auth tài khoản dùng localhost, guest hỗ trợ LAN. Xem [đặc tả Auth và phân quyền](../features/auth.md).

- Yêu cầu mật khẩu mới (2026-11-07, theo yêu cầu chủ dự án): tối thiểu 9 ký tự và ít nhất 1 ký tự đặc biệt; giữ tối đa 128 ký tự Unicode. Xem [đặc tả Auth](../features/auth.md) để biết phạm vi áp dụng.
- Game Hub & quản lý phiên/phòng dùng chung (2026-11-08): `/` là Game Hub chọn trò chơi (Pastel Lavender, screen `7d9066eeafb84b979a3266c355b4f90e`), `/play` là sảnh Quiz Battle, `/play/[code]` là màn phòng/trận. `PlatformProvider` trong `(main)` giữ một kết nối Socket.IO cho mỗi tab có phiên, đọc `GET /api/rooms/current` theo controller membership từ cookie phiên mà không thay đổi presence hoặc idle TTL. Guest tiếp tục chơi đầy đủ 3 mode và 2 layout; điều hướng nội bộ rời màn trận đang `IN_PROGRESS` phải qua hộp thoại xác nhận hủy trận không thưởng.

- Quiz lọc theo lĩnh vực, đề tài và độ khó trước khi tạo phòng. Bonus độ khó thuộc Game Score. Skill có lượt miễn phí theo trận hoặc lượt mua trong kho. Co-op chỉ dùng kho. Các mức điểm, giá, giới hạn và thời gian hiệu ứng là thông số playtest. Xem [luật Quiz](../features/quiz.md) và [kinh tế](../features/economy-items.md).

- Bộ đề JSON v1 hỗ trợ `knowledgeType` tùy chọn với ba nhóm học chuyên đề, đời sống hữu ích và khám phá thú vị. Sảnh lọc thư viện theo nhóm, còn các bộ thiếu nhóm hiển thị là Chưa phân loại. [Hướng dẫn bộ đề](../features/question-packs.md)

- Seed thư viện nạp các QuestionPack JSON đã duyệt từ `prisma/question-packs/` thành bộ trusted và bỏ qua `packId` đã tồn tại. [Hướng dẫn seed](../features/question-packs.md#nạp-vào-thư-viện-chung-bằng-seed)

- Hai trải nghiệm Quiz (2026-11-11, theo yêu cầu chủ dự án). Đố vui lấy tối đa 20 câu ở cả ba mode từ các pack trusted discovery/practical, hỗ trợ Ngẫu nhiên hoặc Tự chọn nhiều lĩnh vực/chủ đề và độ khó. Học luyện giữ chọn một pack, lấy ngẫu nhiên tối đa 10 câu Solo/Duel hoặc 20 câu Co-op, cho phép lặp qua các ván.
- Lịch sử đố vui theo Player ID của host, dùng chung giữa các bộ lọc. Hết câu mới trong tập phù hợp mới mở lại tập đó, ván cuối vòng có thể dưới 20 câu. Định danh bằng hash prompt chuẩn hóa. Ghi batch các câu đã tới lượt khi hoàn thành hoặc hủy, cùng transaction trạng thái session. Crash trước batch có thể hỏi lại câu đã thấy. [Chi tiết](../features/question-packs.md).
- Chốt đề trong backend trước khi công bố phòng. Room giữ đề, Sessions lưu questionSnapshot và selectionSnapshot khi Start, engine nhận danh sách câu. Pack JSON tiếp tục là nguồn, metadata nguồn nhiều pack nằm trong selectionSnapshot. [Dữ liệu](data-model.md).

- Ảnh câu hỏi (2026-11-11). QuestionPack v1 nhận tối đa bốn tham chiếu ảnh mỗi câu, dùng file local hoặc CDN HTTPS theo allowlist khi nhập. Pack và snapshot giữ `src` và `alt` trong JSON hiện có. Khóa lịch sử của câu có ảnh kết hợp đề bài và tập đường dẫn. Kế hoạch mở rộng dùng object storage, nén trước khi phát hành và cache URL theo nội dung. [Nguồn ảnh và lưu trữ](../features/question-packs.md#câu-hỏi-có-ảnh)

## OPEN cần quyết định trước module liên quan

- Khôi phục guest đã mất cookie, gộp hai Player hiện có và quyền sở hữu tiến trình người chơi 2 chung màn hình.
- Mục tiêu riêng và tiến trình qua nhiều ải Co-op.
- Guest nickname moderation/anti-abuse khi mở Internet.
- Game 2–3, rank, deployment Internet, durable room recovery.

Các lựa chọn PROPOSAL được ghi nhận để tránh agent tự xem là quyết định sản phẩm bất biến. Nếu đổi, cập nhật file này, contracts, tests và domain docs cùng task.
