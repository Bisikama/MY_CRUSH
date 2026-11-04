# AGENTS.md — Hướng dẫn bắt buộc cho AI coding agent

## 0. Hiểu sản phẩm trước khi viết code

DuoQuest là một **web game hub học và chơi có điểm thưởng/vật phẩm/tương tác**. V1 ưu tiên **Quiz Battle chất lượng cao** với Solo, Duel, Co-op; hỗ trợ 2 người chung màn hình và 2 client LAN; tương lai tối đa 2 game nữa. **Không tự tạo thêm game** hoặc tính năng community ngoài scope.

## 1. Kiến trúc không được tự ý thay đổi

- Repository: **Monorepo** (gợi ý pnpm workspaces).
- Backend: **NestJS Modular Monolith**, domain-based modules, một backend instance V1.
- Frontend: Next.js + React + TypeScript, Tailwind + shadcn/ui, Zustand cho local UI state.
- DB: PostgreSQL + Prisma; schema có thể tách nhiều file, nhưng **một database logic**.
- Realtime: **Socket.IO**; server là nguồn sự thật cho room, actions, score, result, wallet và item effects.
- Game domain được đóng gói dạng **internal workspace packages**; không tự tách Microservices, không tạo DB riêng/game, không đưa Redis/BullMQ vào khi chưa có nhu cầu.
- Cùng một session core phục vụ `SHARED_SCREEN` và `MULTI_DEVICE`; **không làm hai engine khác nhau**.

## 2. Trình tự bắt buộc trước khi implement

1. Đọc `README.md`, `docs/09-DECISIONS.md`, tài liệu domain liên quan.
2. Khảo sát source hiện có; **không giả định các file trong tài liệu đã tồn tại**.
3. Tóm tắt phạm vi thay đổi, dependencies, schema/contract tác động và rủi ro.
4. Chia thành bước nhỏ, test được; implement theo chiều dọc end-to-end.
5. Thêm hoặc cập nhật unit/integration/e2e tests phù hợp.
6. Chạy lint, typecheck, test, build nếu môi trường có; báo trung thực lỗi/chưa chạy.
7. Cập nhật docs khi API/schema/game rules đã thay đổi; ghi lựa chọn mới vào `docs/09-DECISIONS.md`.

## 3. Ranh giới trách nhiệm

- `packages/game-quiz`: luật Quiz, action validation, scoring theo mode, state, result; **không** trực tiếp ghi Wallet, gửi socket, truy cập Prisma.
- `packages/game-core`: contract game và bộ xử lý chung thực sự được nhiều game dùng.
- `apps/api/modules/rooms`: tạo/đóng phòng, join/ready/leave, xác thực vai trò, trạng thái phòng.
- `apps/api/modules/sessions`: lifecycle trận, state version, deadlines, snapshot/recovery, áp dụng game engine.
- `apps/api/modules/realtime`: adapter transport Socket.IO; **không chứa luật Quiz**.
- `apps/api/modules/rewards`: cấp thưởng có idempotency; `shop`/`inventory`: giao dịch mua và trang bị.
- `apps/web`: UI/animation/keyboard controls; **không tính và phát thưởng đáng tin ở client**.

## 4. Invariants: điều không được phá

- Client không tự khai báo score, đáp án chính xác, Coins balance, winner hoặc thay state trực tiếp.
- Mỗi action có định danh/idempotency; một người không thể nộp nhiều đáp án cùng round.
- `getPlayerView` không để lộ đáp án đúng hoặc đáp án riêng của đối thủ khi round chưa kết thúc.
- `SHARED_SCREEN`: một browser điều khiển 2 player slot đã được server cấp quyền; có ánh xạ input rõ.
- `MULTI_DEVICE`: mỗi client chỉ được gửi action với player slot được xác thực.
- Hoàn thành một trận chỉ cộng thưởng **một lần**; mua item là transaction nguyên tử.
- Điểm trong trận (`Game Score`) khác Coins, XP và Rank Points (Rank chưa dùng V1).
- Cosmetic/gift không tác động điểm, timer, quyền điều khiển; hint/power-up có kiểm tra mode/game.
- LAN không có nghĩa là mạng công cộng; V1 chỉ mở cổng cho mạng tin cậy, không expose PostgreSQL ra Internet.

## 5. Cách phân loại quyết định

- **LOCKED:** kiến trúc trên, 3 mode, 2 layout, JSON pack, shared shop; agent không tự đảo ngược.
- **PROPOSAL:** điểm thưởng, timer, bảng giá, hình thức đặt tên/UI; giữ dưới dạng config và chú thích.
- **OPEN:** guest/profile authentication chi tiết, chọn game 2–3, hệ thống rank và Internet deployment; không tự đóng dấu là đã chốt.

## 6. Mẫu trả lời khi nhận task code

- **Mục tiêu:** thay đổi gì, user story nào.
- **Phạm vi:** module/file bị tác động; không làm gì.
- **Thiết kế:** contracts, state transitions, bảo mật.
- **Triển khai:** các bước cụ thể.
- **Kiểm thử:** unit/integration/e2e + manual LAN 2 client.
- **Kết quả:** thay đổi đã làm, lệnh đã chạy, test pass/fail, phần còn mở.

Không tạo API, Prisma model, env variable, thư mục hay dependency rồi **khẳng định đã tồn tại** nếu chưa kiểm tra repo. Không thêm thư viện chỉ để giải quyết việc có thể xử lý đơn giản trong stack đã chốt.
