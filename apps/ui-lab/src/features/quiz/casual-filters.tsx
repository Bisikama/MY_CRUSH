'use client';
import {
  knowledgeKey,
  type CasualCatalog,
  type CasualCustomSelection,
} from '@duoquest/shared-types';
import { useI18n } from '../../i18n';
import styles from './casual-filters.module.css';

interface Props {
  catalog: CasualCatalog;
  selection: CasualCustomSelection;
  onChange: (selection: CasualCustomSelection) => void;
}

const topicKey = (category: string, topic: string) =>
  JSON.stringify([knowledgeKey(category), knowledgeKey(topic)]);
const maxSelections = 50;

export function CasualFilters({ catalog, selection, onChange }: Props) {
  const { t } = useI18n();
  const categoryLabel = (category: string) =>
    category === 'general' ? t('quiz.casualFilters.generalCategory') : category;
  const categories = new Map(catalog.map(({ category }) => [knowledgeKey(category), category]));
  const selectedCategories = new Set(selection.categories.map(knowledgeKey));
  const selectedTopics = new Set(
    selection.topics.map(({ category, topic }) => topicKey(category, topic)),
  );
  const topics = new Map(
    catalog
      .filter(
        ({ category }) =>
          !selectedCategories.size || selectedCategories.has(knowledgeKey(category)),
      )
      .map(({ category, topic }) => [topicKey(category, topic), { category, topic }]),
  );
  const hasFilters =
    selectedCategories.size || selectedTopics.size || selection.difficulty !== 'mixed';

  return (
    <>
      <fieldset className={styles.field}>
        <legend>{t('quiz.casualFilters.categoriesLegend')}</legend>
        <div className={styles.options}>
          {Array.from(categories, ([key, category]) => (
            <label key={key} className={styles.option}>
              <input
                type="checkbox"
                checked={selectedCategories.has(key)}
                disabled={!selectedCategories.has(key) && selectedCategories.size >= maxSelections}
                onChange={({ target }) => {
                  const next = target.checked
                    ? [...selection.categories, category]
                    : selection.categories.filter((value) => knowledgeKey(value) !== key);
                  const allowed = new Set(next.map(knowledgeKey));
                  onChange({
                    ...selection,
                    categories: next,
                    topics: selection.topics.filter(
                      ({ category }) => !allowed.size || allowed.has(knowledgeKey(category)),
                    ),
                  });
                }}
              />
              {categoryLabel(category)}
            </label>
          ))}
          {!categories.size && (
            <p className={styles.empty}>{t('quiz.casualFilters.emptyCategories')}</p>
          )}
        </div>
      </fieldset>
      <fieldset className={styles.field}>
        <legend>{t('quiz.casualFilters.topicsLegend')}</legend>
        <div className={styles.options}>
          {Array.from(topics, ([key, { category, topic }]) => (
            <label key={key} className={styles.option}>
              <input
                type="checkbox"
                checked={selectedTopics.has(key)}
                disabled={!selectedTopics.has(key) && selectedTopics.size >= maxSelections}
                onChange={({ target }) =>
                  onChange({
                    ...selection,
                    topics: target.checked
                      ? [...selection.topics, { category, topic }]
                      : selection.topics.filter(
                          (value) => topicKey(value.category, value.topic) !== key,
                        ),
                  })
                }
              />
              <span>
                {topic}
                <small>{categoryLabel(category)}</small>
              </span>
            </label>
          ))}
          {!topics.size && <p className={styles.empty}>{t('quiz.casualFilters.emptyTopics')}</p>}
        </div>
      </fieldset>
      <div>
        <label htmlFor="casual-difficulty">{t('quiz.casualFilters.difficultyLabel')}</label>
        <select
          id="casual-difficulty"
          value={selection.difficulty}
          onChange={(event) =>
            onChange({
              ...selection,
              difficulty: event.target.value as CasualCustomSelection['difficulty'],
            })
          }
        >
          <option value="mixed">{t('common.difficulty.mixed')}</option>
          <option value="easy">{t('common.difficulty.easy')}</option>
          <option value="medium">{t('common.difficulty.medium')}</option>
          <option value="hard">{t('common.difficulty.hard')}</option>
        </select>
      </div>
      <div className={styles.footer}>
        <span>{t('quiz.casualFilters.footerHint')}</span>
        {Boolean(hasFilters) && (
          <button
            type="button"
            onClick={() =>
              onChange({ type: 'CASUAL_CUSTOM', categories: [], topics: [], difficulty: 'mixed' })
            }
          >
            {t('quiz.casualFilters.clearButton')}
          </button>
        )}
      </div>
    </>
  );
}
