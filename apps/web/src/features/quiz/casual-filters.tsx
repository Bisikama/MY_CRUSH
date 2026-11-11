'use client';
import {
  knowledgeKey,
  type CasualCatalog,
  type CasualCustomSelection,
} from '@duoquest/shared-types';

interface Props {
  catalog: CasualCatalog;
  selection: CasualCustomSelection;
  onChange: (selection: CasualCustomSelection) => void;
}
export function CasualFilters({ catalog, selection, onChange }: Props) {
  const categories = [
    ...new Map(catalog.map(({ category }) => [knowledgeKey(category), category])).values(),
  ];
  const topics = [
    ...new Map(
      catalog
        .filter(
          ({ category }) =>
            !selection.categories.length ||
            selection.categories.some((value) => knowledgeKey(value) === knowledgeKey(category)),
        )
        .map(({ category, topic }) => [
          JSON.stringify([knowledgeKey(category), knowledgeKey(topic)]),
          { category, topic },
        ]),
    ).entries(),
  ];
  return (
    <>
      <div>
        <label htmlFor="casual-categories">Lĩnh vực</label>
        <select
          id="casual-categories"
          multiple
          value={selection.categories}
          onChange={(event) => {
            const values = Array.from(event.target.selectedOptions, (option) => option.value);
            onChange({
              ...selection,
              categories: values,
              topics: selection.topics.filter(
                ({ category }) =>
                  !values.length ||
                  values.some((value) => knowledgeKey(value) === knowledgeKey(category)),
              ),
            });
          }}
        >
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="casual-topics">Chủ đề</label>
        <select
          id="casual-topics"
          multiple
          value={selection.topics.map(({ category, topic }) =>
            JSON.stringify([knowledgeKey(category), knowledgeKey(topic)]),
          )}
          onChange={(event) => {
            const keys = new Set(
              Array.from(event.target.selectedOptions, (option) => option.value),
            );
            onChange({
              ...selection,
              topics: topics.filter(([key]) => keys.has(key)).map(([, value]) => value),
            });
          }}
        >
          {topics.map(([key, value]) => (
            <option key={key} value={key}>
              {value.category} · {value.topic}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="casual-difficulty">Độ khó</label>
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
          <option value="mixed">Hỗn hợp</option>
          <option value="easy">Dễ</option>
          <option value="medium">Trung bình</option>
          <option value="hard">Khó</option>
        </select>
      </div>
    </>
  );
}
