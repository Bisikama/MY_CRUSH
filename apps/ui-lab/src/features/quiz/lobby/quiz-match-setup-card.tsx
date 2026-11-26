'use client';

import {
  knowledgeKey,
  knowledgeTypeSchema,
  type CasualCatalog,
  type CasualCustomSelection,
  type Difficulty,
  type GameLayout,
  type GameMode,
  type PackSummary,
  type QuestionFilter,
  type QuizSelection,
} from '@duoquest/shared-types';
import { useI18n } from '../../../i18n';
import { getKnowledgeTypeLabel, type KnowledgeTypeFilter } from '../../../lib/knowledge-type';
import { CasualFilters } from '../casual-filters';
import styles from './quiz-lobby-setup.module.css';

export interface PackChoice {
  pack: PackSummary;
  count: number;
}

interface QuizMatchSetupCardProps {
  mode: GameMode;
  layout: GameLayout;
  setLayout: (value: GameLayout) => void;
  selectionType: QuizSelection['type'];
  setSelectionType: (value: QuizSelection['type']) => void;
  casualCatalog: CasualCatalog;
  casualSelection: CasualCustomSelection;
  setCasualSelection: (value: CasualCustomSelection) => void;
  casualCount: number;
  hasUnclassifiedPacks: boolean;
  knowledgeType: KnowledgeTypeFilter;
  setKnowledgeType: (value: KnowledgeTypeFilter) => void;
  categories: string[];
  topics: string[];
  choices: PackChoice[];
  selected: PackChoice | undefined;
  setPackId: (value: string) => void;
  filter: QuestionFilter;
  setFilter: (value: QuestionFilter) => void;
  secondNickname: string;
  setSecondNickname: (value: string) => void;
  busy: boolean;
  connected: boolean;
  createRoom: () => Promise<void>;
}

function CasualStarIcon() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden="true">
      <path
        d="M16 3L19.6 11.1L28.5 12L21.8 17.9L23.8 26.7L16 22.1L8.2 26.7L10.2 17.9L3.5 12L12.4 11.1L16 3Z"
        fill="#FFF4B8"
        stroke="#C46B00"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StudyCapIcon() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true">
      <path d="M16 6L3 12.5L16 19L29 12.5L16 6Z" fill="#FFFFFF" />
      <path
        d="M8 16.5V22.5C8 24.5 11.6 26.2 16 26.2C20.4 26.2 24 24.5 24 22.5V16.5"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M27 14V21.5" stroke="#FFE98A" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function LanDevicesIcon() {
  return (
    <svg viewBox="0 0 36 30" width="34" height="28" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="#FFFFFF" strokeWidth="2.4" fill="rgba(255,255,255,0.22)" />
      <path d="M9 23H15" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="24" y="10" width="9" height="14" rx="2" stroke="#FFFFFF" strokeWidth="2.2" fill="rgba(255,255,255,0.26)" />
      <path d="M24 6C26 4 29 4 31 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SharedScreenIcon() {
  return (
    <svg viewBox="0 0 34 28" width="30" height="26" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="30" height="19" rx="3.5" stroke="#FFFFFF" strokeWidth="2.4" fill="rgba(255,255,255,0.2)" />
      <path d="M17 4V21" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 2.5" />
      <path d="M12 26H22" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 3-Step Gamified Match Setup Panel (Variant 2B Polished):
 * - Step 1 (Pink): Glossy 3D color-coded buttons for Experience & Play Space
 * - Step 2 (Sky): Pastel blue filter tray with pill selects, Pack & Player 2 inputs
 * - Step 3 (Mint): Full-width Honey-Gold 3D "Create Room" CTA + Connected pill
 */
export function QuizMatchSetupCard({
  mode,
  layout,
  setLayout,
  selectionType,
  setSelectionType,
  casualCatalog,
  casualSelection,
  setCasualSelection,
  casualCount,
  hasUnclassifiedPacks,
  knowledgeType,
  setKnowledgeType,
  categories,
  topics,
  choices,
  selected,
  setPackId,
  filter,
  setFilter,
  secondNickname,
  setSecondNickname,
  busy,
  connected,
  createRoom,
}: QuizMatchSetupCardProps) {
  const { locale, t } = useI18n();
  const isStudy = selectionType === 'STUDY';
  const isCasual = !isStudy;

  return (
    <section className={styles.setupPanel} aria-label={t('quiz.setup.cardTitle')}>
      {/* STEP 1: Experience & Play Space Glossy 3D Buttons */}
      <div className={styles.stepRow}>
        <span className={`${styles.stepNumBadge} ${styles.stepNumPink}`} aria-hidden="true">
          1
        </span>

        <div className={styles.dualSelectorGrid}>
          {/* Experience Group */}
          <div className={styles.selectorGroup}>
            <label htmlFor="quiz-experience" className={styles.selectorGroupLabel}>
              {t('quiz.setup.experienceLabel')}
            </label>
            <select
              id="quiz-experience"
              className="sr-only"
              value={isStudy ? 'STUDY' : 'CASUAL'}
              onChange={(event) =>
                setSelectionType(event.target.value === 'STUDY' ? 'STUDY' : 'CASUAL_RANDOM')
              }
            >
              <option value="CASUAL">{t('quiz.setup.experienceCasual')}</option>
              <option value="STUDY">{t('quiz.setup.experienceStudy')}</option>
            </select>

            <div className={styles.tilePair}>
              <button
                type="button"
                aria-pressed={isCasual}
                className={`${styles.choiceTile} ${styles.tileApricot} ${
                  isCasual ? styles.tileActive : ''
                }`}
                onClick={() => {
                  if (isStudy) setSelectionType('CASUAL_RANDOM');
                }}
              >
                {isCasual && (
                  <span className={styles.tileSelectedPill}>{t('quiz.setup.selectedBadge')}</span>
                )}
                <span className={styles.tileIconWrap}>
                  <CasualStarIcon />
                </span>
                <span className={styles.tileTitle}>{t('quiz.setup.experienceCasual')}</span>
              </button>

              <button
                type="button"
                aria-pressed={isStudy}
                className={`${styles.choiceTile} ${styles.tileEmerald} ${
                  isStudy ? styles.tileActive : ''
                }`}
                onClick={() => setSelectionType('STUDY')}
              >
                {isStudy && (
                  <span className={styles.tileSelectedPill}>{t('quiz.setup.selectedBadge')}</span>
                )}
                <span className={styles.tileIconWrap}>
                  <StudyCapIcon />
                </span>
                <span className={styles.tileTitle}>{t('quiz.setup.experienceStudy')}</span>
              </button>
            </div>
          </div>

          <div className={styles.dualDivider} aria-hidden="true" />

          {/* Play Space Group */}
          <div className={styles.selectorGroup}>
            {mode !== 'SOLO' ? (
              <>
                <label htmlFor="layout" className={styles.selectorGroupLabel}>
                  {t('quiz.setup.layoutLabel')}
                </label>
                <select
                  id="layout"
                  className="sr-only"
                  value={layout}
                  onChange={(event) => setLayout(event.target.value as GameLayout)}
                >
                  <option value="MULTI_DEVICE">{t('quiz.setup.layoutMultiDevice')}</option>
                  <option value="SHARED_SCREEN">{t('quiz.setup.layoutSharedScreen')}</option>
                </select>

                <div className={styles.tilePair}>
                  <button
                    type="button"
                    aria-pressed={layout === 'MULTI_DEVICE'}
                    className={`${styles.choiceTile} ${styles.tileAzure} ${
                      layout === 'MULTI_DEVICE' ? styles.tileActive : ''
                    }`}
                    onClick={() => setLayout('MULTI_DEVICE')}
                  >
                    {layout === 'MULTI_DEVICE' && (
                      <span className={styles.tileSelectedPill}>
                        {t('quiz.setup.selectedBadge')}
                      </span>
                    )}
                    <span className={styles.tileIconWrap}>
                      <LanDevicesIcon />
                    </span>
                    <span className={styles.tileTitle}>{t('quiz.setup.layoutMultiDevice')}</span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={layout === 'SHARED_SCREEN'}
                    className={`${styles.choiceTile} ${styles.tileBerry} ${
                      layout === 'SHARED_SCREEN' ? styles.tileActive : ''
                    }`}
                    onClick={() => setLayout('SHARED_SCREEN')}
                  >
                    {layout === 'SHARED_SCREEN' && (
                      <span className={styles.tileSelectedPill}>
                        {t('quiz.setup.selectedBadge')}
                      </span>
                    )}
                    <span className={styles.tileIconWrap}>
                      <SharedScreenIcon />
                      <span className={styles.keycapsCluster} aria-hidden="true">
                        <span className={styles.keycap}>A</span>
                        <span className={styles.keycap}>L</span>
                      </span>
                    </span>
                    <span className={styles.tileTitle}>{t('quiz.setup.layoutSharedScreen')}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className={styles.selectorGroupLabel}>{t('quiz.setup.layoutLabel')}</span>
                <div className={styles.soloLayoutBox}>
                  <span aria-hidden="true">🎯</span>
                  <span>{t('quiz.setup.soloLayoutNote')}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* STEP 2: Sky-Blue Filter Tray & Question Pack */}
      <div className={styles.stepRow}>
        <span className={`${styles.stepNumBadge} ${styles.stepNumSky}`} aria-hidden="true">
          2
        </span>

        <div className={styles.filterTray}>
          {isCasual && (
            <div className={styles.fieldGroup}>
              <label htmlFor="casual-method">{t('quiz.setup.casualMethodLabel')}</label>
              <select
                id="casual-method"
                className="sr-only"
                value={selectionType}
                onChange={(event) =>
                  setSelectionType(event.target.value as QuizSelection['type'])
                }
              >
                <option value="CASUAL_RANDOM">{t('quiz.setup.casualRandom')}</option>
                <option value="CASUAL_CUSTOM">{t('quiz.setup.casualCustom')}</option>
              </select>

              <div className={styles.casualMethodPills}>
                <button
                  type="button"
                  aria-pressed={selectionType === 'CASUAL_RANDOM'}
                  className={`${styles.methodPill} ${
                    selectionType === 'CASUAL_RANDOM' ? styles.methodPillActive : ''
                  }`}
                  onClick={() => setSelectionType('CASUAL_RANDOM')}
                >
                  🎲 {t('quiz.setup.casualRandom')}
                </button>
                <button
                  type="button"
                  aria-pressed={selectionType === 'CASUAL_CUSTOM'}
                  className={`${styles.methodPill} ${
                    selectionType === 'CASUAL_CUSTOM' ? styles.methodPillActive : ''
                  }`}
                  onClick={() => setSelectionType('CASUAL_CUSTOM')}
                >
                  🎛️ {t('quiz.setup.casualCustom')}
                </button>
              </div>
            </div>
          )}

          {selectionType === 'CASUAL_CUSTOM' && (
            <CasualFilters
              catalog={casualCatalog}
              selection={casualSelection}
              onChange={setCasualSelection}
            />
          )}

          {isStudy && (
            <>
              <div className={styles.filterRowFour}>
                <div className={styles.fieldGroup}>
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

                <div className={styles.fieldGroup}>
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

                <div className={styles.fieldGroup}>
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

                <div className={styles.fieldGroup}>
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
              </div>

              <div
                className={
                  layout === 'SHARED_SCREEN' && mode !== 'SOLO'
                    ? styles.filterRowTwo
                    : styles.fieldGroup
                }
              >
                <div className={styles.fieldGroup}>
                  <label htmlFor="pack">{t('quiz.setup.packLabel')}</label>
                  <div className={styles.packSelectWrap}>
                    <span className={styles.packSelectIcon} aria-hidden="true">
                      📦
                    </span>
                    <select
                      id="pack"
                      className={styles.packSelectInput}
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
                </div>

                {layout === 'SHARED_SCREEN' && mode !== 'SOLO' && (
                  <div className={styles.fieldGroup}>
                    <label htmlFor="second">{t('quiz.setup.secondNicknameLabel')}</label>
                    <input
                      id="second"
                      value={secondNickname}
                      onChange={(event) => setSecondNickname(event.target.value)}
                      minLength={2}
                      maxLength={30}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {!isStudy && layout === 'SHARED_SCREEN' && mode !== 'SOLO' && (
            <div className={styles.fieldGroup}>
              <label htmlFor="second">{t('quiz.setup.secondNicknameLabel')}</label>
              <input
                id="second"
                value={secondNickname}
                onChange={(event) => setSecondNickname(event.target.value)}
                minLength={2}
                maxLength={30}
              />
            </div>
          )}

          {layout === 'SHARED_SCREEN' && mode !== 'SOLO' && (
            <p className={styles.helperNote}>{t('quiz.setup.secondNicknameNote')}</p>
          )}

          {selectionType === 'CASUAL_RANDOM' && (
            <p className={styles.helperNote}>{t('quiz.setup.casualRandomHint')}</p>
          )}

          {selectionType === 'CASUAL_CUSTOM' && casualCatalog.length > 0 && (
            <p className={styles.helperNote} role="status">
              {casualCount
                ? t('quiz.setup.casualCustomCount', { count: casualCount })
                : t('quiz.setup.casualCustomEmpty')}
            </p>
          )}

          {isCasual && !casualCatalog.length && (
            <p className={styles.helperNote} role="status">
              {t('quiz.setup.casualLibraryEmpty')}
            </p>
          )}

          {isStudy && !choices.length && (
            <p className={styles.helperNote} role="status">
              {t('quiz.setup.studyPacksEmpty')}
            </p>
          )}

          {isStudy && selected && (
            <p className={styles.helperNote}>
              {getKnowledgeTypeLabel(selected.pack.knowledgeType, locale)}
            </p>
          )}

          {isStudy && !!selected?.pack.relatedKnowledge.length && (
            <div className={styles.relatedList}>
              {selected.pack.relatedKnowledge.map(({ category, topic, reason }, index) => {
                const match = categories.find(
                  (value) => knowledgeKey(value) === knowledgeKey(category),
                );
                return (
                  <span className={styles.relatedChip} key={index}>
                    {match ? (
                      <button
                        type="button"
                        className={styles.relatedChipBtn}
                        onClick={() => setFilter({ category: match })}
                      >
                        {category}
                      </button>
                    ) : (
                      <strong>{category}</strong>
                    )}
                    <span>
                      · {topic} — {reason}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* STEP 3: Wide Honey-Gold 3D CTA & Connected Badge */}
      <div className={`${styles.stepRow} ${styles.stepRowCenter}`}>
        <span className={`${styles.stepNumBadge} ${styles.stepNumMint}`} aria-hidden="true">
          3
        </span>

        <div className={styles.setupFooter}>
          <button
            type="button"
            className={styles.createCta}
            onClick={() => void createRoom()}
            disabled={busy || !connected || (isStudy ? !selected : !casualCount)}
          >
            {mode === 'SOLO' ? t('quiz.setup.createSolo') : t('quiz.setup.createRoom')}
          </button>

          <div className={styles.statusCluster}>
            <span
              className={`${styles.serverPill} ${
                connected ? styles.serverPillOnline : styles.serverPillOffline
              }`}
            >
              {connected ? t('quiz.setup.serverConnected') : t('quiz.setup.serverConnecting')}
            </span>
            <p className={styles.serverSubNote}>{t('quiz.setup.allPlayersReady')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
