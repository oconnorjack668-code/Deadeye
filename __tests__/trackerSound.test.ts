// __tests__/trackerSound.test.ts
//
// These sounds are synthesised, so there is nothing to listen to in CI. What
// can be checked is the thing that actually goes wrong: a sound gets added to
// the picker list and no branch gets added to the synthesis, so the player
// chooses "Airhorn" and hears silence. The list and the code are in different
// places and nothing but a test ties them together.
//
// So this stands a fake AudioContext up in front of the module and asks two
// questions of every advertised sound - does it schedule anything at all, and
// is it in the same loudness bracket as the rest.
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
  DEFAULT_SOUND,
  type MakeSound,
  type MissSound,
} from '@/lib/video/trackerSound';

/** One scheduled sound source: when it runs, and how loud it is. */
interface Source {
  start: number;
  end: number;
  gain: number;
}

/** A gain node, which is where both the volume and the audible path live. */
interface Gain {
  peak: number;
  /** Whether this gain reaches the speakers, or only a frequency param. */
  audible: boolean;
  gain: { setValueAtTime: (v: number) => void; exponentialRampToValueAtTime: (v: number) => void };
  connect: (target: unknown) => unknown;
}

/**
 * Enough of the Web Audio API for this module, and no more.
 *
 * Both builders here end by connecting through a gain node to the destination,
 * so every node records what it was connected to and a started source walks
 * its own chain to find its volume. That is also how an LFO excludes itself:
 * the vibrato depth gain feeds a frequency param rather than the speakers, so
 * it is never read as volume - 140 Hz of wobble is not 140 times too loud.
 */
class FakeAudioContext {
  readonly currentTime = 0;
  readonly sampleRate = 48000;
  readonly state = 'running';
  readonly destination = { id: 'destination' };
  sources: Source[] = [];

  private param(onRamp?: (t: number) => void) {
    return {
      setValueAtTime: () => undefined,
      exponentialRampToValueAtTime: (_v: number, t: number) => onRamp?.(t),
    };
  }

  createGain(): Gain {
    const node: Gain = {
      peak: 0,
      audible: false,
      gain: {
        setValueAtTime: (v: number) => {
          node.peak = Math.max(node.peak, v);
        },
        exponentialRampToValueAtTime: (v: number) => {
          node.peak = Math.max(node.peak, v);
        },
      },
      connect: (target: unknown) => {
        if (target === this.destination) node.audible = true;
        return target;
      },
    };
    return node;
  }

  createOscillator() {
    let vol: Gain | null = null;
    let started = 0;
    return {
      type: 'sine' as OscillatorType,
      frequency: this.param(),
      connect: (target: Gain) => {
        vol = target;
        return target;
      },
      start: (t: number) => {
        started = t;
      },
      stop: (t: number) => {
        // Recorded on stop, by which point the gain is connected and its
        // envelope scheduled
        if (vol?.audible) this.sources.push({ start: started, end: t, gain: vol.peak });
      },
    };
  }

  createBiquadFilter() {
    const filter = {
      type: 'bandpass' as BiquadFilterType,
      // A buffer source has no stop() to read, so its duration comes from the
      // filter sweep it plays through, which ends with the sound
      rampEnd: 0,
      next: null as Gain | null,
      frequency: this.param((t) => {
        filter.rampEnd = Math.max(filter.rampEnd, t);
      }),
      connect: (target: Gain) => {
        filter.next = target;
        return target;
      },
    };
    return filter;
  }

  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  }

  createBufferSource() {
    let filter: ReturnType<FakeAudioContext['createBiquadFilter']> | null = null;
    return {
      buffer: null as unknown,
      connect: (target: ReturnType<FakeAudioContext['createBiquadFilter']>) => {
        filter = target;
        return target;
      },
      start: (t: number) => {
        const vol = filter?.next;
        if (vol?.audible) this.sources.push({ start: t, end: filter?.rampEnd ?? t, gain: vol.peak });
      },
    };
  }
}

/**
 * The module caches one AudioContext for the life of the process, so the fake
 * has to be the first one it ever sees and then stays put. Its log is cleared
 * between tests instead.
 */
const fake = new FakeAudioContext();

/** Peak gain with everything that overlaps added together. */
function peakGain(sources: Source[]): number {
  let peak = 0;
  for (const edge of sources) {
    const at = edge.start;
    // Half-open, so a note ending exactly where the next begins does not read
    // as two notes playing at once
    const together = sources
      .filter((s) => s.start <= at && s.end > at)
      .reduce((sum, s) => sum + s.gain, 0);
    peak = Math.max(peak, together);
  }
  return peak;
}

function scheduledFor(play: () => void): Source[] {
  fake.sources = [];
  play();
  return fake.sources;
}

beforeAll(() => {
  // A constructor returning an object hands back that object, so `new` inside
  // the module yields the single fake whose log these tests read.
  (window as unknown as { AudioContext: unknown }).AudioContext = function () {
    return fake;
  };
});

beforeEach(() => {
  fake.sources = [];
  window.localStorage.clear();
});

describe('every sound in the picker actually makes a sound', () => {
  // The point of the whole file: a label with no branch behind it is silence
  // where the player expected a swish.
  const makes = MAKE_SOUNDS.filter((s) => s.id !== 'off');
  const misses = MISS_SOUNDS.filter((s) => s.id !== 'off');

  it.each(makes.map((s) => s.id))('plays something for the make sound %s', (id) => {
    const sources = scheduledFor(() => playMake(id as MakeSound));
    expect(sources.length).toBeGreaterThan(0);
  });

  it.each(misses.map((s) => s.id))('plays something for the miss sound %s', (id) => {
    const sources = scheduledFor(() => playMiss(id as MissSound));
    expect(sources.length).toBeGreaterThan(0);
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
  // arriving twice as loud as the rest is startling rather than clearer. This
  // does not judge absolute level - only that the set is consistent.
  const LOUDEST = 0.6;

  it.each(MAKE_SOUNDS.filter((s) => s.id !== 'off').map((s) => s.id))(
    'keeps the make sound %s in the same bracket as the others',
    (id) => {
      const peak = peakGain(scheduledFor(() => playMake(id as MakeSound)));
      expect(peak).toBeGreaterThan(0);
      expect(peak).toBeLessThanOrEqual(LOUDEST);
    }
  );

  it.each(MISS_SOUNDS.filter((s) => s.id !== 'off').map((s) => s.id))(
    'keeps the miss sound %s in the same bracket as the others',
    (id) => {
      const peak = peakGain(scheduledFor(() => playMiss(id as MissSound)));
      expect(peak).toBeGreaterThan(0);
      expect(peak).toBeLessThanOrEqual(LOUDEST);
    }
  );
});

describe('shape of the longer sounds', () => {
  // These two exist because the arrangement is the sound: an airhorn with its
  // blasts overlapping is a drone, and a rimshot without the gap is a thud.
  it('fires the airhorn as three separate blasts', () => {
    const starts = [...new Set(scheduledFor(() => playMake('airhorn')).map((s) => s.start))].sort(
      (a, b) => a - b
    );
    expect(starts).toHaveLength(3);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i] - starts[i - 1]).toBeGreaterThan(0.05);
    }
  });

  it('spaces the rimshot as two thumps and a later cymbal', () => {
    const starts = scheduledFor(() => playMiss('rimshot'))
      .map((s) => s.start)
      .sort((a, b) => a - b);
    expect(starts).toHaveLength(3);
    expect(starts[1] - starts[0]).toBeGreaterThan(0.05);
    expect(starts[2] - starts[1]).toBeGreaterThan(0.05);
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
    const heard = new Set(
      Array.from({ length: 80 }, () => spokenLine('hype', true, 4, 7))
    );
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
    const chosen = { make: 'airhorn', miss: 'rimshot', voice: 'hype', voiceUri: 'urn:voice' } as const;
    storeSound(chosen);
    expect(loadSound()).toEqual(chosen);
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
});
