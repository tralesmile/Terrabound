import type { GameEvent } from '../sim/game';
import { BEATS_PER_BAR, composeBar, tempo, type Mood } from './composer';

const MASTER_GAIN = 0.44;

/** Synthesised sound effects: no audio files to ship, license or load. Starts only after a user gesture (browser autoplay policy). */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** Effects bus (tones and noise) under master; music has its own bus. */
  private sfxBus: GainNode | null = null;
  muted = false;
  /** Bus gains 0..1 from the settings screen (see sim/settings.ts audioGains). */
  private vol = { master: 0.8, music: 0.7, sfx: 0.8 };

  /** Apply settings-screen volumes; safe before unlock (stored and applied when the context starts). */
  setVolumes(v: { master: number; music: number; sfx: number }): void {
    this.vol = { ...v };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master?.gain.setTargetAtTime(MASTER_GAIN * v.master, now, 0.05);
    this.sfxBus?.gain.setTargetAtTime(v.sfx, now, 0.05);
  }
  private noiseBuf: AudioBuffer | null = null;
  private last = new Map<string, number>();

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_GAIN * this.vol.master;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.vol.sfx;
      this.sfxBus.connect(this.master);
      const len = this.ctx.sampleRate * 0.2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  /** Short blip so the player hears a new effects volume. */
  preview(): void {
    this.tone(660, 0.09, 'square', 0.08, 990);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.sfxBus ?? this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, delay = 0): void {
    if (!this.ctx || !this.master || !this.noiseBuf || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    s.buffer = this.noiseBuf;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(g).connect(this.sfxBus ?? this.master);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  /** Background music on its own gain so it can be switched off separately. */
  musicOn = true;
  private musicGain: GainNode | null = null;
  private nextBarAt = 0;
  private bar = 0;
  private moodKey = '';

  /** Call every frame: schedules the next bar a little ahead of time (no timers, no audio files). */
  updateMusic(m: Mood): void {
    if (!this.ctx || !this.master) return;
    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.master);
    }
    const on = this.musicOn && !this.muted;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(on ? 0.8 * this.vol.music : 0, now, 0.4);
    if (!on) {
      this.nextBarAt = 0;
      return;
    }
    const key = `${m.biome}|${m.layer}|${m.night}|${m.boss}`;
    if (key !== this.moodKey) {
      // Mood change: start fresh on the next bar boundary.
      this.moodKey = key;
      this.bar = 0;
    }
    if (this.nextBarAt < now) this.nextBarAt = now + 0.1;
    if (this.nextBarAt - now > 0.6) return;
    const spb = 60 / tempo(m);
    const g = this.musicGain;
    for (const n of composeBar(m, this.bar)) {
      const t0 = this.nextBarAt + n.beat * spb;
      const dur = n.len * spb;
      if (n.voice === 'drum' && n.freq > 1000) {
        if (!this.noiseBuf) continue;
        const src = this.ctx.createBufferSource();
        const ng = this.ctx.createGain();
        src.buffer = this.noiseBuf;
        ng.gain.setValueAtTime(n.vol, t0);
        ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(ng).connect(g);
        src.start(t0);
        src.stop(t0 + dur + 0.02);
        continue;
      }
      const o = this.ctx.createOscillator();
      const ng = this.ctx.createGain();
      o.type = n.voice === 'pad' ? 'triangle' : n.voice === 'bass' ? 'sine' : n.voice === 'drum' ? 'sine' : 'square';
      o.frequency.setValueAtTime(n.freq, t0);
      if (n.voice === 'drum') o.frequency.exponentialRampToValueAtTime(35, t0 + dur);
      const attack = n.voice === 'pad' ? Math.min(0.6, dur / 3) : 0.01;
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.linearRampToValueAtTime(n.vol, t0 + attack);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(ng).connect(g);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }
    this.nextBarAt += BEATS_PER_BAR * spb;
    this.bar++;
  }

  /** Rate limit so a burst of events cannot stack hundreds of nodes. */
  private ok(key: string, minGap: number): boolean {
    const now = performance.now();
    if (now - (this.last.get(key) ?? 0) < minGap) return false;
    this.last.set(key, now);
    return true;
  }

  handle(e: GameEvent): void {
    switch (e.t) {
      case 'dig':
        if (this.ok('dig', 90)) {
          this.noise(0.05, 0.22);
          this.tone(140 + Math.random() * 40, 0.05, 'square', 0.06);
        }
        break;
      case 'break':
        this.noise(0.14, 0.4);
        this.tone(180, 0.12, 'triangle', 0.15, 70);
        break;
      case 'pickup':
        if (this.ok('pickup', 50)) this.tone(660, 0.09, 'square', 0.08, 990);
        break;
      case 'place':
        this.tone(220, 0.07, 'square', 0.1, 330);
        break;
      case 'jump':
        this.tone(300, 0.12, 'square', 0.06, 560);
        break;
      case 'land':
        if (e.speed > 6) this.noise(0.08, 0.15);
        break;
      case 'hurt':
        if (this.ok('hurt', 120)) this.tone(160, 0.2, 'sawtooth', 0.18, 60);
        break;
      case 'bank':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.08, undefined, i * 0.07));
        break;
      case 'craft':
        [330, 440, 587].forEach((f, i) => this.tone(f, 0.1, 'square', 0.08, undefined, i * 0.05));
        break;
      case 'smelt':
        if (this.ok('smelt', 400)) this.tone(196, 0.12, 'triangle', 0.07, 392);
        break;
      case 'discover':
        [523, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, undefined, i * 0.09));
        break;
      case 'garage':
        this.tone(147, 0.18, 'sawtooth', 0.06, 110);
        break;
      case 'deploy':
        this.tone(110, 0.25, 'sawtooth', 0.08, 220);
        [330, 440].forEach((f, i) => this.tone(f, 0.08, 'square', 0.05, undefined, 0.2 + i * 0.07));
        break;
      case 'part':
        [392, 523, 659].forEach((f, i) => this.tone(f, 0.08, 'triangle', 0.08, undefined, i * 0.05));
        break;
      case 'chest':
        this.tone(220, 0.08, 'square', 0.1, 440);
        [659, 880, 1175].forEach((f, i) => this.tone(f, 0.1, 'square', 0.07, undefined, 0.08 + i * 0.05));
        break;
      case 'fell':
        this.noise(0.3, 0.35);
        this.tone(120, 0.3, 'triangle', 0.15, 50);
        break;
      case 'lore':
        [880, 1175, 988, 1319].forEach((f, i) => this.tone(f, 0.06, 'square', 0.05, undefined, i * 0.07));
        break;
      case 'meteor':
        this.noise(0.3, 0.3);
        this.tone(90, 0.3, 'triangle', 0.14, 40);
        break;
      case 'weather':
        if (e.kind !== 'clear') [440, 554, 659].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.06, undefined, i * 0.15));
        break;
      case 'npcarrive':
        // Robot greeting: two quick chirps then a doorbell.
        [880, 1175, 659, 523].forEach((f, i) => this.tone(f, 0.1, 'square', 0.05, undefined, i * 0.08));
        break;
      case 'trade':
        // Coin-like clink.
        this.tone(1319, 0.06, 'square', 0.05, undefined, 0);
        this.tone(1760, 0.12, 'triangle', 0.05, undefined, 0.05);
        break;
      case 'npctalk':
        if (this.ok('npctalk', 300)) this.tone(660, 0.07, 'square', 0.04, 880);
        break;
      case 'roomready':
        // Warm rising chime.
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, f, i * 0.09));
        break;
      case 'raidstart':
        // Two-tone siren.
        [0, 0.35, 0.7].forEach((d) => this.tone(520, 0.3, 'square', 0.07, 780, d));
        break;
      case 'raidwarn':
        // A low two-note horn: something is coming.
        [0, 0.45].forEach((d, i) => this.tone(i ? 196 : 247, 0.4, 'sawtooth', 0.05, undefined, d));
        break;
      case 'raidclear':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.1, undefined, i * 0.09));
        break;
      case 'bossspawn':
        [110, 82, 55].forEach((f, i) => this.tone(f, 0.6, 'sawtooth', 0.16, undefined, i * 0.3));
        break;
      case 'bosswarn':
        this.tone(660, 0.12, 'square', 0.08, 990);
        break;
      case 'bossslam':
        this.noise(0.4, 0.5);
        this.tone(60, 0.4, 'triangle', 0.2, 30);
        break;
      case 'bossdown':
        [262, 330, 392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.12, undefined, i * 0.1));
        break;
      case 'nightfall':
        [330, 262, 196].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.1, undefined, i * 0.25));
        break;
      case 'dawn':
        [392, 523, 659].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.08, undefined, i * 0.2));
        break;
      case 'recallstart':
        this.tone(220, 1.2, 'sine', 0.08, 880);
        break;
      case 'recall':
        [880, 660, 1320].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.12, undefined, i * 0.06));
        break;
      case 'goal':
        [659, 880].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.08, undefined, i * 0.08));
        break;
      case 'award':
        // Award: a quick sparkle arpeggio, one note higher per tier.
        [784, 988, 1175, 1568].slice(0, 2 + e.tier).forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.09, undefined, i * 0.07));
        break;
      case 'record':
        // Personal best: a bright rising three-note fanfare.
        [523, 659, 988].forEach((f, i) => this.tone(f, i === 2 ? 0.22 : 0.12, 'square', 0.1, undefined, i * 0.11));
        break;
      case 'upgrade':
        [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.14, undefined, i * 0.06));
        break;
      case 'death':
        this.tone(330, 0.6, 'sawtooth', 0.2, 55);
        this.noise(0.4, 0.3);
        break;
      case 'lowbattery':
        this.tone(880, 0.1, 'square', 0.1);
        this.tone(880, 0.1, 'square', 0.1, undefined, 0.18);
        break;
      case 'full':
        this.tone(120, 0.15, 'square', 0.12);
        break;
      case 'turretshot':
        if (this.ok('turret', 110)) this.tone(640, 0.07, 'square', 0.05, 220);
        break;
      case 'spikehit':
        if (this.ok('spike', 150)) this.noise(0.04, 0.12);
        break;
      case 'shoot':
        if (this.ok('shoot', 80)) this.tone(900, 0.09, 'square', 0.07, 300);
        break;
      case 'drip':
        if (this.ok('drip', 200)) this.tone(900, 0.06, 'sine', 0.05, 500);
        break;
      case 'splash':
        if (this.ok('splash', 80)) this.noise(0.06, 0.1);
        break;
      case 'steam':
        // A short hiss.
        if (this.ok('steam', 120)) this.noise(0.25, 0.08);
        break;
      case 'gas':
        if (this.ok('gas', 300)) this.tone(110, 0.15, 'triangle', 0.08, 90);
        break;
      case 'shothit':
        if (this.ok('shothit', 60)) this.noise(0.04, 0.15);
        break;
      case 'newdive':
        this.tone(200, 0.4, 'triangle', 0.15, 800);
        break;
    }
  }
}
