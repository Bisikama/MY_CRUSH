# Lộ trình và kiểm chứng

> **Mục đích:** Lộ trình và cách chạy các nhóm kiểm thử.
> **Đối tượng:** Chủ dự án, lập trình viên và QA.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-07 (sắp xếp tài liệu; các mốc kiểm chứng trong nội dung giữ nguyên).
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../../package.json).

| Mốc | Trạng thái source foundation                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------- |
| M0  | Monorepo, web/API, health, Prisma/migration/seed có source; LAN thiết bị thật cần nghiệm thu                |
| M1  | Guest, room/slot, ready/start/sync, transport integration có kiểm thử                                       |
| M2  | Quiz Solo, pack preview/import, persistence và history có source                                            |
| M3  | Duel/Co-op 2 layout, buzzer, captain, rematch/reconnect có engine/platform tests; cần playtest UX/mạng thật |
| M4  | Reward policy, ledger, cosmetic purchase/equip API và web tối thiểu; gift/power-up còn backlog              |
| M5  | Responsive, reduced motion, notices đã có; audio, browser regression và backup/recovery còn việc            |

Các trạng thái này mô tả code có thật, không chứng nhận toàn bộ milestone đã nghiệm thu vận hành.

`pnpm test`: engine/validation/queue, room orchestration và Socket.IO server thật với hai client. MemoryStore chỉ trong thư mục test, không được import vào runtime. Integration transport không chứng minh PostgreSQL transaction.

DB integration dùng DB test riêng (tên database phải kết thúc `_test`). Tạo DB dùng một lần, áp migration bằng DATABASE_URL trỏ DB đó, rồi chạy:

```powershell
$env:DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:5432/duoquest_test?schema=public'
pnpm db:deploy
$env:RUN_DB_TESTS = '1'
pnpm test
Remove-Item Env:RUN_DB_TESTS
Remove-Item Env:DATABASE_URL
```

Tests tạo fixtures với UUID riêng, chỉ dọn fixtures do chính test tạo; không truncate/drop database. Không chạy suite này trên DB có dữ liệu cần giữ.

Checklist manual: hai máy LAN; hai tab dùng identity khác nhau (incognito/browser khác); cả 3 mode/2 layout; A/L đồng thời/giữ phím/ghosting; tắt Wi-Fi rồi reconnect; offline quá grace; đóng tab; restart API; import lỗi; mua đồng thời. Giữ ghi nhận trình duyệt, thiết bị, log và hành vi quan sát.

Task tiếp theo ưu tiên: mở rộng browser regression cho Co-op/import → giao diện review câu sai → reactions/gifts → power-up transaction/state effect → profile recovery. Không tự thêm game mới.

Browser e2e hiện có trong `e2e/quiz.spec.ts`: Solo qua refresh/history/quay lại phòng, hai context Duel, shared-screen keyboard/steal và viewport mobile. Chạy `pnpm db:deploy`, `pnpm db:seed`, `pnpm build`, sau đó `pnpm test:e2e` với DATABASE_URL trỏ DB phát triển/test sẵn sàng. Mặc định dùng Chrome đã cài. CI đặt `PLAYWRIGHT_CHANNEL=chromium` và chạy `pnpm exec playwright install --with-deps chromium` trước; không cần Chrome desktop trên CI. Tests tạo guest/room/answer thật trong DB đích, nên dùng DB test. Playwright tự khởi động rồi tắt API/web, yêu cầu cổng 3000/4000 còn trống.

Workflow `.github/workflows/ci.yml` khai báo lint/typecheck/unit/transport/DB/build/browser checks với PostgreSQL service. Workflow chưa được chạy trên GitHub trong phiên dựng source; local checks được ghi riêng trong `docs/quality/verification.md`.
