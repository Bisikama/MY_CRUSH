'use client';

import { useI18n } from '../../../i18n';
import type { ShopCategoryFilter, ShopSortOrder } from '../shop.types';
import styles from './shop.module.css';

interface ShopFilterBarProps {
  totalCount: number;
  category: ShopCategoryFilter;
  search: string;
  sort: ShopSortOrder;
  onCategoryChange: (next: ShopCategoryFilter) => void;
  onSearchChange: (next: string) => void;
  onSortChange: (next: ShopSortOrder) => void;
}

const CATEGORY_IDS: readonly ShopCategoryFilter[] = ['all', 'SKILL', 'COSMETIC', 'OWNED', 'SOON'];

export function ShopFilterBar({
  totalCount,
  category,
  search,
  sort,
  onCategoryChange,
  onSearchChange,
  onSortChange,
}: ShopFilterBarProps) {
  const { t } = useI18n();

  return (
    <section className={styles.filterBar} aria-label={t('shop.filterBarAria')}>
      <div className={styles.categoryGroup} role="tablist" aria-label={t('shop.categoryTabsAria')}>
        {CATEGORY_IDS.map((id) => {
          const active = category === id;
          const label =
            id === 'all'
              ? t('shop.categories.allWithCount', { count: totalCount })
              : t(`shop.categories.${id}`);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.catPill} ${active ? styles.catPillActive : ''}`}
              onClick={() => onCategoryChange(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className={styles.filterControls}>
        <label className={styles.searchWrap}>
          <span className="sr-only">{t('shop.searchLabel')}</span>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('shop.searchPlaceholder')}
            className={styles.searchInput}
          />
        </label>

        <label className={styles.sortWrap}>
          <span className="sr-only">{t('shop.sortLabel')}</span>
          <select
            aria-label={t('shop.sortLabel')}
            value={sort}
            onChange={(event) => onSortChange(event.target.value as ShopSortOrder)}
            className={styles.sortSelect}
          >
            <option value="default">{t('shop.sortOptions.default')}</option>
            <option value="price-asc">{t('shop.sortOptions.priceAsc')}</option>
            <option value="price-desc">{t('shop.sortOptions.priceDesc')}</option>
          </select>
        </label>
      </div>
    </section>
  );
}
