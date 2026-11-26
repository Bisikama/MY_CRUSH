'use client';

import { useCallback, useRef, type MouseEvent } from 'react';
import { useI18n } from '../../../i18n';
import { useShopController } from '../hooks/use-shop-controller';
import { getShopItemStock, isShopItemEquipped } from '../shop-filter.utils';
import type { ShopItem } from '../shop.types';
import { ShopSkyCanvas, type ShopSkyCanvasHandle } from '../sky/shop-sky-canvas';
import { ShopCloudTitle } from './shop-cloud-title';
import { ShopFilterBar } from './shop-filter-bar';
import { ShopItemCard } from './shop-item-card';
import { ShopPurchaseToast } from './shop-purchase-toast';
import { ShopUpcomingCard } from './shop-upcoming-card';
import styles from './shop.module.css';

const SPARKLE_COLORS = ['#FFE066', '#FFFFFF', '#D9B8FF', '#7EE8BA', '#FFB5C8'] as const;

function spawnClickSparkles(x: number, y: number, enabled: boolean) {
  if (!enabled || typeof document === 'undefined') return;
  for (let i = 0; i < 10; i++) {
    const el = document.createElement('span');
    el.className = styles.sparkleParticle ?? '';
    const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.4;
    const dist = 26 + Math.random() * 32;
    el.style.left = `${x - 7}px`;
    el.style.top = `${y - 7}px`;
    el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    const color = SPARKLE_COLORS[i % SPARKLE_COLORS.length]!;
    el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${color}" aria-hidden="true"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>`;
    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), 780);
  }
}

export function ShopScreen() {
  const { t } = useI18n();
  const skyRef = useRef<ShopSkyCanvasHandle | null>(null);
  const {
    identity,
    items,
    inventory,
    balance,
    message,
    purchaseToast,
    busy,
    category,
    search,
    sort,
    motionEnabled,
    sections,
    setCategory,
    setSearch,
    setSort,
    setMotionEnabled,
    toggleMotion,
    purchase,
    equip,
    dismissToast,
  } = useShopController();

  const handlePurchase = useCallback(
    (item: ShopItem, event: MouseEvent<HTMLButtonElement>) => {
      const { clientX, clientY } = event;
      void purchase(item).then((ok) => {
        if (ok) spawnClickSparkles(clientX, clientY, motionEnabled);
      });
    },
    [motionEnabled, purchase],
  );

  const handleEquip = useCallback(
    (item: ShopItem, event: MouseEvent<HTMLButtonElement>) => {
      const { clientX, clientY } = event;
      void equip(item).then((ok) => {
        if (ok) spawnClickSparkles(clientX, clientY, motionEnabled);
      });
    },
    [equip, motionEnabled],
  );

  const handleSpawnMeteor = useCallback(() => {
    if (!motionEnabled) setMotionEnabled(true);
    skyRef.current?.spawnMeteorShower();
  }, [motionEnabled, setMotionEnabled]);

  const canBuySkill = identity?.kind === 'account';
  const showCosmeticSection = sections.cosmetics.length > 0 || sections.upcoming.length > 0;

  return (
    <div className={`${styles.shopRoot} ${motionEnabled ? '' : styles.motionPaused}`}>
      <ShopSkyCanvas ref={skyRef} motionEnabled={motionEnabled} />
      <ShopPurchaseToast toast={purchaseToast} onDismiss={dismissToast} />

      <div className={styles.shopContent}>
        <ShopCloudTitle />

        <ShopFilterBar
          totalCount={items.length}
          category={category}
          search={search}
          sort={sort}
          onCategoryChange={setCategory}
          onSearchChange={setSearch}
          onSortChange={setSort}
        />

        {message && (
          <p className={styles.notice} role="status">
            {message}
          </p>
        )}

        {sections.skills.length > 0 && (
          <section className={styles.sectionBlock} aria-labelledby="shop-skills-heading">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <h2 id="shop-skills-heading" className={styles.sectionTitle}>
                  {t('shop.sections.skillsTitle')}
                </h2>
                <span className={styles.sectionPill}>
                  {t('shop.sections.skillsCountPill', { count: sections.skills.length })}
                </span>
              </div>
              <p className={styles.sectionSub}>{t('shop.sections.skillsSub')}</p>
            </div>

            <div className={styles.cardGrid}>
              {sections.skills.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  quantity={getShopItemStock(inventory, item.id)}
                  equipped={false}
                  balance={balance}
                  busy={busy}
                  canBuySkill={canBuySkill}
                  onPurchase={handlePurchase}
                  onEquip={handleEquip}
                />
              ))}
            </div>
          </section>
        )}

        {showCosmeticSection && (
          <section className={styles.sectionBlock} aria-labelledby="shop-cosmetics-heading">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <h2 id="shop-cosmetics-heading" className={styles.sectionTitle}>
                  {t('shop.sections.cosmeticsTitle')}
                </h2>
                <span className={`${styles.sectionPill} ${styles.sectionPillMint}`}>
                  {t('shop.sections.cosmeticsPill')}
                </span>
              </div>
              <p className={styles.sectionSub}>{t('shop.sections.cosmeticsSub')}</p>
            </div>

            <div className={styles.cardGrid}>
              {sections.cosmetics.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  quantity={getShopItemStock(inventory, item.id)}
                  equipped={isShopItemEquipped(inventory, item.id)}
                  balance={balance}
                  busy={busy}
                  canBuySkill={canBuySkill}
                  onPurchase={handlePurchase}
                  onEquip={handleEquip}
                />
              ))}
              {sections.upcoming.map((upcomingItem) => (
                <ShopUpcomingCard key={upcomingItem.id} item={upcomingItem} />
              ))}
            </div>
          </section>
        )}

        {sections.totalVisible === 0 && (
          <div className={styles.emptyState} role="status">
            <p className={styles.emptyTitle}>{t('shop.empty.title')}</p>
            <p className={styles.emptySub}>{t('shop.empty.subtitle')}</p>
          </div>
        )}

        <section className={styles.fairPlayBar} aria-label={t('shop.fairPlay.ariaLabel')}>
          <p className={styles.fairPlayCopy}>
            <strong>{t('shop.fairPlay.ruleTitle')}</strong> {t('shop.fairPlay.ruleDesc')}
          </p>
          <div className={styles.skyControls}>
            <button type="button" className={styles.meteorBtn} onClick={handleSpawnMeteor}>
              {t('shop.fairPlay.spawnMeteor')}
            </button>
            <button
              type="button"
              className={styles.motionBtn}
              aria-pressed={motionEnabled}
              onClick={toggleMotion}
            >
              {motionEnabled ? t('shop.fairPlay.motionOn') : t('shop.fairPlay.motionOff')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
