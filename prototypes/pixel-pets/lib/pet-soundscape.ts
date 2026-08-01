import type { PetReaction, PetStage } from "./pet-state";
import type { PetWeather, WorldVisitorKind } from "./pet-world";

export interface PetSoundscapeInput {
  enabled: boolean;
  weather: PetWeather;
  weatherIntensity: number;
  focusHush: number;
  visitor: WorldVisitorKind | null;
}

export interface PetSoundscapeMix {
  master: number;
  meadow: number;
  wind: number;
  rain: number;
  warmth: number;
  focus: number;
  wildlife: number;
}

export interface PetVoice {
  waveform: "triangle";
  frequencies: [number, number, number];
  durationSeconds: number;
  attackSeconds: number;
  peakGain: number;
}

export interface VisitorVoice {
  waveform: "sine" | "triangle";
  frequency: number;
  destinationFrequency: number;
  durationSeconds: number;
  peakGain: number;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function resolveSoundscapeMix(input: PetSoundscapeInput): PetSoundscapeMix {
  if (!input.enabled) {
    return { master: 0, meadow: 0, wind: 0, rain: 0, warmth: 0, focus: 0, wildlife: 0 };
  }

  const intensity = clamp(input.weatherIntensity);
  const hush = clamp(input.focusHush);
  const ordinaryWorld = 1 - hush;
  const softenedWorld = 1 - hush * 0.84;

  return {
    master: 0.16 * (1 - hush * 0.12),
    meadow: 0.2 * (1 - hush * 0.62),
    wind: input.weather === "breeze" ? 0.32 * intensity * softenedWorld : 0,
    rain: input.weather === "rain" ? 0.38 * intensity * softenedWorld : 0,
    warmth: input.weather === "sunny" ? 0.05 * intensity * ordinaryWorld : 0,
    focus: 0.07 * hush,
    wildlife: input.visitor ? 0.025 * ordinaryWorld : 0,
  };
}

const STAGE_VOICE = {
  baby: { frequency: 540, duration: 0.28, peakGain: 0.075 },
  young: { frequency: 445, duration: 0.38, peakGain: 0.085 },
  guardian: { frequency: 330, duration: 0.54, peakGain: 0.1 },
} satisfies Record<PetStage, { frequency: number; duration: number; peakGain: number }>;

const REACTION_INTERVAL = {
  idle: [1, 1.025, 0.99],
  greet: [1, 1.16, 1.08],
  eat: [0.94, 1.02, 0.9],
  discover: [1, 1.22, 1.12],
  sleep: [0.88, 0.82, 0.76],
  evolve: [0.9, 1.2, 1.5],
} satisfies Record<PetReaction, [number, number, number]>;

export function resolvePetVoice(stage: PetStage, reaction: PetReaction): PetVoice {
  const voice = STAGE_VOICE[stage];
  const intervals = REACTION_INTERVAL[reaction];
  const durationScale = reaction === "evolve" ? 1.12 : reaction === "sleep" ? 1.06 : 1;

  return {
    waveform: "triangle",
    frequencies: intervals.map((interval) => Math.round(voice.frequency * interval)) as [number, number, number],
    durationSeconds: Math.min(0.62, voice.duration * durationScale),
    attackSeconds: stage === "guardian" ? 0.055 : 0.035,
    peakGain: voice.peakGain,
  };
}

const VISITOR_VOICE = {
  crawler: {
    waveform: "triangle",
    frequency: 290,
    destinationFrequency: 250,
    durationSeconds: 0.24,
    peakGain: 0.035,
  },
  firefly: {
    waveform: "sine",
    frequency: 720,
    destinationFrequency: 910,
    durationSeconds: 0.28,
    peakGain: 0.03,
  },
  "sky-moth": {
    waveform: "sine",
    frequency: 1040,
    destinationFrequency: 760,
    durationSeconds: 0.33,
    peakGain: 0.028,
  },
} satisfies Record<WorldVisitorKind, VisitorVoice>;

export function resolveVisitorVoice(visitor: WorldVisitorKind): VisitorVoice {
  return VISITOR_VOICE[visitor];
}

type SoundscapeLayer = "meadow" | "wind" | "rain" | "warmth" | "focus" | "wildlife";

export class BrowserPetSoundscape {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: Partial<Record<SoundscapeLayer, GainNode>> = {};
  private sources: AudioScheduledSourceNode[] = [];
  private lastMix: PetSoundscapeMix = resolveSoundscapeMix({
    enabled: false,
    weather: "sunny",
    weatherIntensity: 1,
    focusHush: 0,
    visitor: null,
  });

  get started() {
    return this.context !== null && this.context.state !== "closed";
  }

  async start() {
    if (typeof window === "undefined" || !window.AudioContext) return false;
    if (!this.context) this.createGraph(new window.AudioContext());
    if (this.context?.state === "suspended") await this.context.resume();
    this.update(this.lastMix);
    return this.context?.state === "running";
  }

  update(mix: PetSoundscapeMix) {
    this.lastMix = mix;
    const context = this.context;
    if (!context || context.state === "closed" || !this.master) return;
    const now = context.currentTime;
    this.ramp(this.master, mix.master, now, mix.master === 0 ? 0.045 : 0.5);
    (Object.keys(this.layers) as SoundscapeLayer[]).forEach((layer) => {
      const gain = this.layers[layer];
      if (gain) this.ramp(gain, mix[layer], now, 0.62);
    });
  }

  playPetCue(stage: PetStage, reaction: PetReaction) {
    const context = this.context;
    if (!context || context.state !== "running" || !this.master || this.lastMix.master === 0) return;
    const cue = resolvePetVoice(stage, reaction);
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = cue.waveform;
    oscillator.frequency.setValueAtTime(cue.frequencies[0], now);
    oscillator.frequency.linearRampToValueAtTime(cue.frequencies[1], now + cue.durationSeconds * 0.46);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, cue.frequencies[2]), now + cue.durationSeconds);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(cue.peakGain, now + cue.attackSeconds);
    gain.gain.setValueAtTime(cue.peakGain, now + cue.durationSeconds * 0.56);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + cue.durationSeconds);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + cue.durationSeconds + 0.02);
  }

  playVisitorCue(visitor: WorldVisitorKind) {
    const context = this.context;
    if (!context || context.state !== "running" || !this.master || this.lastMix.master === 0) return;
    const cue = resolveVisitorVoice(visitor);
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = cue.waveform;
    oscillator.frequency.setValueAtTime(cue.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(cue.destinationFrequency, now + cue.durationSeconds);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(cue.peakGain, now + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + cue.durationSeconds);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + cue.durationSeconds + 0.02);
  }

  dispose() {
    const context = this.context;
    if (!context || context.state === "closed") return;
    const now = context.currentTime;
    if (this.master) this.ramp(this.master, 0, now, 0.035);
    this.sources.forEach((source) => {
      try {
        source.stop(now + 0.08);
      } catch {
        // A source that has already stopped needs no further cleanup.
      }
    });
    window.setTimeout(() => void context.close(), 100);
    this.context = null;
    this.master = null;
    this.layers = {};
    this.sources = [];
  }

  private createGraph(context: AudioContext) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);

    this.layers.meadow = this.createNoiseLayer(context, "lowpass", 980, 0.15);
    this.layers.wind = this.createNoiseLayer(context, "bandpass", 620, 0.18);
    this.layers.rain = this.createNoiseLayer(context, "highpass", 2300, 0.12);
    this.layers.warmth = this.createToneLayer(context, 261.63, "sine");
    this.layers.focus = this.createToneLayer(context, 196, "sine");
    this.layers.wildlife = this.createToneLayer(context, 880, "sine");
  }

  private createNoiseLayer(
    context: AudioContext,
    filterType: BiquadFilterType,
    frequency: number,
    resonance: number,
  ) {
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = Math.round(frequency * 17);
    for (let index = 0; index < data.length; index += 1) {
      seed = (seed * 16807) % 2147483647;
      data[index] = (seed / 1073741823.5 - 1) * 0.72;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = resonance;
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    source.start();
    this.sources.push(source);
    return gain;
  }

  private createToneLayer(context: AudioContext, frequency: number, type: OscillatorType) {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    filter.type = "lowpass";
    filter.frequency.value = Math.max(320, frequency * 1.8);
    gain.gain.value = 0;
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    oscillator.start();
    this.sources.push(oscillator);
    return gain;
  }

  private ramp(gain: GainNode, value: number, now: number, timeConstant: number) {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.setTargetAtTime(Math.max(0.0001, value), now, timeConstant);
  }
}
