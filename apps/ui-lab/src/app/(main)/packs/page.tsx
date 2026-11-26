'use client';
import { useState } from 'react';
import { Button, Card } from '../../../ui';
import { questionPackSchema, type QuestionPack } from '@duoquest/shared-types';
import { useI18n } from '../../../i18n';
import { api, loadIdentity } from '../../../lib/client';
import { getKnowledgeTypeLabel } from '../../../lib/knowledge-type';
import { QuestionImages } from '../../../features/quiz/question-images';

export default function PacksPage() {
  const { locale, t } = useI18n();
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
      if (!identity) throw new Error(t('packs.guestRequiredError'));
      const pack = questionPackSchema.parse(JSON.parse(raw));
      const data = await api<{ pack: QuestionPack; warning: string }>(
        '/question-packs/preview',
        pack,
      );
      setPreview(data.pack);
      setMessage(data.warning);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('packs.invalidJsonError'));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!preview) return;
    setBusy(true);
    try {
      await api('/question-packs', preview);
      setMessage(t('packs.savedMessage'));
      setPreview(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('packs.saveFailedError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow">
      <p className="eyebrow">{t('packs.eyebrow')}</p>
      <h1>
        {t('packs.titleLine1')}
        <br />
        {t('packs.titleLine2Prefix')}
        <em>{t('packs.titleLine2Em')}</em>
      </h1>
      <p className="lead">{t('packs.lead')}</p>
      <Card>
        <label htmlFor="pack-json">{t('packs.jsonLabel')}</label>
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
          {t('packs.validateButton')}
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
            {t('packs.previewSummary', {
              count: preview.questions.length,
              language: preview.language,
              category: preview.category,
              knowledgeType: getKnowledgeTypeLabel(preview.knowledgeType, locale),
            })}
          </p>
          {!!preview.relatedKnowledge?.length && (
            <div>
              <h3>{t('packs.relatedKnowledgeTitle')}</h3>
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
                {t('packs.answerPrefix', { optionId: question.correctOptionId })}{' '}
                {question.options.find((o) => o.id === question.correctOptionId)?.text}
              </p>
              <p>{question.explanation}</p>
              <p>
                {t('packs.questionMeta', {
                  topic: question.topic,
                  difficulty: question.difficulty,
                  hintsCount: question.hints.length,
                })}
              </p>
              {!!question.hints.length && (
                <ol>
                  {question.hints.map((hint, i) => (
                    <li key={i}>{hint}</li>
                  ))}
                </ol>
              )}
              {question.hints.length < 3 && <p>{t('packs.hintsRecommendation')}</p>}
            </details>
          ))}
          <p className="small muted">{t('packs.confirmNote')}</p>
          <Button disabled={busy} onClick={() => void save()}>
            {t('packs.saveButton')}
          </Button>
        </Card>
      )}
    </div>
  );
}
