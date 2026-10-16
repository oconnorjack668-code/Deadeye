// __tests__/trackerSound.test.ts
//
// These sounds are synthesised, so there is nothing to listen to in CI. What
// can be checked is the thing that actually goes wrong: a sound gets added to
// the picker list and no branch gets added to the synthesis, so the player
// chooses "Airhorn" and hears silence. The list and the code are in different
// places and nothing but a test ties them together.
//
// So this stands a fake AudioContext in front of the module and asks two
// questions of every advertised sound - does it schedule anything audible, and
// does it land in the same loudness bracket as the rest.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  MAKE_SOUNDS,
  MISS_SOUNDS,
  VOICE_STYLES,
  playMake,
  playMiss,
  spokenLine,
  loadSound,
  storeSound,
  isAudible,
  soundSummary,
  DEFAULT_SOUND,
  type MakeSound,
  type MissSound,
} from '@/lib/video/trackerSound';

/** One scheduled voice: when it runs, and its amplitude at the speakers. */
interface Voice {
  start: number;
  end: number;
  gain: number;
}

/**
 * A node in the fake audio graph.
 *
 * Only two things matter: what it is connected to, and whether it multiplies
 * the signal. Filters, convolvers and the limiter pass it through unchanged as
 * far as level is concerned, so they carry a null gain.
 */
interface Node {
  gain: number | null;
  outs: Node[];
  /** Where a filter sweep ends, which is how long a noise burst lasts. */
  rampEnd: number;
}

const node = (gain: number | null = null): Node => ({ gain, outs: [], rampEnd: 0 });

/** Anything the module can connect to. An AudioParam has no node behind it. */
type Target = { node?: Node };

/**
 * Enough of the Web Audio API for this module, and no more.
 *
 * A voice now reaches the speakers through a chain - partial gain, filter,
 * voice gain, master, limiter - so "is it connected to the destination" no
 * longer identifies anything. Instead each started source is traced forward
 * to the destination and the gains along the way are multiplied, which is
 * exactly the amplitude that comes out. That also handles the reverb send for
 * free: it is simply a quieter parallel path, so the dry one wins.
 *
 * An LFO excludes itself by the same rule. The vibrato depth gain feeds an
 * oscillator's frequency rather than anything downstream, and an AudioParam
 * has no node, so that path reaches nothing and is never counted as volume -
 * 140 Hz of wobble is not 140 times too loud.
 */
class FakeAudioContext {
  readonly currentTime = 0;
  readonly sampleRate = 48000;
  readonly state = 'running';
  readonly destination: Target = { node: node() };
  voices: Voice[] = [];
  /**
   * Every frequency the module asks for, in hertz.
   *
   * Partial ratios are applied before the module sets a frequency, so these
   * are the pitches that actually sound. Filter cutoffs land here too, which
   * is fair - a lowpass at 300 Hz is as good as having no content above it -
   * and so do the two or three vibrato rates, which are harmless against a
   * test that asks whether anything at all is up in the audible band.
   */
  spectrum: number[] = [];

  /** A control value nothing reads back. */
  private flat() {
    return {
      setValueAtTime: () => undefined,
      exponentialRampToValueAtTime: () => undefined,
      linearRampToValueAtTime: () => undefined,
    };
  }

  /** A frequency, recorded. */
  private pitched() {
    const heard = (v: number) => {
      this.spectrum.push(v);
    };
    return {
      setValueAtTime: heard,
      exponentialRampToValueAtTime: heard,
      linearRampToValueAtTime: heard,
    };
  }

  private wire(self: Node) {
    return (target: Target) => {
      // A target with no node is an AudioParam: modulation, not signal flow
      if (target?.node) self.outs.push(target.node);
      return target;
    };
  }

  createGain() {
    const self = node(0);
    const louder = (v: number) => {
      self.gain = Math.max(self.gain ?? 0, v);
    };
    return {
      node: self,
      gain: {
        setValueAtTime: louder,
        exponentialRampToValueAtTime: louder,
        linearRampToValueAtTime: louder,
      },
      connect: this.wire(self),
    };
  }

  createOscillator() {
    const self = node();
    let started = 0;
    return {
      node: self,
      type: 'sine' as OscillatorType,
      frequency: this.pitched(),
      detune: this.flat(),
      connect: this.wire(self),
      start: (t: number) => {
        started = t;
      },
      // Recorded on stop, by which point the whole chain exists and every
      // envelope has been scheduled
      stop: (t: number) => this.record(self, started, t),
    };
  }

  createBiquadFilter() {
    const self = node();
    return {
      node: self,
      type: 'bandpass' as BiquadFilterType,
      Q: this.flat(),
      frequency: {
        setValueAtTime: (v: number) => {
          this.spectrum.push(v);
        },
        exponentialRampToValueAtTime: (v: number, t: number) => {
          this.spectrum.push(v);
          self.rampEnd = Math.max(self.rampEnd, t);
        },
      },
      connect: this.wire(self),
    };
  }

  createConvolver() {
    const self = node();
    return { node: self, buffer: null as unknown, connect: this.wire(self) };
  }

  createDynamicsCompressor() {
    const self = node();
    return {
      node: self,
      threshold: this.flat(),
      knee: this.flat(),
      ratio: this.flat(),
      attack: this.flat(),
      release: this.flat(),
      connect: this.wire(self),
    };
  }

  createBuffer(channels: number, length: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, getChannelData: (ch: number) => data[ch] };
  }

  createBufferSource() {
    const self = node();
    return {
      node: self,
      buffer: null as unknown,
      connect: this.wire(self),
      start: (t: number) => {
        // A buffer source has no stop() to read, so its length comes from the
        // filter sweep it plays through, which ends with the sound
        const end = self.outs.reduce((latest, out) => Math.max(latest, out.rampEnd), t);
        this.record(self, t, end);
      },
    };
  }

  private record(from: Node, start: number, end: number) {
    const gain = this.amplitude(from, 1, new Set());
    if (gain > 0) this.voices.push({ start, end, gain });
  }

  /** The loudest path from here to the speakers, gains multiplied along it. */
  private amplitude(n: Node, carried: number, seen: Set<Node>): number {
    if (n === this.destination.node) return carried;
    if (seen.has(n)) return 0;
    const visited = new Set(seen).add(n);
    const through = carried * (n.gain ?? 1);
    let loudest = 0;
    for (const out of n.outs) loudest = Math.max(loudest, this.amplitude(out, through, visited));
    return loudest;
  }
}

/**
 * The module caches one AudioContext and one output chain for the life of the
 * process, so the fake has to be the first one it ever sees and then stays
 * put. Its log is cleared between tests instead.
 */
const fake = new FakeAudioContext();

/** Amplitude with everything that overlaps added together. */
function peak(voices: Voice[]): number {
  let loudest = 0;
  for (const edge of voices) {
    const at = edge.start;
    // Half-open, so a note ending exactly where the next begins does not read
    // as two notes playing at once
    const together = voices
      .filter((v) => v.start <= at && v.end > at)
      .reduce((sum, v) => sum + v.gain, 0);
    loudest = Math.max(loudest, together);
  }
  return loudest;
}

function scheduledFor(play: () => void): Voice[] {
  fake.voices = [];
  fake.spectrum = [];
  play();
  return fake.voices;
}

beforeAll(() => {
  // A constructor returning an object hands back that object, so `new` inside
  // the module yields the single fake whose log these tests read.
  (window as unknown as { AudioContext: unknown }).AudioContext = function () {
    return fake;
  };
});

beforeEach(() => {
  fake.voices = [];
  window.localStorage.clear();
});

const makeIds = MAKE_SOUNDS.filter((s) => s.id !== 'off').map((s) => s.id);
const missIds = MISS_SOUNDS.filter((s) => s.id !== 'off').map((s) => s.id);

describe('every sound in the picker actually makes a sound', () => {
  // The point of the whole file: a label with no branch behind it is silence
  // where the player expected a swish.
  it.each(makeIds)('plays something for the make sound %s', (id) => {
    expect(scheduledFor(() => playMake(id as MakeSound)).length).toBeGreaterThan(0);
  });

  it.each(missIds)('plays something for the miss sound %s', (id) => {
    expect(scheduledFor(() => playMiss(id as MissSound)).length).toBeGreaterThan(0);
  });

  it('stays silent when asked to', () => {
    expect(scheduledFor(() => playMake('off'))).toHaveLength(0);
    expect(scheduledFor(() => playMiss('off'))).toHaveLength(0);
  });

  it('defaults to silence, because nobody expects noise unasked', () => {
    expect(DEFAULT_SOUND.make).toBe('off');
    expect(DEFAULT_SOUND.miss).toBe('off');
    expect(DEFAULT_SOUND.voice).toBe('off');
  });
});

describe('loudness', () => {
  // A phone on a tripod in a hall is already near full volume, so one sound
  // arriving at twice the level of the others is startling rather than
  // clearer, and one arriving at a tenth is not heard at all. This judges the
  // set against itself, not against any absolute.
  const FLOOR = 0.07;
  const CEILING = 0.55;

  const inBracket = (id: string, play: () => void) => {
    const level = peak(scheduledFor(play));
    expect(level, `${id} peaks at ${level.toFixed(3)}`).toBeGreaterThanOrEqual(FLOOR);
    expect(level, `${id} peaks at ${level.toFixed(3)}`).toBeLessThanOrEqual(CEILING);
  };

  it.each(makeIds)('keeps the make sound %s in the same bracket as the others', (id) => {
    inBracket(id, () => playMake(id as MakeSound));
  });

  it.each(missIds)('keeps the miss sound %s in the same bracket as the others', (id) => {
    inBracket(id, () => playMiss(id as MissSound));
  });
});

describe('spectrum', () => {
  // A phone speaker produces almost nothing below about 400 Hz, which is the
  // one speaker these sounds have to work on. A sound whose content all sits
  // underneath that is not a quiet choice, it is inaudible - which is what
  // was wrong with the first bass drop, a sine sweeping to 55 Hz that a phone
  // reproduced as a faint click.
  //
  // Hence the rule the low sounds are built to: carry harmonics above the
  // fundamental and let the ear put the bottom back on. The gong's fundamental
  // is deliberately its quietest partial for exactly this reason.
  const SPEAKER_FLOOR = 400;

  it.each([...makeIds, ...missIds])('puts %s where a phone can reproduce it', (id) => {
    scheduledFor(() => {
      if ((makeIds as string[]).includes(id)) playMake(id as MakeSound);
      else playMiss(id as MissSound);
    });
    const audible = fake.spectrum.filter((hz) => hz >= SPEAKER_FLOOR);
    expect(audible.length, `${id} has nothing above ${SPEAKER_FLOOR} Hz`).toBeGreaterThan(0);
  });

  it('builds the gong from harmonics rather than its fundamental', () => {
    // The specific case the rule exists for: a 160 Hz fundamental a phone
    // cannot move, with the weight carried above it
    scheduledFor(() => playMake('gong'));
    const above = fake.spectrum.filter((hz) => hz >= SPEAKER_FLOOR);
    expect(above.length).toBeGreaterThan(3);
  });
});

describe('shape of the arranged sounds', () => {
  // These exist because the arrangement is the sound: an airhorn with its
  // blasts overlapping is a drone, and a rimshot without the gaps is a thud.
  it('fires the airhorn as three separate blasts', () => {
    const starts = [...new Set(scheduledFor(() => playMake('airhorn')).map((v) => v.start))].sort(
      (a, b) => a - b
    );
    expect(starts).toHaveLength(3);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i] - starts[i - 1]).toBeGreaterThan(0.05);
    }
  });

  it('spaces the rimshot as two thumps and a later cymbal', () => {
    const starts = [...new Set(scheduledFor(() => playMiss('rimshot')).map((v) => v.start))].sort(
      (a, b) => a - b
    );
    expect(starts).toHaveLength(3);
    expect(starts[1] - starts[0]).toBeGreaterThan(0.05);
    expect(starts[2] - starts[1]).toBeGreaterThan(0.05);
  });

  it('rings the bell three times', () => {
    const starts = [...new Set(scheduledFor(() => playMake('bell')).map((v) => v.start))];
    expect(starts).toHaveLength(3);
  });

  it('scatters applause without clumping it', () => {
    // The offsets come from a golden-ratio step rather than Math.random, so a
    // dense sound has a predictable level instead of a lucky one. Were it
    // random, this test would be flaky and so would the loudness bracket.
    const starts = scheduledFor(() => playMake('applause'))
      .map((v) => v.start)
      .sort((a, b) => a - b);
    expect(starts.length).toBeGreaterThan(20);
    const gaps = starts.slice(1).map((s, i) => s - starts[i]);
    expect(Math.max(...gaps)).toBeLessThan(0.06);
  });

  it('plays the scratch as one voice changing direction, not two sweeps', () => {
    // The first version of this was a down-sweep and a separate up-sweep,
    // which reads as two noises rather than one gesture
    const starts = [...new Set(scheduledFor(() => playMiss('scratch')).map((v) => v.start))];
    expect(starts).toEqual([0]);
  });
});

describe('spokenLine', () => {
  it('says nothing at all when the voice is off', () => {
    expect(spokenLine('off', true, 4, 7)).toBeNull();
  });

  it('reads out the score, in the order a player would say it', () => {
    expect(spokenLine('score', true, 4, 7)).toBe('4 of 7');
    expect(spokenLine('score', false, 4, 7)).toBe('4 of 7');
  });

  it('calls the shot before the score', () => {
    expect(spokenLine('call', true, 4, 7)).toBe('Make. 4 of 7');
    expect(spokenLine('call', false, 4, 7)).toBe('Miss. 4 of 7');
  });

  it('stays quiet on a miss when only makes were asked for', () => {
    // A player grinding a shooting drill does not want to be told about each
    // miss out loud
    expect(spokenLine('makes', true, 4, 7)).toBe('4 of 7');
    expect(spokenLine('makes', false, 4, 7)).toBeNull();
  });

  it('varies the hyped phrasing, so it is not the same word forty times', () => {
    const heard = new Set(Array.from({ length: 80 }, () => spokenLine('hype', true, 4, 7)));
    expect(heard.size).toBeGreaterThan(1);
    for (const line of heard) expect(line).toContain('4 of 7');
  });

  it('offers an example for every style, including the silent one', () => {
    // The picker renders `example` unconditionally, so a missing one would
    // read as `undefined` on screen
    for (const style of VOICE_STYLES) expect(typeof style.example).toBe('string');
  });
});

describe('saved settings', () => {
  it('comes back the way it went in', () => {
    const chosen = {
      make: 'airhorn',
      miss: 'rimshot',
      voice: 'hype',
      voiceUri: 'urn:voice',
      muted: false,
    } as const;
    storeSound(chosen);
    expect(loadSound()).toEqual(chosen);
  });

  it('keeps a mute without forgetting what was muted', () => {
    // The whole reason mute is its own flag rather than setting all three to
    // off: someone sharing a court wants their sounds back afterwards
    storeSound({ make: 'airhorn', miss: 'sad', voice: 'hype', voiceUri: null, muted: true });
    const back = loadSound();
    expect(back.muted).toBe(true);
    expect(back.make).toBe('airhorn');
    expect(isAudible(back)).toBe(false);
    expect(isAudible({ ...back, muted: false })).toBe(true);
  });

  it('is silent when nothing is chosen, muted or not', () => {
    expect(isAudible(DEFAULT_SOUND)).toBe(false);
  });

  it('describes the choice in a line for the tracker', () => {
    expect(soundSummary({ make: 'airhorn', miss: 'off', voice: 'off', voiceUri: null, muted: false })).toBe(
      'Airhorn'
    );
    expect(soundSummary({ make: 'swish', miss: 'sad', voice: 'hype', voiceUri: null, muted: false })).toBe(
      'Swish · Sad trombone on a miss · hyped'
    );
    expect(soundSummary({ ...DEFAULT_SOUND, muted: true })).toBe('Muted');
    expect(soundSummary(DEFAULT_SOUND)).toBe('Silent');
  });

  it('falls back to silence rather than trusting a stale id', () => {
    // An id can disappear between releases, and a saved value naming a sound
    // that no longer exists must not reach playMake
    window.localStorage.setItem(
      'hoopiq-tracker-sound-v2',
      JSON.stringify({ make: 'nba-2k-swish', miss: 7, voice: 'shouty', voiceUri: 12 })
    );
    expect(loadSound()).toEqual(DEFAULT_SOUND);
  });

  it('survives storage that is missing or corrupt', () => {
    expect(loadSound()).toEqual(DEFAULT_SOUND);
    window.localStorage.setItem('hoopiq-tracker-sound-v2', 'not json');
    expect(loadSound()).toEqual(DEFAULT_SOUND);
  });

  it('keeps every id it has ever saved loadable', () => {
    // Sounds were added and the list reordered after this key shipped, so a
    // phone with an older choice saved must still find it
    for (const id of makeIds) {
      storeSound({ ...DEFAULT_SOUND, make: id as MakeSound });
      expect(loadSound().make).toBe(id);
    }
    for (const id of missIds) {
      storeSound({ ...DEFAULT_SOUND, miss: id as MissSound });
      expect(loadSound().miss).toBe(id);
    }
  });
});
