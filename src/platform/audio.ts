import type { GameEvent } from '../sim/game';

/** Synthesised sound effects: no audio files to ship, license or load. Starts only after a user gesture (browser autoplay policy). */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
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
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
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
    o.connect(g).connect(this.master);
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
    s.connect(g).connect(this.master);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
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
      case 'newdive':
        this.tone(200, 0.4, 'triangle', 0.15, 800);
        break;
    }
  }
}
