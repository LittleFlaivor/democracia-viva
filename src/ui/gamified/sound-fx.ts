/**
 * SISTEMA DE EFECTOS DE AUDIO SINTETIZADOS (WEB AUDIO API NATIVO)
 * Genera efectos sonoros táctiles estilo videojuego sin archivos externos:
 * - Click táctil de interacción
 * - Swipe / Whoosh cinemático de carta
 * - Aprobación positiva (arpegio brillante)
 * - Rechazo mecánico (impacto sólido)
 * - Delegación técnica (acorde etéreo)
 * - Fanfarria de victoria y consenso final
 */

class SoundEffectsManager {
  private static instance: SoundEffectsManager;
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private constructor() {
    const saved = localStorage.getItem('democracia_sound_muted');
    if (saved === 'true') {
      this.isMuted = true;
    }
  }

  public static getInstance(): SoundEffectsManager {
    if (!SoundEffectsManager.instance) {
      SoundEffectsManager.instance = new SoundEffectsManager();
    }
    return SoundEffectsManager.instance;
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('democracia_sound_muted', String(this.isMuted));
    if (!this.isMuted) {
      this.playTap();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Click táctil suave al pasar el cursor o pulsar botones secundarios.
   */
  public playTap() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  /**
   * Deslizamiento cinemático de carta (Whoosh).
   */
  public playSwipe() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  /**
   * Voto A Favor: Tono ascendente nítido y satisfactorio (Esmeralda).
   */
  public playVoteYes() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.15, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.18);
    });
  }

  /**
   * Voto En Contra: Golpe mecánico y resolutivo con subgrave táctil.
   */
  public playVoteNo() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Delegar en Experto: Acorde armónico futurista (Violeta).
   */
  public playVoteDelegate() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    });
  }

  /**
   * Fanfarria de Consenso Final (Eureka).
   */
  public playVictoryEureka() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chords = [
      { f: 523.25, t: 0 },
      { f: 659.25, t: 0.08 },
      { f: 783.99, t: 0.16 },
      { f: 1046.50, t: 0.26 }
    ];

    chords.forEach(({ f, t }) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + t);

      gain.gain.setValueAtTime(0.18, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + t);
      osc.stop(now + t + 0.45);
    });
  }

  /**
   * Retroceso / Deshacer ronda (Tape rewind suave analógico).
   */
  public playUndo() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.14);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }
}

export const soundFx = SoundEffectsManager.getInstance();
