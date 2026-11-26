interface CloudTint {
  shadow: string;
  shadowMid: string;
  mid: string;
  midFade: string;
  highlight: string;
  highlightFade: string;
}

interface CloudConfig {
  layer: 0 | 1 | 2;
  x: number;
  y: number;
  scale: number;
  speed: number;
  bobAmp: number;
  bobSpd: number;
  alpha: number;
}

interface CloudInstance extends CloudConfig {
  px: number;
  phase: number;
}

interface StarInstance {
  x: number;
  y: number;
  r: number;
  isDiamond: boolean;
  phase: number;
  speed: number;
  hue: string;
  glow: string;
}

interface MeteorPalette {
  core: string;
  mid: string;
  tail: string;
  glow: string;
}

interface MeteorInstance {
  isBig: boolean;
  delay: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  tailLen: number;
  headSize: number;
  width: number;
  dustTimer: number;
  palette: MeteorPalette;
}

interface MeteorDustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isStar: boolean;
  color: string;
  life: number;
  maxLife: number;
  phase: number;
}

const CLOUD_PUFFS = [
  { x: 0.24, y: 0.64, r: 0.2 },
  { x: 0.37, y: 0.48, r: 0.24 },
  { x: 0.52, y: 0.4, r: 0.27 },
  { x: 0.67, y: 0.5, r: 0.23 },
  { x: 0.78, y: 0.65, r: 0.18 },
  { x: 0.48, y: 0.68, r: 0.24 },
  { x: 0.6, y: 0.68, r: 0.22 },
  { x: 0.34, y: 0.69, r: 0.2 },
] as const;

const LAYER_BASE_SCALES = [1.35, 1.1, 0.9] as const;

const CLOUD_CONFIGS: readonly CloudConfig[] = [
  // Layer 0: distant slow violet-lavender banks
  { layer: 0, x: 0.04, y: 0.12, scale: 1.45, speed: 7, bobAmp: 6, bobSpd: 0.44, alpha: 0.88 },
  { layer: 0, x: 0.28, y: 0.07, scale: 1.38, speed: 6.2, bobAmp: 5, bobSpd: 0.4, alpha: 0.82 },
  { layer: 0, x: 0.54, y: 0.1, scale: 1.6, speed: 6, bobAmp: 6, bobSpd: 0.38, alpha: 0.85 },
  { layer: 0, x: 0.82, y: 0.16, scale: 1.42, speed: 7.4, bobAmp: 7, bobSpd: 0.46, alpha: 0.84 },
  { layer: 0, x: 0.14, y: 0.42, scale: 1.5, speed: 6.8, bobAmp: 6, bobSpd: 0.41, alpha: 0.78 },
  { layer: 0, x: 0.64, y: 0.48, scale: 1.55, speed: 6.5, bobAmp: 7, bobSpd: 0.43, alpha: 0.76 },
  { layer: 0, x: 0.94, y: 0.38, scale: 1.35, speed: 7.2, bobAmp: 6, bobSpd: 0.45, alpha: 0.8 },
  { layer: 0, x: 0.3, y: 0.76, scale: 1.6, speed: 6.4, bobAmp: 6, bobSpd: 0.42, alpha: 0.82 },
  { layer: 0, x: 0.78, y: 0.78, scale: 1.65, speed: 7, bobAmp: 7, bobSpd: 0.46, alpha: 0.84 },
  // Layer 1: midground lush creamy-lilac clouds
  { layer: 1, x: 0.02, y: 0.28, scale: 1.16, speed: 14, bobAmp: 9, bobSpd: 0.62, alpha: 0.95 },
  { layer: 1, x: 0.24, y: 0.22, scale: 1.02, speed: 12.8, bobAmp: 8, bobSpd: 0.58, alpha: 0.92 },
  { layer: 1, x: 0.48, y: 0.25, scale: 0.96, speed: 13.5, bobAmp: 8, bobSpd: 0.56, alpha: 0.88 },
  { layer: 1, x: 0.74, y: 0.2, scale: 1.22, speed: 15, bobAmp: 10, bobSpd: 0.64, alpha: 0.95 },
  { layer: 1, x: 0.92, y: 0.54, scale: 1.18, speed: 14.2, bobAmp: 9, bobSpd: 0.6, alpha: 0.92 },
  { layer: 1, x: 0.08, y: 0.66, scale: 1.24, speed: 13.6, bobAmp: 9, bobSpd: 0.57, alpha: 0.92 },
  { layer: 1, x: 0.42, y: 0.88, scale: 1.32, speed: 14.8, bobAmp: 9, bobSpd: 0.59, alpha: 0.94 },
  { layer: 1, x: 0.68, y: 0.9, scale: 1.26, speed: 14, bobAmp: 8, bobSpd: 0.61, alpha: 0.92 },
  { layer: 1, x: 0.18, y: 0.92, scale: 1.3, speed: 13.2, bobAmp: 8, bobSpd: 0.55, alpha: 0.94 },
  // Layer 2: foreground silky wisps
  { layer: 2, x: 0.16, y: 0.08, scale: 0.88, speed: 22, bobAmp: 11, bobSpd: 0.82, alpha: 0.76 },
  { layer: 2, x: 0.62, y: 0.06, scale: 0.92, speed: 23, bobAmp: 10, bobSpd: 0.78, alpha: 0.74 },
  { layer: 2, x: 0.88, y: 0.34, scale: 0.95, speed: 24, bobAmp: 12, bobSpd: 0.8, alpha: 0.72 },
  { layer: 2, x: 0.05, y: 0.5, scale: 0.9, speed: 21, bobAmp: 11, bobSpd: 0.76, alpha: 0.7 },
  { layer: 2, x: 0.35, y: 0.96, scale: 1.15, speed: 20, bobAmp: 10, bobSpd: 0.74, alpha: 0.82 },
  { layer: 2, x: 0.82, y: 0.95, scale: 1.18, speed: 22, bobAmp: 11, bobSpd: 0.78, alpha: 0.82 },
];

function createCloudSprite(scale: number, tint: CloudTint): HTMLCanvasElement {
  const w = Math.round(360 * scale);
  const h = Math.round(170 * scale);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const c = off.getContext('2d');
  if (!c) return off;

  for (const p of CLOUD_PUFFS) {
    const px = p.x * w;
    const py = p.y * h + 10 * scale;
    const pr = p.r * w * 0.58;
    const g = c.createRadialGradient(px, py - pr * 0.15, pr * 0.08, px, py, pr);
    g.addColorStop(0, tint.shadow);
    g.addColorStop(0.65, tint.shadowMid);
    g.addColorStop(1, 'rgba(155, 118, 224, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(px, py, pr, 0, Math.PI * 2);
    c.fill();
  }

  for (const p of CLOUD_PUFFS) {
    const px = p.x * w;
    const py = p.y * h;
    const pr = p.r * w * 0.55;
    const g = c.createRadialGradient(px - pr * 0.12, py - pr * 0.28, pr * 0.06, px, py, pr);
    g.addColorStop(0, tint.mid);
    g.addColorStop(0.62, tint.midFade);
    g.addColorStop(1, 'rgba(242, 232, 255, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(px, py, pr, 0, Math.PI * 2);
    c.fill();
  }

  for (const p of CLOUD_PUFFS.slice(0, 5)) {
    const px = p.x * w - 3 * scale;
    const py = p.y * h - 9 * scale;
    const pr = p.r * w * 0.44;
    const g = c.createRadialGradient(px, py - pr * 0.22, pr * 0.04, px, py, pr);
    g.addColorStop(0, tint.highlight);
    g.addColorStop(0.55, tint.highlightFade);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(px, py, pr, 0, Math.PI * 2);
    c.fill();
  }

  return off;
}

export class PurpleCloudSkyEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites: HTMLCanvasElement[];
  private readonly clouds: CloudInstance[];
  private readonly stars: StarInstance[];
  private readonly meteors: MeteorInstance[] = [];
  private readonly meteorDust: MeteorDustParticle[] = [];

  private width = 0;
  private height = 0;
  private motionEnabled: boolean;
  private mouseX = 0.5;
  private mouseY = 0.5;
  private targetMouseX = 0.5;
  private targetMouseY = 0.5;
  private elapsed = 0;
  private lastTime = 0;
  private nextMeteorAt = 1.1;
  private rafId: number | null = null;
  private hidden = false;

  constructor(canvas: HTMLCanvasElement, initialMotion: boolean) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.canvas = canvas;
    this.ctx = context;
    this.motionEnabled = initialMotion;

    this.sprites = [
      createCloudSprite(LAYER_BASE_SCALES[0], {
        shadow: 'rgba(130, 92, 208, 0.34)',
        shadowMid: 'rgba(154, 118, 224, 0.16)',
        mid: 'rgba(232, 214, 255, 0.72)',
        midFade: 'rgba(220, 196, 255, 0.32)',
        highlight: 'rgba(255, 250, 255, 0.78)',
        highlightFade: 'rgba(247, 238, 255, 0.28)',
      }),
      createCloudSprite(LAYER_BASE_SCALES[1], {
        shadow: 'rgba(146, 108, 220, 0.30)',
        shadowMid: 'rgba(176, 144, 236, 0.14)',
        mid: 'rgba(247, 238, 255, 0.88)',
        midFade: 'rgba(235, 218, 255, 0.42)',
        highlight: 'rgba(255, 255, 255, 0.96)',
        highlightFade: 'rgba(255, 250, 255, 0.42)',
      }),
      createCloudSprite(LAYER_BASE_SCALES[2], {
        shadow: 'rgba(164, 128, 232, 0.18)',
        shadowMid: 'rgba(188, 158, 242, 0.08)',
        mid: 'rgba(255, 252, 255, 0.76)',
        midFade: 'rgba(245, 235, 255, 0.28)',
        highlight: 'rgba(255, 255, 255, 0.90)',
        highlightFade: 'rgba(255, 255, 255, 0.25)',
      }),
    ];

    this.resize(window.innerWidth, window.innerHeight);

    this.clouds = CLOUD_CONFIGS.map((cfg, i) => ({
      ...cfg,
      px: cfg.x * (this.width + 460) - 230,
      phase: i * 1.19,
    }));

    this.stars = Array.from({ length: 72 }, (_, i) => {
      const isDiamond = i < 24;
      return {
        x: Math.random(),
        y: Math.random() * 0.85,
        r: isDiamond ? 3.4 + Math.random() * 5.6 : 1.1 + Math.random() * 2.2,
        isDiamond,
        phase: Math.random() * Math.PI * 2,
        speed: isDiamond ? 1.5 + Math.random() * 2.2 : 1 + Math.random() * 1.9,
        hue: i % 3 === 0 ? '#FFF6C4' : i % 3 === 1 ? '#FFFFFF' : '#F6DCFF',
        glow: i % 3 === 0 ? 'rgba(255, 224, 120, 0.88)' : 'rgba(255, 255, 255, 0.92)',
      };
    });
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.motionEnabled) this.drawFrame(0);
  }

  setPointer(clientX: number, clientY: number) {
    this.targetMouseX = clientX / Math.max(1, this.width);
    this.targetMouseY = clientY / Math.max(1, this.height);
  }

  setMotionEnabled(enabled: boolean) {
    this.motionEnabled = enabled;
    if (enabled && !this.hidden && this.rafId === null) {
      this.lastTime = performance.now();
      this.rafId = window.requestAnimationFrame(this.loop);
    } else if (!enabled) {
      this.stopLoop();
      this.drawFrame(0);
    }
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) {
      this.stopLoop();
    } else if (this.motionEnabled && this.rafId === null) {
      this.lastTime = performance.now();
      this.rafId = window.requestAnimationFrame(this.loop);
    }
  }

  start() {
    this.drawFrame(0);
    if (this.motionEnabled && !this.hidden && this.rafId === null) {
      this.lastTime = performance.now();
      this.rafId = window.requestAnimationFrame(this.loop);
    }
  }

  destroy() {
    this.stopLoop();
  }

  spawnMeteor(isBig: boolean, delayOffset = 0) {
    const startX = isBig
      ? this.width * (0.05 + Math.random() * 0.38)
      : this.width * (0.12 + Math.random() * 0.62);
    const startY = isBig
      ? this.height * (0.03 + Math.random() * 0.16)
      : this.height * (0.02 + Math.random() * 0.28);
    const speed = isBig ? 470 + Math.random() * 110 : 360 + Math.random() * 130;
    const angle = (isBig ? 0.3 : 0.34) + (Math.random() - 0.5) * 0.12;
    this.meteors.push({
      isBig,
      delay: delayOffset,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: isBig ? 1.45 : 0.92,
      tailLen: isBig ? 210 : 115,
      headSize: isBig ? 14 : 7.5,
      width: isBig ? 6.5 : 3.2,
      dustTimer: 0,
      palette: isBig
        ? {
            core: '#FFFDF0',
            mid: '#FFE27A',
            tail: '#E6B8FF',
            glow: 'rgba(255, 226, 115, 0.95)',
          }
        : {
            core: '#FFFFFF',
            mid: '#FFEBA8',
            tail: '#D9C2FF',
            glow: 'rgba(255, 245, 210, 0.9)',
          },
    });
  }

  spawnMeteorShower() {
    this.spawnMeteor(true, 0);
    this.spawnMeteor(false, 0.22);
    this.spawnMeteor(false, 0.48);
  }

  private stopLoop() {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.drawFrame(dt);
    if (this.motionEnabled && !this.hidden) {
      this.rafId = window.requestAnimationFrame(this.loop);
    } else {
      this.rafId = null;
    }
  };

  private drawFourPointStar(
    x: number,
    y: number,
    size: number,
    color: string,
    glowColor: string,
    alpha: number,
    rot: number,
  ) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;

    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.3);
    halo.addColorStop(0, glowColor);
    halo.addColorStop(0.4, 'rgba(255, 245, 255, 0.25)');
    halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    const inner = size * 0.24;
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(inner * 0.6, -inner * 0.6, size, 0);
    ctx.quadraticCurveTo(inner * 0.6, inner * 0.6, 0, size);
    ctx.quadraticCurveTo(-inner * 0.6, inner * 0.6, -size, 0);
    ctx.quadraticCurveTo(-inner * 0.6, -inner * 0.6, 0, -size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawFrame(dt: number) {
    const { ctx, width: W, height: H } = this;
    if (this.motionEnabled && dt > 0) {
      this.elapsed += dt;
      this.mouseX += (this.targetMouseX - this.mouseX) * 0.04;
      this.mouseY += (this.targetMouseY - this.mouseY) * 0.04;
    }

    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#B998F7');
    skyGrad.addColorStop(0.28, '#D5BCFF');
    skyGrad.addColorStop(0.62, '#EADBFF');
    skyGrad.addColorStop(1, '#F9F0FF');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    const bloom = ctx.createRadialGradient(W * 0.5, H * 0.14, 10, W * 0.5, H * 0.14, W * 0.52);
    bloom.addColorStop(0, 'rgba(255, 248, 232, 0.52)');
    bloom.addColorStop(0.45, 'rgba(255, 235, 252, 0.22)');
    bloom.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, W, H);

    for (const s of this.stars) {
      const wave = 0.5 + 0.5 * Math.sin(this.elapsed * s.speed + s.phase);
      const glint = Math.pow(wave, 2.2);
      const sx = s.x * W + (this.mouseX - 0.5) * -10;
      const sy = s.y * H + (this.mouseY - 0.5) * -8;

      if (s.isDiamond) {
        const curSize = s.r * (0.55 + glint * 0.95);
        const alpha = 0.28 + glint * 0.72;
        this.drawFourPointStar(sx, sy, curSize, s.hue, s.glow, alpha, glint * 0.25);
      } else {
        ctx.save();
        ctx.globalAlpha = 0.22 + glint * 0.75;
        ctx.fillStyle = s.hue;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r * (0.8 + glint * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (this.motionEnabled && this.elapsed >= this.nextMeteorAt) {
      const roll = Math.random();
      if (roll < 0.42) {
        this.spawnMeteor(true, 0);
      } else if (roll < 0.78) {
        this.spawnMeteor(false, 0);
        this.spawnMeteor(false, 0.26);
      } else {
        this.spawnMeteorShower();
      }
      this.nextMeteorAt = this.elapsed + 3.8 + Math.random() * 3.4;
    }

    for (let i = this.meteorDust.length - 1; i >= 0; i--) {
      const d = this.meteorDust[i]!;
      if (this.motionEnabled && dt > 0) {
        d.life += dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }
      const dp = d.life / d.maxLife;
      if (dp >= 1) {
        this.meteorDust.splice(i, 1);
        continue;
      }
      const da = (1 - dp) * (0.55 + 0.45 * Math.sin(d.life * 22 + d.phase));
      if (d.isStar) {
        this.drawFourPointStar(
          d.x,
          d.y,
          d.size * (1 - dp * 0.45),
          d.color,
          'rgba(255,235,160,0.85)',
          da,
          d.life * 3,
        );
      } else {
        ctx.save();
        ctx.globalAlpha = da;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size * (1 - dp * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i]!;
      if (m.delay > 0) {
        if (this.motionEnabled && dt > 0) m.delay -= dt;
        continue;
      }
      if (this.motionEnabled && dt > 0) {
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.dustTimer += dt;
        const emitInterval = m.isBig ? 0.022 : 0.045;
        while (m.dustTimer >= emitInterval) {
          m.dustTimer -= emitInterval;
          this.meteorDust.push({
            x: m.x + (Math.random() - 0.5) * (m.isBig ? 14 : 6),
            y: m.y + (Math.random() - 0.5) * (m.isBig ? 14 : 6),
            vx: -m.vx * 0.06 + (Math.random() - 0.5) * 28,
            vy: -m.vy * 0.06 + (Math.random() - 0.5) * 28 + 12,
            size: m.isBig ? 2.2 + Math.random() * 3.8 : 1.5 + Math.random() * 2.2,
            isStar: Math.random() < (m.isBig ? 0.55 : 0.35),
            color: Math.random() < 0.55 ? '#FFF5B8' : '#FFFFFF',
            life: 0,
            maxLife: m.isBig ? 0.55 + Math.random() * 0.45 : 0.35 + Math.random() * 0.3,
            phase: Math.random() * 6,
          });
        }
      }
      const p = m.life / m.maxLife;
      if (p >= 1) {
        this.meteors.splice(i, 1);
        continue;
      }
      const alpha = p < 0.15 ? p / 0.15 : Math.sin(((1 - p) / 0.85) * (Math.PI / 2));
      const norm = Math.hypot(m.vx, m.vy);
      const ux = m.vx / norm;
      const uy = m.vy / norm;
      const tailLen = m.tailLen * Math.min(1, p * 3.2);
      const tx = m.x - ux * tailLen;
      const ty = m.y - uy * tailLen;

      ctx.save();
      ctx.globalAlpha = alpha;
      const outerGrad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      outerGrad.addColorStop(0, m.palette.mid);
      outerGrad.addColorStop(0.45, m.palette.tail);
      outerGrad.addColorStop(1, 'rgba(230, 184, 255, 0)');
      ctx.strokeStyle = outerGrad;
      ctx.lineWidth = m.width * 2.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      const coreGrad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      coreGrad.addColorStop(0, m.palette.core);
      coreGrad.addColorStop(0.55, m.palette.mid);
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = coreGrad;
      ctx.lineWidth = m.width;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();

      this.drawFourPointStar(
        m.x,
        m.y,
        m.headSize,
        m.palette.core,
        m.palette.glow,
        alpha,
        m.life * (m.isBig ? 4.2 : 6),
      );
    }

    for (const cl of this.clouds) {
      const sprite = this.sprites[cl.layer]!;
      const drawW = sprite.width * (cl.scale / LAYER_BASE_SCALES[cl.layer]);
      const drawH = sprite.height * (drawW / sprite.width);

      if (this.motionEnabled && dt > 0) {
        cl.px += cl.speed * dt;
        if (cl.px - drawW * 0.5 > W + 80) {
          cl.px = -drawW * 0.65;
        }
      }

      const parallaxX = (this.mouseX - 0.5) * (cl.layer + 1) * -14;
      const parallaxY = (this.mouseY - 0.5) * (cl.layer + 1) * -9;
      const bobY = Math.sin(this.elapsed * cl.bobSpd + cl.phase) * cl.bobAmp;

      ctx.save();
      ctx.globalAlpha = cl.alpha;
      ctx.drawImage(
        sprite,
        cl.px - drawW * 0.5 + parallaxX,
        cl.y * H - drawH * 0.5 + bobY + parallaxY,
        drawW,
        drawH,
      );
      ctx.restore();
    }
  }
}
