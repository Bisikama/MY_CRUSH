import { DEFAULT_LOCALE, type LocaleCode } from '../../i18n';
import { getUpcomingShopItems, resolveShopItemVisual } from './shop-catalog.registry';
import type {
  ShopCategoryFilter,
  ShopInventory,
  ShopItem,
  ShopSortOrder,
  ShopUpcomingCardItem,
} from './shop.types';

export interface ShopFilterQuery {
  category: ShopCategoryFilter;
  search: string;
  sort: ShopSortOrder;
}

export interface ShopDisplaySections {
  skills: ShopItem[];
  cosmetics: ShopItem[];
  upcoming: ShopUpcomingCardItem[];
  totalVisible: number;
}

export function getShopItemStock(inventory: ShopInventory, itemId: string): number {
  return inventory.items.find((row) => row.itemId === itemId)?.quantity ?? 0;
}

export function isShopItemEquipped(inventory: ShopInventory, itemId: string): boolean {
  return inventory.loadout.some((row) => row.itemId === itemId);
}

function normalizeQuery(text: string, locale: LocaleCode): string {
  return text.trim().toLocaleLowerCase(locale);
}

function matchesItemSearch(item: ShopItem, query: string, locale: LocaleCode): boolean {
  if (!query) return true;
  const visual = resolveShopItemVisual(item, locale);
  return (
    item.name.toLocaleLowerCase(locale).includes(query) ||
    visual.description.toLocaleLowerCase(locale).includes(query) ||
    visual.tagLabel.toLocaleLowerCase(locale).includes(query)
  );
}

function matchesUpcomingSearch(
  item: ShopUpcomingCardItem,
  query: string,
  locale: LocaleCode,
): boolean {
  if (!query) return true;
  return (
    item.name.toLocaleLowerCase(locale).includes(query) ||
    item.description.toLocaleLowerCase(locale).includes(query)
  );
}

export function filterAndSortShopItems(
  items: readonly ShopItem[],
  inventory: ShopInventory,
  { category, search, sort }: ShopFilterQuery,
  locale: LocaleCode = DEFAULT_LOCALE,
): ShopItem[] {
  if (category === 'SOON') return [];
  const query = normalizeQuery(search, locale);

  const filtered = items.filter((item) => {
    if (!matchesItemSearch(item, query, locale)) return false;
    if (category === 'all') return true;
    if (category === 'OWNED') return getShopItemStock(inventory, item.id) > 0;
    return item.kind === category;
  });

  if (sort === 'price-asc') {
    return [...filtered].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, locale));
  }
  if (sort === 'price-desc') {
    return [...filtered].sort((a, b) => b.price - a.price || a.name.localeCompare(b.name, locale));
  }
  return filtered;
}

export function groupShopDisplaySections(
  items: readonly ShopItem[],
  inventory: ShopInventory,
  query: ShopFilterQuery,
  upcomingCatalog?: readonly ShopUpcomingCardItem[],
  locale: LocaleCode = DEFAULT_LOCALE,
): ShopDisplaySections {
  const effectiveUpcoming = upcomingCatalog ?? getUpcomingShopItems(locale);
  const filtered = filterAndSortShopItems(items, inventory, query, locale);
  const skills = filtered.filter((item) => item.kind === 'SKILL');
  const cosmetics = filtered.filter((item) => item.kind !== 'SKILL');

  const normalizedSearch = normalizeQuery(query.search, locale);
  const includeUpcoming = query.category === 'all' || query.category === 'SOON';
  const upcoming = includeUpcoming
    ? effectiveUpcoming.filter((item) => matchesUpcomingSearch(item, normalizedSearch, locale))
    : [];

  return {
    skills,
    cosmetics,
    upcoming,
    totalVisible: skills.length + cosmetics.length + upcoming.length,
  };
}
