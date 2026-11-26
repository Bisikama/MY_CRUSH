'use client';

import type { MouseEvent } from 'react';
import { useI18n } from '../../../i18n';
import { resolveShopItemVisual } from '../shop-catalog.registry';
import type { ShopItem } from '../shop.types';
import { ShopItemArt } from './shop-item-art';
import styles from './shop.module.css';

interface ShopItemCardProps {
  item: ShopItem;
  quantity: number;
  equipped: boolean;
  balance: number;
  busy: boolean;
  canBuySkill: boolean;
  onPurchase: (item: ShopItem, event: MouseEvent<HTMLButtonElement>) => void;
  onEquip: (item: ShopItem, event: MouseEvent<HTMLButtonElement>) => void;
}

export function ShopItemCard({
  item,
  quantity,
  equipped,
  balance,
  busy,
  canBuySkill,
  onPurchase,
  onEquip,
}: ShopItemCardProps) {
  const { locale, t } = useI18n();
  const visual = resolveShopItemVisual(item, locale);
  const isSkill = item.kind === 'SKILL';
  const owned = quantity > 0;

  return (
    <article className={styles.itemCard}>
      <div className={styles.itemStage} style={{ background: visual.stageGradient }}>
        <span className={styles.itemTag} style={{ color: visual.badgeText }}>
          {visual.tagLabel}
        </span>
        <ShopItemArt artKey={visual.artKey} />
      </div>

      <div className={styles.itemTitleRow}>
        <h3 className={styles.itemName}>{item.name}</h3>
        {isSkill ? (
          <span
            className={styles.stockBadge}
            style={{ background: visual.badgeBg, color: visual.badgeText }}
          >
            {t('shop.card.stockBadge', { quantity })}
          </span>
        ) : owned ? (
          <span
            className={styles.stockBadge}
            style={{ background: visual.badgeBg, color: visual.badgeText }}
          >
            {t('shop.card.ownedBadge')}
          </span>
        ) : null}
      </div>

      <p className={styles.itemDesc}>{visual.description}</p>

      <div className={styles.itemFooter}>
        <div className={`${styles.priceTag} ${!isSkill && owned ? styles.priceOwned : ''}`}>
          <span className={styles.coinDot} aria-hidden="true">
            ★
          </span>
          <span>{t('shop.card.priceCoins', { price: item.price })}</span>
        </div>

        {isSkill ? (
          <button
            type="button"
            className={`${styles.squishBtn} ${styles.squishPurple}`}
            disabled={busy || balance < item.price || !canBuySkill}
            onClick={(event) => onPurchase(item, event)}
          >
            {t('shop.card.redeemSkill')}
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.squishBtn} ${
              equipped
                ? styles.squishMint
                : owned
                  ? styles.squishOutline
                  : styles.squishPurple
            }`}
            disabled={busy || equipped || (!owned && balance < item.price)}
            onClick={(event) => {
              if (owned) onEquip(item, event);
              else onPurchase(item, event);
            }}
          >
            {equipped
              ? t('shop.card.equipped')
              : owned
                ? t('shop.card.equip')
                : t('shop.card.buyItem')}
          </button>
        )}
      </div>
    </article>
  );
}
