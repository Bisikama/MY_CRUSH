'use client';
import { useState } from 'react';
import { Button, Card } from '../../../ui';
import { questionPackSchema, type QuestionPack } from '@duoquest/shared-types';
import { api, loadIdentity } from '../../../lib/client';
import { knowledgeTypeLabels } from '../../../lib/knowledge-type';
import { QuestionImages } from '../../../features/quiz/question-images';

export default function PacksPage() {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<QuestionPack | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function validate() {
    setBusy(true);
    setMessage('');
    setPreview(null);
    try {
      const identity = await loadIdentity();
      if (!identity) throw new Error('Hãy tạo hồ sơ khách tại trang Chơi trước.');
      const pack = questionPackSchema.parse(JSON.parse(raw));
      const data = await api<{ pack: QuestionPack; warning: string }>(
        '/question-packs/preview',
        pack,
      );
      setPreview(data.pack);
      setMessage(data.warning);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'JSON không hợp lệ');
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!preview) return;
    setBusy(true);
    try {
      await api('/question-packs', preview);
      setMessage('Đã lưu phiên bản bộ đề. Bạn có thể chọn bộ đề này khi tạo phòng.');
      setPreview(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="narrow">
      <p className="eyebrow">THƯ VIỆN CỦA BẠN</p>
      <h1>
        Mang câu hỏi
        <br />
        của bạn <em>vào cuộc chơi.</em>
      </h1>
      <p className="lead">
        Dán bộ đề JSON schemaVersion 1, kiểm tra rồi duyệt nội dung trước khi lưu.
      </p>
      <Card>
        <label htmlFor="pack-json">Nội dung JSON</label>
        <textarea
          id="pack-json"
          rows={14}
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value);
            setPreview(null);
          }}
          placeholder={'{ "schemaVersion": 1, "packId": "my-pack", ... }'}
        />
        <Button disabled={busy || !raw.trim()} onClick={() => void validate()}>
          Kiểm tra & xem trước
        </Button>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </Card>
      {preview && (
        <Card>
          <h2>{preview.title}</h2>
          <p>
            {preview.questions.length} câu · {preview.language} · {preview.category} ·{' '}
            {knowledgeTypeLabels[preview.knowledgeType ?? 'unclassified']}
          </p>
          {!!preview.relatedKnowledge?.length && (
            <div>
              <h3>Kiến thức bổ sung</h3>
              <ul>
                {preview.relatedKnowledge.map(({ category, topic, reason }, index) => (
                  <li key={index}>
                    <strong>
                      {category} · {topic}
                    </strong>{' '}
                    — {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.questions.map((question, index) => (
            <details key={question.id}>
              <summary>
                {index + 1}. {question.prompt}
              </summary>
              <QuestionImages images={question.images} lazy />
              <p>
                Đáp án {question.correctOptionId}:{' '}
                {question.options.find((o) => o.id === question.correctOptionId)?.text}
              </p>
              <p>{question.explanation}</p>
              <p>
                {question.topic} · {question.difficulty} · {question.hints.length} gợi ý
              </p>
              {!!question.hints.length && (
                <ol>
                  {question.hints.map((hint, i) => (
                    <li key={i}>{hint}</li>
                  ))}
                </ol>
              )}
              {question.hints.length < 3 && <p>Chuẩn soạn đề mới khuyến nghị 3–5 gợi ý.</p>}
            </details>
          ))}
          <p className="small muted">
            Xác nhận bạn đã kiểm tra nội dung. Lưu sẽ tạo phiên bản mới; các trận đang chơi giữ
            snapshot cũ.
          </p>
          <Button disabled={busy} onClick={() => void save()}>
            Xác nhận lưu bộ đề
          </Button>
        </Card>
      )}
    </div>
  );
}
