# Đặc tả Auth và phân quyền DuoQuest

Ngày rà soát 06/11/2026. Tài liệu mô tả Auth trong source. Database phát triển cần chạy migration Auth và cấu hình SMTP để gửi mail thật.

## Phạm vi đã thống nhất

- Đăng ký theo thứ tự email → mã sáu số → nickname và mật khẩu. Đăng nhập bằng email và mật khẩu DuoQuest. Chấp nhận email hợp lệ ngoài Gmail.
- Giữ chế độ guest và cho nâng cấp guest hiện tại. Giữ `Player.id` để bảo toàn Wallet, XP, Inventory, lịch sử và bộ đề riêng. Đăng nhập vào tài khoản đã tồn tại chuyển hồ sơ, có thông báo trước, và không tự gộp tiến trình.
- Có đăng xuất, đăng xuất mọi thiết bị, quên và đổi mật khẩu. Gửi mã qua SMTP cấu hình được với Nodemailer.
- Role tài khoản cố định `PLAYER` và `ADMIN`. Vai trò `GUEST` là loại danh tính. Quản trị nghiệp vụ, dashboard và Google OAuth thuộc các đợt sau.
- Nghiệm thu tài khoản trên localhost. Guest tiếp tục hỗ trợ LAN tin cậy. HTTPS cho tài khoản qua LAN là mốc riêng.

## Backend và phân quyền

AuthModule cung cấp AuthService, session guard và MailService trong NestJS hiện tại. PostgreSQL lưu `Account` có email chuẩn hóa duy nhất và `playerId` duy nhất, `AuthSession` có hash token, `EmailChallenge` có trạng thái xác minh và dữ liệu lượt gửi, và `AuthRateLimit` có cửa sổ hết hạn. `Account` giữ Argon2id hash, `emailVerifiedAt` và role. Chuẩn hóa email bằng trim và lowercase, giữ nguyên dấu chấm và `+tag`. Guest và account dùng opaque token ngẫu nhiên 32 byte, lưu SHA-256 digest phía server và đặt cookie host-only `HttpOnly`, `SameSite=Lax`, `Path=/`. Dùng cookie `Secure` trên HTTPS, cấu hình HTTP riêng cho localhost và guest LAN trong môi trường phát triển.

| Lớp quyền                   | Cách kiểm tra                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| API công khai               | Đánh dấu `@Public()` tường minh cho auth entrypoints, health, catalog và tạo guest. Endpoint có flow/CSRF vẫn phải qua guard tương ứng. |
| API chơi và dữ liệu cá nhân | `@AllowGuest()` cho guest, Player và Admin đã xác thực. Dữ liệu lấy theo `Player.id` của principal.                                     |
| Tài khoản                   | Phiên Account bắt buộc cho đổi mật khẩu và đăng xuất mọi thiết bị.                                                                      |
| Quản trị                    | `@Roles('ADMIN')` cho API quản trị tương lai. Đọc role từ DB trên REST. CLI nội bộ cấp/gỡ role theo email đã xác minh.                  |
| Phòng và game               | RoomsService kiểm tra membership, host và quyền slot cho cả Guest, Player và Admin.                                                     |

Guard mặc định yêu cầu Account trừ endpoint được đánh dấu khác. Phiên thiếu hoặc hết hạn trả 401. Danh tính hợp lệ nhưng thiếu quyền trả 403. Đăng ký luôn cấp `PLAYER`. Kiểm thử role guard qua controller trong test suite. Tách quyền quản trị khỏi quyền sở hữu tài nguyên. [NestJS Authorization](https://docs.nestjs.com/security/authorization)

## CSRF và trạng thái trước đăng nhập

`GET /api/auth/csrf` cấp cookie flow host-only, `HttpOnly`, `SameSite=Lax` có nonce 32 byte và hạn 30 phút, cùng CSRF token HMAC trong JSON. Dùng khóa dẫn xuất riêng từ `AUTH_SECRET` cho cookie flow, CSRF và OTP. Cookie flow được ký và kiểm tra hạn trên server. CSRF token gắn với nonce flow khi chưa đăng nhập, hoặc với opaque session hiện hành khi đã xác thực. Response có `Cache-Control: no-store`. Endpoint đọc này không INSERT `AuthSession` hay `EmailChallenge`.

Mỗi request ghi phải có Origin trong allowlist và `X-CSRF-Token` khớp với cookie hiện hành. Frontend giữ CSRF token trong bộ nhớ và lấy lại khi session đổi. CORS cho phép credentials trên origin cụ thể. Dùng cùng hostname giữa web và API, ví dụ `localhost:3000` và `localhost:4000`. Các luồng tài khoản dùng origin localhost được cấu hình, bao gồm API origin localhost nếu thử từ Swagger. Swagger dùng cùng kiểm tra cookie, Origin và CSRF. [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

Chỉ tạo phiên trong DB khi tạo guest, chuyển token guest cũ hoặc xác thực tài khoản thành công. Tạo challenge khi bắt đầu gửi mã. Challenge gắn với flow nonce hoặc session đã xác thực, đồng thời gắn `playerId` nếu đang nâng cấp guest. `GET /auth/flow` khôi phục trạng thái sau reload từ cookie và DB. Phiên flow hết hạn thì bắt đầu lại. Xoay cookie session và dọn flow khi xác thực thành công. Tác vụ dọn mỗi giờ xóa các bản ghi phiên, challenge và bộ đếm đã hết hạn hoặc bị thu hồi, với điều kiện không xóa lượt SMTP còn đang xử lý.

## Phiên đăng nhập và Socket.IO

- Phiên hết hạn sau 7 ngày không hoạt động và tối đa 30 ngày kể từ lúc tạo. `lastActiveAt` chỉ được cập nhật khi có hoạt động xác thực hợp lệ và lần ghi trước đã cách ít nhất 15 phút. Dùng cập nhật có điều kiện để nhiều tab/socket không cùng ghi. Polling, heartbeat và kiểm tra nền không gia hạn phiên.
- Socket.IO xác thực bằng cookie tại handshake và kiểm tra Origin ngay tại lớp chấp nhận kết nối. Cache kết quả xác thực theo session tối đa 5 giây, giới hạn bằng thời hạn thực của phiên. Gộp các lượt đọc đồng thời trên cùng session. Cache miss/lỗi DB không được dùng dữ liệu hết TTL. REST có kiểm tra quyền dùng trạng thái DB hiện hành.
- Dùng `node:events` như RoomsService hiện tại. Logout, logout-all, reset/đổi mật khẩu và nâng cấp guest phát sự kiện sau khi transaction commit. Gateway xóa cache, đánh dấu session đã bị thu hồi và ngắt các socket liên quan. Kết quả DB đang đọc dở trước sự kiện không được điền lại cache. Kiểm tra cache và trạng thái thu hồi trước khi xử lý lệnh, kể cả lệnh chờ hàng xử lý room. Lệnh đã bắt đầu trước khi thu hồi có thể hoàn tất. Khi API restart, cache và socket đều được tạo lại từ DB.
- Kiểm tra phiên hết hạn định kỳ tối đa 30 giây cho socket đang rảnh. Lệnh vào sau thời điểm hết hạn bị từ chối ngay. Socket bị ngắt đi qua quy tắc reconnect/grace hiện tại. Cache 5 giây phục vụ game commands, không dùng để quyết định role Admin. Thay đổi role bằng CLI có hiệu lực khi REST đọc lại role.

Đợt triển khai chuyển guest bearer token cũ một lần qua `/auth/guest/migrate`. Transaction kiểm tra và vô hiệu hóa token cũ rồi tạo cookie cho cùng Player. Frontend chỉ xóa token cũ sau khi xác nhận đã nhận phiên. Các API và socket thông thường dùng cookie. `Player.tokenHash` chuyển nullable để giữ dữ liệu cũ. Phối hợp cập nhật web/API cùng đợt sau khi kết thúc các phòng đang chơi.

## OTP, mật khẩu và gửi email

OTP là chuỗi sáu chữ số sinh bằng `crypto.randomInt`, có thể bắt đầu bằng `0`. Lưu HMAC gắn với challenge ID, email, purpose và mã. Mã hợp lệ trong 5 phút kể từ khi được kích hoạt, tối đa 5 lần sai/challenge. Resend cách ít nhất 60 giây và giữ nguyên số lần sai. Grant sau khi xác minh có hạn 10 phút, dùng một lần, ràng buộc đúng flow, email, purpose và danh tính guest nếu có. Verify/complete cập nhật có điều kiện để chống dùng lại và tranh chấp đồng thời. Hoàn tất đăng ký hoặc đăng nhập chuyển danh tính yêu cầu rời phòng đang mở.

Mật khẩu giữ **15–128 ký tự Unicode**, hỗ trợ khoảng trắng, không trim hoặc bắt buộc tổ hợp ký tự. Dùng Argon2id với mặc định 19 MiB, 2 iterations, parallelism 1 và salt ngẫu nhiên. UI gợi ý cụm từ dễ nhớ và hỗ trợ password manager. OTP lúc đăng ký chỉ xác minh quyền sở hữu email. Mức tối thiểu 8 ký tự trong NIST áp dụng khi mật khẩu chỉ được dùng trong xác thực đa yếu tố. [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver) · [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

| Loại giới hạn   | Cách tính                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Thao tác gửi mã | 10 request/phút/IP và 20 request/giờ/IP, tính trước khi kiểm tra email hoặc gọi SMTP. Dùng IP từ socket khi chạy trực tiếp, cấu hình trusted proxy riêng khi có reverse proxy. |
| Quota email     | 5 lượt/giờ/email, dùng chung giữa đăng ký và reset. Giữ chỗ nguyên tử trước SMTP, tính các lượt đang gửi vào trần. SMTP từ chối rõ ràng thì giải phóng chỗ.                    |
| Nhập mã         | 5 lần sai/challenge. Thêm giới hạn 20 lần verify/15 phút/IP và 10 lần/15 phút/email/purpose để hạn chế mở flow mới liên tục.                                                   |
| Đăng nhập       | 5 lần sai/15 phút/email và 20 lần sai/15 phút/IP. Kiểm tra trước khi chạy Argon2id. Email không tồn tại dùng dummy hash và cùng lỗi `INVALID_CREDENTIALS`.                     |

Không mở transaction trong lúc gửi SMTP. Mỗi lượt gửi có ID và chỉ một lượt đang gửi trên mỗi challenge. SMTP chấp nhận đúng người nhận thì chốt quota và kích hoạt mã mới bằng cập nhật có điều kiện theo ID lượt gửi. SMTP từ chối rõ ràng thì giữ mã cũ còn hạn. Nếu hết deadline hoặc đứt kết nối khi chưa biết SMTP đã nhận thư hay chưa, giữ chỗ trong cửa sổ quota, không kích hoạt mã mới và cho thử lại sau cooldown. Kết quả gửi đến muộn không được ghi đè mã đang có hiệu lực. Quota chỉ phản ánh SMTP chấp nhận hoặc kết quả chưa xác định, không phản ánh việc mail đã tới inbox.

Nodemailer dùng TLS với xác minh chứng chỉ, timeout kết nối/chào server/idle socket mặc định 5/5/8 giây và deadline phản hồi HTTP 12 giây. Deadline HTTP là giới hạn phản hồi riêng. Lượt gửi đang chờ được kết thúc hoặc bỏ qua kết quả muộn theo ID và không kích hoạt OTP sau deadline. Lỗi mail đăng ký hiển thị trạng thái gửi lại. Reset giữ phản hồi trung tính cả khi email vắng mặt hoặc SMTP thất bại. Không ghi password, OTP, session, cookie hoặc SMTP credentials vào log. [Nodemailer SMTP](https://nodemailer.com/smtp) · [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

`register/start` trả rõ `EMAIL_ALREADY_REGISTERED` theo quyết định sản phẩm. Điều này cho phép dò địa chỉ đã đăng ký qua endpoint này, dù login và reset trả lỗi trung tính. Áp dụng giới hạn theo IP trước khi trả kết quả. Reset thu hồi mọi phiên và yêu cầu đăng nhập lại. Đổi mật khẩu cần mật khẩu hiện tại, thu hồi các phiên cũ và tạo phiên mới cho thiết bị vừa đổi. Thông báo email sau đổi/reset thực hiện sau commit.

## Hợp đồng web và kiểm chứng

Các route mới dưới `/api/auth`: `GET /csrf`, `GET /me`, `GET /flow`, `POST /flow/cancel`, `POST /guest/migrate`, `POST /login`, `POST /logout`, `POST /logout-all`, `POST /password/change`, và `POST /start`, `/resend`, `/verify`, `/complete` trong hai nhóm `/register` và `/password-reset`. Start nhận email. Resend và verify dùng challenge ID cùng phiên flow, verify nhận thêm mã. Complete nhận challenge ID và mật khẩu, thêm nickname khi đăng ký. Email và quyền được lấy từ trạng thái server. Profile, packs và shop giữ đường dẫn. `POST /players/guest` đặt cookie và trả hồ sơ guest.

Next.js có `/register`, `/login`, `/forgot-password` và đổi mật khẩu trong profile. Dùng Zod cho dữ liệu đầu vào và Zustand cho trạng thái UI. Form chỉ hiện mật khẩu sau khi server xác nhận mã. Hỗ trợ paste OTP, `autocomplete="one-time-code"`, `new-password`, hiển thị cooldown, hết hạn và lỗi gửi. Dùng `credentials: 'include'` cho fetch, `withCredentials` cho Socket.IO và `BroadcastChannel` để các tab đồng bộ danh tính. Chuyển danh tính thì đóng socket cũ và tải lại `/auth/me`.

Triển khai theo thứ tự session/guest migration → đăng ký/SMTP → login/reset/đổi mật khẩu → role/Swagger/hồi quy. Kiểm thử các điểm sau:

- 100 lượt lấy CSRF không cookie không sinh dòng AuthSession. Token khác cookie, khác phiên hoặc Origin sai bị từ chối.
- OTP sai/hết hạn/khác flow/khác purpose, resend, tranh chấp complete và race quota dưới gửi đồng thời. SMTP lỗi rõ ràng, SMTP timeout chưa rõ kết quả và phản hồi muộn đều cho trạng thái đúng.
- Socket burst cùng phiên không query mỗi lệnh, nhiều tab chỉ cập nhật hoạt động một lần mỗi 15 phút. Logout/reset ngắt socket sau commit và cache không tái xuất hiện từ DB read cũ. Kiểm tra lệnh đang chờ room queue sau revoke.
- 401/403, role giả, quyền Admin tách quyền host và ownership. Guest migration/nâng cấp giữ cùng Player cùng số dư, kho, pack và lịch sử.
- E2E browser đăng ký theo đúng ba bước, reload, gửi lại, login/reset/đổi mật khẩu, chơi Quiz bằng guest và Account. SMTP giả trong CI, thử SMTP thật trên localhost. Nghiệm thu hồi quy guest qua LAN hai client.
- Chạy lint, typecheck, unit/integration trên DB test, build và browser E2E. Khi implement, cập nhật README, Swagger, contracts và hiện trạng. `AUTH_SECRET` cùng SMTP credentials dùng biến server-side, cấu hình SMTP trước nghiệm thu mail thật.
