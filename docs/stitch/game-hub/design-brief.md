# Màn chọn game — Matcha Meadow

> **Mục đích:** Prompt Stitch cho màn chọn game DuoQuest, tách hub chung khỏi sảnh riêng từng game.
> **Đối tượng:** Chủ dự án, người thiết kế và lập trình viên frontend.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-08.
> **Liên quan:** [Mục lục](../../README.md), [Phạm vi sản phẩm](../../product/scope.md), [Quyết định](../../architecture/decisions.md), [Kinh tế và vật phẩm](../../features/economy-items.md), [Brief hồ sơ](../account/account-profile.md).

## Nội dung và thao tác

DuoQuest là hub chung. Quiz Battle là game đang có; hai game tương lai chưa được chọn. Luồng đề xuất: chọn game → vào sảnh riêng → chọn cách chơi/tạo hoặc tham gia phòng. Trang gốc hiện mở trực tiếp QuizClient; brief này chưa thay đổi route hoặc triển khai màn hub.

| Thành phần        | Hiển thị                                                             | Thao tác                                    |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| Header            | Logo, Các trò chơi, Shop, avatar, nickname, Coins                    | Về hub, mở Shop, mở hồ sơ; Coins chỉ để đọc |
| Lời chào          | “Hôm nay, bạn muốn chơi gì?” và minh họa nhỏ                         | Không có CTA riêng                          |
| Quiz Battle       | Minh họa, mô tả, 1–2 người, Solo/Duel/Co-op, chung màn hình hoặc LAN | “Vào game” mở sảnh Quiz, chưa bắt đầu trận  |
| Hai thẻ tương lai | “Trò chơi tiếp theo”, “Đang lên ý tưởng”, hộp bí ẩn                  | Không tương tác, không nút chơi             |
| Phòng đang mở     | Tên game và mã phòng, chỉ hiện khi có dữ liệu thật                   | Quay lại phòng                              |

Coins và XP thuộc hồ sơ dùng chung; điểm trận thuộc từng game. Header chỉ hiện Coins, XP xem trong hồ sơ. Shop dùng chung nhưng vật phẩm có thể có phạm vi áp dụng riêng theo game. Không đưa form mode, bộ đề, tạo/join phòng vào hub. Chọn màu Matcha Meadow chỉ là hướng thiết kế màn này, chưa thay theme toàn app.

## Prompt dán vào Stitch

Sao chép nguyên khối bên dưới. Mục tiêu là tạo một artboard desktop mới; giữ các màn auth, hồ sơ và trong game đã có.

```text
Design exactly ONE desktop web screen for the DuoQuest
GAME HUB, where players browse and choose a game before
entering that game's own lobby.

Screen name: “DuoQuest — Chọn trò chơi — Matcha Meadow”.

This is a visual concept for review.
Do not redesign existing authentication, profile or in-game screens.
All visible UI copy must be Vietnamese, except established
names such as DuoQuest, Quiz Battle, Solo, Duel, Co-op and Coins.

PRODUCT STRUCTURE
DuoQuest is the shared platform.
Quiz Battle is the first playable game inside DuoQuest.
Two additional games are planned but have not been chosen.
Do not invent their names, genres, rules or release dates.

VISUAL DIRECTION
A lively, cozy game selection screen with a pastel matcha palette.
Use soft clay 3D illustrations, tactile buttons, collectible-card
styling, rounded corners and gentle green-tinted shadows.
Keep the page airy, readable and focused on choosing a game.

Colors:
- Page background: #F7FAF2.
- Card surfaces: #FFFEF8.
- Sage accent: #A8C99B.
- Primary buttons and active navigation: #46734B.
- Button hover: #365C3B.
- Pale mint surfaces: #E5F1DF.
- Butter-yellow accent: #F6D98B.
- Soft peach accent: #F3C7AC.
- Main text: #273C2C.
- Secondary text: #607061.
- Borders: #DCE7D5.

Typography: Quicksand headings, Nunito Sans body.
Use dark text on pastel surfaces.
White text is reserved for dark forest-green buttons.

DESKTOP LAYOUT
Target a 1440px-wide desktop viewport.
Centered content, maximum width 1180px.
Use natural vertical scrolling.
Do not create a mobile artboard.

1. COMPACT HEADER
Left: DuoQuest logo.
Navigation: “Các trò chơi” active, and “Shop”.
Right: small framed mascot avatar, fictional nickname “Mây Nhỏ”
and a compact Coins balance.

The avatar/nickname opens the personal profile.
The Coins chip is informational, not a purchase button.
Do not add a profile sidebar, XP bar, level or rank.
Use fictional sample account data only.

2. SHORT WELCOME
Heading: “Hôm nay, bạn muốn chơi gì?”
Supporting line: “Chọn một trò chơi, bắt đầu cuộc vui.”

Include a small charming lavender bunny and sky-blue bird
clay illustration with a few static pastel stars.
Preserve the mascots' original colors.
Keep this section short enough that the game cards are
clearly visible in the first viewport.

3. GAME SELECTION — THE MAIN FOCUS
Heading: “Các trò chơi”.
Use one row of three substantial cards with consistent
image ratios and aligned content.

PLAYABLE CARD: QUIZ BATTLE
Make this card the strongest visual anchor.
Use a playful clay illustration of question cards,
a buzzer and the DuoQuest mascots.

Name: “Quiz Battle”.
Description:
“Thử tài kiến thức, so tài hoặc cùng bạn vượt thử thách.”

Compact metadata:
- “1–2 người”.
- “Solo · Duel · Co-op”.
- “Chung màn hình hoặc LAN”.

Primary button: “Vào game”.
This opens the existing Quiz Battle lobby/setup screen.
It does not immediately start a match.

Do not place mode selectors, question-pack selectors,
timers, room creation or room-code inputs inside this card.

TWO FUTURE GAME CARDS
Use two distinct but understated mystery-box illustrations.
Name both cards “Trò chơi tiếp theo”.
Status: “Đang lên ý tưởng”.
Supporting text: “Một trải nghiệm mới đang được khám phá.”

Use muted pastel treatments.
No play button, clickable affordance, countdown, invented
game title, genre, reward or release date.
Do not make these look like games unlocked by earning Coins.

4. CONDITIONAL RETURN-TO-ROOM COMPONENT
Provide a compact component specification for an existing room:
“Bạn có phòng đang mở”
“Quiz Battle · Mã phòng: ABC234”
Action: “Quay lại phòng”.

Only render this component when an actual active room exists.
The main artboard should show the default state without it.
Document the conditional behavior outside the product UI;
do not generate a second screen.

SHARED PLATFORM VS GAME
Coins and XP belong to the shared player profile.
Match scores belong to individual games.
The Shop is shared; some items may apply only to particular games.
Do not imply all items work in every game.

Do not add reward claims, free gifts, daily missions,
a leaderboard, achievements, friends, chat, matchmaking,
online-player counters or monetization.

GUEST / SIGNED-OUT BEHAVIOR
The header composition shown is a sample signed-in state.
For guests, use their guest nickname without inventing an email.
For signed-out users, replace personal data with “Đăng nhập”.
Do not show a fake zero balance or require account registration
just to browse the game selection.

POLISH
Cards: 24–32px corner radius.
Make the Quiz Battle CTA easy to find.
Use subtle hover lift and tactile button press feedback.
Future-game cards should remain visually non-interactive.
Provide visible keyboard focus and targets at least 44px.
Honor prefers-reduced-motion.
No flashing, automatic carousel or oversized marketing footer.

Generate exactly one desktop game-hub artboard.
```

## Tiêu chí review và giới hạn kiểm chứng

- Phân biệt được hub DuoQuest với game Quiz Battle; tìm được nút “Vào game” ngay trong danh sách.
- Desktop 1440px, container tối đa 1180px, ba thẻ cùng hàng; danh sách game thấy rõ ở viewport đầu. Đọc tốt chữ trên pastel, focus rõ, vùng bấm từ 44px.
- Hai thẻ tương lai không có trạng thái hover/CTA gây hiểu nhầm là có thể chơi hoặc mở khóa bằng Coins.
- Không trộn điểm trận với Coins/XP. Không hiện rank, cấp độ, tên game hoặc luật thưởng tự đặt.
- Header có bản mô tả account/guest/anonymous; artboard mặc định chỉ dùng tài khoản giả. Khối quay lại phòng được đặc tả riêng và không xuất hiện trong artboard mặc định khi không có phòng.
- Ngày 2026-11-08 (bước chuẩn bị): mới chuẩn bị prompt Matcha Meadow và đối chiếu phạm vi/source. Project tham chiếu: [DuoQuest](https://stitch.withgoogle.com/projects/9329491706796553468), ID `9329491706796553468`.

## Mốc tích hợp Pastel Lavender (2026-11-08)

- **Screen trên Stitch:** `projects/9329491706796553468/screens/7d9066eeafb84b979a3266c355b4f90e` — tiêu đề **DuoQuest — Chọn trò chơi — Pastel Lavender** (cùng có màn thử nghiệm Matcha Meadow `861bdf29e7e842ea9a22c702c0d3675e`). Chủ dự án chốt triển khai bản **Pastel Lavender** làm trang chủ `/`.
- **Tài nguyên cục bộ:** Đã tải và xác minh định dạng JPEG thực (`ffd8ffe0`) cho 4 ảnh minh họa từ HTML Stitch vào `apps/web/public/images/hub/` (`hero-mascots.jpg`, `quiz-battle.jpg`, `mystery-chest.jpg`, `mystery-gift.jpg`), không phụ thuộc URL ảnh ngoài.
- **Kiến trúc route và giao diện đã tích hợp:**
  - `/` (`apps/web/src/app/(main)/page.tsx`) render `GameHub`: hiển thị lời chào, minh họa thỏ/chim, tóm tắt “1 game có sẵn · 2 ý tưởng tiếp theo”, thẻ Quiz Battle dẫn tới `/play` và hai thẻ “Trò chơi tiếp theo” ở trạng thái “Đang lên ý tưởng”. Đã loại bỏ nút bật/tắt banner thử nghiệm và khối đặc tả thiết kế ở cuối prototype.
  - `/play` (`apps/web/src/app/(main)/play/page.tsx`) render `QuizClient` cho sảnh Quiz Battle; `/play/[code]` giữ nguyên cho phòng chơi.
  - `SiteHeader` dùng chung trong `MainLayout` theo bảng màu Pastel Lavender, hiển thị Coins thật từ `/api/players/me`, trạng thái anonymous/guest/account và liên kết điều hướng.
  - Bổ sung `GET /api/rooms/current` và `PlatformProvider` giữ một kết nối Socket.IO cho mỗi tab có phiên, hiển thị `ActiveRoomBanner` theo trạng thái phòng thật và mở `LeaveMatchDialog` xác nhận khi rời màn trận đang `IN_PROGRESS`.
