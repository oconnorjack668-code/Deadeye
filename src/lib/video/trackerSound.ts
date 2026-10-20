// src/lib/video/trackerSound.ts
// What the app does out loud when a shot is called: by the video tracker, or
// by a player tapping make or miss in the hoops logger. One choice, made once
// in Settings, for both.
//
// A phone on a tripod is several metres away and the player is usually facing
// the hoop, so the badge on screen is only half the confirmation - vibration
// never reaches them and a glance costs the next rep. Sound is the part that
// actually lands.
//
// Makes and misses are chosen separately, because they are not equally
// interesting: a make is the thing worth hearing, and most people want nothing
// at all for a miss unless it is funny. The defaults are two real recordings,
// a net swish and a rim clank, because those sound like basketball.
//
// Almost everything is synthesised rather than shipped as audio files, which is
// a licensing decision as much as a technical one. A recording is owned by
// whoever made it - a game's sound effect, a clip of a song, another creator's
// upload - and being widely shared does not change that, because a licence
// covering a sound on one platform does not travel to this app. A FORMAT is not
// owned, though. An airhorn, a record scratch, a rimshot, a sad trombone are
// comedic gestures anyone may build their own version of, so these sound like
// the gag and owe nothing to anyone. If recorded audio is ever added here, it
// has to be recorded by us or carry a licence covering commercial distribution.
//
// The two recordings do: both are CC0 (public domain dedication) on Freesound,
// which allows commercial use with no attribution, each trimmed to one shot.
//   /sounds/swish.mp3      the third swish in "Basketball Net Swish Sound.wav"
//                          by Hann90, https://freesound.org/people/Hann90/sounds/518048/
//   /sounds/rim-clank.mp3  the first brick in "Sports Basketball Hit Basket Missed"
//                          by amsaenz03, https://freesound.org/people/amsaenz03/sounds/788261/

// Order is celebration first and understated last, with the swish in front
// because it is the one that sounds like basketball rather than like a game.
export const MAKE_SOUNDS = [
  { id: 'net', label: 'Net swish (real)' },
  { id: 'swish', label: 'Swish' },
  { id: 'airhorn', label: 'Airhorn' },
  { id: 'crowd', label: 'Crowd roar' },
  { id: 'applause', label: 'Applause' },
  { id: 'bell', label: 'Boxing bell' },
  { id: 'fanfare', label: 'Fanfare' },
  { id: 'kaching', label: 'Ka-ching' },
  { id: 'levelup', label: 'Level up' },
  { id: 'gong', label: 'Gong' },
  { id: 'bass', label: 'Bass drop' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'chime', label: 'Chime' },
  { id: 'off', label: 'Silent' },
] as const;

// Silent leads because it is the default, and then the jokes, because a funny
// one is the only reason anyone turns miss sounds on at all. The two flat
// sounds come last rather than first for the same reason.
export const MISS_SOUNDS = [
  { id: 'rim', label: 'Rim clank (real)' },
  { id: 'off', label: 'Silent' },
  { id: 'sad', label: 'Sad trombone' },
  { id: 'wah', label: 'Wah wah' },
  { id: 'rimshot', label: 'Rimshot' },
  { id: 'scratch', label: 'Record scratch' },
  { id: 'boing', label: 'Boing' },
  { id: 'wrong', label: 'Wrong answer' },
  { id: 'deflate', label: 'Deflate' },
  { id: 'brick', label: 'Brick' },
  { id: 'clunk', label: 'Rim clunk' },
  { id: 'buzz', label: 'Buzzer' },
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
  /**
   * Silences everything without forgetting any of it.
   *
   * Separate from setting all three to off, because someone sharing a court
   * wants one button now and their sounds back afterwards - not to rebuild
   * the choice from scratch.
   */
  muted: boolean;
}

export const DEFAULT_SOUND: SoundSettings = {
  make: 'net',
  miss: 'rim',
  voice: 'off',
  voiceUri: null,
  muted: false,
};

const KEY = 'hoopiq-tracker-sound-v2';

const isMake = (v: unknown): v is MakeSound => MAKE_SOUNDS.some((s) => s.id === v);
const isMiss = (v: unknown): v is MissSound => MISS_SOUNDS.some((s) => s.id === v);
const isVoice = (v: unknown): v is VoiceStyle => VOICE_STYLES.some((s) => s.id === v);

/**
 * Reads saved settings. Until a player chooses, a make swishes and a miss
 * clanks, quietly: a player who wants silence turns it off once in Settings or
 * with the mute button, and a player who chose silence before keeps it.
 */
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
      muted: parsed.muted === true,
    };
  } catch {
    return DEFAULT_SOUND;
  }
}

/** Whether anything would be heard at all, which is what the mute button reads. */
export function isAudible(settings: SoundSettings): boolean {
  if (settings.muted) return false;
  return settings.make !== 'off' || settings.miss !== 'off' || settings.voice !== 'off';
}

/**
 * The current choice in a few words, for a screen that is not the picker.
 *
 * The tracker shows this rather than four dropdowns, because by then the
 * choice has already been made in Settings and all that is wanted on a phone
 * on a tripod is confirmation that it will be heard.
 */
export function soundSummary(settings: SoundSettings): string {
  if (settings.muted) return 'Muted';
  const parts: string[] = [];
  const make = MAKE_SOUNDS.find((s) => s.id === settings.make);
  const miss = MISS_SOUNDS.find((s) => s.id === settings.miss);
  if (make && settings.make !== 'off') parts.push(make.label);
  if (miss && settings.miss !== 'off') parts.push(`${miss.label} on a miss`);
  if (settings.voice !== 'off') {
    const voice = VOICE_STYLES.find((s) => s.id === settings.voice);
    if (voice) parts.push(voice.label.toLowerCase());
  }
  return parts.length ? parts.join(' · ') : 'Silent';
}

export function storeSound(settings: SoundSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private window or blocked storage: the choice lasts the session, which
    // is a smaller loss than refusing to make a sound at all.
  }
}

// ---------------------------------------------------------------------------
// The synthesis engine
//
// Three things separate a sound that reads as finished from one that reads as
// cheap, and none of them is expensive to fix.
//
// 1. SPACE. A bare oscillator is bone dry, and nothing in the real world is.
//    One short convolution reverb - decaying noise, generated independently
//    per channel so the tail is wide - puts every sound in a room.
//
// 2. SPECTRUM. A phone speaker produces almost nothing below about 400 Hz, so
//    a bass drop sweeping to 55 Hz is near silence with a click on the front.
//    The low sounds here are built from harmonics ABOVE the fundamental, which
//    the ear reassembles into a bass note the speaker never actually made.
//
// 3. PARTIALS. One oscillator is a test tone. A struck bell has partials at
//    non-integer ratios, brass has a filter that opens as it is blown, and a
//    horn has two voices beating against each other a few hertz apart. That
//    structure is most of what quality means here.
// ---------------------------------------------------------------------------

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

interface Rig {
  c: AudioContext;
  /** Where every voice sends its dry signal. */
  master: GainNode;
  /** Where every voice sends its share of the reverb. */
  wet: GainNode;
}

let rig: Rig | null = null;

/** A synthesised room: decaying noise, which is all a reverb tail really is. */
function room(c: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buffer = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    // Generated separately per channel on purpose: two identical tails collapse
    // to the middle, two independent ones sound like a hall
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buffer;
}

/** The output chain, built once. */
function engine(): Rig | null {
  if (rig) return rig;
  const c = audio();
  if (!c) return null;
  try {
    const master = c.createGain();
    master.gain.setValueAtTime(0.9, c.currentTime);

    // A limiter rather than a compressor. Shots can be called while the last
    // celebration is still ringing, and two sounds landing together is the one
    // case that would clip - which is the single artefact that reads as
    // genuinely broken rather than merely quiet.
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-6, c.currentTime);
    limiter.knee.setValueAtTime(0, c.currentTime);
    limiter.ratio.setValueAtTime(20, c.currentTime);
    limiter.attack.setValueAtTime(0.003, c.currentTime);
    limiter.release.setValueAtTime(0.12, c.currentTime);
    master.connect(limiter).connect(c.destination);

    const reverb = c.createConvolver();
    reverb.buffer = room(c, 1.1, 2.4);
    const wet = c.createGain();
    wet.gain.setValueAtTime(1, c.currentTime);
    wet.connect(reverb).connect(master);

    rig = { c, master, wet };
    return rig;
  } catch {
    return null;
  }
}

/**
 * Nudges a context the browser suspended, and builds the rig if it has not
 * been built.
 *
 * Called when a session starts rather than when the first shot lands, because
 * generating the reverb tail takes a few milliseconds and the moment a shot is
 * called is the worst possible time to spend them.
 */
export function resumeAudio(): void {
  const r = engine();
  if (r && r.c.state === 'suspended') void r.c.resume().catch(() => undefined);
}

/**
 * One voice's output.
 *
 * Every voice gets its own gain, sent both straight to the master and into the
 * shared reverb. The send is per voice because an arcade blip wants to stay
 * dry and a gong wants a hall.
 */
function out(r: Rig, wet: number): GainNode {
  const g = r.c.createGain();
  g.connect(r.master);
  if (wet > 0) {
    const send = r.c.createGain();
    send.gain.setValueAtTime(wet, r.c.currentTime);
    g.connect(send).connect(r.wet);
  }
  return g;
}

/**
 * A ratio against the fundamental, and how loud that partial is.
 *
 * Not called Partial, which is taken by TypeScript's own Partial<T> - and
 * loadSound above needs it.
 */
type Overtone = readonly [ratio: number, level: number];

/** A point on a pitch path: how far through the sound, and what pitch. */
type PitchPoint = readonly [fraction: number, hz: number];

interface ToneSpec {
  /** The fundamental, which several partials may be derived from. */
  freq: number;
  seconds: number;
  gain: number;
  at?: number;
  type?: OscillatorType;
  /** Where the pitch ends up, as sugar for a single-point path. */
  to?: number;
  /** Several pitches in sequence - a scratch being dragged, a horn bending. */
  path?: readonly PitchPoint[];
  /**
   * Ratios against the fundamental. An integer series is brass or a string; a
   * non-integer one is struck metal. Levels are normalised, so `gain` always
   * means the peak and adding a partial never makes the voice louder.
   */
  partials?: readonly Overtone[];
  /** A filter that opens or closes across the sound: how brass is blown. */
  lowpass?: { from: number; to: number };
  /** Wobble, as a fraction of the pitch, so it scales with every partial. */
  vibrato?: { hz: number; depth: number };
  attack?: number;
  wet?: number;
}

const ONE: readonly Overtone[] = [[1, 1]];

/**
 * A pitched voice, built from partials sharing one envelope.
 *
 * Higher partials are given shorter decays than low ones, which is what makes
 * a struck sound fade rather than simply stop.
 */
function tone(r: Rig, spec: ToneSpec): void {
  const c = r.c;
  const start = c.currentTime + (spec.at ?? 0);
  const seconds = spec.seconds;
  const attack = Math.min(spec.attack ?? 0.004, seconds / 3);
  const partials = spec.partials ?? ONE;
  const total = partials.reduce((sum, [, level]) => sum + level, 0) || 1;

  const voice = out(r, spec.wet ?? 0.18);
  voice.gain.setValueAtTime(0.0001, start);
  voice.gain.exponentialRampToValueAtTime(Math.max(0.0001, spec.gain), start + attack);
  voice.gain.exponentialRampToValueAtTime(0.0001, start + seconds);

  // One filter for the whole stack, between the partials and the output
  let sink: AudioNode = voice;
  if (spec.lowpass) {
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(spec.lowpass.from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, spec.lowpass.to), start + seconds);
    filter.connect(voice);
    sink = filter;
  }

  const path: readonly PitchPoint[] = spec.path ?? (spec.to !== undefined ? [[1, spec.to]] : []);

  for (const [ratio, level] of partials) {
    const osc = c.createOscillator();
    osc.type = spec.type ?? 'sine';
    osc.frequency.setValueAtTime(spec.freq * ratio, start);
    for (const [fraction, hz] of path) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, hz * ratio), start + seconds * fraction);
    }

    if (spec.vibrato) {
      // An oscillator connected to another's frequency adds to it rather than
      // replacing it, so the pitch path still runs underneath. Depth is a
      // fraction of the starting pitch and decays with it; held constant it
      // would swamp the low end and a spring would turn into a siren.
      const lfo = c.createOscillator();
      const depth = c.createGain();
      const hz = Math.max(1, spec.freq * ratio * spec.vibrato.depth);
      lfo.frequency.setValueAtTime(spec.vibrato.hz, start);
      depth.gain.setValueAtTime(hz, start);
      depth.gain.exponentialRampToValueAtTime(Math.max(0.5, hz * 0.15), start + seconds);
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(start);
      lfo.stop(start + seconds + 0.03);
    }

    const share = c.createGain();
    const peak = level / total;
    share.gain.setValueAtTime(peak, start);
    // A partial two octaves up dies in a third of the time
    share.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak * 0.04),
      start + seconds / Math.max(1, ratio * 0.55)
    );
    osc.connect(share).connect(sink);
    osc.start(start);
    osc.stop(start + seconds + 0.03);
  }
}

type NoiseShape = 'decay' | 'swell' | 'flat' | 'burst';

interface NoiseSpec {
  seconds: number;
  fromHz: number;
  toHz: number;
  gain: number;
  at?: number;
  type?: BiquadFilterType;
  q?: number;
  shape?: NoiseShape;
  /** How much the level flutters, which is what turns static into a crowd. */
  am?: number;
  amHz?: number;
  wet?: number;
}

/** A noise voice shaped by a sweeping filter: nets, cymbals, claps and crowds. */
function hit(r: Rig, spec: NoiseSpec): void {
  const c = r.c;
  const start = c.currentTime + (spec.at ?? 0);
  const seconds = spec.seconds;
  const shape = spec.shape ?? 'decay';
  const am = spec.am ?? 0;
  const amHz = spec.amHz ?? 5;

  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const p = i / data.length;
    let level: number;
    if (shape === 'swell') level = Math.sin(Math.PI * p);
    else if (shape === 'flat') level = 1;
    else if (shape === 'burst') level = (1 - p) ** 3;
    else level = 1 - p;
    if (am > 0) {
      const t = (i / c.sampleRate) * amHz * 2 * Math.PI;
      level *= 1 - am + am * (0.5 + 0.5 * Math.sin(t));
    }
    data[i] = (Math.random() * 2 - 1) * level;
  }

  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = spec.type ?? 'bandpass';
  filter.Q.setValueAtTime(spec.q ?? 1, start);
  filter.frequency.setValueAtTime(spec.fromHz, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(1, spec.toHz), start + seconds);
  const voice = out(r, spec.wet ?? 0.2);
  voice.gain.setValueAtTime(spec.gain, start);
  src.connect(filter).connect(voice);
  src.start(start);
}

/**
 * Evenly scattered offsets, without Math.random.
 *
 * A clap pattern wants to be irregular but it does not want to be different
 * every time: random timing makes the loudness of a dense sound a matter of
 * luck, which is untestable and occasionally too loud. Stepping by the golden
 * ratio and wrapping fills the window without ever clumping.
 */
function scatter(count: number, seconds: number): number[] {
  const offsets: number[] = [];
  for (let i = 0; i < count; i++) offsets.push(((i * 0.6180339887498949) % 1) * seconds);
  return offsets;
}

/** Bell partials: struck metal rings at ratios that are not whole numbers. */
const METAL: readonly Overtone[] = [
  [1, 1],
  [2.76, 0.45],
  [5.4, 0.2],
  [8.93, 0.07],
];

/** Rim partials: shorter, harsher metal than a bell. */
const RIM: readonly Overtone[] = [
  [1, 1],
  [2.41, 0.6],
  [3.88, 0.35],
  [6.2, 0.18],
  [9.1, 0.08],
];

/** A brass stack: two voices a few hertz apart, plus an octave for bite. */
const BRASS: readonly Overtone[] = [
  [1, 1],
  [1.006, 0.8],
  [2, 0.3],
];

// ---------------------------------------------------------------------------
// The two recordings (licences at the top of this file)
// ---------------------------------------------------------------------------

// Kept well under full volume and level with each other: the swish peaks about
// 5 dB under the clank, so it is turned down less
const RECORDINGS = {
  net: { url: '/sounds/swish.mp3', gain: 0.6 },
  rim: { url: '/sounds/rim-clank.mp3', gain: 0.35 },
} as const;
type Recording = keyof typeof RECORDINGS;

const downloads = new Map<Recording, Promise<ArrayBuffer | null>>();
const decoded = new Map<Recording, Promise<AudioBuffer | null>>();

/** Fetches a recording once. A failure is forgotten, so the next shot tries again. */
function download(id: Recording): Promise<ArrayBuffer | null> {
  let pending = downloads.get(id);
  if (!pending) {
    pending = Promise.resolve()
      .then(() => fetch(RECORDINGS[id].url))
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .catch(() => null)
      .then((data) => {
        if (!data) downloads.delete(id);
        return data;
      });
    downloads.set(id, pending);
  }
  return pending;
}

function recording(c: AudioContext, id: Recording): Promise<AudioBuffer | null> {
  let pending = decoded.get(id);
  if (!pending) {
    pending = download(id)
      .then((data) => (data ? c.decodeAudioData(data) : null))
      .catch(() => null)
      .then((buffer) => {
        // Decoding takes the downloaded bytes with it, so a retry starts over
        downloads.delete(id);
        if (!buffer) decoded.delete(id);
        return buffer;
      });
    decoded.set(id, pending);
  }
  return pending;
}

/**
 * Starts downloading the recordings these settings use, so the first shot of
 * a session is not silent. Only the files: decoding needs an audio context,
 * which waits for the player's first tap.
 */
export function preloadRecordings(settings: SoundSettings): void {
  if (settings.muted) return;
  if (settings.make === 'net') void download('net');
  if (settings.miss === 'rim') void download('rim');
}

function playRecording(r: Rig, id: Recording): void {
  void recording(r.c, id).then((buffer) => {
    if (!buffer) return;
    try {
      const source = r.c.createBufferSource();
      source.buffer = buffer;
      const gain = r.c.createGain();
      gain.gain.setValueAtTime(RECORDINGS[id].gain, r.c.currentTime);
      // Through the limiter, but not the reverb: a recording has its own room
      source.connect(gain).connect(r.master);
      source.start();
    } catch {
      // Context closed underneath us
    }
  });
}

export function playMake(sound: MakeSound): void {
  const r = engine();
  if (!r || sound === 'off') return;
  try {
    if (sound === 'net') {
      playRecording(r, 'net');
    } else if (sound === 'swish') {
      // Two layers, because a net is a hiss with a snap on the front
      hit(r, { seconds: 0.24, fromHz: 3000, toHz: 1100, gain: 0.3, q: 0.8, wet: 0.25 });
      hit(r, { seconds: 0.07, fromHz: 900, toHz: 500, gain: 0.1, shape: 'burst', wet: 0.15 });
    } else if (sound === 'airhorn') {
      // Three blasts, the last one held. The 1.006 partial beats against the
      // fundamental about three times a second, which is the whole difference
      // between a horn and a sawtooth.
      const blast = (at: number, seconds: number) =>
        tone(r, { freq: 440, to: 466, seconds, at, gain: 0.2, type: 'sawtooth', partials: BRASS, wet: 0.3, attack: 0.008 });
      blast(0, 0.13);
      blast(0.18, 0.13);
      blast(0.36, 0.4);
    } else if (sound === 'crowd') {
      // A rumble, a band of voices fluttering at seven hertz, and a handful of
      // claps on top. The flutter is what stops it being wind.
      hit(r, { seconds: 1, fromHz: 400, toHz: 700, gain: 0.15, type: 'lowpass', shape: 'swell', wet: 0.4 });
      hit(r, { seconds: 1, fromHz: 1200, toHz: 900, gain: 0.13, q: 0.7, shape: 'swell', am: 0.6, amHz: 7, wet: 0.45 });
      for (const at of [0.08, 0.19, 0.27, 0.41, 0.56]) {
        hit(r, { seconds: 0.05, fromHz: 2600, toHz: 1600, gain: 0.06, shape: 'burst', at, wet: 0.5 });
      }
    } else if (sound === 'applause') {
      // Many short bright bursts. Dense enough to read as a room rather than
      // as a person clapping, and swelling so it has a shape.
      const offsets = scatter(36, 0.8);
      offsets.forEach((at, i) => {
        hit(r, {
          seconds: 0.035,
          fromHz: 2000 + ((i * 317) % 1900),
          toHz: 1200,
          gain: 0.1 + 0.06 * Math.sin(Math.PI * (at / 0.8)),
          shape: 'burst',
          at,
          wet: 0.45,
        });
      });
    } else if (sound === 'bell') {
      // Ding ding ding. One strike is a notification; three is a round starting.
      const ding = (at: number) =>
        tone(r, { freq: 680, seconds: 0.9, at, gain: 0.15, partials: METAL, wet: 0.4, attack: 0.002 });
      ding(0);
      ding(0.3);
      ding(0.6);
    } else if (sound === 'fanfare') {
      // Brass is a sawtooth behind a filter that opens as the note is blown.
      // Two short notes into a held fifth with an octave over it.
      const horn = (freq: number, at: number, seconds: number, gain: number) =>
        tone(r, {
          freq,
          seconds,
          at,
          gain,
          type: 'sawtooth',
          partials: BRASS,
          lowpass: { from: 700, to: 4200 },
          wet: 0.35,
          attack: 0.02,
        });
      horn(523, 0, 0.13, 0.16);
      horn(523, 0.15, 0.13, 0.16);
      horn(784, 0.3, 0.5, 0.19);
      horn(1046, 0.3, 0.5, 0.09);
    } else if (sound === 'kaching') {
      // Two bright dings a seventh apart and a drawer sliding out under them
      tone(r, { freq: 1180, seconds: 0.5, gain: 0.13, partials: METAL, wet: 0.3, attack: 0.002 });
      tone(r, { freq: 1570, seconds: 0.55, at: 0.07, gain: 0.11, partials: METAL, wet: 0.3, attack: 0.002 });
      hit(r, { seconds: 0.22, fromHz: 1800, toHz: 600, gain: 0.09, at: 0.16, q: 0.6, wet: 0.25 });
    } else if (sound === 'levelup') {
      // Five notes up a major triad, the last one held. Harmonics on a
      // triangle keep it bright without the chiptune edge of a square.
      const notes = [523, 659, 784, 1046, 1318];
      const rich: readonly Overtone[] = [
        [1, 1],
        [2, 0.3],
        [3, 0.12],
      ];
      notes.forEach((freq, i) => {
        const last = i === notes.length - 1;
        tone(r, {
          freq,
          seconds: last ? 0.45 : 0.1,
          at: i * 0.075,
          gain: last ? 0.17 : 0.12,
          type: 'triangle',
          partials: rich,
          wet: 0.3,
          attack: 0.003,
        });
      });
    } else if (sound === 'gong') {
      // The fundamental is deliberately the quietest partial. At 160 Hz a
      // phone speaker barely moves, so the weight has to come from the
      // partials above it and the ear puts the bottom back on by itself.
      tone(r, {
        freq: 160,
        to: 150,
        seconds: 2.2,
        gain: 0.19,
        partials: [
          [1, 0.5],
          [2.4, 1],
          [3.7, 0.8],
          [5.1, 0.5],
          [7.3, 0.3],
          [9.8, 0.2],
        ],
        wet: 0.6,
        attack: 0.006,
      });
      hit(r, { seconds: 0.4, fromHz: 1400, toHz: 400, gain: 0.09, shape: 'burst', wet: 0.5 });
    } else if (sound === 'bass') {
      // Sweeps to 70 Hz, which a phone cannot reproduce - so the harmonics
      // carry the gesture and the drop is still heard. A bright click on the
      // front gives it something audible to start from.
      tone(r, {
        freq: 220,
        to: 70,
        seconds: 0.55,
        gain: 0.22,
        partials: [
          [1, 0.8],
          [2, 0.7],
          [3, 0.4],
          [4, 0.2],
        ],
        wet: 0.25,
      });
      hit(r, { seconds: 0.09, fromHz: 2200, toHz: 700, gain: 0.09, shape: 'burst', wet: 0.2 });
    } else if (sound === 'arcade') {
      // Bare squares and almost no reverb, because here the cheapness is the
      // point - this one is meant to sound like a coin in a cabinet.
      [660, 880, 1320].forEach((freq, i) => {
        tone(r, { freq, seconds: i === 2 ? 0.16 : 0.07, at: i * 0.07, gain: 0.15, type: 'square', wet: 0.08, attack: 0.001 });
      });
    } else if (sound === 'chime') {
      // A fifth rather than a third: bells have enough partials of their own
      // without a close interval beating against them.
      tone(r, { freq: 880, seconds: 1.1, gain: 0.14, partials: METAL, wet: 0.45, attack: 0.002 });
      tone(r, { freq: 1320, seconds: 0.9, at: 0.03, gain: 0.08, partials: METAL, wet: 0.45, attack: 0.002 });
    }
  } catch {
    // Never let a sound failure interrupt a session
  }
}

export function playMiss(sound: MissSound): void {
  const r = engine();
  if (!r || sound === 'off') return;
  try {
    if (sound === 'rim') {
      playRecording(r, 'rim');
    } else if (sound === 'sad') {
      // Three notes down, each one bending as it goes, with the slow vibrato a
      // player would put on it. Entirely unserious, and the whole reason
      // anyone would turn miss sounds on at all.
      const slide = (from: number, to: number, at: number, seconds: number, gain: number) =>
        tone(r, {
          freq: from,
          to,
          seconds,
          at,
          gain,
          type: 'sawtooth',
          partials: BRASS,
          lowpass: { from: 520, to: 1700 },
          vibrato: { hz: 5.5, depth: 0.012 },
          wet: 0.3,
          attack: 0.03,
        });
      slide(330, 311, 0, 0.2, 0.14);
      slide(294, 277, 0.19, 0.2, 0.14);
      slide(262, 175, 0.38, 0.6, 0.16);
    } else if (sound === 'wah') {
      // One continuous voice sagging in two steps, with the filter closing as
      // it falls. Different gag from the trombone: that one walks down, this
      // one deflates.
      tone(r, {
        freq: 330,
        path: [
          [0.25, 294],
          [0.45, 311],
          [0.7, 247],
          [1, 185],
        ],
        seconds: 0.95,
        gain: 0.17,
        type: 'sawtooth',
        partials: BRASS,
        lowpass: { from: 1700, to: 450 },
        vibrato: { hz: 5, depth: 0.014 },
        wet: 0.3,
        attack: 0.025,
      });
    } else if (sound === 'rimshot') {
      // Ba-dum-tss. The toms sit at 260 and 210 Hz rather than down at 80,
      // where a phone would have produced nothing at all.
      const tom = (freq: number, at: number) =>
        tone(r, {
          freq,
          to: freq * 0.55,
          seconds: 0.14,
          at,
          gain: 0.2,
          partials: [
            [1, 0.9],
            [2, 0.45],
            [3.2, 0.2],
          ],
          wet: 0.2,
          attack: 0.001,
        });
      tom(260, 0);
      tom(210, 0.15);
      hit(r, { seconds: 0.7, fromHz: 9000, toHz: 3000, gain: 0.1, type: 'highpass', shape: 'burst', at: 0.3, wet: 0.45 });
    } else if (sound === 'scratch') {
      // A scratch is one sound dragged back and forth, so it has to be one
      // continuous voice changing direction four times. Two separate sweeps
      // read as two noises, which is what the first version of this was.
      const back: readonly PitchPoint[] = [
        [0.25, 150],
        [0.5, 430],
        [0.75, 170],
        [1, 320],
      ];
      tone(r, {
        freq: 520,
        path: back,
        seconds: 0.34,
        gain: 0.14,
        type: 'sawtooth',
        partials: [
          [1, 1],
          [2, 0.4],
        ],
        lowpass: { from: 3000, to: 1400 },
        wet: 0.2,
      });
      hit(r, { seconds: 0.34, fromHz: 4200, toHz: 900, gain: 0.13, q: 0.5, shape: 'flat', am: 0.7, amHz: 9, wet: 0.2 });
    } else if (sound === 'boing') {
      // A spring: pitch dropping fast with a deep wobble riding on it
      tone(r, {
        freq: 760,
        to: 110,
        seconds: 0.5,
        gain: 0.18,
        type: 'triangle',
        partials: [
          [1, 1],
          [2, 0.35],
          [3, 0.15],
        ],
        vibrato: { hz: 20, depth: 0.22 },
        wet: 0.3,
        attack: 0.003,
      });
    } else if (sound === 'wrong') {
      // Two flat buzzes, the game-show kind. The fundamental is under what a
      // phone reproduces, so the harsh harmonics above it do the work.
      const buzz = (at: number) =>
        tone(r, {
          freq: 196,
          seconds: 0.22,
          at,
          gain: 0.15,
          type: 'square',
          partials: [
            [1, 1],
            [2, 0.6],
            [3, 0.4],
            [4, 0.25],
          ],
          wet: 0.15,
          attack: 0.002,
        });
      buzz(0);
      buzz(0.28);
    } else if (sound === 'deflate') {
      // Air going out: a long filter sweep down with a flutter in it
      hit(r, { seconds: 0.75, fromHz: 2600, toHz: 300, gain: 0.14, q: 1.4, am: 0.35, amHz: 14, wet: 0.25 });
      tone(r, {
        freq: 420,
        to: 95,
        seconds: 0.75,
        gain: 0.06,
        type: 'sawtooth',
        partials: [
          [1, 1],
          [2, 0.3],
        ],
        wet: 0.2,
        attack: 0.02,
      });
    } else if (sound === 'brick') {
      // Dead weight off the back iron: short, mid-heavy, and no ring at all
      tone(r, {
        freq: 190,
        to: 120,
        seconds: 0.13,
        gain: 0.2,
        partials: [
          [1, 0.8],
          [2, 0.6],
          [3.4, 0.3],
          [5.1, 0.12],
        ],
        wet: 0.12,
        attack: 0.001,
      });
      hit(r, { seconds: 0.1, fromHz: 1100, toHz: 300, gain: 0.11, shape: 'burst', wet: 0.15 });
    } else if (sound === 'clunk') {
      // Metal, so the partials are not whole-number multiples. At 430 Hz with
      // partials above it the whole sound sits where a phone can be heard.
      tone(r, { freq: 430, to: 420, seconds: 0.45, gain: 0.14, partials: RIM, wet: 0.35, attack: 0.001 });
      hit(r, { seconds: 0.08, fromHz: 3200, toHz: 1200, gain: 0.09, shape: 'burst', wet: 0.3 });
    } else if (sound === 'buzz') {
      // The buzzer on a gym clock: harsh, held, and rattling slightly
      tone(r, {
        freq: 233,
        seconds: 0.7,
        gain: 0.14,
        type: 'square',
        partials: [
          [1, 1],
          [2, 0.55],
          [3, 0.35],
          [5, 0.15],
        ],
        vibrato: { hz: 28, depth: 0.03 },
        wet: 0.2,
        attack: 0.005,
      });
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
  if (settings.muted) return;
  resumeAudio();
  if (made) playMake(settings.make);
  else playMiss(settings.miss);
  const line = spokenLine(settings.voice, made, makes, attempts);
  if (line) say(line, settings.voiceUri);
}
