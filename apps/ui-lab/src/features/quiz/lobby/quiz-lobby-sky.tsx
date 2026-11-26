'use client';

import styles from './quiz-lobby-sky.module.css';

interface QuizLobbySkyProps {
  motionEnabled: boolean;
}

function CloudShape({ className }: { className?: string }) {
  return (
    <svg
      className={`${styles.cloud ?? ''} ${className ?? ''}`}
      viewBox="0 0 340 150"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lobbyPuffyCloudGrad" x1="170" y1="8" x2="170" y2="138" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="72%" stopColor="#F5FAFF" />
          <stop offset="100%" stopColor="#D7EEFF" />
        </linearGradient>
      </defs>
      <path
        d="M54 134C24 134 6 115 6 92C6 70 23 53 46 52C56 24 84 8 117 13C139 0 174 0 198 16C224 4 258 13 275 39C302 38 329 56 332 85C335 113 310 134 278 134H54Z"
        fill="url(#lobbyPuffyCloudGrad)"
      />
    </svg>
  );
}

function SparkleStar({ className }: { className?: string }) {
  return (
    <svg
      className={`${styles.sparkle ?? ''} ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 1.5L14.7 9.3L22.5 12L14.7 14.7L12 22.5L9.3 14.7L1.5 12L9.3 9.3L12 1.5Z" />
    </svg>
  );
}

/**
 * Animated daytime sky backdrop for Quiz Battle Lobby (Variant 2B Polished).
 * Pure CSS + lightweight SVG layers; honors both user toggle and `prefers-reduced-motion`.
 */
export function QuizLobbySky({ motionEnabled }: QuizLobbySkyProps) {
  return (
    <div
      className={`${styles.skyBackdrop} ${motionEnabled ? '' : styles.motionPaused}`}
      aria-hidden="true"
    >
      <div className={styles.skyGlowOverlay} />

      {/* Vibrant Pastel Rainbow Arc sweeping from left clouds over the hero */}
      <div className={styles.rainbowWrap}>
        <svg className={styles.rainbowSvg} viewBox="0 0 1200 460" fill="none">
          <defs>
            <linearGradient id="rainbowFadeMaskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="72%" stopColor="#FFFFFF" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <mask id="rainbowSoftMask">
              <rect x="0" y="0" width="1200" height="460" fill="url(#rainbowFadeMaskGrad)" />
            </mask>
          </defs>
          <g mask="url(#rainbowSoftMask)" strokeLinecap="round" fill="none">
            <path d="M70 435 A530 390 0 0 1 1130 435" stroke="#FF7AA2" strokeWidth="26" strokeOpacity="0.88" />
            <path d="M96 435 A504 366 0 0 1 1104 435" stroke="#FFAC6B" strokeWidth="26" strokeOpacity="0.9" />
            <path d="M122 435 A478 342 0 0 1 1078 435" stroke="#FFE46B" strokeWidth="26" strokeOpacity="0.92" />
            <path d="M148 435 A452 318 0 0 1 1052 435" stroke="#7AE8B4" strokeWidth="26" strokeOpacity="0.9" />
            <path d="M174 435 A426 294 0 0 1 1026 435" stroke="#70D0FF" strokeWidth="26" strokeOpacity="0.9" />
            <path d="M200 435 A400 270 0 0 1 1000 435" stroke="#BA9EFF" strokeWidth="26" strokeOpacity="0.88" />
            <path
              className={styles.rainbowShimmer}
              d="M122 435 A478 342 0 0 1 1078 435"
              stroke="#FFFFFF"
              strokeWidth="9"
              strokeDasharray="28 52"
              strokeOpacity="0.62"
            />
          </g>
        </svg>
      </div>

      {/* Radiant Animated Pastel Sun with Concentric Halo Rings */}
      <div className={styles.sunCluster}>
        <div className={styles.sunHaloOuter} />
        <div className={styles.sunHaloRing} />
        <svg className={styles.sunRays} viewBox="0 0 200 200" fill="none">
          {Array.from({ length: 12 }, (_, idx) => (
            <rect
              key={idx}
              x="95"
              y="6"
              width="10"
              height="24"
              rx="5"
              fill="#FFF3A8"
              fillOpacity="0.82"
              transform={`rotate(${idx * 30} 100 100)`}
            />
          ))}
        </svg>
        <div className={styles.sunCore} />
      </div>

      {/* Puffy 3D Cloud Framing */}
      <div className={styles.cloudLayer}>
        <CloudShape className={styles.cloudFarA} />
        <CloudShape className={styles.cloudFarB} />
        <CloudShape className={styles.cloudFrameLeft} />
        <CloudShape className={styles.cloudFrameRight} />
        <svg
          className={styles.cloudBankBottom}
          viewBox="0 0 1440 210"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 132C78 82 162 80 236 114C294 58 408 52 482 102C558 48 680 46 760 100C850 44 976 50 1054 106C1136 58 1246 60 1324 108C1376 80 1412 88 1440 110V210H0V132Z"
            fill="#FFFFFF"
            fillOpacity="0.94"
          />
          <path
            d="M0 164C102 122 214 126 300 156C396 104 526 112 618 154C718 108 858 116 954 158C1056 114 1196 120 1294 158C1360 134 1408 140 1440 152V210H0V164Z"
            fill="#EFF9FF"
          />
        </svg>
      </div>

      {/* Floating Sun Sparkles */}
      <SparkleStar className={styles.sparkle1} />
      <SparkleStar className={styles.sparkle2} />
      <SparkleStar className={styles.sparkle3} />
      <SparkleStar className={styles.sparkle4} />
      <SparkleStar className={styles.sparkle5} />
    </div>
  );
}
