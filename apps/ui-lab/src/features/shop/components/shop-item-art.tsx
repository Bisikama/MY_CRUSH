'use client';

import type { ShopArtKey } from '../shop.types';
import styles from './shop.module.css';

export function ShopItemArt({ artKey }: { artKey: ShopArtKey }) {
  switch (artKey) {
    case 'hint':
      return (
        <svg viewBox="0 0 110 110" className={styles.artSvg} aria-hidden="true">
          <defs>
            <radialGradient id="shopBulbG" cx="38%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#FFFDF0" />
              <stop offset="45%" stopColor="#FFE066" />
              <stop offset="100%" stopColor="#F5A623" />
            </radialGradient>
          </defs>
          <circle cx="55" cy="48" r="36" fill="#FFE680" opacity="0.35" />
          <path
            d="M55 18 C37 18 26 31 26 46 C26 57 34 65 39 71 C41 74 42 78 42 80 H68 C68 78 69 74 71 71 C76 65 84 57 84 46 C84 31 73 18 55 18Z"
            fill="url(#shopBulbG)"
          />
          <ellipse cx="43" cy="34" rx="8" ry="5" transform="rotate(-25 43 34)" fill="#FFFFFF" opacity="0.72" />
          <circle cx="46" cy="49" r="3.4" fill="#5A3600" />
          <circle cx="64" cy="49" r="3.4" fill="#5A3600" />
          <circle cx="45" cy="47.8" r="1.1" fill="#FFF" />
          <circle cx="63" cy="47.8" r="1.1" fill="#FFF" />
          <ellipse cx="40" cy="54" rx="4.2" ry="2.4" fill="#FF8C69" opacity="0.55" />
          <ellipse cx="70" cy="54" rx="4.2" ry="2.4" fill="#FF8C69" opacity="0.55" />
          <path d="M49 56 Q55 61 61 56" fill="none" stroke="#5A3600" strokeWidth="2.6" strokeLinecap="round" />
          <rect x="42" y="79" width="26" height="8" rx="4" fill="#B5A6D4" />
          <rect x="45" y="88" width="20" height="7" rx="3.5" fill="#8E7BB8" />
          <path d="M55 6 V12 M20 22 L25 27 M90 22 L85 27" stroke="#FFB81C" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    case 'fifty-fifty':
      return (
        <svg viewBox="0 0 110 110" className={styles.artSvg} aria-hidden="true">
          <defs>
            <linearGradient id="shopBladeG" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#B9D9EE" />
            </linearGradient>
            <linearGradient id="shopHandleG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#58CBFF" />
              <stop offset="100%" stopColor="#1E88E5" />
            </linearGradient>
          </defs>
          <rect x="20" y="20" width="28" height="34" rx="8" fill="#FFFFFF" opacity="0.85" transform="rotate(-10 34 37)" />
          <rect x="62" y="20" width="28" height="34" rx="8" fill="#FFFFFF" opacity="0.85" transform="rotate(10 76 37)" />
          <path d="M40 24 L56 60 L64 56 L48 20 Z" fill="url(#shopBladeG)" />
          <path d="M70 24 L54 60 L46 56 L62 20 Z" fill="url(#shopBladeG)" />
          <circle cx="55" cy="54" r="4.5" fill="#4A607A" />
          <circle cx="38" cy="76" r="14" fill="none" stroke="url(#shopHandleG)" strokeWidth="8.5" />
          <circle cx="72" cy="76" r="14" fill="none" stroke="url(#shopHandleG)" strokeWidth="8.5" />
          <circle cx="34" cy="72" r="2.2" fill="#FFF" opacity="0.7" />
          <circle cx="68" cy="72" r="2.2" fill="#FFF" opacity="0.7" />
        </svg>
      );
    case 'cover':
      return (
        <svg viewBox="0 0 110 110" className={styles.artSvg} aria-hidden="true">
          <defs>
            <radialGradient id="shopCloudMaskG" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#D7B8FF" />
              <stop offset="100%" stopColor="#9A6CE0" />
            </radialGradient>
          </defs>
          <path
            d="M30 74 H80 C90 74 96 67 96 58 C96 50 90 43 82 42 C80 28 68 20 55 20 C42 20 31 29 29 42 C21 43 14 50 14 59 C14 68 21 74 30 74Z"
            fill="url(#shopCloudMaskG)"
          />
          <ellipse cx="44" cy="34" rx="10" ry="5" transform="rotate(-15 44 34)" fill="#FFFFFF" opacity="0.65" />
          <path d="M38 52 Q44 47 50 52" fill="none" stroke="#472380" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M60 52 Q66 47 72 52" fill="none" stroke="#472380" strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="35" cy="58" rx="4.5" ry="2.5" fill="#FF9EC6" opacity="0.65" />
          <ellipse cx="75" cy="58" rx="4.5" ry="2.5" fill="#FF9EC6" opacity="0.65" />
          <path d="M49 60 Q55 65 61 60" fill="none" stroke="#472380" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M84 22 L86 27 L91 29 L86 31 L84 36 L82 31 L77 29 L82 27 Z" fill="#FFE07D" />
        </svg>
      );
    case 'blur':
      return (
        <svg viewBox="0 0 110 110" className={styles.artSvg} aria-hidden="true">
          <defs>
            <radialGradient id="shopBub1" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#FFB99E" />
              <stop offset="100%" stopColor="#FF8A65" />
            </radialGradient>
            <radialGradient id="shopBub2" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#E2C6FF" />
              <stop offset="100%" stopColor="#B084F0" />
            </radialGradient>
          </defs>
          <circle cx="52" cy="54" r="25" fill="url(#shopBub1)" />
          <ellipse cx="43" cy="43" rx="7" ry="4.5" transform="rotate(-30 43 43)" fill="#FFFFFF" opacity="0.82" />
          <circle cx="79" cy="36" r="13" fill="url(#shopBub2)" />
          <ellipse cx="75" cy="31" rx="3.8" ry="2.4" transform="rotate(-25 75 31)" fill="#FFFFFF" opacity="0.85" />
          <circle cx="28" cy="74" r="10" fill="url(#shopBub2)" />
          <circle cx="78" cy="75" r="8" fill="url(#shopBub1)" />
          <circle cx="46" cy="55" r="2.6" fill="#6E2712" />
          <circle cx="58" cy="55" r="2.6" fill="#6E2712" />
          <path d="M49 61 Q52 64 55 61" fill="none" stroke="#6E2712" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'mint-frame':
      return (
        <svg viewBox="0 0 110 110" className={styles.artSvg} aria-hidden="true">
          <defs>
            <linearGradient id="shopMintRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7EE8BA" />
              <stop offset="100%" stopColor="#2BB57D" />
            </linearGradient>
          </defs>
          <circle cx="55" cy="55" r="39" fill="url(#shopMintRing)" />
          <circle cx="55" cy="55" r="31" fill="#F8F1FF" />
          <ellipse cx="45" cy="39" rx="5.5" ry="13" transform="rotate(-10 45 39)" fill="#C6A4FA" />
          <ellipse cx="65" cy="39" rx="5.5" ry="13" transform="rotate(10 65 39)" fill="#C6A4FA" />
          <circle cx="55" cy="60" r="18" fill="#D5BAFF" />
          <circle cx="49" cy="58" r="2.6" fill="#3D226B" />
          <circle cx="61" cy="58" r="2.6" fill="#3D226B" />
          <ellipse cx="44" cy="63" rx="3.4" ry="2" fill="#FF9EBC" opacity="0.7" />
          <ellipse cx="66" cy="63" rx="3.4" ry="2" fill="#FF9EBC" opacity="0.7" />
          <path d="M52 63 Q55 66 58 63" fill="none" stroke="#3D226B" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M84 26 Q94 24 91 34 Q82 36 84 26Z" fill="#239E6B" />
          <path d="M22 76 L24 81 L29 83 L24 85 L22 90 L20 85 L15 83 L20 81 Z" fill="#FFE07D" />
        </svg>
      );
    case 'soon-frames':
      return (
        <svg viewBox="0 0 80 80" className={styles.upcomingSvg} aria-hidden="true">
          <rect x="18" y="30" width="44" height="34" rx="10" fill="#D4BEFA" />
          <rect x="14" y="22" width="52" height="13" rx="6" fill="#B694F2" />
          <rect x="36" y="22" width="8" height="42" fill="#FFF" opacity="0.75" />
          <path
            d="M40 22 C33 10 22 14 27 22 M40 22 C47 10 58 14 53 22"
            fill="none"
            stroke="#9B72E8"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'soon-emotes':
      return (
        <svg viewBox="0 0 80 80" className={styles.upcomingSvg} aria-hidden="true">
          <circle cx="40" cy="40" r="24" fill="#FFE49E" />
          <circle cx="32" cy="36" r="3.2" fill="#7A5200" />
          <circle cx="48" cy="36" r="3.2" fill="#7A5200" />
          <path d="M31 46 Q40 54 49 46" fill="none" stroke="#7A5200" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    case 'soon-gifts':
      return (
        <svg viewBox="0 0 80 80" className={styles.upcomingSvg} aria-hidden="true">
          <path
            d="M40 62 C40 62 18 48 18 33 C18 24 25 19 32 19 C36 19 39 22 40 25 C41 22 44 19 48 19 C55 19 62 24 62 33 C62 48 40 62 40 62Z"
            fill="#FFB5C8"
          />
          <path d="M56 16 L58 21 L63 23 L58 25 L56 30 L54 25 L49 23 L54 21 Z" fill="#FFE07D" />
        </svg>
      );
    case 'generic-skill':
      return (
        <svg viewBox="0 0 110 110" className={styles.artSvg} aria-hidden="true">
          <circle cx="55" cy="55" r="32" fill="#D5BAFF" />
          <path d="M58 26 L38 58 H54 L50 84 L74 50 H57 Z" fill="#FFFDF0" />
        </svg>
      );
    case 'generic-cosmetic':
    default:
      return (
        <svg viewBox="0 0 110 110" className={styles.artSvg} aria-hidden="true">
          <circle cx="55" cy="55" r="34" fill="#BCE0FF" />
          <path d="M55 24 L62 46 L84 53 L62 60 L55 82 L48 60 L26 53 L48 46 Z" fill="#FFFFFF" />
        </svg>
      );
  }
}
