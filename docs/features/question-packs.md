# Bộ câu hỏi JSON

> **Mục đích:** Hướng dẫn kiểm chứng kiến thức, soạn JSON và nhập bộ câu hỏi vào DuoQuest.
> **Đối tượng:** Người soạn đề, lập trình viên và QA.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-11.
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../../examples/question-pack.schema.json).

Nguồn chuẩn: `packages/shared-types/src/question-pack.ts`. Ví dụ: `examples/question-pack.json`. JSON Schema: `examples/question-pack.schema.json`, sinh bằng `pnpm exec tsx scripts/export-question-schema.ts`. Khi sửa Zod phải sinh lại schema.

Pipeline web/API: parse → Zod validation + business validation → preview (không ghi) → người dùng duyệt → xác nhận lưu phiên bản mới. Không gọi AI tích hợp trong app. Nội dung đưa vào UI dưới dạng text, không render HTML từ pack.

schemaVersion=1, packId dạng slug, title/language/category, 1–500 questions. Mỗi question `single_choice`, 4 options ID A–D, topic/difficulty/prompt/correctOptionId/explanation; hints/tags tùy chọn, timer 5–120 giây. Strict objects từ chối field lạ. Limit upload tổng 1MB.

Business validation phát hiện ID trùng, option ID/text trùng, nội dung câu trùng và answer không tồn tại. Câu chữ dùng prompt chuẩn hóa. Câu có ảnh dùng thêm tập đường dẫn ảnh. JSON Schema mô tả cấu trúc; các bất biến liên trường vẫn phải chạy Zod/business validation. Không khẳng định tự kiểm tra được tính đúng kiến thức.

packId đã thuộc người khác/trusted library không được guest chiếm lại. Cùng chủ sở hữu cập nhật tạo version mới, không ghi đè version đã có. Shared lobby chọn pack version ID, không chọn slug có thể đổi nội dung.

Ở sảnh Quiz, host chọn mode, layout (trừ Solo) và trải nghiệm. Học luyện chuyên môn chọn một phiên bản bộ đề cùng lĩnh vực, đề tài và độ khó theo flow hiện tại. Server kiểm tra quyền dùng pack, bốc ngẫu nhiên tối đa 10 câu với Solo/Duel hoặc 20 câu với Co-op. Tái đấu giữ phiên bản và bộ lọc, bốc lại câu và có thể gặp câu cũ.

Đố vui thử thách có Ngẫu nhiên và Tự chọn. Ngẫu nhiên dùng toàn bộ nguồn phù hợp. Tự chọn có ba field Lĩnh vực, Chủ đề và Độ khó. Hai field đầu chọn nhiều, mỗi chủ đề gắn với lĩnh vực, để trống tương đương tất cả. Độ khó gồm Dễ, Trung bình, Khó và Hỗn hợp. Mỗi danh sách tối đa 50 mục.

Nguồn đố vui là phiên bản mới nhất của mỗi pack trusted có nhóm `discovery` hoặc `practical`. `QuizPreparationService` đọc metadata, tải JSON từng lô 25 pack và truy vấn lịch sử từng lô tối đa 1.000 khóa. Câu phù hợp được lọc, loại trùng prompt, lấy mẫu reservoir rồi xáo thứ tự bằng random server. Mỗi câu hợp lệ có cùng cơ hội được chọn, Hỗn hợp không áp tỷ lệ cố định giữa các độ khó. Chi phí đọc tăng tuyến tính theo kho câu nguồn.

Đố vui lấy tối đa 20 câu host chưa gặp trong tập đang lọc. Nếu còn 4 câu mới thì ván có 4 câu. Hết câu mới thì mở lại riêng tập đang lọc. Hai cách chọn dùng chung lịch sử theo Player ID của host. Câu chữ dùng SHA-256 của prompt sau chuẩn hóa NFKC, chữ thường và khoảng trắng. Câu có ảnh kết hợp prompt chuẩn hóa và tập `src` đã sắp xếp để phân biệt các câu cùng đề bài. Sửa `alt` hoặc đổi thứ tự ảnh giữ nguyên khóa. Khi trùng nguồn, giữ bản đầu theo packId và vị trí câu trong pack.

Backend chốt đề trước khi công bố phòng. Start và Sync dùng đề này. Tái đấu chỉ chuẩn bị đề mới sau khi lịch sử ván trước đã commit. Lịch sử ghi một batch khi hoàn thành hoặc hủy ván, chỉ gồm các câu đã tới lượt. Rời phòng trước Start không ghi lịch sử. Backend crash trước batch có thể khiến câu đã thấy xuất hiện lại, theo giới hạn phục hồi hiện tại. Dữ liệu lịch sử cũ bắt đầu trống.

Pack có thể có `relatedKnowledge` gồm tối đa 12 mục `category`, `topic` và `reason`. Chọn lĩnh vực gợi ý chỉ lọc các bộ đề đã được cấp quyền. Prompt mới yêu cầu 3–5 gợi ý theo thứ tự. Import v1 vẫn nhận bộ cũ có ít hơn ba gợi ý.

## Câu hỏi có ảnh

Thêm `images` vào câu `single_choice` để hiển thị tối đa bốn ảnh trước các lựa chọn.

```json
{
  "images": [
    {
      "src": "/images/quiz/food/7b3a90.webp",
      "alt": "Bát mì sợi vàng với tôm, rau thơm và bánh tráng"
    }
  ]
}
```

- Ảnh local đặt trong `apps/web/public/images/quiz/`. Ví dụ file `apps/web/public/images/quiz/food/7b3a90.webp` dùng đường dẫn trong mẫu. Trình duyệt tải từ máy chạy web qua LAN.
- Với CDN, dùng URL HTTPS tĩnh. Thêm origin chính xác vào `QUIZ_IMAGE_CDN_ORIGINS` trong `.env`, phân cách bằng dấu phẩy, ví dụ `https://cdn.example.com`. API kiểm tra khi Preview/Save và seed kiểm tra trước khi ghi. Dùng tên file và thư mục ASCII, đuôi thường `.webp`, `.jpg`, `.jpeg`, `.png` hoặc `.avif`. Đặt URL ổn định, không kèm thông tin đăng nhập, query hay fragment.
- `alt` từ 1–300 ký tự, mô tả dấu hiệu nhìn thấy. Tránh ghi thẳng đáp án trong `alt` và tên file. Kiểm tra ảnh tải được trên màn Preview trước khi đưa vào thư viện chung. Ảnh CDN yêu cầu thiết bị có đường kết nối tới CDN.

### Dung lượng và lưu trữ

PostgreSQL chỉ lưu `src` và `alt` trong JSON bộ đề và snapshot của trận. File được phục vụ từ web hoặc CDN. Ảnh được nén **trước khi phát hành file**. Với ảnh chụp, ưu tiên WebP, cạnh dài khoảng 1.280 px và mục tiêu khoảng 150 KB mỗi ảnh. Giữ chi tiết cần thiết để người chơi trả lời. [Định dạng ảnh](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)

Khi mở luồng upload, dùng object storage và CDN. Pipeline kiểm tra định dạng thực, giới hạn byte và pixel, xoay theo EXIF, bỏ metadata, mã hóa WebP và dùng hash nội dung để tái sử dụng file trùng. Tạo bản 640 px và 1.280 px khi có nhu cầu tối ưu theo thiết bị. Dùng URL theo hash hoặc phiên bản để cache lâu. Giữ các file còn được pack hoặc snapshot tham chiếu và phát hành URL mới khi sửa ảnh. [HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

## Tìm và kiểm chứng kiến thức

1. **Xác định nội dung cần kiểm tra.** Chọn lĩnh vực, đề tài, nhóm người chơi và mục tiêu học. Viết ra dữ kiện cần xác minh, gồm đơn vị, địa bàn, thời điểm hoặc phiên bản nếu những yếu tố đó ảnh hưởng đến đáp án.
2. **Tìm theo dữ kiện cụ thể.** Thử từ khóa tiếng Việt và thuật ngữ gốc. Ví dụ, tìm `chu vi hình vuông công thức` rồi thu hẹp bằng `site:openstax.org square perimeter geometric formulas`. Với số liệu, tìm bảng dữ liệu của đơn vị công bố. Với kiến thức kỹ thuật, tìm tài liệu chính thức đúng phiên bản. Với kiến thức nền, ưu tiên giáo trình có đơn vị xuất bản rõ ràng.
3. **Mở và đọc nguồn.** Kiểm tra tác giả hoặc tổ chức, ngày hoặc ấn bản, và mục chứa dữ kiện. Đối chiếu trực tiếp với bảng, công thức hoặc đoạn gốc. Kết quả tìm kiếm và câu trả lời của AI có thể gợi ý từ khóa. Chỉ ghi nguồn đã mở và đọc được phần hỗ trợ câu hỏi. Thiếu căn cứ thì đánh dấu **Chờ xác minh** và loại câu đó khỏi bản nhập.
4. **Đối chiếu khi dữ kiện dễ thay đổi hoặc còn tranh luận.** Tìm nguồn độc lập thứ hai. Nếu hai nguồn lệch nhau, so phạm vi, định nghĩa và mốc thời gian. Ghi mốc ngay trong câu hỏi nếu nó quyết định đáp án. Khi vẫn có nhiều cách trả lời hợp lý, sửa phạm vi hoặc bỏ câu.
5. **Giải lại câu trước khi duyệt.** Tự tính hoặc suy luận từ nguồn, so cả bốn lựa chọn, kiểm tra chỉ có một đáp án đúng và `correctOptionId` trỏ đúng chữ cái. Diễn đạt lời giải bằng lời của mình. Kiểm tra cả dữ kiện bổ sung trong lời giải và gợi ý.

### Ghi nguồn theo ID câu hỏi

Giữ một bảng nguồn riêng cùng bản thảo, tra cứu theo `packId` và `questions[].id`. Khi sửa nội dung câu, cập nhật căn cứ tương ứng. Ghi URL trực tiếp hoặc thông tin sách, vị trí chương/mục/trang, ngày kiểm tra và phép suy luận nếu có. Bảng này phục vụ biên tập. Schema v1 từ chối các trường tự thêm như `source` và `sources`.

| Pack / ID câu                    | Căn cứ và cách suy ra đáp án                                                                | Ngày kiểm tra | Nguồn và vị trí                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `chu-vi-hinh-vuong` / `chu-vi-6` | Công thức chu vi là \(P = 4s\). Cạnh 6 cm là dữ kiện của đề. Thay số được 24 cm, ứng với C. | 2026-11-10    | OpenStax, _Prealgebra 2e_, phụ lục C, dòng Square. [Geometric Formulas](https://openstax.org/books/prealgebra-2e/pages/c-geometric-formulas) |

### Đối chiếu bộ mẫu Tính giá khi mua sắm

| Pack / ID câu                                 | Cách kiểm tra đáp án của bộ Tính giá khi mua sắm                              |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `tinh-gia-khi-mua-sam` / `gia-sau-giam`       | 150.000 × (1 − 20%) = 120.000 đồng, đáp án A.                                 |
| `tinh-gia-khi-mua-sam` / `so-sanh-khuyen-mai` | Giá ở A là 180.000 đồng, ở B là 170.000 đồng. B rẻ hơn 10.000 đồng, đáp án B. |
| `tinh-gia-khi-mua-sam` / `tinh-ty-le-giam`    | (320.000 − 272.000) ÷ 320.000 = 15%, đáp án C.                                |

Giá và mức giảm trong cả ba câu là dữ kiện giả định. Công thức được đối chiếu ngày 2026-11-10 với OpenStax, _Prealgebra 2e_, mục 6.3, phần **Solve Discount Applications**, khung **Discount** và ví dụ 6.31. [Nguồn công thức](https://openstax.org/books/prealgebra-2e/pages/6-3-solve-sales-tax-commission-and-discount-applications)

## Tạo file JSON

- **Đời sống hữu ích** (`practical`), [Tính giá khi mua sắm](../../examples/question-pack-smart-shopping.json) có ba câu tiếng Việt, hai độ khó và lời giải đối chiếu trong bảng nguồn.
- **Học chuyên đề** (`academic`), [Chu vi hình vuông](../../examples/question-pack-learning.json) có một câu kèm gợi ý học tiếp.
- **Khám phá thú vị** (`discovery`), [Khởi động cùng DuoQuest](../../examples/question-pack.json) có bốn câu thuộc nhiều đề tài.

Sao chép mẫu phù hợp thành một file `.json` mã hóa UTF-8. Đặt `packId` riêng cho bộ mới, điền thông tin chung rồi thêm các đối tượng câu hỏi vào mảng `questions`. Dùng dấu ngoặc kép cho tên trường và chuỗi, ngăn phần tử bằng dấu phẩy và bỏ dấu phẩy sau phần tử cuối. JSON thuần không có chú thích hay hàng rào Markdown.

### Thuộc tính cấp bộ đề

| Trường             | Bắt buộc | Cách điền                                                                                                                        |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`    | Có       | Số nguyên `1`, chỉ phiên bản định dạng nhập. Phiên bản lưu của bộ đề do server cấp.                                              |
| `packId`           | Có       | Mã 3–80 ký tự gồm chữ thường ASCII, chữ số và dấu gạch ngang, bắt đầu bằng chữ hoặc số. Giữ mã khi cập nhật bộ của mình.         |
| `title`            | Có       | Tên hiển thị của bộ đề, 1–160 ký tự.                                                                                             |
| `language`         | Có       | Mã ngôn ngữ nội dung như `vi` hoặc `en`. Validator hiện kiểm tra độ dài 2–20 ký tự. Trường này hiển thị ở preview.               |
| `category`         | Có       | Lĩnh vực dùng để lọc bộ đề, 1–80 ký tự. Ví dụ `Toán học`.                                                                        |
| `knowledgeType`    | Tùy chọn | Nhóm kiến thức theo mục đích chính. Chọn một trong ba giá trị bên dưới.                                                          |
| `questions`        | Có       | Mảng 1–500 câu nguồn để lọc và lấy mẫu ngẫu nhiên khi chuẩn bị đề.                                                               |
| `relatedKnowledge` | Tùy chọn | Tối đa 12 gợi ý học tiếp. Mỗi mục gồm `category` (1–80 ký tự), `topic` (1–160 ký tự) và `reason` (lý do nên học, 1–4.000 ký tự). |

Thêm `"knowledgeType": "academic"` ở cấp bộ đề để gán nhóm. Dùng một nhóm theo mục đích chính của bộ.

| Giá trị     | Nhãn             | Ví dụ                                 |
| ----------- | ---------------- | ------------------------------------- |
| `academic`  | Học chuyên đề    | Học HTTP và REST theo hệ thống.       |
| `practical` | Đời sống hữu ích | Tập đọc nhãn thực phẩm.               |
| `discovery` | Khám phá thú vị  | Tìm hiểu vì sao bầu trời có màu xanh. |

Trường này tùy chọn trong JSON v1. Bộ cũ thiếu trường xuất hiện dưới nhãn **Chưa phân loại**. Khi soạn bộ mới, chọn một trong ba giá trị trong bảng. Sảnh `/play` dùng nhóm để thu hẹp thư viện trước khi lọc lĩnh vực, đề tài và độ khó.

### Thuộc tính từng câu hỏi

| Trường             | Bắt buộc | Cách điền                                                                                        |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------ |
| `id`               | Có       | Mã câu 1–100 ký tự, duy nhất trong bộ. Dùng mã này để tra bảng nguồn.                            |
| `type`             | Có       | Dùng `single_choice` cho câu có một đáp án đúng.                                                 |
| `topic`            | Có       | Đề tài của câu, ví dụ `Chu vi hình vuông`. Dùng tên nhất quán để sảnh gom câu vào cùng đề tài.   |
| `difficulty`       | Có       | Một trong `easy`, `medium`, `hard`. Chọn theo nhóm người chơi và mức suy luận cần thiết.         |
| `prompt`           | Có       | Đề bài người chơi đọc. Ghi đủ điều kiện, mốc thời gian và đơn vị nếu có.                         |
| `options`          | Có       | Đúng bốn đối tượng gồm `id` và `text`. Dùng đủ A, B, C, D và bốn nội dung khác nhau.             |
| `correctOptionId`  | Có       | Chữ cái của phương án đúng. Cập nhật trường này nếu nội dung đúng được chuyển sang chữ cái khác. |
| `explanation`      | Có       | Lời giải cho biết vì sao đáp án đúng. Có thể giải thích thêm lỗi dễ nhầm.                        |
| `hints`            | Tùy chọn | Mảng tối đa 5 gợi ý, mặc định `[]`. Khi soạn mới, dùng 3–5 gợi ý từ khái niệm đến cách làm.      |
| `tags`             | Tùy chọn | Mảng tối đa 20 nhãn, mỗi nhãn tối đa 80 ký tự, mặc định `[]`.                                    |
| `timeLimitSeconds` | Tùy chọn | Số giây nguyên từ 5 đến 120, mặc định 20.                                                        |

`topic`, `prompt`, `options[].text`, `explanation` và từng gợi ý là chuỗi từ 1 đến 4.000 ký tự sau khi bỏ khoảng trắng hai đầu. Xem [validator](../../packages/shared-types/src/question-pack.ts) để đối chiếu giới hạn và quy tắc kiểm tra trùng.

Xếp độ khó theo nhóm người chơi mục tiêu. Với bộ chuyên đề, có thể đi từ nhận biết khái niệm đến áp dụng và phân tích tình huống. Với bộ đời sống hoặc khám phá, cân nhắc số bước suy luận và ngữ cảnh cho sẵn. Một dữ kiện ít người biết vẫn có thể là câu dễ nếu đề cung cấp đủ căn cứ.

## Duyệt và nạp vào game

1. Kiểm tra bảng nguồn đủ căn cứ cho từng ID. Giải lại các câu đã sửa và đối chiếu thứ tự phương án với đáp án.
2. Tạo phiên khách hoặc đăng nhập. Mở `/packs`, dán nội dung file JSON rồi bấm **Kiểm tra & xem trước**. Giữ payload trong giới hạn 1 MB.
3. So nội dung và lời giải hiển thị với bảng nguồn. Preview kiểm tra định dạng và các ràng buộc dữ liệu. Việc duyệt độ chính xác thuộc về người soạn.
4. Bấm **Xác nhận lưu bộ đề**, sau đó vào `/play` để chọn bộ đề và chơi thử. Với mẫu **Tính giá khi mua sắm**, chọn **Đời sống hữu ích** ở **Nhóm kiến thức**, **Mua sắm** ở **Lĩnh vực** và **Tính tiền giảm giá** ở **Đề tài**. Giữ **Mọi độ khó** để chọn đủ ba câu. Nếu trùng mã với bộ của người khác hoặc thư viện hệ thống, dùng một `packId` riêng.

Khi dùng AI hỗ trợ, có thể dùng [prompt tạo bộ câu hỏi](../prompts/generate-question-pack.md) và yêu cầu trả riêng bảng nguồn cùng JSON để duyệt từng phần.

## Nạp vào thư viện chung bằng seed

1. Sau khi duyệt câu hỏi và đáp án, đặt các file QuestionPack v1 vào [thư mục seed](../../prisma/question-packs/). Mỗi file `.json` chứa một bộ đề và nằm trực tiếp trong thư mục. Với ZIP Blueprint Backend, chỉ lấy JSON từ `pack-files/`. Giữ các bảng nguồn trong `research/` và báo cáo QA trong ZIP để tra cứu khi cần.
2. Từ thư mục gốc, cấu hình `DATABASE_URL` trong `.env` cho database đích. Chạy `pnpm db:deploy` nếu database chưa áp dụng migrations, rồi chạy `pnpm db:seed`.
3. Đọc số bộ được thêm và bỏ qua trong terminal. Mở `/play`, chọn **Học chuyên đề** trong **Nhóm kiến thức** để tìm 7 bộ Backend có sẵn trong thư mục.

Seed kiểm tra tất cả JSON trước khi ghi và báo tên file nếu có lỗi định dạng hoặc trùng `packId` giữa các file. Bộ mới được thêm ở phiên bản 1 với `trusted: true`, thuộc thư viện chung và có thể dùng cho trận nhận thưởng theo luật hiện có. Chỉ đặt bộ đã duyệt vào thư mục này. Nếu database đã có bất kỳ phiên bản nào của cùng `packId`, seed bỏ qua bộ đó kể cả khi đổi tên file hoặc sửa nội dung. Bộ starter và danh mục vật phẩm tiếp tục được nạp qua cùng lệnh.
