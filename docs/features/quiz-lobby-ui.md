# Giao diện Sảnh chờ Quiz Battle (Variant 2B — Vibrant Rainbow Toybox)

> **Mục đích:** Mô tả kiến trúc module, hợp đồng giao diện và hướng dẫn bảo trì/nâng cấp cho màn hình Sảnh chờ Quiz Battle (`/play`) để lập trình viên và AI agent có thể chỉnh sửa hoặc thay thế từng phần an toàn.
> **Đối tượng:** Chủ dự án, lập trình viên frontend và AI coding agent.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-26.
> **Liên quan:** [Mục lục](../README.md), [Luật Quiz](quiz.md), [Quyết định kiến trúc](../architecture/decisions.md#ui-lab), [Quy định tài liệu](../documentation-guide.md).

## Phạm vi và ngữ cảnh

- **Phạm vi hiện thực:** Đã triển khai trong **`apps/ui-lab`** (cổng `3100`) để duyệt thiết kế và kiểm thử độc lập theo ranh giới UI Lab. Chưa chuyển sang `apps/web`.
- **Phong cách chốt:** **Variant 2B — Vibrant Rainbow Toybox** (bầu trời xanh ban ngày có mặt trời tỏa tia xoay dịu, cầu vồng pastel, mây trôi nhiều lớp, 3 thẻ Mode 3D nổi khối, bảng Match Setup 3 vùng với các ô chọn màu sắc sinh động, nút CTA vàng mật ong và thẻ vé mời 6 ô mã phòng).
- **Ngôn ngữ:** Toàn bộ nhãn giao diện dùng `useI18n()` (`vi` / `en`). Nội dung bộ câu hỏi (`title`, `category`, `topic`, `prompt`, `options`, `explanation`) giữ nguyên theo dữ liệu nguồn.

## Kiến trúc module

Toàn bộ giao diện Sảnh chờ được tách gọn thành 1 orchestrator và 1 thư mục con `lobby/` tại `apps/ui-lab/src/features/quiz/`:

| File | Vai trò | Khi nào cần sửa |
| --- | --- | --- |
| `quiz-setup.tsx` | **Thin Orchestrator** — tính toán `categories`, `topics`, `choices`, `casualCount`, giữ state `motionEnabled` và lắp ráp các khối con. | Khi thêm filter/field mới vào luồng tạo phòng hoặc thay đổi cấu trúc tổng thể trang `/play`. |
| `lobby/quiz-lobby-sky.tsx` & `lobby/quiz-lobby-sky.module.css` | **Lớp nền bầu trời động** — gradient trời xanh, mặt trời xoay tia (`sunSpin`, `sunBreathe`), cầu vồng pastel (`rainbowPulse`, `rainbowGlow`), mây trôi nhiều lớp và hạt nắng lấp lánh. | Khi muốn đổi chủ đề bầu trời (hoàng hôn, ban đêm, theo mùa) hoặc thay bằng Canvas/3D mà **không chạm** logic form. |
| `lobby/quiz-lobby-hero.tsx` | **Hero mây** — lời chào người chơi, nút bật/tắt `Bầu trời động`, mascot 3D (`/images/hub/hero-mascots.jpg`). | Khi đổi copy chào mừng, đổi ảnh mascot hoặc thêm thông báo sự kiện. |
| `lobby/quiz-mode-cards.tsx` | **3 thẻ chế độ chơi 3D** — `01 Solo` (xanh trời), `02 Duel` (tím mộng + sao vàng), `∞ Co-op` (xanh ngọc mint). | Khi chỉnh giao diện thẻ mode hoặc hiển thị thêm metadata của từng mode. |
| `lobby/quiz-match-setup-card.tsx` | **Bảng thiết lập 3 vùng:**<br>1. Dual 3D Color Tiles (*Trải nghiệm* & *Không gian chơi*)<br>2. Khay lọc xanh pastel (*Đố vui Ngẫu nhiên/Tự chọn* hoặc *Học luyện 4 bộ lọc + Bộ câu hỏi + Tên người chơi 2*)<br>3. Footer trạng thái server + nút CTA 3D vàng mật ong. | Khi nâng cấp UX chọn trải nghiệm, thêm bộ lọc mới, hoặc tinh chỉnh bảng màu của từng vùng. |
| `lobby/quiz-invite-ticket.tsx` | **Thẻ vé mời 6 ô mã (`A B C 2 3 4`)** — 6 ô hiển thị 3D đồng bộ với 1 `<input id="room-code">` phủ trong suốt (hỗ trợ gõ, dán `Ctrl+V`, `Backspace` mượt). | Khi đổi style vé mời, đổi độ dài mã phòng hoặc bổ sung nút dán nhanh mã mời. |
| `lobby/quiz-lobby-setup.module.css` | **Stylesheet tập trung** cho layout 2 cột (`workspaceGrid`), các thẻ kính mờ, nút khối 3D và responsive breakpoints (`1080px`, `820px`, `560px`). | Khi tinh chỉnh spacing, màu sắc, đổ bóng hoặc breakpoint mobile/tablet. |

## Hợp đồng bất biến (Không được phá khi chỉnh sửa)

1. **Tương thích E2E & Accessibility (`sr-only` synced selects):**
   - Trong `quiz-match-setup-card.tsx`, các nhóm chọn bằng nút 3D (*Trải nghiệm*, *Không gian chơi*, *Cách chọn đề*) **phải giữ nguyên** `<select className="sr-only">` có đúng `id` (`quiz-experience`, `layout`, `casual-method`) và `<label htmlFor="...">` đồng bộ 2 chiều với các nút 3D.
   - Các input/select chính phải giữ nguyên `id` và label chuẩn: `pack-knowledge-type`, `pack-category`, `pack-topic`, `pack-difficulty`, `pack`, `second`, `room-code`.
   - Lý do: Toàn bộ Playwright E2E (`apps/ui-lab/e2e/ui-lab.spec.ts`) và trình đọc màn hình tương tác ổn định qua các label/control chuẩn này.
2. **Hiệu năng & giảm chuyển động (`prefers-reduced-motion`):**
   - Mọi animation trong `quiz-lobby-sky.module.css` phải dùng thuộc tính GPU-friendly (`transform`, `opacity`) và tự dừng khi người dùng bật `prefers-reduced-motion: reduce` hoặc nhấn nút **Bầu trời động: Tắt**.
3. **Đa ngôn ngữ (`i18n`):**
   - Không viết cứng chuỗi hiển thị mới trong JSX; mọi nhãn mới phải thêm đồng bộ vào cả `apps/ui-lab/src/i18n/locales/vi/quiz.ts` và `apps/ui-lab/src/i18n/locales/en/quiz.ts` (được kiểm tra tự động bởi `i18n.test.ts`).
4. **Ranh giới UI Lab & Server Authoritative:**
   - Không ghi `localStorage`/`sessionStorage` trong `apps/ui-lab` (UI Lab chạy in-memory để giữ E2E sandbox sạch).
   - Giao diện chỉ gửi cấu hình tạo phòng/vào phòng; không tự tính điểm, lọc đáp án hay thay state trực tiếp ở client.

## Hướng dẫn nhanh cho Agent khi nâng cấp hoặc thay thế

- **Thay thế hoàn toàn Background:** Chỉ cần sửa hoặc thay `lobby/quiz-lobby-sky.tsx` + `lobby/quiz-lobby-sky.module.css` giữ nguyên prop `{ motionEnabled: boolean }`.
- **Thay đổi phối màu các ô Trải nghiệm / Không gian chơi:** Sửa 4 class màu ngữ nghĩa trong `quiz-lobby-setup.module.css`: `.tileApricot` (Đố vui), `.tileEmerald` (Học luyện), `.tileAzure` (LAN), `.tileBerry` (Chung màn hình).
- **Chuyển sang `apps/web` sau khi chủ dự án duyệt:**
  1. Copy thư mục `lobby/` và `quiz-setup.tsx` sang `apps/web/src/features/quiz/` (cập nhật import `matchesLabCasual` sang helper tương ứng của web chính nếu khác, và nối với `i18n` của `apps/web`).
  2. Kiểm tra lại `z-index` của `SiteHeader` và `LeaveMatchDialog` khi đặt trên `QuizLobbySky` (`z-index: 0`).
  3. Chạy đầy đủ `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` và nghiệm thu 2 thiết bị LAN thực.

## Kiểm chứng và giới hạn

- **Ngày cập nhật:** 2026-11-26.
- **Trạng thái kiểm chứng:** Đã kiểm chứng `typecheck`, `eslint`, unit test i18n và production build `apps/ui-lab` trong phiên triển khai; chưa chuyển sang `apps/web` và chưa chạy Playwright E2E `pnpm test:ui-lab` trong phiên này.
