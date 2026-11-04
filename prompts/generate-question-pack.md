# Tạo bộ câu hỏi

Tạo JSON thuần, không code fence, theo examples/question-pack.schema.json và ví dụ question-pack.json. schemaVersion=1. Dùng packId slug riêng, language=vi. Mỗi câu single_choice có 4 option A–D, đúng một correctOptionId, explanation giải thích rõ và timeLimitSeconds từ 5–120. Không lặp ID, prompt hoặc nội dung option. Không dùng câu hỏi có đáp án mơ hồ hoặc kiến thức không chắc chắn. Nội dung sẽ được người dùng duyệt lại trước khi import; không coi AI là nguồn kiểm chứng cuối cùng.
