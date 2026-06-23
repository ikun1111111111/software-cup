/**
 * Web 端实时口型同步引擎
 *
 * 基于 Web Audio API 的 AnalyserNode 实时分析音频能量，
 * 映射到 VRM 的口型 blend shape（aa/ih/ou/ee/oh）。
 *
 * 仅在浏览器环境可用，React Native 请使用 phoneme 时间轴方案。
 */
export class LipSyncEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private dataArray: Uint8Array | null = null;
  private rafId: number | null = null;
  private running = false;

  // 平滑后的口型值
  private smoothed = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };

  // 配置参数
  private config = {
    smoothing: 0.75,      // Analyser 平滑系数 (0-1)
    fftSize: 512,         // FFT 大小
    mouthSmoothing: 0.6,  // 口型值平滑系数
    sensitivity: 1.8,     // 灵敏度
    threshold: 4,         // 静音阈值 (dB)
  };

  private onUpdate: (lips: { aa: number; ih: number; ou: number; ee: number; oh: number }) => void;

  constructor(
    onUpdate: (lips: { aa: number; ih: number; ou: number; ee: number; oh: number }) => void,
  ) {
    this.onUpdate = onUpdate;
  }

  /**
   * 用 AudioBuffer 播放并驱动口型（适合 TTS 返回的音频数据）
   */
  async playAudioBuffer(
    audioBuffer: AudioBuffer,
    onEnded?: () => void,
  ): Promise<void> {
    this.stop();

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.audioContext = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = this.config.fftSize;
    analyser.smoothingTimeConstant = this.config.smoothing;
    this.analyser = analyser;

    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    this.gainNode = gain;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    this.source = source;

    this.dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.onended = () => {
      onEnded?.();
      this.stop();
    };

    source.start(0);
    this.running = true;
    this.driveLoop();
  }

  /**
   * 用 HTMLAudioElement/MediaElement 驱动口型（适合 <audio> 标签）
   */
  async playMediaElement(
    mediaElement: HTMLAudioElement | HTMLMediaElement,
    onEnded?: () => void,
  ): Promise<void> {
    this.stop();

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.audioContext = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = this.config.fftSize;
    analyser.smoothingTimeConstant = this.config.smoothing;
    this.analyser = analyser;

    const source = ctx.createMediaElementSource(mediaElement as HTMLMediaElement);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    this.source = source;

    this.dataArray = new Uint8Array(analyser.frequencyBinCount);

    const endedHandler = () => {
      onEnded?.();
      this.stop();
    };
    mediaElement.addEventListener('ended', endedHandler, { once: true });

    this.running = true;
    this.driveLoop();
  }

  private driveLoop = () => {
    if (!this.running || !this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray as any);

    const bands = this.analyzeBands();
    const target = this.mapToLipShapes(bands);

    // 平滑过渡
    const s = this.config.mouthSmoothing;
    for (const key of Object.keys(this.smoothed) as Array<keyof typeof this.smoothed>) {
      this.smoothed[key] = this.smoothed[key] * s + target[key] * (1 - s);
    }

    this.onUpdate({ ...this.smoothed });
    this.rafId = requestAnimationFrame(this.driveLoop);
  };

  /**
   * 分析频带能量
   */
  private analyzeBands(): {
    low: number;      // 85-250 Hz  (元音 aa/ou 基础)
    midLow: number;   // 250-500 Hz (ee/oh)
    mid: number;      // 500-2000 Hz (ih, 辅音)
    high: number;     // 2000-8000 Hz (齿音、气音)
    totalDb: number;
  } {
    if (!this.analyser || !this.dataArray) {
      return { low: 0, midLow: 0, mid: 0, high: 0, totalDb: 0 };
    }

    const nyquist = this.analyser.context.sampleRate / 2;
    const binCount = this.dataArray.length;
    const binToFreq = (i: number) => (i / binCount) * nyquist;

    let low = 0, midLow = 0, mid = 0, high = 0;
    let lowCount = 0, midLowCount = 0, midCount = 0, highCount = 0;
    let totalDb = 0;

    for (let i = 0; i < binCount; i++) {
      const freq = binToFreq(i);
      const value = this.dataArray[i];
      const db = value > 0 ? 20 * Math.log10(value / 255) : -100;
      totalDb = Math.max(totalDb, db);

      if (freq >= 85 && freq < 250) {
        low += db;
        lowCount++;
      } else if (freq >= 250 && freq < 500) {
        midLow += db;
        midLowCount++;
      } else if (freq >= 500 && freq < 2000) {
        mid += db;
        midCount++;
      } else if (freq >= 2000 && freq < 8000) {
        high += db;
        highCount++;
      }
    }

    const avg = (sum: number, count: number) => (count > 0 ? sum / count : -100);

    return {
      low: avg(low, lowCount),
      midLow: avg(midLow, midLowCount),
      mid: avg(mid, midCount),
      high: avg(high, highCount),
      totalDb,
    };
  }

  /**
   * 将频带能量映射到 VRM 口型 blend shape
   */
  private mapToLipShapes(bands: {
    low: number;
    midLow: number;
    mid: number;
    high: number;
    totalDb: number;
  }) {
    const { threshold, sensitivity } = this.config;

    if (bands.totalDb < threshold) {
      return { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    }

    // 把 dB 值归一化到 0-1
    const norm = (db: number) => {
      const v = (db - threshold) / (60 - threshold); // 60dB 视为最大
      return Math.max(0, Math.min(1, v * sensitivity));
    };

    return {
      aa: norm(bands.low) * 1.2,           // 低频元音：张嘴
      ou: norm(bands.low) * 0.8,           // 圆唇音
      oh: norm(bands.midLow) * 0.9,        // 中低圆唇
      ee: norm(bands.midLow) * 1.0,        // 咧嘴
      ih: norm(bands.mid) * 1.1,           // 扁嘴、辅音
    };
  }

  stop(): void {
    this.running = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    try {
      if ('stop' in (this.source as any)) {
        (this.source as any).stop();
      }
    } catch {
      // ignore
    }

    this.source?.disconnect?.();
    this.gainNode?.disconnect?.();
    this.analyser?.disconnect?.();

    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close?.().catch(() => {});
    }

    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.gainNode = null;
    this.dataArray = null;

    // 口型归零
    this.smoothed = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    this.onUpdate({ ...this.smoothed });
  }
}
