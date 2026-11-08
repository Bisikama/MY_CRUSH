# Kết quả kiểm chứng source foundation

> **Mục đích:** Bằng chứng kiểm chứng theo từng mốc, không chứng nhận source mới nhất.
> **Đối tượng:** Chủ dự án, lập trình viên và QA.
> **Trạng thái:** `historical`.
> **Cập nhật:** 2026-11-08 (bổ sung kiểm chứng lifecycle; giữ nguyên các mốc lịch sử).
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../project/roadmap-quality.md).

## Sửa lifecycle Game Hub ngày 2026-11-08

Đã tái hiện hai lỗi trên web production bằng Chrome và HTTP/Socket.IO fixture: response `/rooms/current` ghi nhận chưa có phòng nhưng đến sau create/start làm mất snapshot và bỏ qua xác nhận rời trận; phiên bị server thu hồi làm tab mắc kẹt ở danh tính cũ, phải reload mới tiếp tục được.

Phần sửa giữ nguyên backend/contracts/schema, quyền guest và chính sách thưởng:

- Room reads chỉ được áp dụng khi sequence danh tính, generation phòng và ID lượt đọc còn hiện hành; các lệnh phòng đang chờ ACK chặn read commit. Snapshot realtime hoặc thao tác phòng mới vô hiệu hóa response cũ. Timeout lệnh dẫn tới đọc lại phòng từ server, không kết luận lệnh thất bại chỉ vì mất ACK.
- Room store áp dụng summary và snapshot nhất quán, giữ kiểm tra version trong cùng session. Callback cũ không cập nhật store hoặc điều hướng sau đổi socket/danh tính.
- HTTP 401, socket `UNAUTHORIZED` và `io server disconnect` xác minh lại phiên qua một request đang chạy dùng chung. Anonymous dọn state, giữ URL/link mời; 403, lỗi mạng và 5xx không tự xóa danh tính. Focus kiểm tra phiên trước khi tải lại dữ liệu. Mỗi socket chỉ có một lượt reconnect chủ động sau handshake lỗi, có nút thử lại; một lần thu hồi phiên mới không bị chặn bởi cooldown thời gian.
- Provider dùng lượt `/auth/me` mới khi xác minh, tránh tái sử dụng request được gửi với cookie trước đó; request cũ kết thúc không được xóa cache của request mới. Header có lỗi và nút thử lại phiên khi vẫn giữ danh tính.

### Cách chạy kiểm chứng cô lập

```powershell
pnpm --filter @duoquest/web build
pnpm exec playwright test --config e2e/platform-lifecycle.config.ts
```

[Config lifecycle](../../e2e/platform-lifecycle.config.ts) chạy web production ở loopback cổng riêng `3177`, không reuse hoặc dừng dev server ở `3000`/`4000`. [Fixture HTTP/Socket.IO](../../apps/api/test/platform-browser-fixture.ts) mở cổng ngẫu nhiên trên loopback, Playwright proxy request browser tới fixture, đóng kết nối/server sau test. Fixture không import Prisma, không ghi database, không gửi mail. Nếu cổng `3177` bị chiếm, bộ test dừng thay vì can thiệp tiến trình khác.

[Browser suite](../../e2e/platform-lifecycle.spec.ts) dùng provider thật và kiểm tra: response null trễ; Cancel/Confirm rời trận và chờ ACK; create đã xảy ra nhưng mất ACK; thu hồi phiên và tạo guest mới tại link mời; gộp 401/disconnect; reconnect phiên hợp lệ; thu hồi phiên liên tiếp; chặn handshake retry lặp; 5xx; 403; HTTP 401 không có disconnect; connect_error unauthorized; lookup danh tính cũ đến sau broadcast; lỗi mạng và thử lại; logout/unmount không reconnect ngoài ý muốn.

### Kết quả và giới hạn

- `pnpm test`: **91 tests pass**, 11 files pass, 8 DB tests skip có chủ đích. Con số bao gồm các test hiện có trong workspace tại thời điểm chạy, không chỉ test bổ sung của task này.
- Lint và typecheck đã pass; build API/web đã pass ngoài sandbox. Các lần chạy trong sandbox gặp `EACCES` cho loopback hoặc `EPERM` tạo thư mục `.next`; chạy lại ngoài sandbox đã loại trừ lỗi môi trường này.
- `pnpm exec playwright test --config e2e/platform-lifecycle.config.ts`: **14/14 tests pass** trên Chrome headless, tổng thời gian suite 32.1s. Hai kịch bản lỗi ban đầu và các trường hợp thu hồi phiên liên tiếp, handshake bị từ chối, request danh tính đến chậm đều pass. Web production được build lại từ source cuối trước lần chạy này.
- Prettier check các file thuộc task và kiểm tra liên kết nội bộ trong tài liệu này đều pass. Các lần đầu viết browser suite có selector không duy nhất và thời điểm đo kết nối chưa ổn định; đã sửa fixture/test và chạy lại toàn bộ suite thành công.
- Chưa chạy lại PostgreSQL integration, toàn bộ Quiz/Auth E2E với DB/SMTP fixture, hoặc LAN hai thiết bị thật. Suite lifecycle không thay thế các bước đó, không chứng minh việc cộng thưởng hay gửi OTP trên dịch vụ thật.

## Bổ sung Auth ngày 06/11/2026

Áp dụng hai migration và seed thành công trên PostgreSQL test riêng. Vitest 58/58 pass khi bật DB suite. Chrome pass 4 bài Quiz và 1 bài Auth kiểm tra guest upgrade, xác minh OTP sau reload, đặt lại mật khẩu và đăng nhập. Lint, typecheck, Prisma validate và build API/web pass. Kiểm tra format pass với `--end-of-line auto` trên Windows. SMTP dùng adapter giả trong kiểm thử. Còn nghiệm thu email SMTP thật và LAN hai máy vật lý.

Ngày thực hiện: 03/11/2026. Đây là kết quả chạy thực tế trong phiên dựng codebase, không thay thế nghiệm thu V1 trên thiết bị đích.

| Kiểm tra                                  | Kết quả                                                        |
| ----------------------------------------- | -------------------------------------------------------------- |
| `pnpm install`                            | Thành công, có pnpm-lock.yaml và build allowlist               |
| `pnpm db:generate`                        | Prisma Client 6.19 sinh thành công                             |
| `pnpm db:validate`                        | Schema hợp lệ                                                  |
| `pnpm db:deploy` trên database test trống | Migration foundation áp dụng thành công, gồm CHECK constraints |
| `pnpm db:seed` trên database test         | Thành công, có starter pack và cosmetic                        |
| `pnpm lint`                               | Pass                                                           |
| `pnpm typecheck`                          | Pass toàn workspace, tooling và e2e source                     |
| `pnpm test` với `RUN_DB_TESTS=1`          | 52 tests pass, 6 test files                                    |
| `pnpm build`                              | Nest API bundle và Next production build thành công            |
| `pnpm test:e2e`                           | 4 browser tests pass trên Chrome thật                          |
| `pnpm format:check`                       | Pass sau chuẩn hóa định dạng cuối                              |

Tests thông thường không bật DB suite: 46 tests chạy, 6 DB tests skip có chủ đích. Muốn kiểm chứng transaction thật phải bật suite theo hướng dẫn trong docs/project/roadmap-quality.md, không lấy MemoryStore làm bằng chứng database.

Môi trường local: Windows, Node 22.19.0, pnpm 11.25.0, PostgreSQL 18.1 có sẵn trên máy, Chrome 156.0.8078.80. Cluster PostgreSQL kiểm thử được tạo riêng trong `.local/pg-verify`, bind 127.0.0.1:55432, database `duoquest_test`. Không dùng hoặc sửa database có sẵn của người dùng. Cluster này được tắt khi kết thúc kiểm chứng; cấu hình `.env` thông thường vẫn dành cho PostgreSQL/Docker phát triển.

Docker Desktop chưa chạy trong phiên này nên không xác nhận trực tiếp `docker compose up`. Compose/CI cấu hình PostgreSQL 17; kiểm thử database tại máy chạy trên PostgreSQL 18.1. Workflow GitHub Actions được cung cấp dưới dạng source, chưa chạy trên GitHub.

Các hành vi đã kiểm tra:

- 3 mode/2 layout ở engine; server deadline, scoring, duplicate answers và view filtering.
- Slot authorization; action retry, payload mismatch, stale round/session; create/join đồng thời; buzzer đồng thời; result commit retry; rematch và reconnect.
- Socket server thật + hai clients: auth, Ready/Start/Sync, che đáp án, refresh/reconnect và kết quả.
- PostgreSQL: hai purchase vượt tổng số dư chỉ một thành công; concurrent purchase retry; equip ownership/slot; negative balance CHECK; result/reward một lần; pack version không ghi đè.
- Chrome: Solo tới kết quả và history qua refresh; quay về/rời room từ Home; hai browser context vào cùng phòng; shared-screen A/L và cướp điểm; viewport 390×844 không tràn ngang. Đã xem ảnh mobile render.

Chưa kiểm chứng hai máy vật lý/Wi-Fi thật, firewall, keyboard ghosting vật lý, Co-op browser regression, gift/power-up, soak/load test hoặc Internet deployment. Room đang chơi không resume qua restart API; policy hiện tại hủy không thưởng và giữ lịch sử đã commit.
