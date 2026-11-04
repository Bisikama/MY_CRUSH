# DuoQuest — Tổng hợp hiện trạng dự án

Ngày đối chiếu: **04/11/2026**. Đây là ảnh chụp hiện trạng source, cấu hình và kiểm chứng trong phiên làm việc; cần cập nhật khi dự án thay đổi.

Tài liệu dành cho chủ dự án: nắm game đã có gì, người chơi đang trải nghiệm gì, công nghệ đã setup đến đâu và phần nào vẫn cần quyết định. Không phải cam kết mọi tính năng đã được nghiệm thu, cũng không phê duyệt thêm tính năng mới.

## 1. Kết luận hiện tại

**DuoQuest đã có sườn web game Quiz hoạt động xuyên suốt từ tạo người chơi, vào phòng, chơi, xem kết quả đến lưu lịch sử và thưởng. Nền tảng phát triển local/LAN đã được thiết lập. Trải nghiệm hình ảnh, âm thanh, nhịp chơi và chiều sâu của từng mode vẫn cần hoàn thiện.**

| Câu hỏi                                    | Trả lời hiện tại                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Đã có game chơi được chưa?                 | Có Quiz Battle với Solo, Duel, Co-op và luồng phòng/session dùng chung.                                       |
| Đã có giao diện chưa?                      | Có trang chơi, màn phòng/trận/kết quả, bộ đề, hồ sơ và shop.                                                  |
| Đã có backend và database thật chưa?       | Có NestJS + PostgreSQL + Prisma; runtime không dùng database giả.                                             |
| Đã có multiplayer chưa?                    | Có hai người chung màn hình hoặc hai client; LAN hai máy vật lý chưa được nghiệm thu đầy đủ.                  |
| Đã setup đủ để phát triển tiếp chưa?       | Có nền tảng, scripts, contracts, migration, seed, test và Swagger. Có lưu ý lệch cổng ở file mẫu, xem mục 11. |
| Đã sẵn sàng phát hành công khai chưa?      | Chưa; Internet deployment, tài khoản/recovery và chống abuse chưa được chốt/hoàn thiện.                       |
| Đã có nhiều game trong hub chưa?           | Chưa. Hiện chỉ Quiz; game 2–3 chưa chọn.                                                                      |
| Chất lượng trải nghiệm đã hoàn thiện chưa? | Chưa. Có sườn hoạt động, nhưng chưa đủ cơ sở kết luận hấp dẫn/cân bằng nếu thiếu playtest.                    |

### Cách hiểu trạng thái

- **Có source:** có triển khai trong repo, chưa mặc định đồng nghĩa đã nghiệm thu mọi tình huống.
- **Đã kiểm chứng:** có kết quả chạy kiểm tra; phải xem phạm vi và thời điểm.
- **Cơ bản:** đã có luồng chính nhưng trải nghiệm hoặc độ bao phủ còn hạn chế.
- **Chưa có / OPEN:** chưa triển khai hoặc cần chủ dự án quyết định.
- **PROPOSAL:** giá trị đang dùng để chạy thử, có thể thay sau khi được duyệt.

## 2. Định hướng và phạm vi đang được giữ

DuoQuest là web game hub học và chơi có điểm, phần thưởng, vật phẩm và tương tác. V1 ưu tiên làm Quiz Battle chất lượng cao.

Các ràng buộc đã khóa:

- Ba mode: `SOLO`, `DUEL`, `COOP`.
- Hai cách bố trí chơi: `SHARED_SCREEN` và `MULTI_DEVICE`; cùng một session core/engine.
- Tối đa hai người trong luồng Quiz hiện tại; Solo có một người.
- Bộ câu hỏi theo JSON pack; shop dùng chung cho nền tảng.
- Một backend instance và một database logic; server quyết định luật, điểm và thưởng.
- Không tự thêm game, community, rank hay deployment Internet ngoài phạm vi đã duyệt.

## 3. Công nghệ và kiến trúc đã setup

Phiên bản dưới đây lấy từ manifest; dấu `^` là khoảng phiên bản, bản cài cụ thể được khóa trong `pnpm-lock.yaml`.

| Thành phần        | Công nghệ/cấu hình                                     | Đã setup gì                                                                                  |
| ----------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Runtime           | Node.js yêu cầu `>=22.12.0`                            | Dev/build TypeScript; môi trường kiểm tra hiện dùng Node `22.19.0`.                          |
| Quản lý repo      | pnpm `11.25.0`, workspaces                             | Monorepo `apps/*`, `packages/*`, lockfile, khai báo dependencies nội bộ `workspace:*`.       |
| Ngôn ngữ          | TypeScript `^5.9.3`                                    | Strict mode, cấu hình chung và typecheck theo package.                                       |
| Frontend          | Next.js `16.4.4`, React `^19.2.0`                      | App Router, dev server, production build/start, transpile workspace packages.                |
| Styling           | Tailwind CSS `^4.1.16`, CSS tokens                     | PostCSS, stylesheet chung, responsive và reduced motion.                                     |
| UI primitives     | Cấu hình shadcn, Radix Slot, CVA, clsx, tailwind-merge | `Button`, `Card`, helper `cn`; chưa phải thư viện UI đầy đủ.                                 |
| UI state          | Zustand `^5.0.8`                                       | Giữ public room/game view cho giao diện; không chứa engine đáng tin.                         |
| Backend           | NestJS `12.3.2`, Express `^5.1.0`                      | Modular monolith theo domain, DI rõ ràng, error filter, CORS, health.                        |
| Realtime          | Socket.IO server/client `^4.8.1`                       | Auth token, room events, ACK, filtered snapshot, reconnect và giới hạn thao tác.             |
| Database          | PostgreSQL `17-alpine` qua Docker Compose              | Một service, volume bền vững, healthcheck, chỉ publish cổng DB trên loopback.                |
| ORM               | Prisma / Prisma Client `6.19.0`                        | Schema, migration, generator, seed, transaction và truy vấn dữ liệu.                         |
| Validation        | Zod `^3.25.76`                                         | Request/schema validation và quy tắc kiểm tra bộ đề.                                         |
| API docs          | `@nestjs/swagger` `^12.1.0`, zod-to-json-schema        | Swagger UI, JSON, mô tả 12 REST endpoint và guest bearer auth.                               |
| Dev/backend build | tsx, tsup                                              | Theo dõi thay đổi khi dev; bundle API dạng CommonJS.                                         |
| Kiểm thử          | Vitest, Nest testing, Playwright                       | Unit, orchestration, Socket.IO integration, DB integration và browser e2e.                   |
| Chất lượng code   | ESLint, Prettier                                       | Lint, kiểm soát import boundary, format và scripts kiểm tra.                                 |
| CI                | GitHub Actions                                         | Workflow có PostgreSQL service và các bước kiểm tra; chưa xác nhận kết quả chạy trên GitHub. |

Không có Redis/BullMQ, microservices, database riêng cho từng game hoặc dịch vụ AI trong app. Các thành phần này không phải yêu cầu để chạy nền tảng hiện tại.

### Sơ đồ hoạt động

```text
Browser Next.js
  ├─ REST: guest, profile, packs, shop, history
  └─ Socket.IO: phòng, thao tác chơi, snapshot
                 ↓
NestJS một instance
  ├─ Rooms: thành viên, quyền slot, Ready/Start/Leave
  ├─ Sessions: vòng đời trận, deadline, version, action receipt
  ├─ game-quiz: luật thuần, không I/O
  └─ Persistence / Rewards / Shop / Inventory
                 ↓
        PostgreSQL qua Prisma
```

### Bản đồ source

| Đường dẫn                          | Trách nhiệm                                                            |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `apps/web`                         | Giao diện, thao tác, keyboard và kết nối backend.                      |
| `apps/api`                         | NestJS, API, Socket.IO, điều phối domain và persistence.               |
| `packages/shared-types`            | Public contracts, Zod schemas, kiểu dữ liệu REST/socket.               |
| `packages/game-sdk`                | Interface engine phía server.                                          |
| `packages/game-core`               | Domain errors, assertion và hàng xử lý tuần tự theo key.               |
| `packages/game-quiz`               | Luật Quiz, state, scoring, action validation, filtered view và result. |
| `packages/ui`                      | UI primitives dùng chung.                                              |
| `prisma`                           | Một schema, migration stream và seed.                                  |
| `infra`                            | Docker Compose cho PostgreSQL local.                                   |
| `examples`, `prompts`, `scripts`   | Pack mẫu, JSON Schema, prompt tham khảo và script xuất schema.         |
| `e2e`, `docs`, `.github/workflows` | Browser tests, tài liệu và CI.                                         |

## 4. Người chơi đang đi qua những màn hình nào?

| Màn hình      | Đường dẫn      | Trải nghiệm đang có                                                                                    |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| Trang chơi    | `/`            | Tạo guest, chọn mode/layout/bộ đề, đặt tên người thứ hai khi phù hợp, tạo hoặc join phòng.             |
| Phòng và trận | `/play/[code]` | Thông tin phòng, copy lời mời, Ready, Start, điểm, câu hỏi, đáp án, reveal, kết quả, Rematch và Leave. |
| Bộ đề         | `/packs`       | Dán JSON, kiểm tra, xem trước câu hỏi/đáp án/giải thích và xác nhận lưu.                               |
| Hồ sơ         | `/profile`     | Nickname, Coins, XP, lịch sử trận gần đây và xóa phiên khách trên trình duyệt.                         |
| Cửa hàng      | `/shop`        | Catalog cosmetic, giá, số Coins, mua, xem trạng thái sở hữu và trang bị.                               |

Luồng chính:

```text
Tạo guest → chọn pack/mode/layout → tạo hoặc join phòng
→ Ready → host Start → chơi câu hỏi → reveal/giải thích
→ câu tiếp theo hoặc kết thúc → lưu kết quả/thưởng hợp lệ
→ Rematch, xem lịch sử hoặc rời phòng
```

Solo vẫn dùng room/session core và cần backend/database. Không có cam kết chơi offline.

### Guest và quyền điều khiển

- Nickname từ 2–30 ký tự sau trim.
- Token ngẫu nhiên được browser lưu trong localStorage; server lưu hash token.
- Refresh trên cùng trình duyệt giữ được guest nếu storage còn nguyên.
- Hai tab dùng cùng token vẫn là cùng một người, không tự tạo hai identity.
- Chung màn hình: server cấp hai slot cho controller host; slot thứ hai là guest do server tạo.
- Hai thiết bị: mỗi client chỉ được điều khiển slot thuộc identity đã xác thực.
- Chưa có đăng nhập tài khoản, liên kết account, khôi phục guest, expiry/rotation token.
- Chưa bảo đảm giữ tiến trình slot người thứ hai qua các phòng mới hoặc cho người đó claim hồ sơ riêng.

## 5. Luật chơi đang có

### Chu kỳ chung

`QUESTION → REVEAL → QUESTION tiếp theo / FINISHED`.

- Server quản lý thời gian; client chỉ hiển thị đếm ngược.
- Một người chỉ được nộp một đáp án cho cùng câu; action có ID để chống xử lý lặp.
- Hết giờ không nhận answer mới; server đóng câu và xử lý kết quả.
- Trong khi câu đang mở, không gửi đáp án đúng, giải thích, hints hoặc câu tương lai cho client.
- Đáp án riêng của đối thủ được giấu trước reveal trong multi-device.

### Khác biệt theo mode

| Mode               | Luật hiện tại                                                                                           | Chiều sâu còn thiếu                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Solo               | Một người trả lời; đúng được điểm cơ bản và bonus tốc độ; reveal giải thích.                            | Chưa có lộ trình học, màn ôn sai hay phân tích tiến bộ chuyên sâu. |
| Duel multi-device  | Hai người cùng câu hỏi, trả lời riêng; reveal khi cả hai đã trả lời hoặc hết giờ.                       | Chưa có các cơ chế bổ sung đã được chốt để tăng chiến thuật.       |
| Duel shared-screen | A/L hoặc nút bấm giành quyền; người có quyền chọn đáp án; sai bị trừ điểm và người còn lại có thể cướp. | Phản hồi giành quyền, cướp điểm và hướng dẫn thao tác còn cơ bản.  |
| Co-op              | Luân phiên đội trưởng; chỉ đội trưởng chốt đáp án; chung điểm/mạng; sai hoặc hết giờ mất mạng.          | Ải mới là nhóm câu; chưa có mục tiêu riêng từng ải hoặc power-up.  |

Co-op hỗ trợ cả hai layout. Solo có một slot; không phải mọi tổ hợp mode/layout đều mang ý nghĩa hai người chơi.

### Thông số đang dùng — PROPOSAL

| Thông số                       | Giá trị hiện tại                                                  |
| ------------------------------ | ----------------------------------------------------------------- |
| Điểm trả lời đúng thông thường | `round(100 + 50 × thời gian còn lại / tổng thời gian)`            |
| Sai trong Duel chung màn hình  | Trừ 20 điểm.                                                      |
| Cướp đúng                      | 75 điểm.                                                          |
| Thời gian reveal               | 2.500 ms.                                                         |
| Co-op                          | 3 mạng, 4 câu/ải.                                                 |
| Số câu                         | Solo/Duel tối đa 10; Co-op tối đa 20; rút ngắn theo pack thực tế. |
| Timer câu hỏi                  | 5–120 giây theo pack; mặc định 20 giây nếu thiếu.                 |

**Điểm cần lưu ý:** session hiện lấy các câu đầu của pack bằng `slice`, chưa có bước xáo trộn/chọn ngẫu nhiên. Pack mẫu hiện có **4 câu**, nên trải nghiệm mẫu ngắn và dễ lặp; không tự lặp câu để đủ giới hạn trên.

Solo 0 điểm vẫn có thể là hoàn thành; Duel bằng điểm là `DRAW`; Co-op hết mạng kết thúc thất bại sau reveal. Các số điểm/timer/mạng chưa phải cân bằng sản phẩm đã được chốt.

## 6. Phòng, LAN và mất kết nối

- Phòng có mã sáu ký tự, host, player slots, trạng thái Ready và kết nối.
- Lifecycle phòng: `WAITING → READY → IN_PROGRESS → FINISHED`; có thể chuyển `CANCELLED`.
- Chỉ host được Start khi các slot đủ điều kiện Ready/connected.
- Một principal chỉ ở một room còn sống; muốn đổi cấu hình lobby hiện tạo phòng mới.
- Rematch cần các controller đồng ý, tạo session ID mới và giữ lịch sử cũ.
- Leave đóng phòng trong V1; chưa có chuyển quyền host.
- Client reconnect xin snapshot đã lọc; có thể quay lại/rời phòng đang mở từ Home.
- Grace hiện 30 giây sau khi socket cuối của controller ngắt; clock vẫn chạy, quá grace hủy và không thưởng.
- Idle TTL 15 phút, tối đa 128 room; đây là cấu hình hiện tại, chưa phải kết quả đo tải.
- Room và live game state ở RAM. Restart API hủy session dang dở, không resume trận; kết quả đã commit vẫn còn DB.

Web và API bind `0.0.0.0`; browser suy ra API hostname từ trang đang mở và mặc định cổng 4000. Không bắt máy khách gọi `localhost` của chính nó. Có fallback copy lời mời cho HTTP LAN.

LAN cần cấu hình origin IP thật trong `WEB_ORIGINS` và firewall Private network. Có source hỗ trợ LAN và transport tests, nhưng chưa đồng nghĩa đã nghiệm thu Wi-Fi/hai máy vật lý.

## 7. Điểm, phần thưởng và cửa hàng

Ba khái niệm tách biệt: **Game Score** trong trận, **Coins** để mua đồ, **XP** cho tiến trình. Rank Points/rank chưa dùng V1.

### Phần thưởng hiện tại — PROPOSAL

| Trường hợp đủ điều kiện          | Coins                                   | XP        |
| -------------------------------- | --------------------------------------- | --------- |
| Solo hoàn thành                  | 10                                      | 20        |
| Duel                             | 6 cơ bản; người thắng không hòa thêm 10 | 20        |
| Co-op hoàn thành                 | 12                                      | 20        |
| Co-op thất bại hoặc pack tự nhập | Không cấp                               | Không cấp |

- Chỉ trusted pack được thưởng; seed tạo pack mẫu trusted.
- Giới hạn hiện tại 10 session thưởng/player/ngày UTC; Coins và XP cùng giới hạn.
- Tạo guest không được cấp Coins miễn phí.
- Kết quả và phần thưởng được xử lý trong cùng transaction, chống cộng trùng.
- UI kết quả hiện chưa trình bày đầy đủ breakdown phần thưởng; profile đọc lại Coins/XP.

### Shop và inventory

- Có API và giao diện catalog, mua cosmetic, inventory và equip.
- Seed hiện có một cosmetic: **Khung bạc hà**, ID `frame-mint`, giá 250 Coins.
- Giá lấy từ server; client không được gửi balance/giá để quyết định giao dịch.
- Mua dùng UUID `requestId`; retry cùng giao dịch giữ cùng ID; trừ Coins và cấp đồ trong transaction.
- Equip kiểm tra sở hữu và slot, lưu vào Loadout.
- **Chưa render cosmetic/loadout trong trận.** Mua/trang bị đã có dữ liệu nhưng phần thể hiện chưa khép kín.
- Chưa có gift/reaction, vật phẩm tiêu hao hoặc power-up tác động gameplay.

## 8. Nội dung câu hỏi

Đã có schemaVersion 1, pack mẫu, JSON Schema và pipeline nhập nội dung:

`Dán JSON → parse/validation → preview → người dùng duyệt → xác nhận lưu version mới`.

- Pack 1–500 câu; hiện chỉ câu `single_choice`, đúng một lựa chọn trong A–D.
- Mỗi câu có topic, difficulty, prompt, bốn options, đáp án đúng, giải thích; hỗ trợ dữ liệu hints/tags/timer.
- Kiểm tra ID/prompt trùng, option ID/text trùng, cấu trúc thiếu/sai và field lạ.
- Server giới hạn JSON body 1 MB.
- Không tự xác minh kiến thức đúng/sai; người tạo vẫn phải duyệt nội dung.
- Pack mới cùng owner tạo version mới, không ghi đè câu hỏi của trận đang chạy.
- Pack tự nhập thuộc thư viện riêng của owner; người được mời vẫn chơi được session của host.
- Chưa có form soạn câu hỏi, AI generation trong app, chia sẻ thư viện công khai hay quy trình admin duyệt nội dung.
- Trường `hints` có trong pack không đồng nghĩa đã có nút dùng hint trong gameplay.

## 9. Hình ảnh, hoạt họa, âm thanh và UX

| Đã có trong giao diện                                               | Chưa có / cần hoàn thiện                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Typography, màu, CSS tokens, card/button và bố cục responsive.      | Bộ nhận diện/asset hình ảnh hoàn chỉnh và hướng mỹ thuật được chủ dự án duyệt.  |
| Avatar chữ cái, bảng điểm, timer, trạng thái đội trưởng và mạng/ải. | Nhân vật/mascot, skin trong trận và hoạt họa gắn với diễn biến trận.            |
| Highlight đáp án chọn/đúng, giải thích sau reveal.                  | Phản hồi đúng/sai/cướp điểm/đổi người dẫn đầu phong phú.                        |
| Thông báo lỗi, mất kết nối và trạng thái chờ.                       | Onboarding được playtest đầy đủ với người mới.                                  |
| CSS transitions cơ bản và hỗ trợ `prefers-reduced-motion`.          | Hệ thống animation theo sự kiện, nhạc/SFX và điều khiển âm thanh.               |
| Màn kết quả, nút Rematch, link lịch sử.                             | Tóm tắt diễn biến, phần thưởng trực quan, thành tích nổi bật và review câu sai. |

Nhận định về độ vui/độ hấp dẫn cần playtest; báo cáo này dựa vào source và phản hồi chủ dự án, không thay thế đánh giá cảm nhận trên thiết bị thực.

## 10. Backend, dữ liệu và an toàn đã có

### Các module

Players, Rooms, Sessions, Realtime, Question Packs, Persistence, Rewards, Shop, Inventory và Health đã có source theo trách nhiệm riêng. Realtime chuyển tiếp transport; luật Quiz nằm trong package game.

### Dữ liệu đã có schema/migration

| Nhóm                | Models                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Người chơi          | `Player` với nickname, token hash, XP.                                 |
| Nội dung            | `QuizQuestionPack` với owner, trusted, version và JSON content.        |
| Trận                | `GameSession`, `SessionPlayer`, snapshot câu hỏi.                      |
| Kết quả/câu trả lời | `MatchResult`, `QuizPlayerAnswer`.                                     |
| Kinh tế             | `Wallet`, `CoinTransaction`, `ItemDefinition`, `Inventory`, `Loadout`. |

Có một migration foundation, unique constraints cho idempotency/quan hệ và CHECK constraints cho balance/price/quantity không âm. Room/participant đang hoạt động quản lý trong RAM, không có bảng room bền vững.

### Các hàng rào đã triển khai

- Server quyết định score, winner, wallet, reward và quyền điều khiển; client gửi ý định thao tác.
- Không trả raw engine state hay snapshot đáp án bí mật cho browser.
- Game action dùng `sessionId`, `roundId`, `actionId`, kiểm tra player slot và deadline.
- Command/timer/disconnect được tuần tự hóa theo room để hạn chế race condition.
- Transaction kết quả/thưởng và purchase có idempotency; có retry transaction khi xung đột phù hợp.
- Không công bố FINISHED trước commit kết quả; DB lỗi lúc kết toán được xử lý thử lại.
- CORS dùng allowlist origin; REST dùng bearer token; socket xác thực token khi kết nối.
- Socket payload tối đa 16 KB, hiện giới hạn 25 thao tác/giây/socket.
- Error filter không trả stack/database details cho browser.

Chưa có hệ thống đầy đủ cho môi trường Internet: chống bot tạo guest, chống farm đa identity, token recovery/rotation, moderation, giám sát tập trung, backup/restore đã nghiệm thu hoặc chạy nhiều API instance. Không xem các hàng rào hiện tại là chứng nhận production security.

## 11. Setup hiện tại đã đủ chưa?

### Kiểm tra trực tiếp ngày 04/11/2026

| Kiểm tra                   | Kết quả ở thời điểm lập tài liệu                                          |
| -------------------------- | ------------------------------------------------------------------------- |
| Node / pnpm / Docker CLI   | Có: Node `22.19.0`, pnpm `11.25.0`, Docker `29.9.2`.                      |
| Dependencies / `.env`      | Có `node_modules` và file `.env`.                                         |
| PostgreSQL Docker          | `infra-postgres-1` đang Up, healthcheck `healthy`.                        |
| Database address hiện tại  | `127.0.0.1:55432`; không sao chép thông tin mật trong `.env` vào báo cáo. |
| Migration                  | `prisma migrate status`: có 1 migration; database schema up to date.      |
| Web                        | `GET http://127.0.0.1:3000` trả HTTP 200.                                 |
| API liveness               | `GET /api/health` trả HTTP 200.                                           |
| Database readiness qua API | `GET /api/health/ready` trả HTTP 200.                                     |
| OpenAPI JSON               | `GET /api/docs-json` trả HTTP 200.                                        |
| Build artifacts            | Có API `dist/main.js` và Web `.next/BUILD_ID`.                            |

Các kiểm tra này xác nhận dịch vụ đang hoạt động tại thời điểm kiểm tra; không bảo đảm container/server vẫn chạy sau khi tắt máy. Không thay đổi database hoặc khởi động lại dịch vụ để lập báo cáo.

**Kết luận setup:** đủ để tiếp tục phát triển và chơi thử local. Các phần cần nghiệm thu thêm là LAN hai máy, browser regression mở rộng và vận hành; chưa đủ điều kiện kết luận sẵn sàng phát hành Internet.

### Cổng và file cấu hình cần biết

| Thành phần                          | Cấu hình/địa chỉ                                   |
| ----------------------------------- | -------------------------------------------------- |
| Web                                 | `http://localhost:3000`                            |
| API                                 | `http://localhost:4000/api`                        |
| Swagger UI                          | `http://localhost:4000/api/docs`                   |
| OpenAPI JSON                        | `http://localhost:4000/api/docs-json`              |
| PostgreSQL trên Windows qua Compose | `127.0.0.1:55432`                                  |
| PostgreSQL bên trong container      | `5432`                                             |
| File API/Prisma/Compose dùng        | `.env` tại root.                                   |
| Override API cho web nếu cần        | `NEXT_PUBLIC_API_URL` trong `apps/web/.env.local`. |

**Điểm chưa đồng bộ trong tài liệu mẫu:** `.env.example` hiện để DB cổng `5432`, còn `infra/compose.yaml` publish `55432`. README phần LAN cũng còn nhắc cổng PostgreSQL `5432`. Với Docker Compose hiện tại, URL trên máy host phải dùng `55432`. File `.env` hiện tại đã dùng cổng này; báo cáo chỉ ghi nhận, chưa sửa các file cấu hình/tài liệu khác.

Khi dùng PostgreSQL có sẵn thay Docker, URL phải khớp server thực tế. Đổi `POSTGRES_PASSWORD` trong `.env` không tự đổi mật khẩu của database đã tồn tại trong volume.

### Lệnh và ý nghĩa

Chạy từ root repo bằng PowerShell:

| Lệnh                           | Tác dụng                                                                 |
| ------------------------------ | ------------------------------------------------------------------------ |
| `pnpm install`                 | Cài dependencies theo workspace/lockfile.                                |
| `pnpm db:up`                   | Khởi động PostgreSQL Docker ở chế độ nền; cần Docker Desktop chạy.       |
| `pnpm db:generate`             | Sinh Prisma Client; không tạo bảng hay chứng minh kết nối DB thành công. |
| `pnpm db:validate`             | Kiểm tra Prisma schema hợp lệ.                                           |
| `pnpm db:deploy`               | Áp dụng migration đã commit lên DB đích; có thay đổi cấu trúc dữ liệu.   |
| `pnpm db:migrate --name <ten>` | Tạo/áp migration khi phát triển schema; cần review SQL.                  |
| `pnpm db:seed`                 | Nạp pack mẫu và cosmetic; script không ghi đè các bản seed đã có.        |
| `pnpm dev`                     | Chạy web và API để phát triển.                                           |
| `pnpm db:down`                 | Dừng/gỡ container Compose; lệnh hiện tại giữ volume dữ liệu.             |
| `pnpm lint`, `pnpm typecheck`  | Kiểm tra lint và kiểu dữ liệu.                                           |
| `pnpm test`                    | Chạy Vitest; DB suite chỉ bật khi được cấu hình riêng.                   |
| `pnpm build`                   | Build API và web; không tự triển khai Internet.                          |
| `pnpm format:check`            | Kiểm tra định dạng code/tài liệu.                                        |
| `pnpm test:e2e`                | Chạy Playwright; cần DB đã migrate/seed, build, browser và cổng trống.   |

Lần đầu: kiểm tra `.env` đúng DB/cổng → install → db:up nếu dùng Docker → generate → deploy → seed → dev. Không chép đè `.env` đã cấu hình.

Những lần sau thường chỉ cần `pnpm db:up`, đợi DB healthy, rồi `pnpm dev`. Nhấn Ctrl+C dừng dev server; database Docker vẫn chạy độc lập.

## 12. REST, Swagger và Socket.IO

Đã có 12 REST endpoint:

| Method và path, sau prefix `/api` | Auth   | Chức năng                           |
| --------------------------------- | ------ | ----------------------------------- |
| `POST /players/guest`             | Public | Tạo guest, nhận token.              |
| `GET /players/me`                 | Bearer | Hồ sơ, Coins, XP.                   |
| `GET /players/me/history`         | Bearer | Tối đa 20 trận hoàn thành gần nhất. |
| `GET /question-packs`             | Bearer | Pack trusted và pack riêng.         |
| `POST /question-packs/preview`    | Bearer | Kiểm tra/preview pack.              |
| `POST /question-packs`            | Bearer | Lưu version pack.                   |
| `GET /shop/items`                 | Public | Catalog cosmetic.                   |
| `GET /shop/inventory`             | Bearer | Đồ sở hữu và loadout.               |
| `POST /shop/purchases`            | Bearer | Mua bằng itemId/requestId.          |
| `POST /shop/equip`                | Bearer | Trang bị item đã sở hữu.            |
| `GET /health`                     | Public | API liveness.                       |
| `GET /health/ready`               | Public | Database readiness.                 |

Swagger có mô tả request/response, status và lỗi. Tạo guest → copy token → bấm Authorize → dán token không kèm chữ Bearer. Token Swagger không lưu qua reload. Try it out gọi API thật, các POST có thể thay đổi dữ liệu.

Socket.IO dùng path `/socket.io`, auth `{ token }`; client events: `room:create`, `room:join`, `room:ready`, `match:start`, `room:sync`, `game:action`, `room:rematch`, `room:leave`. ACK có nhánh thành công/thất bại. Server hiện phát `room:state` với view đã lọc; không dựa vào các type event chưa được emit. Socket.IO không thử qua Swagger.

## 13. Kiểm thử và bằng chứng hiện có

### Source kiểm thử

| Nhóm                 | Phạm vi                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Unit                 | Quiz rules/scoring/view filtering, pack validation, keyed queue.                             |
| Platform             | Room/session orchestration, idempotency, controller quyền slot và lifecycle.                 |
| Transport            | Nest + Socket.IO thật, hai client; persistence trong RAM chỉ dành cho test.                  |
| Swagger              | UI/assets/JSON, 12 operations, auth, validation và readiness failure.                        |
| Database integration | Transaction purchase/equip/result/reward và constraints trên DB test riêng.                  |
| Browser e2e          | Solo/refresh/history, Duel hai browser context, shared-screen buzzer/steal, mobile viewport. |

### Kết quả đã ghi nhận

- **Phiên bổ sung Swagger ngày 04/11/2026:** lint, typecheck, build và format pass; Vitest **50 pass, 6 DB tests skip**. Bốn test Swagger đã pass, gồm kiểm tra HTTP localhost thật. Không chạy lại DB integration hoặc browser e2e trong phiên Swagger.
- **Bản nền ngày 03/11/2026:** `docs/11-VERIFICATION.md` ghi 52 tests pass khi bật DB suite và 4 browser e2e pass. Đó là kết quả trước khi thêm Swagger, trên database test PostgreSQL 18.1 riêng; không đồng nhất với Docker PostgreSQL 17 đang dùng hiện tại.
- **Lượt lập báo cáo này:** kiểm tra source/config, versions, Docker status, migration status và HTTP web/API/OpenAPI. Không chạy lại toàn bộ test/build vì chỉ thêm tài liệu.
- Workflow CI có source; chưa có bằng chứng trong phiên làm việc rằng workflow đã chạy thành công trên GitHub.

Các phần chưa nghiệm thu đầy đủ: hai máy LAN thật, firewall/Wi-Fi, bàn phím ghosting, Co-op browser regression, import browser regression, load/soak, crash recovery, backup/restore và đánh giá độ vui/cân bằng qua playtest.

DB integration phải dùng DB riêng có tên kết thúc `_test`, không dùng DB có dữ liệu cần giữ. MemoryStore trong test không chứng minh transaction PostgreSQL.

## 14. Phần chưa có và phần cần chủ dự án quyết định

### Chưa triển khai hoàn chỉnh

- Hoạt họa theo diễn biến trận, âm thanh/SFX và bộ hình ảnh được duyệt.
- Mục tiêu riêng từng ải Co-op, màn ôn sai, trải nghiệm kết quả/phần thưởng phong phú.
- Gift/reaction transport, power-up và xử lý tiêu hao tương ứng.
- Hiển thị cosmetic đã trang bị trong trận.
- Recovery/account linking, chuyển/claim hồ sơ guest thứ hai.
- Durable room recovery, vận hành Internet, chống abuse và backup/restore đã nghiệm thu.
- Game 2–3, rank, public matchmaking/community; không mặc định nằm trong công việc tiếp theo.

### Các quyết định đang mở

| Chủ đề             | Điều cần bạn chọn trước khi triển khai                              |
| ------------------ | ------------------------------------------------------------------- |
| Trải nghiệm chính  | Ai chơi, hoàn cảnh chơi, cảm xúc và mode ưu tiên cải thiện.         |
| Gameplay           | Nhịp trận, điểm/timer/mạng, mục tiêu Co-op, trợ giúp cho từng mode. |
| Mỹ thuật           | Hướng hình ảnh, nhân vật/asset, mức chuyển động và âm thanh.        |
| Tiến trình/kinh tế | Cách thưởng, giá, catalog và động lực chơi lại.                     |
| Identity           | Giữ guest hay mở rộng account/recovery, quyền sở hữu player 2.      |
| Vận hành           | Tiếp tục local/LAN hay có một task riêng cho Internet deployment.   |

Chưa tự chốt các đề xuất trên. Theo yêu cầu chủ dự án, thay đổi sản phẩm cần trình phương án, tác động và hỏi trước khi implement. Trong phạm vi đã duyệt, agent có thể xử lý kỹ thuật/kiểm thử phù hợp; phát sinh phạm vi mới phải hỏi lại.

## 15. Hướng đi tiếp được đề xuất, chưa phê duyệt

1. Chốt một trang định hướng: người chơi, hoàn cảnh chơi, cảm giác mong muốn và mode làm trọng tâm.
2. Gom ý tưởng vào backlog; chia làm đợt này, thử nghiệm và để sau.
3. Đặc tả một trận hoàn chỉnh, gồm luật và các trạng thái giao diện; duyệt trước khi sửa logic.
4. Làm bản thử một luồng từ vào phòng đến kết quả/Rematch, có phản hồi hình ảnh/âm thanh đủ để đánh giá.
5. Chơi thử, ghi nhận chỗ khó hiểu/chờ lâu/thiếu công bằng và nhu cầu chơi lại.
6. Hoàn thiện luồng đã chọn rồi mới mở rộng phần còn lại theo phạm vi được duyệt.

Đây là đề xuất cách quản lý, chưa phải lịch triển khai hoặc danh sách tính năng đã được đồng ý.

## 16. Tài liệu và source để tra cứu

- [README: chạy local/LAN và Swagger](../README.md)
- [Phạm vi sản phẩm](01-PRODUCT-SCOPE.md)
- [Kiến trúc](02-ARCHITECTURE.md)
- [Luật Quiz](03-QUIZ-GAMEPLAY.md)
- [Room, realtime và LAN](04-ROOMS-REALTIME-LAN.md)
- [Dữ liệu và transaction](05-DATA-MODEL.md)
- [Kinh tế và vật phẩm](06-ECONOMY-ITEMS.md)
- [Bộ câu hỏi JSON](07-QUESTION-PACKS.md)
- [Roadmap và hướng dẫn test](08-ROADMAP-QUALITY.md)
- [Quyết định LOCKED / PROPOSAL / OPEN](09-DECISIONS.md)
- [REST/socket contracts](10-CONTRACTS.md)
- [Kết quả kiểm chứng bản nền](11-VERIFICATION.md)
- [Scripts/dependencies root](../package.json), [web](../apps/web/package.json), [API](../apps/api/package.json)
- [Luật engine thực tế](../packages/game-quiz/src/quiz.engine.ts)
- [Giao diện lobby/trận/kết quả](../apps/web/src/features/quiz/quiz-stage.tsx)
- [Prisma schema](../prisma/schema.prisma), [seed](../prisma/seed.ts), [Docker Compose](../infra/compose.yaml)

Khi code và tài liệu khác nhau, đối chiếu source và quyết định sản phẩm trước khi cập nhật; không xem mô tả tính năng là bằng chứng tính năng đã triển khai.
