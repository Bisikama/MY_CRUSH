import { describe, expect, it } from 'vitest';
import { resolveShopItemVisual } from './shop-catalog.registry';
import {
  filterAndSortShopItems,
  getShopItemStock,
  groupShopDisplaySections,
  isShopItemEquipped,
} from './shop-filter.utils';
import type { ShopInventory, ShopItem } from './shop.types';

const SAMPLE_ITEMS: ShopItem[] = [
  { id: 'mint-frame', name: 'Khung bạc hà', price: 250, kind: 'COSMETIC', slot: 'AVATAR_FRAME' },
  { id: 'quiz-hint', name: 'Gợi ý', price: 10, kind: 'SKILL', slot: null },
  { id: 'quiz-fifty-fifty', name: '50/50', price: 15, kind: 'SKILL', slot: null },
  { id: 'quiz-cover', name: 'Che câu hỏi', price: 20, kind: 'SKILL', slot: null },
  { id: 'quiz-blur', name: 'Làm mờ đáp án', price: 25, kind: 'SKILL', slot: null },
];

const SAMPLE_INVENTORY: ShopInventory = {
  items: [
    { itemId: 'quiz-hint', quantity: 3 },
    { itemId: 'quiz-cover', quantity: 0 },
  ],
  loadout: [{ itemId: 'mint-frame', slot: 'AVATAR_FRAME' }],
};

describe('shop-catalog.registry & shop-filter.utils', () => {
  it('resolves known items and provides safe fallbacks for future items', () => {
    expect(resolveShopItemVisual(SAMPLE_ITEMS[0]!).artKey).toBe('mint-frame');
    expect(
      resolveShopItemVisual({
        id: 'frame-mint',
        name: 'Khung bạc hà',
        price: 250,
        kind: 'COSMETIC',
        slot: 'avatar-frame',
      }).artKey,
    ).toBe('mint-frame');

    const futureSkill = resolveShopItemVisual({
      id: 'future-freeze-timer',
      name: 'Đóng băng thời gian',
      price: 40,
      kind: 'SKILL',
      slot: null,
    });
    expect(futureSkill.artKey).toBe('generic-skill');

    const futureCosmetic = resolveShopItemVisual({
      id: 'frame-galaxy',
      name: 'Khung ngân hà',
      price: 350,
      kind: 'COSMETIC',
      slot: 'avatar-frame',
    });
    expect(futureCosmetic.artKey).toBe('generic-cosmetic');
  });

  it('filters by category, owned stock, Vietnamese search and sorts by price', () => {
    expect(getShopItemStock(SAMPLE_INVENTORY, 'quiz-hint')).toBe(3);
    expect(getShopItemStock(SAMPLE_INVENTORY, 'missing')).toBe(0);
    expect(isShopItemEquipped(SAMPLE_INVENTORY, 'mint-frame')).toBe(true);
    expect(isShopItemEquipped(SAMPLE_INVENTORY, 'quiz-hint')).toBe(false);

    const ownedOnly = filterAndSortShopItems(SAMPLE_ITEMS, SAMPLE_INVENTORY, {
      category: 'OWNED',
      search: '',
      sort: 'default',
    });
    expect(ownedOnly.map((i) => i.id)).toEqual(['quiz-hint']);

    const sortedDesc = filterAndSortShopItems(SAMPLE_ITEMS, SAMPLE_INVENTORY, {
      category: 'SKILL',
      search: '',
      sort: 'price-desc',
    });
    expect(sortedDesc.map((i) => i.price)).toEqual([25, 20, 15, 10]);

    const searched = filterAndSortShopItems(SAMPLE_ITEMS, SAMPLE_INVENTORY, {
      category: 'all',
      search: 'bạc hà',
      sort: 'default',
    });
    expect(searched.map((i) => i.id)).toEqual(['mint-frame']);
  });

  it('groups sections and shows upcoming cards only on all or SOON tabs', () => {
    const allSections = groupShopDisplaySections(SAMPLE_ITEMS, SAMPLE_INVENTORY, {
      category: 'all',
      search: '',
      sort: 'default',
    });
    expect(allSections.skills).toHaveLength(4);
    expect(allSections.cosmetics).toHaveLength(1);
    expect(allSections.upcoming).toHaveLength(3);

    const skillOnly = groupShopDisplaySections(SAMPLE_ITEMS, SAMPLE_INVENTORY, {
      category: 'SKILL',
      search: '',
      sort: 'default',
    });
    expect(skillOnly.skills).toHaveLength(4);
    expect(skillOnly.cosmetics).toHaveLength(0);
    expect(skillOnly.upcoming).toHaveLength(0);

    const soonOnly = groupShopDisplaySections(SAMPLE_ITEMS, SAMPLE_INVENTORY, {
      category: 'SOON',
      search: 'biểu cảm',
      sort: 'default',
    });
    expect(soonOnly.skills).toHaveLength(0);
    expect(soonOnly.cosmetics).toHaveLength(0);
    expect(soonOnly.upcoming.map((i) => i.id)).toEqual(['soon-emotes']);
  });
});
