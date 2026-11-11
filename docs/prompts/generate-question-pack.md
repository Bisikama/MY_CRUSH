# Tạo bộ câu hỏi

> **Mục đích:** Hướng dẫn ChatGPT phân loại câu hỏi và xuất các file JSON dùng được trong DuoQuest.
> **Đối tượng:** Người soạn đề và trợ lý AI.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-11.
> **Liên quan:** [Mục lục](../README.md), [Đặc tả bộ câu hỏi](../features/question-packs.md), [JSON Schema](../../examples/question-pack.schema.json).

Gửi file Markdown này cho ChatGPT cùng tài liệu nguồn hoặc danh sách câu hỏi thô. Có thể kèm câu lệnh sau.

> Hãy chuyển tài liệu đính kèm thành các bộ câu hỏi DuoQuest theo hướng dẫn này. Đối tượng là [nhóm người chơi], mục tiêu là [đố vui, học luyện hoặc cả hai], số câu mong muốn là [số câu]. Trả bảng phân loại và từng file JSON riêng. Đánh dấu các câu cần mình xác minh trước khi đưa vào pack.

## Phân loại trước khi viết JSON

| Luồng mục tiêu       | `knowledgeType` | Dùng cho                                                      |
| -------------------- | --------------- | ------------------------------------------------------------- |
| Đố vui thử thách     | `discovery`     | Khám phá, kiến thức phổ thông, văn hóa, âm nhạc, câu đố logic |
| Đố vui thử thách     | `practical`     | Kiến thức có thể áp dụng trong sinh hoạt, mua sắm, nấu ăn     |
| Học luyện chuyên môn | `academic`      | Kiến thức theo môn học, lộ trình hoặc kỹ năng nghề nghiệp     |

1. Nhóm câu theo cặp **`knowledgeType` + `category`**. Tách thành file riêng khi đổi nhóm kiến thức hoặc lĩnh vực. Một file có một `packId` duy nhất và chứa được nhiều `topic`. Chẳng hạn, pack `am-thuc-viet-do-vui` có thể chứa chủ đề Món miền Trung và Món miền Nam. Pack `backend-http-hoc-luyen` có thể chứa chủ đề HTTP Status và HTTP Method.
2. Dùng `category` ở cấp pack cho **Lĩnh vực**, `topic` ở cấp câu cho **Chủ đề**. Dùng cùng một tên cho cùng một lĩnh vực hoặc chủ đề qua các pack để bộ lọc gom đúng câu. Khi có danh mục hoặc pack cũ, ưu tiên dùng lại nhãn đang có.
3. Gán `difficulty` cho từng câu theo đối tượng học. `easy` kiểm tra nhận biết, `medium` yêu cầu áp dụng hoặc suy luận một bước, `hard` cần phân tích hoặc nhiều bước. Giao diện dùng Hỗn hợp để lấy câu từ cả ba mức. JSON của từng câu chỉ dùng `easy`, `medium` hoặc `hard`.
4. Với câu đố vui, ưu tiên câu ngắn và đủ dữ kiện để chơi cùng nhau. Với câu học luyện, bám mục tiêu học, dùng phương án nhiễu phản ánh lỗi dễ mắc và giải thích nguyên tắc sau khi trả lời. Mỗi câu có đúng một đáp án tốt nhất. Có thể viết 3–5 gợi ý từ khái niệm đến cách suy luận, tránh nêu đáp án.

## Định dạng đầu ra

- Trả bảng phân loại riêng gồm tên file, `packId`, `knowledgeType`, `category`, các `topic` và số câu theo độ khó. Ghi nguồn và câu cần xác minh ở ngoài JSON, đối chiếu theo `packId` và `id` câu.
- Mỗi file là một object JSON thuần UTF-8. Dùng `schemaVersion: 1`, `packId` chữ thường ASCII dài 3–80 ký tự, gồm chữ, số hoặc dấu gạch ngang và bắt đầu bằng chữ hoặc số. Điền `title`, `language`, `knowledgeType`, `category` và mảng `questions` từ 1–500 câu. Đặt tên file `<packId>.v1.json`.
- Mỗi câu có `id` duy nhất trong pack, `type: "single_choice"`, `topic`, `difficulty`, `prompt`, bốn `options` với ID A–D và nội dung khác nhau, `correctOptionId` trỏ đến một trong các lựa chọn, và `explanation`. Có thể thêm `hints` tối đa 5 mục, `tags` tối đa 20 mục và `timeLimitSeconds` từ 5–120, mặc định 20. `relatedKnowledge` là trường tùy chọn cấp pack để gợi ý nội dung học tiếp.
- Soát câu trùng nội dung trong và giữa các file. Giữ đủ dữ kiện trong đề bài, kiểm tra đáp án và lời giải. Chỉ dùng field có trong schema. `trusted`, `ownerId`, `version`, `mode` và `source` không thuộc file QuestionPack.

## Mẫu Đố vui

Với câu nhìn hình, thêm tối đa bốn phần tử `{ "src": "/images/quiz/food/7b3a90.webp", "alt": "Bát mì vàng với tôm và rau" }` vào mảng `images` của câu. Dùng đường dẫn tới file người soạn đã cung cấp hoặc URL CDN HTTPS đã được cấu hình. Giữ `alt` mô tả dấu hiệu trong ảnh. Các câu cùng đề bài được phân biệt theo tập đường dẫn ảnh. [Quy tắc ảnh và lưu trữ](../features/question-packs.md#câu-hỏi-có-ảnh)

```json
{
  "schemaVersion": 1,
  "packId": "am-thuc-viet-do-vui",
  "title": "Đố vui ẩm thực Việt",
  "language": "vi",
  "knowledgeType": "discovery",
  "category": "Ẩm thực Việt",
  "questions": [
    {
      "id": "q01",
      "type": "single_choice",
      "topic": "Món ăn miền Trung",
      "difficulty": "easy",
      "prompt": "Mì Quảng gắn với vùng đất nào?",
      "options": [
        { "id": "A", "text": "Quảng Nam" },
        { "id": "B", "text": "Bến Tre" },
        { "id": "C", "text": "Lạng Sơn" },
        { "id": "D", "text": "Hà Nội" }
      ],
      "correctOptionId": "A",
      "explanation": "Mì Quảng là món ăn đặc trưng của xứ Quảng."
    }
  ]
}
```

## Mẫu Học luyện

```json
{
  "schemaVersion": 1,
  "packId": "backend-http-hoc-luyen",
  "title": "Học luyện HTTP cơ bản",
  "language": "vi",
  "knowledgeType": "academic",
  "category": "Backend",
  "questions": [
    {
      "id": "q01",
      "type": "single_choice",
      "topic": "HTTP Status",
      "difficulty": "easy",
      "prompt": "Mã trạng thái HTTP nào biểu thị tài nguyên đã được tạo thành công?",
      "options": [
        { "id": "A", "text": "204" },
        { "id": "B", "text": "201" },
        { "id": "C", "text": "404" },
        { "id": "D", "text": "500" }
      ],
      "correctOptionId": "B",
      "explanation": "201 Created cho biết yêu cầu đã thành công và đã tạo tài nguyên mới."
    }
  ]
}
```

## Nạp và kiểm tra trong DuoQuest

1. Duyệt nội dung và thử kiểm tra định dạng qua **Bộ câu hỏi → Kiểm tra & xem trước** tại `/packs`. Bước xác nhận lưu trên trang này tạo pack riêng, có thể chọn ở Học luyện.
2. Để đưa vào thư viện chung, đặt file đã duyệt trực tiếp trong `prisma/question-packs/` và chạy `pnpm db:seed` với database của dự án. Seed tự đặt `trusted: true` và bỏ qua `packId` đã tồn tại. [Quy trình nạp thư viện](../features/question-packs.md#nạp-vào-thư-viện-chung-bằng-seed)
3. Trong PostgreSQL, mỗi phiên bản là một bản ghi `QuizQuestionPack`. Các trường `knowledgeType`, `category` và mảng `questions` nằm trong JSON `content`. **Đố vui** chỉ bốc từ pack thư viện đã duyệt thuộc `discovery` hoặc `practical`, ghép tối đa 20 câu. **Học luyện** cho chọn một pack có quyền dùng và bốc câu trong pack đó. Chọn nhóm **Học chuyên đề** để tìm các pack `academic`. [Mô hình dữ liệu](../architecture/data-model.md)
