export type ShopItemKind = 'SKILL' | 'COSMETIC' | (string & {});

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  kind: ShopItemKind;
  slot: string | null;
}

export interface ShopOwnedItem {
  itemId: string;
  quantity: number;
}

export interface ShopLoadoutRow {
  itemId: string;
  slot: string;
}

export interface ShopInventory {
  items: ShopOwnedItem[];
  loadout: ShopLoadoutRow[];
}

export type ShopCategoryFilter = 'all' | 'SKILL' | 'COSMETIC' | 'OWNED' | 'SOON';

export type ShopSortOrder = 'default' | 'price-asc' | 'price-desc';

export type ShopArtKey =
  | 'hint'
  | 'fifty-fifty'
  | 'cover'
  | 'blur'
  | 'mint-frame'
  | 'soon-frames'
  | 'soon-emotes'
  | 'soon-gifts'
  | 'generic-skill'
  | 'generic-cosmetic';

export interface ShopItemVisualMeta {
  artKey: ShopArtKey;
  tagLabel: string;
  description: string;
  stageGradient: string;
  badgeBg: string;
  badgeText: string;
}

export interface ShopUpcomingCardItem {
  id: string;
  name: string;
  tagLabel: string;
  description: string;
  artKey: ShopArtKey;
}
