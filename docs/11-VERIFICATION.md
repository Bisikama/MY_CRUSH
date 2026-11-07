# Kết quả kiểm chứng source foundation

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

Tests thông thường không bật DB suite: 46 tests chạy, 6 DB tests skip có chủ đích. Muốn kiểm chứng transaction thật phải bật suite theo hướng dẫn trong docs/08, không lấy MemoryStore làm bằng chứng database.

Môi trường local: Windows, Node 22.19.0, pnpm 11.25.0, PostgreSQL 18.1 có sẵn trên máy, Chrome 156.0.8078.80. Cluster PostgreSQL kiểm thử được tạo riêng trong `.local/pg-verify`, bind 127.0.0.1:55432, database `duoquest_test`. Không dùng hoặc sửa database có sẵn của người dùng. Cluster này được tắt khi kết thúc kiểm chứng; cấu hình `.env` thông thường vẫn dành cho PostgreSQL/Docker phát triển.

Docker Desktop chưa chạy trong phiên này nên không xác nhận trực tiếp `docker compose up`. Compose/CI cấu hình PostgreSQL 17; kiểm thử database tại máy chạy trên PostgreSQL 18.1. Workflow GitHub Actions được cung cấp dưới dạng source, chưa chạy trên GitHub.

Các hành vi đã kiểm tra:

- 3 mode/2 layout ở engine; server deadline, scoring, duplicate answers và view filtering.
- Slot authorization; action retry, payload mismatch, stale round/session; create/join đồng thời; buzzer đồng thời; result commit retry; rematch và reconnect.
- Socket server thật + hai clients: auth, Ready/Start/Sync, che đáp án, refresh/reconnect và kết quả.
- PostgreSQL: hai purchase vượt tổng số dư chỉ một thành công; concurrent purchase retry; equip ownership/slot; negative balance CHECK; result/reward một lần; pack version không ghi đè.
- Chrome: Solo tới kết quả và history qua refresh; quay về/rời room từ Home; hai browser context vào cùng phòng; shared-screen A/L và cướp điểm; viewport 390×844 không tràn ngang. Đã xem ảnh mobile render.

Chưa kiểm chứng hai máy vật lý/Wi-Fi thật, firewall, keyboard ghosting vật lý, Co-op browser regression, gift/power-up, soak/load test hoặc Internet deployment. Room đang chơi không resume qua restart API; policy hiện tại hủy không thưởng và giữ lịch sử đã commit.
