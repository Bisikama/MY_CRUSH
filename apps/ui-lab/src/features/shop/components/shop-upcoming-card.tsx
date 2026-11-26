'use client';

import { useI18n } from '../../../i18n';
import type { ShopUpcomingCardItem } from '../shop.types';
import { ShopItemArt } from './shop-item-art';
import styles from './shop.module.css';

export function ShopUpcomingCard({ item }: { item: ShopUpcomingCardItem }) {
  const { t } = useI18n();
  return (
    <article className={styles.upcomingCard}>
      <div className={styles.upcomingStage}>
        <span className={styles.upcomingTag}>{item.tagLabel}</span>
        <ShopItemArt artKey={item.artKey} />
      </div>
      <h3 className={styles.upcomingName}>{item.name}</h3>
      <p className={styles.upcomingDesc}>{item.description}</p>
      <div className={styles.upcomingFooter}>
        <span className={styles.upcomingHint}>{t('shop.upcoming.preparing')}</span>
        <span className={styles.upcomingBadge}>{t('shop.upcoming.comingSoonBadge')}</span>
      </div>
    </article>
  );
}
