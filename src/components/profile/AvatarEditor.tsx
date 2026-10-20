// src/components/profile/AvatarEditor.tsx
'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Copy, Share2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/Button';
import { AVATAR_COLORS, AVATAR_EMOJIS, PHOTO_VISIBILITY, type AvatarColor, type PhotoVisibility } from '@/lib/avatars';

export interface OwnPhoto {
  url: string | null;
  status: 'pending' | 'approved';
  visibility: PhotoVisibility;
}

/** Side of the square photo sent to the server, in pixels. */
const PHOTO_SIZE = 320;

/**
 * The photo cropped to a square and redrawn as a small JPEG. Redrawing it on a
 * canvas is also what strips its EXIF data, the phone's GPS position included,
 * before it ever leaves the phone.
 */
async function shrink(file: File): Promise<Blob> {
  let source: CanvasImageSource & { width: number; height: number };
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(file);
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    }).finally(() => URL.revokeObjectURL(url));
  }
  const side = Math.min(source.width, source.height);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode'))), 'image/jpeg', 0.85));
}

/**
 * Choosing an avatar: an emoji on a colour, and an optional photo with a choice
 * of who sees it. Under 16, the photo waits for a parent (see api/profile/photo).
 */
export function AvatarEditor({
  name,
  emoji: initialEmoji,
  color: initialColor,
  photo: initialPhoto,
  is16Plus,
}: {
  name: string;
  emoji: string | null;
  color: string | null;
  photo: OwnPhoto | null;
  is16Plus: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [color, setColor] = useState(initialColor);
  const [photo, setPhoto] = useState(initialPhoto);
  const [draft, setDraft] = useState<{ blob: Blob; url: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [visibility, setVisibility] = useState<PhotoVisibility>(initialPhoto?.visibility ?? 'friends');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [parentLink, setParentLink] = useState<string | null>(null);

  async function saveLook(next: { avatar_emoji?: string; avatar_color?: string }) {
    const before = { emoji, color };
    if (next.avatar_emoji) setEmoji(next.avatar_emoji);
    if (next.avatar_color) setColor(next.avatar_color);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update(next).eq('id', user.id);
    if (error) {
      setEmoji(before.emoji);
      setColor(before.color);
      setMessage({ tone: 'error', text: 'Could not save that. Try again.' });
      return;
    }
    router.refresh();
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    try {
      const blob = await shrink(file);
      if (draft) URL.revokeObjectURL(draft.url);
      setDraft({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setMessage({ tone: 'error', text: 'That photo could not be opened. Try a different one.' });
    }
  }

  /** What the server said after a change: approved, or waiting for a parent. */
  function afterSave(data: { status?: string; emailed?: boolean; link?: string | null }, url: string | null) {
    const status = data.status === 'approved' ? 'approved' : 'pending';
    setPhoto((p) => ({ url: url ?? p?.url ?? null, status, visibility }));
    setParentLink(data.link ?? null);
    setMessage(
      status === 'approved'
        ? { tone: 'ok', text: 'Photo saved.' }
        : data.emailed
          ? { tone: 'ok', text: 'We emailed your parent to approve it. Until then, everyone else sees your emoji.' }
          : { tone: 'ok', text: 'Send the link below to a parent to approve it. Until then, everyone else sees your emoji.' }
    );
    router.refresh();
  }

  async function upload() {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append('photo', draft.blob, 'photo.jpg');
    form.append('visibility', visibility);
    form.append('consent', consent ? 'yes' : 'no');
    const res = await fetch('/api/profile/photo', { method: 'POST', body: form }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string; status?: string; emailed?: boolean; link?: string | null };
    setBusy(false);
    if (!res?.ok) {
      setMessage({ tone: 'error', text: data?.error || 'Could not save your photo. Please try again.' });
      return;
    }
    afterSave(data, draft.url);
    setDraft(null);
    setConsent(false);
  }

  async function changeVisibility(next: PhotoVisibility) {
    setVisibility(next);
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/profile/photo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: next }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string; status?: string; emailed?: boolean; link?: string | null };
    setBusy(false);
    if (!res?.ok) {
      setVisibility(photo?.visibility ?? 'friends');
      setMessage({ tone: 'error', text: data?.error || 'Could not change that. Please try again.' });
      return;
    }
    afterSave(data, null);
  }

  async function removePhoto() {
    if (!window.confirm('Remove your photo? Your emoji will show instead.')) return;
    setBusy(true);
    const res = await fetch('/api/profile/photo', { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setMessage({ tone: 'error', text: 'Could not remove your photo. Please try again.' });
      return;
    }
    setPhoto(null);
    setParentLink(null);
    setMessage({ tone: 'ok', text: 'Photo removed.' });
    router.refresh();
  }

  async function shareLink() {
    if (!parentLink) return;
    try {
      if (navigator.share) await navigator.share({ title: 'Approve my Deadeye photo', url: parentLink });
      else await navigator.clipboard.writeText(parentLink);
      if (!navigator.share) setMessage({ tone: 'ok', text: 'Link copied. Send it to a parent.' });
    } catch {
      // Share sheet closed
    }
  }

  const choiceClass = (on: boolean) =>
    `rounded-lg border px-3 py-2 text-left text-xs ${on ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} emoji={emoji} color={color} photoUrl={draft?.url ?? photo?.url} size={64} />
        <div className="text-sm">
          <div className="font-semibold text-white">Profile picture</div>
          <div className="text-xs text-zinc-500">
            {photo
              ? photo.status === 'pending'
                ? 'Photo waiting for a parent. Others see your emoji until then.'
                : `Photo seen by: ${PHOTO_VISIBILITY.find((v) => v.id === photo.visibility)?.label.toLowerCase()}`
              : 'Your emoji shows wherever your name does.'}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs text-zinc-400">Emoji</div>
        <div className="grid grid-cols-8 gap-1.5">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => void saveLook({ avatar_emoji: e })}
              aria-pressed={emoji === e}
              aria-label={`Use ${e}`}
              className={`flex aspect-square items-center justify-center rounded-lg text-xl ${emoji === e ? 'bg-zinc-700 ring-2 ring-orange-500' : 'bg-zinc-800/70 hover:bg-zinc-800'}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs text-zinc-400">Colour</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AVATAR_COLORS) as AvatarColor[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => void saveLook({ avatar_color: c })}
              aria-pressed={color === c}
              aria-label={c}
              className={`h-8 w-8 rounded-full ring-2 ${AVATAR_COLORS[c]} ${color === c ? 'outline outline-2 outline-offset-2 outline-white' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-white">Photo (optional)</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Camera className="h-3.5 w-3.5" /> {photo ? 'Change' : 'Add a photo'}
            </Button>
            {photo && !draft && (
              <Button size="sm" variant="ghost" className="gap-1.5 text-red-400" onClick={() => void removePhoto()} disabled={busy}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
        </div>

        {!is16Plus && (
          <p className="text-xs text-zinc-400">
            You are under 16, so a parent or guardian approves your photo, and who can see it, before anyone else sees it.
          </p>
        )}

        {(draft || photo) && (
          <div role="radiogroup" aria-label="Who can see your photo" className="grid gap-1.5">
            {PHOTO_VISIBILITY.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={visibility === v.id}
                disabled={busy}
                onClick={() => (draft ? setVisibility(v.id) : void changeVisibility(v.id))}
                className={choiceClass(visibility === v.id)}
              >
                <span className="block font-semibold">{v.label}</span>
                <span className="block text-zinc-500">{v.hint}</span>
              </button>
            ))}
          </div>
        )}

        {draft && (
          <>
            <label className="flex items-start gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-500" />
              <span>This is a photo of me, and I am happy for the people I chose above to see it. I can remove it at any time.</span>
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={() => void upload()} isLoading={busy} disabled={!consent}>
                {is16Plus ? 'Save photo' : 'Ask a parent to approve'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  URL.revokeObjectURL(draft.url);
                  setDraft(null);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {parentLink && (
          <div className="rounded-lg bg-zinc-950/60 p-2 text-xs text-zinc-300">
            <p className="mb-2 break-all">{parentLink}</p>
            <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => void shareLink()}>
              {typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{' '}
              Send to a parent
            </Button>
          </div>
        )}
      </div>

      {message && (
        <p role="status" className={`text-xs ${message.tone === 'ok' ? 'text-emerald-300' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
