'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, Card } from '../../ui';
import {
  matchesQuestion,
  knowledgeKey,
  knowledgeTypeSchema,
  type Difficulty,
  type GameMode,
  type GameLayout,
  type PackSummary,
  type QuestionFilter,
  type QuizSelection,
  type CasualCatalog,
  type CasualCustomSelection,
} from '@duoquest/shared-types';
import { useI18n } from '../../i18n';
import type { GameIdentity } from '../../lib/client';
import { getKnowledgeTypeLabel, type KnowledgeTypeFilter } from '../../lib/knowledge-type';
import { CasualFilters } from './casual-filters';
import { matchesLabCasual } from '../../mock/packs';

interface Props {
  selectionType: QuizSelection['type'];
  setSelectionType: (value: QuizSelection['type']) => void;
  casualCatalog: CasualCatalog;
  casualSelection: CasualCustomSelection;
  setCasualSelection: (value: CasualCustomSelection) => void;
  identity: GameIdentity;
  resumeCode: string | null;
  mode: GameMode;
  setMode: (value: GameMode) => void;
  layout: GameLayout;
  setLayout: (value: GameLayout) => void;
  packs: PackSummary[];
  hasUnclassifiedPacks: boolean;
  knowledgeType: KnowledgeTypeFilter;
  setKnowledgeType: (value: KnowledgeTypeFilter) => void;
  packId: string;
  setPackId: (value: string) => void;
  filter: QuestionFilter;
  setFilter: (value: QuestionFilter) => void;
  secondNickname: string;
  setSecondNickname: (value: string) => void;
  joinCode: string;
  setJoinCode: (value: string) => void;
  busy: boolean;
  connected: boolean;
  notice: ReactNode;
  createRoom: () => Promise<void>;
  joinRoom: () => Promise<void>;
  leaveRoom: (code: string) => Promise<void>;
}

const MODE_OPTIONS = [
  { id: 'SOLO' as const, icon: '01' },
  { id: 'DUEL' as const, icon: '02' },
  { id: 'COOP' as const, icon: '∞' },
];

export function QuizSetup({
  selectionType,
  setSelectionType,
  casualCatalog,
  casualSelection,
  setCasualSelection,
  identity,
  resumeCode,
  mode,
  setMode,
  layout,
  setLayout,
  packs,
  hasUnclassifiedPacks,
  knowledgeType,
  setKnowledgeType,
  packId,
  setPackId,
  filter,
  setFilter,
  secondNickname,
  setSecondNickname,
  joinCode,
  setJoinCode,
  busy,
  connected,
  notice,
  createRoom,
  joinRoom,
  leaveRoom,
}: Props) {
  const { locale, localeMeta, t } = useI18n();

  const casualCount = casualCatalog.reduce(
    (count, row) =>
      count +
      (selectionType !== 'CASUAL_CUSTOM' || matchesLabCasual(row.category, row, casualSelection)
        ? row.count
        : 0),
    0,
  );
  const distinct = (values: string[]) =>
    [...new Map(values.map((value) => [knowledgeKey(value), value])).values()].sort((a, b) =>
      a.localeCompare(b, localeMeta.code),
    );
  const categories = distinct(packs.map((pack) => pack.category));
  const topics = distinct(
    packs
      .filter(
        (pack) => !filter.category || knowledgeKey(pack.category) === knowledgeKey(filter.category),
      )
      .flatMap((pack) => pack.groups.map((group) => group.topic)),
  );
  const choices = packs
    .map((pack) => ({
      pack,
      count: pack.groups
        .filter((group) => matchesQuestion(pack.category, group, filter))
        .reduce((total, group) => total + group.count, 0),
    }))
    .filter(({ count }) => count > 0);
  const selected = choices.find(({ pack }) => pack.id === packId);

  return (
    <>
      {resumeCode && (
        <Card>
          <h2>{t('quiz.setup.resumeTitle', { code: resumeCode })}</h2>
          <div className="actions">
            <Button asChild>
              <Link href={`/play/${resumeCode}`}>{t('quiz.setup.resumeButton')}</Link>
            </Button>
            <Button
              variant="outline"
              disabled={busy || !connected}
              onClick={() => void leaveRoom(resumeCode)}
            >
              {t('quiz.setup.leaveCurrentButton')}
            </Button>
          </div>
        </Card>
      )}
      <div className="hero">
        <div>
          <p className="eyebrow">
            {t('quiz.setup.heroEyebrow', {
              nickname: identity.nickname.toLocaleUpperCase(localeMeta.code),
            })}
          </p>
          <h1>
            {t('quiz.setup.heroTitleLine1')}
            <br />
            {t('quiz.setup.heroTitleLine2Prefix')}
            <em>{t('quiz.setup.heroTitleLine2Em')}</em>
          </h1>
          <p className="lead">
            {t('quiz.setup.heroLeadLine1')}
            <br />
            {t('quiz.setup.heroLeadLine2')}
          </p>
        </div>
        <div className="quiz-illustration" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="quiz-tile">
            Q<span>✦</span>
          </span>
          <b className="floating-pill">{t('quiz.setup.floatingPill')}</b>
          <i className="spark">✧</i>
        </div>
      </div>
      <div className="section-heading">
        <h2>{t('quiz.setup.sectionHeading')}</h2>
        <span>{t('quiz.setup.sectionMeta')}</span>
      </div>
      <div className="mode-grid">
        {MODE_OPTIONS.map((item) => (
          <button
            key={item.id}
            className={`mode-card ${mode === item.id ? 'selected' : ''}`}
            onClick={() => setMode(item.id)}
            aria-pressed={mode === item.id}
          >
            <span className="mode-icon">{item.icon}</span>
            <span className="mode-title">
              {t(`quiz.modes.${item.id}.title`)}
              <span className="radio" />
            </span>
            <strong>{t(`quiz.modes.${item.id}.subtitle`)}</strong>
            <p>{t(`quiz.modes.${item.id}.description`)}</p>
          </button>
        ))}
      </div>
      <div className="setup-grid">
        <Card>
          <span className="tag">{t('quiz.setup.cardTag')}</span>
          <h2>{t('quiz.setup.cardTitle')}</h2>
          <div className="form-grid">
            <div>
              <label htmlFor="quiz-experience">{t('quiz.setup.experienceLabel')}</label>
              <select
                id="quiz-experience"
                value={selectionType === 'STUDY' ? 'STUDY' : 'CASUAL'}
                onChange={(event) =>
                  setSelectionType(event.target.value === 'STUDY' ? 'STUDY' : 'CASUAL_RANDOM')
                }
              >
                <option value="CASUAL">{t('quiz.setup.experienceCasual')}</option>
                <option value="STUDY">{t('quiz.setup.experienceStudy')}</option>
              </select>
            </div>
            {mode !== 'SOLO' && (
              <div>
                <label htmlFor="layout">{t('quiz.setup.layoutLabel')}</label>
                <select
                  id="layout"
                  value={layout}
                  onChange={(event) => setLayout(event.target.value as GameLayout)}
                >
                  <option value="MULTI_DEVICE">{t('quiz.setup.layoutMultiDevice')}</option>
                  <option value="SHARED_SCREEN">{t('quiz.setup.layoutSharedScreen')}</option>
                </select>
              </div>
            )}
            {selectionType !== 'STUDY' && (
              <div>
                <label htmlFor="casual-method">{t('quiz.setup.casualMethodLabel')}</label>
                <select
                  id="casual-method"
                  value={selectionType}
                  onChange={(event) =>
                    setSelectionType(event.target.value as QuizSelection['type'])
                  }
                >
                  <option value="CASUAL_RANDOM">{t('quiz.setup.casualRandom')}</option>
                  <option value="CASUAL_CUSTOM">{t('quiz.setup.casualCustom')}</option>
                </select>
              </div>
            )}
            {selectionType === 'CASUAL_CUSTOM' && (
              <CasualFilters
                catalog={casualCatalog}
                selection={casualSelection}
                onChange={setCasualSelection}
              />
            )}
            {selectionType === 'STUDY' && (
              <>
                <div>
                  <label htmlFor="pack-knowledge-type">{t('quiz.setup.knowledgeTypeLabel')}</label>
                  <select
                    id="pack-knowledge-type"
                    value={knowledgeType}
                    onChange={(event) =>
                      setKnowledgeType(event.target.value as KnowledgeTypeFilter)
                    }
                  >
                    <option value="all">{t('common.knowledgeType.all')}</option>
                    {knowledgeTypeSchema.options.map((value) => (
                      <option key={value} value={value}>
                        {getKnowledgeTypeLabel(value, locale)}
                      </option>
                    ))}
                    {hasUnclassifiedPacks && (
                      <option value="unclassified">
                        {getKnowledgeTypeLabel('unclassified', locale)}
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="pack-category">{t('quiz.setup.categoryLabel')}</label>
                  <select
                    id="pack-category"
                    value={filter.category ?? ''}
                    onChange={(event) =>
                      setFilter({
                        ...filter,
                        category: event.target.value || undefined,
                        topic: undefined,
                      })
                    }
                  >
                    <option value="">{t('quiz.setup.allCategories')}</option>
                    {categories.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pack-topic">{t('quiz.setup.topicLabel')}</label>
                  <select
                    id="pack-topic"
                    value={filter.topic ?? ''}
                    onChange={(event) =>
                      setFilter({ ...filter, topic: event.target.value || undefined })
                    }
                  >
                    <option value="">{t('quiz.setup.allTopics')}</option>
                    {topics.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pack-difficulty">{t('quiz.setup.difficultyLabel')}</label>
                  <select
                    id="pack-difficulty"
                    value={filter.difficulty ?? ''}
                    onChange={(event) =>
                      setFilter({
                        ...filter,
                        difficulty: (event.target.value || undefined) as Difficulty | undefined,
                      })
                    }
                  >
                    <option value="">{t('common.difficulty.any')}</option>
                    <option value="easy">{t('common.difficulty.easy')}</option>
                    <option value="medium">{t('common.difficulty.medium')}</option>
                    <option value="hard">{t('common.difficulty.hard')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pack">{t('quiz.setup.packLabel')}</label>
                  <select
                    id="pack"
                    value={selected?.pack.id ?? ''}
                    onChange={(event) => setPackId(event.target.value)}
                  >
                    <option value="" disabled>
                      {t('quiz.setup.selectPackPlaceholder')}
                    </option>
                    {choices.map(({ pack, count }) => (
                      <option key={pack.id} value={pack.id}>
                        {t('quiz.setup.packOptionCount', { title: pack.title, count })}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          {selectionType === 'CASUAL_RANDOM' && (
            <p className="small">{t('quiz.setup.casualRandomHint')}</p>
          )}
          {selectionType === 'CASUAL_CUSTOM' && casualCatalog.length > 0 && (
            <p className="small" role="status">
              {casualCount
                ? t('quiz.setup.casualCustomCount', { count: casualCount })
                : t('quiz.setup.casualCustomEmpty')}
            </p>
          )}
          {selectionType !== 'STUDY' && !casualCatalog.length && (
            <p role="status">{t('quiz.setup.casualLibraryEmpty')}</p>
          )}
          {selectionType === 'STUDY' && !choices.length && (
            <p role="status">{t('quiz.setup.studyPacksEmpty')}</p>
          )}
          {selectionType === 'STUDY' && selected && (
            <p className="small">{getKnowledgeTypeLabel(selected.pack.knowledgeType, locale)}</p>
          )}
          {selectionType === 'STUDY' &&
            selected?.pack.relatedKnowledge.map(({ category, topic, reason }, index) => {
              const match = categories.find(
                (value) => knowledgeKey(value) === knowledgeKey(category),
              );
              return (
                <p className="small" key={index}>
                  {match ? (
                    <button type="button" onClick={() => setFilter({ category: match })}>
                      {category}
                    </button>
                  ) : (
                    category
                  )}
                  {' · '}
                  {topic} — {reason}
                </p>
              );
            })}
          {layout === 'SHARED_SCREEN' && mode !== 'SOLO' && (
            <>
              <label htmlFor="second">{t('quiz.setup.secondNicknameLabel')}</label>
              <input
                id="second"
                value={secondNickname}
                onChange={(event) => setSecondNickname(event.target.value)}
                minLength={2}
                maxLength={30}
              />
              <p className="small muted" style={{ marginTop: -8, marginBottom: 14 }}>
                {t('quiz.setup.secondNicknameNote')}
              </p>
            </>
          )}
          <Button
            onClick={() => void createRoom()}
            disabled={busy || !connected || (selectionType === 'STUDY' ? !selected : !casualCount)}
          >
            {mode === 'SOLO' ? t('quiz.setup.createSolo') : t('quiz.setup.createRoom')}
          </Button>
          <p className="small muted">
            {connected ? t('quiz.setup.serverConnected') : t('quiz.setup.serverConnecting')} ·{' '}
            {t('quiz.setup.serverAuthoritativeNote')}
          </p>
        </Card>
        <Card className="join-card">
          <span className="tag">{t('quiz.setup.joinTag')}</span>
          <h2>{t('quiz.setup.joinTitle')}</h2>
          <p>{t('quiz.setup.joinDesc')}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void joinRoom();
            }}
          >
            <label htmlFor="room-code">{t('quiz.setup.roomCodeLabel')}</label>
            <input
              id="room-code"
              className="code-input"
              placeholder="ABC234"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <Button variant="outline" disabled={busy || !connected || joinCode.length !== 6}>
              {t('quiz.setup.joinButton')}
            </Button>
          </form>
        </Card>
      </div>
      {notice}
    </>
  );
}
