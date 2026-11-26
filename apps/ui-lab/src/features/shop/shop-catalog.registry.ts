import { DEFAULT_LOCALE, translate, type LocaleCode, type TranslationKey } from '../../i18n';
import type { ShopItem, ShopItemVisualMeta, ShopUpcomingCardItem } from './shop.types';

interface VisualStyleSpec {
  artKey: ShopItemVisualMeta['artKey'];
  tagKey: TranslationKey;
  descKey: TranslationKey;
  stageGradient: string;
  badgeBg: string;
  badgeText: string;
}

const MINT_FRAME_SPEC: VisualStyleSpec = {
  artKey: 'mint-frame',
  tagKey: 'shop.visuals.cosmeticPermanentTag',
  descKey: 'shop.visuals.mintFrameDesc',
  stageGradient: 'linear-gradient(155deg, #E2FAEE 0%, #B8F0D6 100%)',
  badgeBg: '#DFF8EC',
  badgeText: '#17784F',
};

const SPEC_BY_ITEM_ID: Record<string, VisualStyleSpec> = {
  'quiz-hint': {
    artKey: 'hint',
    tagKey: 'shop.visuals.skillQuizTag',
    descKey: 'shop.visuals.hintDesc',
    stageGradient: 'linear-gradient(155deg, #FFF7D6 0%, #FFE8A3 100%)',
    badgeBg: '#FFF0C2',
    badgeText: '#8A5600',
  },
  'quiz-fifty-fifty': {
    artKey: 'fifty-fifty',
    tagKey: 'shop.visuals.skillQuizTag',
    descKey: 'shop.visuals.fiftyFiftyDesc',
    stageGradient: 'linear-gradient(155deg, #E2F6FF 0%, #BAE6FF 100%)',
    badgeBg: '#D6F1FF',
    badgeText: '#005A87',
  },
  'quiz-cover': {
    artKey: 'cover',
    tagKey: 'shop.visuals.skillQuizTag',
    descKey: 'shop.visuals.coverDesc',
    stageGradient: 'linear-gradient(155deg, #F1E5FF 0%, #D9BEFF 100%)',
    badgeBg: '#ECE0FF',
    badgeText: '#572E99',
  },
  'quiz-blur': {
    artKey: 'blur',
    tagKey: 'shop.visuals.skillQuizTag',
    descKey: 'shop.visuals.blurDesc',
    stageGradient: 'linear-gradient(155deg, #FFEBE2 0%, #FFD0BD 100%)',
    badgeBg: '#FFE3D6',
    badgeText: '#A83F1A',
  },
  'mint-frame': MINT_FRAME_SPEC,
  'frame-mint': MINT_FRAME_SPEC,
};

const GENERIC_SKILL_SPEC: VisualStyleSpec = {
  artKey: 'generic-skill',
  tagKey: 'shop.visuals.skillConsumableTag',
  descKey: 'shop.visuals.genericSkillDesc',
  stageGradient: 'linear-gradient(155deg, #EFE5FF 0%, #D9C4FF 100%)',
  badgeBg: '#ECE0FF',
  badgeText: '#572E99',
};

const GENERIC_COSMETIC_SPEC: VisualStyleSpec = {
  artKey: 'generic-cosmetic',
  tagKey: 'shop.visuals.cosmeticPermanentTag',
  descKey: 'shop.visuals.genericCosmeticDesc',
  stageGradient: 'linear-gradient(155deg, #EAF6FF 0%, #D6E9FF 100%)',
  badgeBg: '#E3F2FF',
  badgeText: '#1A5A96',
};

export function resolveShopItemVisual(
  item: ShopItem,
  locale: LocaleCode = DEFAULT_LOCALE,
): ShopItemVisualMeta {
  const spec =
    SPEC_BY_ITEM_ID[item.id] ??
    (item.kind === 'SKILL' ? GENERIC_SKILL_SPEC : GENERIC_COSMETIC_SPEC);
  return {
    artKey: spec.artKey,
    tagLabel: translate(locale, spec.tagKey),
    description: translate(locale, spec.descKey),
    stageGradient: spec.stageGradient,
    badgeBg: spec.badgeBg,
    badgeText: spec.badgeText,
  };
}

export function getUpcomingShopItems(
  locale: LocaleCode = DEFAULT_LOCALE,
): readonly ShopUpcomingCardItem[] {
  const tagLabel = translate(locale, 'shop.upcoming.tagLabel');
  return [
    {
      id: 'soon-frames',
      name: translate(locale, 'shop.upcoming.framesName'),
      tagLabel,
      description: translate(locale, 'shop.upcoming.framesDesc'),
      artKey: 'soon-frames',
    },
    {
      id: 'soon-emotes',
      name: translate(locale, 'shop.upcoming.emotesName'),
      tagLabel,
      description: translate(locale, 'shop.upcoming.emotesDesc'),
      artKey: 'soon-emotes',
    },
    {
      id: 'soon-gifts',
      name: translate(locale, 'shop.upcoming.giftsName'),
      tagLabel,
      description: translate(locale, 'shop.upcoming.giftsDesc'),
      artKey: 'soon-gifts',
    },
  ];
}

export const UPCOMING_SHOP_ITEMS: readonly ShopUpcomingCardItem[] =
  getUpcomingShopItems(DEFAULT_LOCALE);
