// __tests__/performanceTests.test.ts
import { describe, it, expect } from 'vitest';
import { convertResult, isPersonalBest, lengthUnit, testRecordFlags } from '@/lib/performanceTests';

describe('performance test units', () => {
  it('logs jumps in the player unit', () => {
    expect(lengthUnit('metric')).toBe('cm');
    expect(lengthUnit('imperial')).toBe('inches');
  });

  it('converts jumps between inches and cm, and refuses units that do not compare', () => {
    expect(convertResult({ value: 30, unit: 'inches' }, 'cm')).toBe(76.2);
    expect(convertResult({ value: 76.2, unit: 'cm' }, 'inches')).toBe(30);
    expect(convertResult({ value: 5.1, unit: 'seconds' }, 'seconds')).toBe(5.1);
    expect(convertResult({ value: 12, unit: 'reps' }, 'seconds')).toBeNull();
  });

  it('does not call 60 cm a record over 30 inches', () => {
    expect(isPersonalBest({ value: 60, unit: 'cm' }, [{ value: 30, unit: 'inches' }], false)).toBe(false);
    expect(isPersonalBest({ value: 80, unit: 'cm' }, [{ value: 30, unit: 'inches' }], false)).toBe(true);
  });

  it('counts a faster time as a record for timed tests, and a first result always', () => {
    expect(isPersonalBest({ value: 3.4, unit: 'seconds' }, [{ value: 3.6, unit: 'seconds' }], true)).toBe(true);
    expect(isPersonalBest({ value: 3.8, unit: 'seconds' }, [{ value: 3.6, unit: 'seconds' }], true)).toBe(false);
    expect(isPersonalBest({ value: 50, unit: 'cm' }, [], false)).toBe(true);
  });
});

describe('test records after an edit', () => {
  it('recomputes which results were records, in order', () => {
    const results = [
      { value: 28, unit: 'inches' },
      { value: 30, unit: 'inches' },
      { value: 74, unit: 'cm' },
      { value: 80, unit: 'cm' },
    ];
    // 74 cm is about 29.1 inches: not better than 30
    expect(testRecordFlags(results, false)).toEqual([true, true, false, true]);
    expect(testRecordFlags([{ value: 3.2, unit: 'seconds' }, { value: 3.1, unit: 'seconds' }], true)).toEqual([true, true]);
  });
});
