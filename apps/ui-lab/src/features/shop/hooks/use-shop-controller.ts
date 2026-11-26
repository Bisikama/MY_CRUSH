'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../../i18n';
import { actionId, api, loadIdentity } from '../../../lib/client';
import { usePlatform } from '../../../providers/platform-provider';
import { groupShopDisplaySections } from '../shop-filter.utils';
import type { ShopCategoryFilter, ShopInventory, ShopItem, ShopSortOrder } from '../shop.types';

export interface ShopPurchaseToastState {
  itemName: string;
  subtitle: string;
}

export function useShopController() {
  const { locale, t } = useI18n();
  const { refreshProfile, identity } = usePlatform();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<ShopInventory>({ items: [], loadout: [] });
  const [balance, setBalance] = useState(0);
  const [message, setMessage] = useState('');
  const [purchaseToast, setPurchaseToast] = useState<ShopPurchaseToastState | null>(null);
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState<ShopCategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ShopSortOrder>('default');
  const [motionEnabled, setMotionEnabled] = useState(true);

  const requestIds = useRef(new Map<string, string>());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) setMotionEnabled(false);
  }, []);

  const refresh = useCallback(async () => {
    const guest = await loadIdentity();
    if (!guest) throw new Error(t('shop.messages.guestRequired'));
    const [catalog, owned, profile] = await Promise.all([
      api<ShopItem[]>('/shop/items'),
      api<ShopInventory>('/shop/inventory'),
      api<{ wallet: { balance: number } }>('/players/me'),
    ]);
    setItems(catalog);
    setInventory(owned);
    setBalance(profile.wallet.balance);
  }, [t]);

  useEffect(() => {
    void refresh().catch((error: unknown) =>
      setMessage(error instanceof Error ? error.message : t('shop.messages.loadFailed')),
    );
  }, [refresh, t]);

  useEffect(() => {
    if (!purchaseToast) return;
    const timeout = window.setTimeout(() => setPurchaseToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [purchaseToast]);

  const purchase = useCallback(
    async ({ id: itemId, name: itemName, kind }: ShopItem): Promise<boolean> => {
      setBusy(true);
      setMessage('');
      const requestId = requestIds.current.get(itemId) ?? actionId();
      requestIds.current.set(itemId, requestId);
      try {
        await api('/shop/purchases', { itemId, requestId });
        requestIds.current.delete(itemId);
        setPurchaseToast({
          itemName,
          subtitle:
            kind === 'SKILL'
              ? t('shop.toast.skillAdded', { itemName })
              : t('shop.toast.itemAdded', { itemName }),
        });
        await Promise.all([refresh(), refreshProfile()]).catch(() =>
          setMessage(t('shop.messages.refreshFailedAfterPurchase')),
        );
        return true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t('shop.messages.purchaseFailed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh, refreshProfile, t],
  );

  const equip = useCallback(
    async (item: ShopItem): Promise<boolean> => {
      setBusy(true);
      try {
        await api('/shop/equip', { itemId: item.id });
        await refresh();
        setMessage(t('shop.messages.equipSuccess'));
        return true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t('shop.messages.equipFailed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh, t],
  );

  const sections = useMemo(
    () => groupShopDisplaySections(items, inventory, { category, search, sort }, undefined, locale),
    [items, inventory, category, search, sort, locale],
  );

  const dismissToast = useCallback(() => setPurchaseToast(null), []);
  const toggleMotion = useCallback(() => setMotionEnabled((prev) => !prev), []);

  return {
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
  };
}
