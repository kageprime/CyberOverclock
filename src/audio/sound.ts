// Web Audio API Synthesizer for Cyberpunk Roguelite

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmInterval: any = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private step: number = 0;
  private isCombatIntense: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.startBGM();
    } catch (e) {
      console.warn('Web Audio not supported or failed to initialize', e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setCombatIntensity(intense: boolean) {
    this.isCombatIntense = intense;
  }

  // --- Sound Effects ---

  public playSlash(comboStep: number = 1) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    const baseFreq = comboStep === 3 ? 520 : comboStep === 2 ? 440 : 380;
    osc.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.14);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playDash() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Filtered white noise burst + pitch sweep
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.18);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    noise.start(now);
  }

  public playLaser() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playHit(isCrit: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 360 : 200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    gain.gain.setValueAtTime(isCrit ? 0.6 : 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playExplosion() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    noise.start(now);
  }

  public playOverclock() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playPickup() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.00, now + 0.06); // A5

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playRoomClear() {
    if (!this.ctx || this.isMuted) return;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now);
        osc.stop(now + 0.2);
      }, idx * 70);
    });
  }

  // --- Cyberpunk Dynamic Synthwave Generator ---

  private startBGM() {
    if (this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;

    // 125 BPM synth loop, 16 steps per bar
    const stepDuration = 60 / 125 / 4; // 16th note = ~0.12s
    const bassNotes = [110, 110, 110, 110, 98, 98, 123.47, 110]; // A2, G2, B2
    const arpHex = [220, 261.63, 329.63, 440, 523.25, 659.25, 523.25, 440];

    this.bgmInterval = setInterval(() => {
      if (!this.ctx || this.isMuted || !this.bgmPlaying) return;
      const now = this.ctx.currentTime;
      const beat = this.step % 16;
      this.step++;

      // Synth Bassline on 8th notes
      if (beat % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        const noteIdx = Math.floor(beat / 2) % bassNotes.length;
        osc.frequency.setValueAtTime(bassNotes[noteIdx], now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(this.isCombatIntense ? 1200 : 600, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + stepDuration * 1.8);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + stepDuration * 1.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain!);

        osc.start(now);
        osc.stop(now + stepDuration * 1.9);
      }

      // Cyber Kick on beats 0, 4, 8, 12
      if (beat % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();

        kickOsc.frequency.setValueAtTime(150, now);
        kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

        kickGain.gain.setValueAtTime(0.35, now);
        kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain!);

        kickOsc.start(now);
        kickOsc.stop(now + 0.12);
      }

      // Snare / Clap on beats 4, 12
      if (beat === 4 || beat === 12) {
        const snareNoise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
        const data = snareNoise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = snareNoise;
        const sFilter = this.ctx.createBiquadFilter();
        sFilter.type = 'highpass';
        sFilter.frequency.setValueAtTime(900, now);
        const sGain = this.ctx.createGain();
        sGain.gain.setValueAtTime(0.18, now);
        sGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        noiseNode.connect(sFilter);
        sFilter.connect(sGain);
        sGain.connect(this.musicGain!);
        noiseNode.start(now);
      }

      // High Arp in combat
      if (this.isCombatIntense && beat % 2 === 1) {
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'sine';
        const note = arpHex[beat % arpHex.length];
        arpOsc.frequency.setValueAtTime(note, now);
        arpGain.gain.setValueAtTime(0.08, now);
        arpGain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);
        arpOsc.connect(arpGain);
        arpGain.connect(this.musicGain!);
        arpOsc.start(now);
        arpOsc.stop(now + 0.09);
      }
    }, stepDuration * 1000);
  }
}

export const sound = new SoundSystem();
