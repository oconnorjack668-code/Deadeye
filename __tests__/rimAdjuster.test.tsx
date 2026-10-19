// __tests__/rimAdjuster.test.tsx
// The magnified view for placing the two ends of the rim before tracking.
import React, { useRef, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RimAdjuster } from '@/components/video/RimAdjuster';
import type { Point } from '@/lib/video/rimAdjust';

// The 2:39 test clip: a 1080x1920 frame with a ring 50px across
const W = 1080;
const H = 1920;
const LEFT = { x: 386 / W, y: 860 / H };
const RIGHT = { x: 436 / W, y: 860 / H };

/** Renders the adjuster over a video element that reports a real frame size. */
function Harness({ start = [LEFT, RIGHT], onStart = vi.fn(), onRedo = vi.fn(), seen }: {
  start?: [Point, Point];
  onStart?: () => void;
  onRedo?: () => void;
  seen?: (edges: [Point, Point]) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [edges, setEdges] = useState<[Point, Point]>(start);
  const [ready, setReady] = useState(false);
  return (
    <>
      <video
        ref={(v) => {
          if (v && !v.videoWidth) {
            Object.defineProperty(v, 'videoWidth', { value: W });
            Object.defineProperty(v, 'videoHeight', { value: H });
          }
          (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = v;
          if (v && !ready) queueMicrotask(() => setReady(true));
        }}
      />
      {ready && (
        <RimAdjuster
          videoRef={videoRef}
          edges={edges}
          onChange={(e) => {
            setEdges(e);
            seen?.(e);
          }}
          onStart={onStart}
          onRedo={onRedo}
        />
      )}
    </>
  );
}

/** The magnified canvas, given a size on screen of 360 x 360. */
async function zoom() {
  const canvas = await screen.findByLabelText(/magnified view of the hoop/i);
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 360, right: 360, bottom: 360, x: 0, y: 0, toJSON: () => ({}) });
  (canvas as HTMLCanvasElement & { setPointerCapture: () => void }).setPointerCapture = () => undefined;
  // The view measures the frame just after it appears
  await waitFor(() => expect(canvas.getAttribute('aria-busy')).toBe('false'));
  return canvas;
}

describe('RimAdjuster', () => {
  it('moves the nearer end to where the finger is, and follows a drag', async () => {
    const seen = vi.fn();
    render(<Harness seen={seen} />);
    const canvas = await zoom();
    // The ring fills about half the view, centred: the left end is near 90px
    fireEvent.pointerDown(canvas, { clientX: 80, clientY: 180, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 70, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    const [left, right] = seen.mock.calls.at(-1)![0] as [Point, Point];
    // Left end moved further left; right end untouched
    expect(left.x * W).toBeLessThan(386);
    expect(right).toEqual(RIGHT);
  });

  it('nudges the chosen end a video pixel at a time', async () => {
    const seen = vi.fn();
    render(<Harness seen={seen} />);
    await zoom();
    fireEvent.click(screen.getByRole('button', { name: 'Right end' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }));
    const [, right] = seen.mock.calls.at(-1)![0] as [Point, Point];
    expect(right.x * W).toBeCloseTo(437);
    expect(right.y * H).toBeCloseTo(859);
  });

  it('warns when the hoop is too small in the picture to count well', async () => {
    render(<Harness />);
    expect(await screen.findByText(/only about 50 pixels across/)).toBeTruthy();
  });

  it('says nothing about size for a hoop that is big enough', async () => {
    render(<Harness start={[{ x: 300 / W, y: 0.4 }, { x: 450 / W, y: 0.4 }]} />);
    await zoom();
    expect(screen.queryByText(/pixels across/)).toBeNull();
  });

  it('starts tracking, or goes back to tapping', async () => {
    const onStart = vi.fn();
    const onRedo = vi.fn();
    render(<Harness onStart={onStart} onRedo={onRedo} />);
    fireEvent.click(await screen.findByRole('button', { name: /start tracking/i }));
    fireEvent.click(screen.getByRole('button', { name: /tap again/i }));
    expect(onStart).toHaveBeenCalledOnce();
    expect(onRedo).toHaveBeenCalledOnce();
  });
});
