import type { QuizSkill } from '@duoquest/shared-types';
import type { QuizThemeDefinition } from './quiz-theme-registry';

export type BgmChannel = 'lobby' | 'match';
export type AudioPreviewKind = 'lobby' | 'match' | 'skill';

const SKILL_BASE_FREQUENCIES: Record<QuizSkill, readonly number[]> = {
  HINT: [523.25, 659.25, 783.99],
  FIFTY_FIFTY: [440.0, 554.37, 659.25],
  COVER: [196.0, 146.83, 110.0],
  BLUR: [392.0, 311.13, 261.63],
};

class QuizAudioController {
  private ctx: AudioContext | null = null;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private activeChannel: BgmChannel | null = null;
  private activeThemeId: string | null = null;
  private noteIndex = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private playTone(
    frequency: number,
    durationMs: number,
    waveform: OscillatorType,
    gainPeak = 0.045,
    delayMs = 0,
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const startAt = ctx.currentTime + delayMs / 1000;
      const stopAt = startAt + durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = waveform;
      osc.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(stopAt + 0.01);
    } catch {
      /* Ignore Web Audio errors when autoplay is restricted. */
    }
  }

  startBgm(channel: BgmChannel, theme: QuizThemeDefinition) {
    if (typeof window === 'undefined') return;
    if (this.activeChannel === channel && this.activeThemeId === theme.id) return;

    this.stopBgm();
    this.activeChannel = channel;
    this.activeThemeId = theme.id;
    this.noteIndex = 0;

    const fileUrl = channel === 'lobby' ? theme.audio.lobbyBgmUrl : theme.audio.matchBgmUrl;
    if (fileUrl) {
      const audio = new Audio(fileUrl);
      audio.loop = true;
      audio.volume = channel === 'lobby' ? 0.35 : 0.45;
      this.bgmAudio = audio;
      void audio.play().catch(() => {
        if (this.activeChannel === channel && this.activeThemeId === theme.id) {
          this.startSynthLoop(channel, theme);
        }
      });
      return;
    }

    this.startSynthLoop(channel, theme);
  }

  private startSynthLoop(channel: BgmChannel, theme: QuizThemeDefinition) {
    const notes = channel === 'lobby' ? theme.audio.synth.lobbyNotes : theme.audio.synth.matchNotes;
    const stepMs =
      channel === 'lobby' ? theme.audio.synth.lobbyStepMs : theme.audio.synth.matchStepMs;
    if (!notes.length) return;

    const tick = () => {
      const note = notes[this.noteIndex % notes.length]!;
      this.noteIndex += 1;
      this.playTone(
        note,
        Math.min(stepMs * 0.85, 380),
        theme.audio.synth.waveform,
        channel === 'lobby' ? 0.03 : 0.042,
      );
    };

    tick();
    this.bgmTimer = setInterval(tick, stepMs);
  }

  stopBgm() {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.previewTimer !== null) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.src = '';
      this.bgmAudio = null;
    }
    this.activeChannel = null;
    this.activeThemeId = null;
  }

  playSkillSfx(skill: QuizSkill, theme: QuizThemeDefinition) {
    if (typeof window === 'undefined') return;
    const customUrl = theme.audio.skillSfxUrls?.[skill];
    if (customUrl) {
      const audio = new Audio(customUrl);
      audio.volume = 0.65;
      void audio.play().catch(() => {
        this.playSynthSkillSfx(skill, theme);
      });
      return;
    }
    this.playSynthSkillSfx(skill, theme);
  }

  private playSynthSkillSfx(skill: QuizSkill, _theme: QuizThemeDefinition) {
    // Tạm thời dùng chung bộ hiệu ứng âm thanh Skill mặc định của Rừng nguyên sinh cho mọi chủ đề
    const baseNotes = SKILL_BASE_FREQUENCIES[skill];
    const waveform: OscillatorType =
      skill === 'COVER' ? 'sawtooth' : skill === 'BLUR' ? 'sine' : 'triangle';
    baseNotes.forEach((freq, idx) => {
      this.playTone(freq, 140, waveform, 0.06, idx * 90);
    });
  }

  preview(kind: AudioPreviewKind, theme: QuizThemeDefinition, onDone?: () => void) {
    this.stopBgm();
    if (kind === 'skill') {
      this.playSkillSfx('HINT', theme);
      this.previewTimer = setTimeout(() => {
        this.playSkillSfx('COVER', theme);
        onDone?.();
      }, 420);
      return;
    }

    this.startBgm(kind, theme);
    this.previewTimer = setTimeout(() => {
      this.stopBgm();
      onDone?.();
    }, 2200);
  }
}

export const quizAudioController = new QuizAudioController();
