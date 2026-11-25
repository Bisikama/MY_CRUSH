# Hướng dẫn setup và vận hành DuoQuest qua Cloudflare Tunnel

> **Mục đích:** Tài liệu hướng dẫn đầy đủ từ bước chuẩn bị ban đầu (setup 1 lần) đến quy trình bật/tắt hằng ngày và gia cố bảo mật khi đưa DuoQuest lên Internet qua Cloudflare Tunnel.
> **Đối tượng:** Chủ dự án và người vận hành máy host Windows.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-25.
> **Liên quan:** [Mục lục](../README.md), [Quyết định kiến trúc](../architecture/decisions.md), [Auth và phân quyền](../features/auth.md).

---

## 1. Kiến trúc Same-Origin (Không cần mở port router)

DuoQuest chạy 2 tiến trình nội bộ (`Web` ở `127.0.0.1:3000` và `API + Socket.IO` ở `127.0.0.1:4000`) và kết nối ra Internet bằng **1 domain HTTPS duy nhất** (ví dụ `https://game.example.me`) thông qua `cloudflared`:

```text
Người chơi (HTTPS)
   └─► Cloudflare Edge (SSL + WAF + Bot Fight)
         └─► cloudflared (chạy trên máy host Windows)
               ├── ^/api(/|$)        ──► http://127.0.0.1:4000 (NestJS REST API)
               ├── ^/socket\.io(/|$) ──► http://127.0.0.1:4000 (Socket.IO Realtime)
               └── (mọi path khác)   ──► http://127.0.0.1:3000 (Next.js Web)
```

**Lợi ích:**

- Không cần mở port `3000`, `4000`, `55432` trên router hay Windows Firewall công cộng.
- Giữ nguyên cùng một origin nên cookie phiên `HttpOnly; Secure; SameSite=Lax` hoạt động ổn định trên mọi trình duyệt (kể cả Safari/iOS).
- Khách chơi trên Internet có thể đăng ký bằng Gmail OTP để nâng cấp trực tiếp hồ sơ Guest sang tài khoản mà vẫn giữ nguyên Coins, XP, kho vật phẩm và lịch sử trận trong PostgreSQL.

---

## 2. Setup lần đầu (Chỉ cần làm 1 lần)

### Bước 2.1: Chuẩn bị tài khoản Cloudflare và tên miền

1. Đăng ký tài khoản miễn phí tại `https://dash.cloudflare.com`.
2. Chuẩn bị 1 tên miền (có thể mua trên Cloudflare/Namecheap/Porkbun hoặc dùng ưu đãi **GitHub Student Developer Pack → Namecheap Offer #1** để nhận tên miền `.me` miễn phí 1 năm; nhớ tắt **Auto-Renew** sau khi đăng ký).
3. Trong Cloudflare Dashboard → **Account Home** → **Add a domain** → nhập tên miền → chọn gói **Free ($0)**.
4. Copy 2 dòng **Nameserver** mà Cloudflare cấp, dán vào mục **Nameservers → Custom DNS** ở nhà cung cấp tên miền (ví dụ Namecheap → **Domain List → Manage**).
5. Đợi 5–15 phút cho tới khi Cloudflare báo tên miền ở trạng thái **Active**.

### Bước 2.2: Tải `cloudflared` bản portable vào ổ `D:` (không tốn ổ `C:`)

Mở PowerShell và chạy:

```powershell
New-Item -ItemType Directory -Force -Path "D:\tools\cloudflared" | Out-Null
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "D:\tools\cloudflared\cloudflared.exe"
D:\tools\cloudflared\cloudflared.exe --version
```

### Bước 2.3: Tạo Tunnel và lưu Token an toàn (ngoài thư mục Git)

1. Vào Cloudflare Dashboard → **Networking → Tunnels** (hoặc `https://one.dash.cloudflare.com` → **Networks → Tunnels**) → **Create a tunnel** → chọn **Cloudflared**.
2. Đặt tên tunnel (ví dụ `DuoQuest Game`) → chọn OS **Windows (64-bit)**.
3. Cuộn xuống dưới mục **Install and Run**, copy **đúng chuỗi token bắt đầu bằng `eyJ...`** nằm sau chữ `install ` (bỏ qua bước tải `.msi`).
4. Tạo file `D:\tools\cloudflared\start-tunnel.ps1` (nằm ngoài repo Git để không bao giờ lộ lên GitHub):

```powershell
$env:TUNNEL_TOKEN = "<DAN_CHUOI_TOKEN_eyJ_CUA_BAN_VAO_DAY>"
D:\tools\cloudflared\cloudflared.exe tunnel run
```

> **Bảo mật:** Không lưu token tunnel vào `.env` của repo, không chụp ảnh chứa chuỗi `eyJ...` và không commit lên Git. Nếu lỡ lộ, vào trang Tunnel bấm **Rotate token** rồi cập nhật lại `start-tunnel.ps1`.

### Bước 2.4: Thêm 3 Route trên Cloudflare Dashboard

Chạy thử `D:\tools\cloudflared\start-tunnel.ps1` để thấy 4 kết nối `Registered tunnel connection` và trạng thái **Healthy**, sau đó vào tab **Routes → Add route → Published application** và tạo đúng **3 mục** trên cùng 1 Subdomain & Domain (mục **Additional application settings** giữ nguyên `Using defaults`):

| Thứ tự          | Subdomain                | Domain               | Path (optional — regex) | Service URL             |
| :-------------- | :----------------------- | :------------------- | :---------------------- | :---------------------- |
| 1 (REST API)    | `game` _(hoặc để trống)_ | `<ten-mien-cua-ban>` | `^/api(/\|$)`           | `http://127.0.0.1:4000` |
| 2 (Socket.IO)   | `game` _(giống mục 1)_   | `<ten-mien-cua-ban>` | `^/socket\.io(/\|$)`    | `http://127.0.0.1:4000` |
| 3 (Web Next.js) | `game` _(giống mục 1)_   | `<ten-mien-cua-ban>` | _(để trống)_            | `http://127.0.0.1:3000` |

### Bước 2.5: Cấu hình biến môi trường Production

1. **Tạo `AUTH_SECRET` cố định** (chạy 1 lần và copy kết quả):
   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```
2. **Cập nhật file `.env` ở thư mục gốc dự án** (thay `https://game.example.me` bằng đúng Full hostname của bạn):
   ```dotenv
   NODE_ENV=production
   API_HOST=127.0.0.1
   API_PORT=4000

   WEB_ORIGINS=https://game.example.me
   AUTH_WEB_ORIGIN=https://game.example.me
   ALLOW_PUBLIC_ACCOUNT_AUTH=true
   TRUST_PROXY_MODE=cloudflare
   ENABLE_SWAGGER=false
   AUTH_COOKIE_SECURE=true

   AUTH_SECRET=<chuoi-base64url-vua-tao>

   # SMTP gửi mã OTP thật (ví dụ Gmail dùng App Password 16 ký tự)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<your-email@gmail.com>
   SMTP_PASSWORD=<gmail-app-password>
   MAIL_FROM="DuoQuest <your-email@gmail.com>"
   ```
3. **Cập nhật file `apps/web/.env.local`** (bắt buộc có trước khi chạy `pnpm build`):
   ```dotenv
   NEXT_PUBLIC_API_URL=https://game.example.me
   NEXT_PUBLIC_ALLOW_PUBLIC_ACCOUNT_AUTH=true
   ```

### Bước 2.6: Bật các lớp bảo vệ trên Cloudflare Dashboard

Vào tên miền của bạn trên Cloudflare Dashboard và bật:

1. **SSL/TLS → Overview:** Chọn **Full** (hoặc **Full (strict)**), vào **Edge Certificates** bật **Always Use HTTPS**.
2. **Security → WAF → Custom rules:** Tạo 1 rule chặn (`Block`) khi URI Path bắt đầu bằng `/api/docs` (chặn cả `/api/docs` và `/api/docs-json`).
3. **Security → WAF → Rate limiting rules:**
   - `/api/players/guest`: chặn nếu > 15 request / phút / IP.
   - `/api/auth/register` và `/api/auth/password-reset`: chặn nếu > 10 request / phút / IP.
   - `/api/question-packs`: chặn nếu > 10 request / phút / IP.
4. **Security → Bots:** Bật **Bot Fight Mode**.
5. _(Tùy chọn cho nhóm kín)_ **Zero Trust → Access → Applications:** Nếu chỉ mở cho bạn bè/tester, bật Access yêu cầu email whitelist trước khi vào web.

---

## 3. Quy trình BẬT / TẮT game mỗi lần sử dụng

### Khi muốn MỞ game lên Internet

Chạy từ thư mục gốc dự án (`D:\SESSION_8\MY_CRUSH`):

1. **Bật PostgreSQL** (nếu Docker chưa bật):
   ```powershell
   pnpm db:up
   pnpm db:deploy
   ```
   _(Chỉ cần chạy `pnpm db:seed` khi mới tạo DB hoặc có thêm bộ đề mới)._
2. **Build bản production** (chỉ cần chạy lại khi bạn vừa sửa code hoặc sửa `apps/web/.env.local`):
   ```powershell
   pnpm build
   ```
3. **Mở 3 cửa sổ PowerShell riêng và giữ chúng chạy:**
   - Cửa sổ 1 — Chạy API:
     ```powershell
     pnpm --filter @duoquest/api start
     ```
   - Cửa sổ 2 — Chạy Web:
     ```powershell
     pnpm --filter @duoquest/web start
     ```
   - Cửa sổ 3 — Mở Cloudflare Tunnel:
     ```powershell
     D:\tools\cloudflared\start-tunnel.ps1
     ```

### Kiểm tra nhanh sau khi bật

- Mở `https://<domain-cua-ban>/api/health` → trả về `{"status":"ok","service":"duoquest-api"}`.
- Mở `https://<domain-cua-ban>/api/docs` → phải trả về `404` (hoặc bị Cloudflare chặn).
- Mở `https://<domain-cua-ban>`, tạo Guest, chơi thử 1 ván, rồi thử vào `/register` đăng ký bằng Gmail để xác nhận nhận OTP và giữ nguyên tiến trình.
- Mở DevTools → **Application → Cookies**: kiểm tra cookie `dq_session` có đủ cờ `HttpOnly`, `Secure`, `SameSite=Lax`.

### Khi muốn TẮT

- Bấm `Ctrl + C` ở 3 cửa sổ PowerShell (Tunnel, Web, API).
- Dữ liệu người chơi, điểm, Coins, XP và kho vật phẩm đã được lưu bền vững trong volume PostgreSQL.

---

## 4. Các lớp bảo vệ đã tích hợp sẵn trên Server

- **Đọc IP thật an toàn (`TRUST_PROXY_MODE=cloudflare`):** Chỉ tin cậy header `CF-Connecting-IP` khi kết nối TCP đến từ loopback (`127.0.0.1` / `::1`) và đúng định dạng IP, chống giả mạo IP và tránh gom chung rate limit về `127.0.0.1`.
- **Tự tắt Swagger ở Production:** `/api/docs` và `/api/docs-json` tắt mặc định khi `NODE_ENV=production` (`ENABLE_SWAGGER=false`).
- **HTTP Security Headers:** Cả NestJS và Next.js đều gửi `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (production), `Content-Security-Policy` (web) và ẩn `X-Powered-By`.
- **Rate Limit & Quota chống DoS (PROPOSAL):**
  - Tạo Guest (`POST /api/players/guest`): tối đa 20 lần/15 phút/IP và 60 lần/24 giờ/IP.
  - Đăng nhập & OTP (`POST /api/auth/*`): 20 lần login/15p/IP, 5 lần/15p/email, 10 OTP/phút/IP, 20 OTP/giờ/IP, 5 mail/giờ/email.
  - Bộ đề tự nhập (`POST /api/question-packs`): lưu tối đa 10 lần/15p/player, preview tối đa 30 lần/15p/player; quota tối đa **10 bộ đề riêng** và **30 phiên bản** mỗi người chơi.
  - Socket.IO & Phòng chơi: tối đa **4 socket/player**, **20 socket/IP**, **15 lần tạo phòng/15 phút/IP**, tối đa **4 phòng hoạt động cùng lúc/IP** và **128 phòng toàn server**.
  - Health readiness (`GET /api/health/ready`): cache trạng thái khỏe 3 giây và gộp request đồng thời để tránh spam truy vấn PostgreSQL.

---

## 5. Xử lý nhanh lỗi thường gặp

| Hiện tượng                                  | Nguyên nhân thường gặp                                                          | Cách xử lý                                                                                                            |
| :------------------------------------------ | :------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| Nút **Add route** trên Cloudflare bị mờ     | Chưa chọn **Domain** hoặc Domain chưa ở trạng thái **Active**                   | Đợi Nameserver cập nhật xong (Active) rồi chọn tên miền ở ô `Domain`.                                                 |
| Đăng ký / đăng nhập báo `403 FORBIDDEN`     | `ALLOW_PUBLIC_ACCOUNT_AUTH` chưa bật hoặc sai `AUTH_WEB_ORIGIN` / `WEB_ORIGINS` | Kiểm tra cả `.env` và `apps/web/.env.local` đều dùng chính xác `https://<domain>`, sau đó rebuild web và restart API. |
| Vào web được nhưng không tạo/vào phòng được | Thiếu route Socket.IO hoặc ghi nhầm `https://` ở Service URL                    | Kiểm tra route `^/socket\.io(/\|$)` trỏ tới `http://127.0.0.1:4000`.                                                  |
| Không gửi được mã OTP Gmail                 | Sai `SMTP_PASSWORD` hoặc dùng mật khẩu thường thay vì App Password              | Bật xác minh 2 bước trên tài khoản Google, tạo **App Password** 16 ký tự và điền vào `SMTP_PASSWORD`.                 |
| Quên lưu / lỡ lộ Token Tunnel               | Token chỉ hiện lúc tạo hoặc bị lộ ra ngoài                                      | Vào Tunnel trên Cloudflare → **Rotate token** → dán token mới vào `D:\tools\cloudflared\start-tunnel.ps1`.            |

> **Kế hoạch mở rộng bảo mật (Giai đoạn 2):** Tích hợp **Cloudflare Turnstile (CAPTCHA)** cho luồng tạo Guest và gửi email OTP để chống bot phân tán nhiều IP.
