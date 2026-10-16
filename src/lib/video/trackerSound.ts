// src/lib/video/trackerSound.ts
// What the tracker does out loud when it calls a shot.
//
// A phone on a tripod is several metres away and the player is usually facing
// the hoop, so the badge on screen is only half the confirmation - vibration
// never reaches them and a glance costs the next rep. Sound is the part that
// actually lands.
//
// Makes and misses are chosen separately, because they are not equally
// interesting: a make is the thing worth hearing, and most people want nothing
// at all for a miss unless it is funny. So misses default to silent while makes
// default to a swish.
//
// Everything is synthesised through the Web Audio API rather than shipped as
// audio files: no assets to download, nothing to break offline, and a swish is
// a band-passed noise burst with a falling filter.

export const MAKE_SOUNDS = [
  { id: 'swish', label: 'Swish' },
  { id: 'chime', label: 'Chime' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'bass', label: 'Bass drop' },
  { id: 'crowd', label: 'Crowd' },
  { id: 'off', label: 'Silent' },
] as const;

export const MISS_SOUNDS = [
  { id: 'off', label: 'Silent' },
  { id: 'clunk', label: 'Rim clunk' },
  { id: 'buzz', label: 'Buzz' },
  { id: 'sad', label: 'Sad trombone' },
] as const;

export const VOICE_STYLES = [
  // Every entry carries `example`, even the empty one, so the union does not
  // narrow to a shape without it and force a check at every use site
  { id: 'off', label: 'No voice', example: '' },
  { id: 'score', label: 'Score only', example: '4 of 7' },
  { id: 'call', label: 'Call and score', example: 'Make. 4 of 7' },
  { id: 'hype', label: 'Hyped', example: 'Bucket! 4 of 7' },
  { id: 'makes', label: 'Makes only', example: '4 of 7, on makes only' },
] as const;

export type MakeSound = (typeof MAKE_SOUNDS)[number]['id'];
export type MissSound = (typeof MISS_SOUNDS)[number]['id'];
export type VoiceStyle = (typeof VOICE_STYLES)[number]['id'];

export interface SoundSettings {
  make: MakeSound;
  miss: MissSound;
  voice: VoiceStyle;
  /** A voiceURI from speechSynthesis.getVoices(), or null for the default. */
  voiceUri: string | null;
}

export const DEFAULT_SOUND: SoundSettings = { make: 'off', miss: 'off', voice: 'off', voiceUri: null };

const KEY = 'hoopiq-tracker-sound-v2';

const isMake = (v: unknown): v is MakeSound => MAKE_SOUNDS.some((s) => s.id === v);
const isMiss = (v: unknown): v is MissSound => MISS_SOUNDS.some((s) => s.id === v);
const isVoice = (v: unknown): v is VoiceStyle => VOICE_STYLES.some((s) => s.id === v);

/** Reads saved settings. Everything off by default: nobody expects noise unasked. */
export function loadSound(): SoundSettings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SOUND;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      make: isMake(parsed.make) ? parsed.make : DEFAULT_SOUND.make,
      miss: isMiss(parsed.miss) ? parsed.miss : DEFAULT_SOUND.miss,
      voice: isVoice(parsed.voice) ? parsed.voice : DEFAULT_SOUND.voice,
      voiceUri: typeof parsed.voiceUri === 'string' ? parsed.voiceUri : null,
    };
  } catch {
    return DEFAULT_SOUND;
  }
}

export function storeSound(settings: SoundSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private window or blocked storage: the choice lasts the session, which
    // is a smaller loss than refusing to make a sound at all.
  }
}

let ctx: AudioContext | null = null;

/**
 * The shared audio context, created on first use.
 *
 * Browsers refuse to start one outside a user gesture, so this is only called
 * from inside a session the player started, and a refusal is swallowed - a
 * missing sound must never stop a shot being counted.
 */
function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

/** Nudges a context the browser suspended when the tab lost focus. */
export function resumeAudio(): void {
  const c = audio();
  if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
}

/** One oscillator note. `at` offsets it, so notes can be built into a phrase. */
function note(
  c: AudioContext,
  { from, to, seconds, type, gain, at = 0 }: { from: number; to: number; seconds: number; type: OscillatorType; gain: number; at?: number }
): void {
  const start = c.currentTime + at;
  const osc = c.createOscillator();
  const vol = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
  // Ramped rather than switched: an abrupt stop clicks
  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(vol).connect(c.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

/** A burst of noise shaped by a sweeping filter: nets, crowds and buzzes. */
function noise(
  c: AudioContext,
  { seconds, fromHz, toHz, gain, type = 'bandpass', swell = false }: { seconds: number; fromHz: number; toHz: number; gain: number; type?: BiquadFilterType; swell?: boolean }
): void {
  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const p = i / data.length;
    // A swell rises then falls (a crowd); otherwise it decays (a swish)
    const shape = swell ? Math.sin(Math.PI * p) : 1 - p;
    data[i] = (Math.random() * 2 - 1) * shape;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(fromHz, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), c.currentTime + seconds);
  const vol = c.createGain();
  vol.gain.setValueAtTime(gain, c.currentTime);
  src.connect(filter).connect(vol).connect(c.destination);
  src.start();
}

export function playMake(sound: MakeSound): void {
  const c = audio();
  if (!c || sound === 'off') return;
  try {
    if (sound === 'swish') {
      noise(c, { seconds: 0.28, fromHz: 3200, toHz: 900, gain: 0.35 });
    } else if (sound === 'chime') {
      // A major third, struck together and left to ring
      note(c, { from: 880, to: 880, seconds: 0.5, type: 'sine', gain: 0.22 });
      note(c, { from: 1108, to: 1108, seconds: 0.55, type: 'sine', gain: 0.16, at: 0.02 });
    } else if (sound === 'arcade') {
      // Three rising square blips, the shape of every coin ever collected
      note(c, { from: 660, to: 660, seconds: 0.07, type: 'square', gain: 0.18 });
      note(c, { from: 880, to: 880, seconds: 0.07, type: 'square', gain: 0.18, at: 0.07 });
      note(c, { from: 1320, to: 1320, seconds: 0.14, type: 'square', gain: 0.18, at: 0.14 });
    } else if (sound === 'bass') {
      note(c, { from: 220, to: 55, seconds: 0.42, type: 'sine', gain: 0.4 });
    } else if (sound === 'crowd') {
      // Low broadband noise that swells and falls: a roar, at arm's length
      noise(c, { seconds: 0.85, fromHz: 420, toHz: 900, gain: 0.3, type: 'lowpass', swell: true });
    }
  } catch {
    // Never let a sound failure interrupt a session
  }
}

export function playMiss(sound: MissSound): void {
  const c = audio();
  if (!c || sound === 'off') return;
  try {
    if (sound === 'clunk') {
      note(c, { from: 180, to: 120, seconds: 0.2, type: 'square', gain: 0.18 });
    } else if (sound === 'buzz') {
      note(c, { from: 160, to: 150, seconds: 0.32, type: 'sawtooth', gain: 0.16 });
    } else if (sound === 'sad') {
      // Three notes down. Entirely unserious, and the whole reason someone
      // would turn miss sounds on at all.
      note(c, { from: 330, to: 311, seconds: 0.18, type: 'sawtooth', gain: 0.16 });
      note(c, { from: 294, to: 277, seconds: 0.18, type: 'sawtooth', gain: 0.16, at: 0.17 });
      note(c, { from: 262, to: 196, seconds: 0.42, type: 'sawtooth', gain: 0.18, at: 0.34 });
    }
  } catch {
    // As above
  }
}

/**
 * Voices the browser offers, English first.
 *
 * Returns nothing until the list has loaded, which on some browsers happens
 * after a "voiceschanged" event rather than immediately - see onVoicesReady.
 */
export function availableVoices(): SpeechSynthesisVoice[] {
  try {
    const all = window.speechSynthesis?.getVoices() ?? [];
    return [...all].sort((a, b) => {
      const aEn = a.lang.startsWith('en') ? 0 : 1;
      const bEn = b.lang.startsWith('en') ? 0 : 1;
      return aEn - bEn || a.name.localeCompare(b.name);
    });
  } catch {
    return [];
  }
}

/** Calls back when the voice list is populated. Returns a cleanup function. */
export function onVoicesReady(callback: () => void): () => void {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return () => undefined;
    synth.addEventListener('voiceschanged', callback);
    return () => synth.removeEventListener('voiceschanged', callback);
  } catch {
    return () => undefined;
  }
}

const HYPE_MAKE = ['Bucket!', 'Got it!', 'Cash!', 'Money!', 'Splash!'];
const HYPE_MISS = ['Next one.', 'Keep going.', 'Reset.'];

/** What the voice should say, or null when it should stay quiet. */
export function spokenLine(style: VoiceStyle, made: boolean, makes: number, attempts: number): string | null {
  const score = `${makes} of ${attempts}`;
  if (style === 'off') return null;
  if (style === 'makes') return made ? score : null;
  if (style === 'score') return score;
  if (style === 'call') return `${made ? 'Make' : 'Miss'}. ${score}`;
  const words = made ? HYPE_MAKE : HYPE_MISS;
  return `${words[Math.floor(Math.random() * words.length)]} ${score}`;
}

/**
 * Says something, if the browser can.
 *
 * Cancels anything still speaking: shots can come faster than a sentence, and
 * a queue of stale scores is worse than silence.
 */
export function say(text: string, voiceUri: string | null): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const chosen = voiceUri ? availableVoices().find((v) => v.voiceURI === voiceUri) : null;
    if (chosen) utterance.voice = chosen;
    utterance.rate = 1.15;
    synth.speak(utterance);
  } catch {
    // No speech synthesis, or blocked. Not a reason to fail a shot.
  }
}

/** Announces one called shot: the chosen sound, then the chosen words. */
export function announceShot(settings: SoundSettings, made: boolean, makes: number, attempts: number): void {
  resumeAudio();
  if (made) playMake(settings.make);
  else playMiss(settings.miss);
  const line = spokenLine(settings.voice, made, makes, attempts);
  if (line) say(line, settings.voiceUri);
}
