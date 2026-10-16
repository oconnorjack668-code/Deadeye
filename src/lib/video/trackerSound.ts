// src/lib/video/trackerSound.ts
// What the tracker does out loud when it calls a shot.
//
// A phone on a tripod is several metres away and the player is usually facing
// the other way, so the visual badge is only half the confirmation - vibration
// is useless at that distance and a glance costs the next rep. Sound is the
// part that actually reaches them.
//
// Tones are synthesised rather than shipped as audio files: no assets to load,
// nothing to go wrong offline, and a swish or a clunk is a handful of
// oscillator settings. The voice uses the browser's own speech synthesis for
// the same reason.

export const SOUND_CHOICES = [
  { id: 'off', label: 'Silent', hint: 'Just the badge on screen' },
  { id: 'tone', label: 'Tones', hint: 'A rising note for a make, a flat one for a miss' },
  { id: 'swish', label: 'Swish', hint: 'A swish for a make, a rim clunk for a miss' },
  { id: 'voice', label: 'Voice', hint: 'Says the running score out loud' },
] as const;

export type SoundChoice = (typeof SOUND_CHOICES)[number]['id'];

const KEY = 'hoopiq-tracker-sound-v1';

/** Reads the saved choice. Silent by default: nobody expects noise unasked. */
export function loadSoundChoice(): SoundChoice {
  try {
    const raw = window.localStorage.getItem(KEY);
    return SOUND_CHOICES.some((c) => c.id === raw) ? (raw as SoundChoice) : 'off';
  } catch {
    return 'off';
  }
}

export function storeSoundChoice(choice: SoundChoice): void {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    // Private window or blocked storage: the choice lasts the session, which
    // is a smaller loss than refusing to make a sound at all.
  }
}

type Ctx = AudioContext & { webkitAudioContext?: never };
let ctx: Ctx | null = null;

/**
 * The shared audio context, created on first use.
 *
 * Browsers refuse to start one outside a user gesture, so this is only ever
 * called from inside the tracking session the player themselves started, and
 * a refusal is swallowed rather than thrown - a missing sound must never stop
 * a shot being counted.
 */
function audio(): Ctx | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC() as Ctx;
    return ctx;
  } catch {
    return null;
  }
}

/** Nudges a context that the browser suspended when the tab lost focus. */
export function resumeAudio(): void {
  const c = audio();
  if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
}

interface ToneSpec {
  from: number;
  to: number;
  seconds: number;
  type: OscillatorType;
  gain: number;
}

function playTone({ from, to, seconds, type, gain }: ToneSpec): void {
  const c = audio();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const vol = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), c.currentTime + seconds);
    // Ramped rather than switched, because an abrupt stop clicks
    vol.gain.setValueAtTime(0.0001, c.currentTime);
    vol.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.01);
    vol.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + seconds);
    osc.connect(vol).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + seconds + 0.02);
  } catch {
    // Never let a sound failure interrupt a session
  }
}

/** White-ish noise through a falling filter: the closest a few lines get to a net. */
function playSwish(): void {
  const c = audio();
  if (!c) return;
  try {
    const seconds = 0.28;
    const buffer = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // Fades across the buffer so the swish falls away rather than stopping
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(900, c.currentTime + seconds);
    const vol = c.createGain();
    vol.gain.setValueAtTime(0.35, c.currentTime);
    src.connect(filter).connect(vol).connect(c.destination);
    src.start();
  } catch {
    // As above
  }
}

/**
 * Says something, if the browser can and the player asked for it.
 *
 * Cancels anything still speaking first: shots can come faster than a sentence,
 * and a queue of stale scores is worse than silence.
 */
export function say(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.15;
    utterance.volume = 1;
    synth.speak(utterance);
  } catch {
    // No speech synthesis, or it is blocked. Not a reason to fail a shot.
  }
}

/**
 * Announces one called shot.
 *
 * `made` drives which sound; the score is only spoken, since a number read
 * aloud is the one thing a player cannot get from a glance at the phone.
 */
export function announceShot(choice: SoundChoice, made: boolean, makes: number, attempts: number): void {
  if (choice === 'off') return;
  resumeAudio();
  if (choice === 'tone') {
    // Up for a make, down for a miss - learnable without being told
    playTone(made ? { from: 520, to: 880, seconds: 0.18, type: 'sine', gain: 0.3 } : { from: 300, to: 200, seconds: 0.22, type: 'sine', gain: 0.22 });
    return;
  }
  if (choice === 'swish') {
    if (made) playSwish();
    else playTone({ from: 180, to: 120, seconds: 0.2, type: 'square', gain: 0.18 });
    return;
  }
  if (choice === 'voice') {
    say(`${made ? 'Make' : 'Miss'}. ${makes} of ${attempts}`);
  }
}
