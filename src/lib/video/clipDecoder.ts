// src/lib/video/clipDecoder.ts
// Reads an uploaded clip frame by frame with the browser's video decoder
// (WebCodecs), as fast as the device can, instead of playing it.
//
// Playing a clip and reading each frame's pixels out of the <video> costs
// frames the tracker never sees. Measured in Chrome on the bench laptop (14
// Nov 2026), the 2:39 bench clip (60 fps, portrait) lost about a quarter of
// its frames at normal speed however the pixels were read, and the calls fell
// from 31 of 31 to 25-27; at half speed every frame arrived (30 of 31) but
// checking took 5:20. Decoded here, every frame arrived and it called 30 of
// 31 in 42 seconds: there is no playback clock to keep up with, so nothing is
// dropped, and a phone that decodes faster than real time checks faster too.
//
// Runs in the tracker's worker. The file is read a slice at a time and only as
// fast as the decoder keeps up, so a long clip is never held in memory.
import { createFile, DataStream, Endianness, MP4BoxBuffer, type Sample } from 'mp4box';
import { createWorkload, isRepeat } from './workload';

/** Clockwise rotation the clip is shown at, from its track matrix. */
export type Rotation = 0 | 90 | 180 | 270;

export class DecodeError extends Error {
  constructor(
    message: string,
    /** Frames handed to the tracker before it failed: none means playing the clip instead loses nothing. */
    readonly frames: number
  ) {
    super(message);
    this.name = 'DecodeError';
  }
}

/**
 * The rotation a track matrix (16.16 fixed point: a, b, u, c, d, v, x, y, w)
 * shows its frames at, clockwise. Phones store portrait video sideways with
 * this set; the <video> element applies it, and so the rim taps are in the
 * turned picture, while the decoder hands back frames as stored.
 *
 * Checked against Chrome's <video> on clips flagged 90, 180 and 270 by ffmpeg
 * (14 Nov 2026): the crops matched to within 2-4 levels, the difference the
 * graphics chip's colour conversion makes anyway.
 */
export function rotationOf(matrix: ArrayLike<number> | undefined | null): Rotation {
  if (!matrix || matrix.length < 2) return 0;
  const deg = Math.round((Math.atan2(matrix[1], matrix[0]) * 180) / Math.PI);
  const r = ((deg % 360) + 360) % 360;
  return r === 90 || r === 180 || r === 270 ? r : 0;
}

/** A square crop in the picture as shown, mapped into the frame as stored (coded size codedW x codedH). */
export function cropInStored(crop: { sx: number; sy: number; side: number }, rotation: Rotation, codedW: number, codedH: number): { x: number; y: number } {
  const { sx, sy, side } = crop;
  if (rotation === 90) return { x: sy, y: codedH - sx - side };
  if (rotation === 180) return { x: codedW - sx - side, y: codedH - sy - side };
  if (rotation === 270) return { x: codedW - sy - side, y: sx };
  return { x: sx, y: sy };
}

/**
 * Milliseconds to take off a decoded frame's time to put it on the clip's own
 * clock, from the track's edit list.
 *
 * A clip cut without re-encoding, and some phones' own files, start playback
 * partway into the first group of frames. The decoder still hands back the
 * frames before that point; the <video> never shows them. Without this the
 * tracker's shot times did not match the video's, and its first frame was a
 * different moment from the one the player saw.
 */
export function editOffsetMs(edits: ReadonlyArray<{ media_time: number; segment_duration: number }> | undefined, timescale: number, movieTimescale: number): number {
  let delayMs = 0;
  for (const edit of edits ?? []) {
    if (edit.media_time === -1) {
      // An empty edit: nothing shown for this long
      delayMs += (edit.segment_duration / movieTimescale) * 1000;
      continue;
    }
    return (edit.media_time / timescale) * 1000 - delayMs;
  }
  // `|| 0`: no delay is 0, not -0
  return -delayMs || 0;
}

/** The codec's setup bytes (avcC, hvcC, vpcC or av1C) that the decoder needs as `description`. */
function description(file: ReturnType<typeof createFile>, trackId: number): Uint8Array | undefined {
  const trak = file.getTrackById(trackId) as unknown as {
    mdia: { minf: { stbl: { stsd: { entries: Array<Record<string, { write(s: DataStream): void } | undefined>> } } } };
  };
  for (const entry of trak.mdia.minf.stbl.stsd.entries) {
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    if (box) {
      const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN);
      box.write(stream);
      // Without the 8-byte box header
      return new Uint8Array(stream.buffer as ArrayBuffer, 8);
    }
  }
  return undefined;
}

export interface DecodeOptions {
  /** The picture's size as the <video> shows it, which the rim was tapped on. A clip that decodes to another size is refused. */
  videoWidth: number;
  videoHeight: number;
  /** The hoop crop in that picture, and the size to draw it at. */
  crop: { sx: number; sy: number; side: number };
  px: number;
  /** Each frame's hoop crop, in order, on the clip's clock (ms). Repeats and frames under 30 fps apart are left out. */
  onFrame(pixels: Uint8ClampedArray, px: number, t: number): void;
  /** Where it has got to, now and then. */
  onProgress?(t: number, durationMs: number): void;
  /** True once the run has been stopped: decoding ends at the next frame. */
  stopped(): boolean;
}

export interface DecodeSummary {
  /** Frames handed to onFrame. */
  frames: number;
  /** Frames the decoder produced, before thinning. */
  decoded: number;
  durationMs: number;
}

/** Bytes read from the file at a time. */
const SLICE = 4 * 1024 * 1024;
/** Frames waiting for the decoder, and decoded frames waiting to be drawn, past which reading pauses. */
const MAX_QUEUED = 60;
const MAX_WAITING = 8;

export async function decodeClip(file: Blob, options: DecodeOptions): Promise<DecodeSummary> {
  const { px } = options;
  const mp4 = createFile();
  const canvas = new OffscreenCanvas(px, px);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new DecodeError('No 2d context', 0);
  // The app's own thinning to 30 a second and repeat check, as for playback
  const workload = createWorkload();
  let last: Uint8ClampedArray | null = null;
  let decoder: VideoDecoder | null = null;
  let failure: string | null = null;
  let rotation: Rotation = 0;
  let codedW = 0;
  let codedH = 0;
  let offsetMs = 0;
  let durationMs = 0;
  let frames = 0;
  let decoded = 0;
  let lastProgress = 0;
  // Decoded frames are drawn strictly in order: the tracker compares each
  // frame with the ones before it
  let chain: Promise<void> = Promise.resolve();
  let waiting = 0;

  const draw = async (frame: VideoFrame) => {
    decoded++;
    const t = frame.timestamp / 1000 - offsetMs;
    if (failure || options.stopped() || t < 0 || !workload.wants(t)) {
      frame.close();
      return;
    }
    // The crop in the stored frame, cut and shrunk by the graphics chip, then
    // turned the way the picture is shown
    const at = cropInStored(options.crop, rotation, codedW, codedH);
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(frame, at.x, at.y, options.crop.side, options.crop.side, { resizeWidth: px, resizeHeight: px, resizeQuality: 'low' });
    } finally {
      frame.close();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (rotation) {
      ctx.translate(px / 2, px / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-px / 2, -px / 2);
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = ctx.getImageData(0, 0, px, px).data;
    if (last && isRepeat(pixels, last)) return;
    last = pixels;
    workload.scored(t);
    if (options.stopped()) return;
    options.onFrame(pixels, px, t);
    frames++;
    if (options.onProgress && t - lastProgress >= 1000) {
      lastProgress = t;
      options.onProgress(t, durationMs);
    }
  };

  mp4.onError = (_module: string, message: string) => {
    failure = `Could not read the clip: ${message}`;
  };
  mp4.onReady = (info) => {
    const track = info.videoTracks[0];
    if (!track) {
      failure = 'No video in the clip';
      return;
    }
    codedW = track.video?.width ?? track.track_width;
    codedH = track.video?.height ?? track.track_height;
    rotation = rotationOf((track as unknown as { matrix?: ArrayLike<number> }).matrix);
    const shownW = rotation === 90 || rotation === 270 ? codedH : codedW;
    const shownH = rotation === 90 || rotation === 270 ? codedW : codedH;
    // The rim was tapped on the picture the <video> shows. If this reads the
    // clip any differently, the taps would land somewhere else.
    if (shownW !== options.videoWidth || shownH !== options.videoHeight) {
      failure = `Decoded size ${shownW}x${shownH} is not the video's ${options.videoWidth}x${options.videoHeight}`;
      return;
    }
    offsetMs = editOffsetMs((track as unknown as { edits?: Array<{ media_time: number; segment_duration: number }> }).edits, track.timescale, track.movie_timescale);
    durationMs = (info.duration / info.timescale) * 1000;
    const config: VideoDecoderConfig = { codec: track.codec, codedWidth: codedW, codedHeight: codedH, description: description(mp4, track.id) };
    decoder = new VideoDecoder({
      output: (frame) => {
        waiting++;
        chain = chain.then(() => draw(frame)).catch((err) => void (failure ??= `Could not read a frame: ${String(err)}`)).finally(() => void waiting--);
      },
      error: (err) => void (failure ??= `The decoder failed: ${err.message}`),
    });
    try {
      decoder.configure(config);
    } catch (err) {
      failure = `This clip's format (${track.codec}) cannot be decoded here: ${String(err)}`;
      return;
    }
    mp4.setExtractionOptions(track.id, null, { nbSamples: 30 });
    mp4.start();
  };
  mp4.onSamples = (_id: number, _user: unknown, samples: Sample[]) => {
    if (!decoder || failure || decoder.state !== 'configured') return;
    for (const s of samples) {
      if (!s.data) continue;
      decoder.decode(new EncodedVideoChunk({ type: s.is_sync ? 'key' : 'delta', timestamp: (1e6 * s.cts) / s.timescale, duration: (1e6 * s.duration) / s.timescale, data: s.data }));
    }
  };

  // Set in a callback, which the compiler cannot follow
  const dec = () => decoder as VideoDecoder | null;
  // mp4box says where it wants to read next. When the index is at the end of
  // the file, as phones often write it, that is back at the video data.
  let offset = 0;
  let reads = 0;
  while (offset < file.size && !failure && !options.stopped() && reads++ < 1_000_000) {
    const ab = await file.slice(offset, offset + SLICE).arrayBuffer();
    const end = offset + ab.byteLength;
    const next = mp4.appendBuffer(MP4BoxBuffer.fromArrayBuffer(ab, offset), end >= file.size);
    offset = typeof next === 'number' && next !== offset ? next : end;
    while (dec() && !failure && !options.stopped() && (dec()!.decodeQueueSize > MAX_QUEUED || waiting > MAX_WAITING)) {
      await new Promise((r) => setTimeout(r, 2));
    }
  }
  mp4.flush();
  if (!dec() && !failure && !options.stopped()) failure = 'The clip has no video the browser can read';
  if (dec() && dec()!.state === 'configured' && !failure && !options.stopped()) {
    try {
      await dec()!.flush();
    } catch (err) {
      failure ??= `The decoder failed at the end: ${String(err)}`;
    }
  }
  await chain;
  if (dec() && dec()!.state !== 'closed') dec()!.close();
  if (failure) throw new DecodeError(failure, frames);
  return { frames, decoded, durationMs };
}
