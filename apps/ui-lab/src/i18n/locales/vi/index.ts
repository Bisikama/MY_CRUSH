import { viAuth } from './auth';
import { viCommon } from './common';
import { viHub } from './hub';
import { viLab } from './lab';
import { viNav } from './nav';
import { viPacks } from './packs';
import { viProfile } from './profile';
import { viQuiz } from './quiz';
import { viShop } from './shop';

export const viDictionary = {
  common: viCommon,
  nav: viNav,
  hub: viHub,
  auth: viAuth,
  quiz: viQuiz,
  packs: viPacks,
  shop: viShop,
  profile: viProfile,
  lab: viLab,
} as const;
