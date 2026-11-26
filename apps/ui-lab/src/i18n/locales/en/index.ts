import type { TranslationDictionary } from '../../types';
import { enAuth } from './auth';
import { enCommon } from './common';
import { enHub } from './hub';
import { enLab } from './lab';
import { enNav } from './nav';
import { enPacks } from './packs';
import { enProfile } from './profile';
import { enQuiz } from './quiz';
import { enShop } from './shop';

export const enDictionary: TranslationDictionary = {
  common: enCommon,
  nav: enNav,
  hub: enHub,
  auth: enAuth,
  quiz: enQuiz,
  packs: enPacks,
  shop: enShop,
  profile: enProfile,
  lab: enLab,
};
