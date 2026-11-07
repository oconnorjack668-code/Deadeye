import { describe, it, expect } from 'vitest';
import { checkFraming, framingVerdict } from '@/lib/video/framing';
import { rimFromEdges } from '@/lib/video/shotDetector';

const PX = 96;
function crop(level: number, brightShare = 0) {
  const px = new Uint8ClampedArray(PX * PX * 4);
  for (let i = 0; i < PX * PX; i++) {
    const v = i < PX * PX * brightShare ? 255 : level + ((i * 37) % 40);
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v;
    px[i * 4 + 3] = 255;
  }
  return px;
}

describe('framing check', () => {
  const big = rimFromEdges({ x: 0.45, y: 0.4 }, { x: 0.55, y: 0.4 });

  it('passes a well set up camera', () => {
    const checks = checkFraming({ rim: big, videoWidth: 1920, videoHeight: 1080, crop: crop(110), cropPx: PX, later: crop(110) });
    expect(checks.map((c) => c.ok)).toEqual([true, true, true, true, true]);
    expect(framingVerdict(checks)).toBe('good');
  });

  it('flags a small hoop, no room above and glare', () => {
    const small = rimFromEdges({ x: 0.5, y: 0.03 }, { x: 0.53, y: 0.03 });
    const checks = checkFraming({ rim: small, videoWidth: 1280, videoHeight: 720, crop: crop(10, 0.3), cropPx: PX });
    expect(Object.fromEntries(checks.map((c) => [c.id, c.ok]))).toEqual({ size: false, room: false, light: true, glare: false });
    expect(framingVerdict(checks)).toBe('fix');
  });

  it('flags a dim picture', () => {
    const checks = checkFraming({ rim: big, videoWidth: 1920, videoHeight: 1080, crop: crop(5), cropPx: PX });
    expect(checks.find((c) => c.id === 'light')?.ok).toBe(false);
  });
});
