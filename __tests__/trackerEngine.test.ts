import { describe, it, expect, vi } from 'vitest';
import { bitmapsWork, createInlineEngine } from '@/lib/video/trackerEngine';

const config = { rim: { x: 0.5, y: 0.3, width: 0.06 }, videoWidth: 1920, videoHeight: 1080 };

describe('the tracker engine on the main thread', () => {
  it('never takes bitmaps, and closes one it is handed', () => {
    const engine = createInlineEngine(config, () => undefined);
    expect(engine.takesBitmaps()).toBe(false);
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
    engine.pushBitmap(bitmap, 320, 0);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it('scores pixels pushed to it, and finishes with a list', async () => {
    const frames: number[] = [];
    const engine = createInlineEngine(config, (r) => frames.push(r.t));
    for (let i = 0; i < 4; i++) engine.push(new Uint8ClampedArray(64 * 64 * 4), 64, i * 33);
    expect(frames).toHaveLength(4);
    expect(await engine.finish()).toEqual([]);
  });
});

describe('bitmapsWork', () => {
  it('says no where OffscreenCanvas is missing', () => {
    const had = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
    try {
      expect(bitmapsWork()).toBe(false);
    } finally {
      if (had) (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = had;
    }
  });
});
