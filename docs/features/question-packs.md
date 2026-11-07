# Bộ câu hỏi JSON

> **Mục đích:** Định dạng và quy trình sử dụng bộ câu hỏi JSON.
> **Đối tượng:** Người soạn đề, lập trình viên và QA.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-07 (sắp xếp tài liệu; các mốc kiểm chứng trong nội dung giữ nguyên).
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../../examples/question-pack.schema.json).

Nguồn chuẩn: `packages/shared-types/src/question-pack.ts`. Ví dụ: `examples/question-pack.json`. JSON Schema: `examples/question-pack.schema.json`, sinh bằng `pnpm exec tsx scripts/export-question-schema.ts`. Khi sửa Zod phải sinh lại schema.

Pipeline web/API: parse → Zod validation + business validation → preview (không ghi) → người dùng duyệt → xác nhận lưu phiên bản mới. Không gọi AI tích hợp trong app. Nội dung đưa vào UI dưới dạng text, không render HTML từ pack.

schemaVersion=1, packId dạng slug, title/language/category, 1–500 questions. Mỗi question `single_choice`, 4 options ID A–D, topic/difficulty/prompt/correctOptionId/explanation; hints/tags tùy chọn, timer 5–120 giây. Strict objects từ chối field lạ. Limit upload tổng 1MB.

Business validation phát hiện ID trùng, option ID/text trùng, prompt trùng sau chuẩn hóa Unicode/case/whitespace, answer không tồn tại. JSON Schema mô tả cấu trúc; các bất biến liên trường vẫn phải chạy Zod/business validation. Không khẳng định tự kiểm tra được tính đúng kiến thức.

packId đã thuộc người khác/trusted library không được guest chiếm lại. Cùng chủ sở hữu cập nhật tạo version mới, không ghi đè version đã có. Shared lobby chọn pack version ID, không chọn slug có thể đổi nội dung.
