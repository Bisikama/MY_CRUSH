# Tạo bộ câu hỏi

> **Mục đích:** Prompt tạo bộ câu hỏi theo JSON Schema của dự án.
> **Đối tượng:** Người soạn đề và agent.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-07 (sắp xếp tài liệu; các mốc kiểm chứng trong nội dung giữ nguyên).
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../../examples/question-pack.schema.json).

Tạo JSON thuần, không code fence, theo [JSON Schema](../../examples/question-pack.schema.json) và [ví dụ bộ đề](../../examples/question-pack.json). schemaVersion=1. Dùng packId slug riêng, language=vi. Mỗi câu single_choice có 4 option A–D, đúng một correctOptionId, explanation giải thích rõ và timeLimitSeconds từ 5–120. Không lặp ID, prompt hoặc nội dung option. Không dùng câu hỏi có đáp án mơ hồ hoặc kiến thức không chắc chắn. Nội dung sẽ được người dùng duyệt lại trước khi import; không coi AI là nguồn kiểm chứng cuối cùng.
