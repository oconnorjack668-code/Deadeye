// @vitest-environment node
// __tests__/profilePhoto.test.ts
// The rules on profile photos: consent, a parent for under-16s, and asking a
// parent again before a photo is shown to more people.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => ({ id: 'user-1', email: 'player@example.com' }) }));
const email = { configured: true, sent: [] as Array<{ to: string; text: string }>, fail: false };
vi.mock('@/lib/email', () => ({
  emailConfigured: () => email.configured,
  sendEmail: async (message: { to: string; text: string }) => {
    if (email.fail) throw new Error('mail down');
    email.sent.push(message);
  },
}));

interface Db {
  ageCheck: { is_16_plus: boolean; consent_status: string; parent_email: string | null } | null;
  photo: { path: string; created_at: string; status: string; visibility: string; approval_token: string | null } | null;
  upserts: Array<Record<string, unknown>>;
  updates: Array<Record<string, unknown>>;
  uploads: string[];
}
const db: Db = { ageCheck: null, photo: null, upserts: [], updates: [], uploads: [] };

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: table === 'age_checks' ? db.ageCheck : table === 'profile_photos' ? db.photo : null }),
        }),
      }),
      upsert: async (row: Record<string, unknown>) => {
        db.upserts.push(row);
        return { error: null };
      },
      update: (change: Record<string, unknown>) => ({
        eq: async () => {
          db.updates.push(change);
          return { error: null };
        },
      }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
    storage: {
      from: () => ({
        upload: async (path: string) => {
          db.uploads.push(path);
          return { error: null };
        },
        remove: async () => ({ error: null }),
      }),
    },
  }),
}));

import { POST, PATCH } from '@/app/api/profile/photo/route';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);

function upload(fields: { consent?: string; visibility?: string; bytes?: Uint8Array<ArrayBuffer> }) {
  const form = new FormData();
  form.append('photo', new File([fields.bytes ?? JPEG], 'photo.jpg', { type: 'image/jpeg' }));
  form.append('visibility', fields.visibility ?? 'friends');
  if (fields.consent) form.append('consent', fields.consent);
  return POST(new Request('http://localhost/api/profile/photo', { method: 'POST', body: form }));
}

function patch(visibility: string) {
  return PATCH(
    new Request('http://localhost/api/profile/photo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
    })
  );
}

beforeEach(() => {
  email.configured = true;
  email.fail = false;
  email.sent = [];
  db.ageCheck = null;
  db.photo = null;
  db.upserts = [];
  db.updates = [];
  db.uploads = [];
});

describe('profile photo upload', () => {
  it('needs the player to say it is them and they are happy to share it', async () => {
    db.ageCheck = { is_16_plus: true, consent_status: 'not_needed', parent_email: null };
    const res = await upload({});
    expect(res.status).toBe(400);
    expect(db.uploads).toHaveLength(0);
  });

  it('refuses a file that is not a JPEG, whatever it is called', async () => {
    db.ageCheck = { is_16_plus: true, consent_status: 'not_needed', parent_email: null };
    const res = await upload({ consent: 'yes', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]) });
    expect(res.status).toBe(415);
  });

  it('shows a 16+ player photo straight away, to whoever they chose', async () => {
    db.ageCheck = { is_16_plus: true, consent_status: 'not_needed', parent_email: null };
    const res = await upload({ consent: 'yes', visibility: 'everyone' });
    expect(await res.json()).toEqual({ status: 'approved' });
    expect(db.upserts[0]).toMatchObject({ status: 'approved', consent_by: 'player', visibility: 'everyone', approval_token: null });
  });

  it('holds an under-16 photo and emails the parent the link, never the player', async () => {
    db.ageCheck = { is_16_plus: false, consent_status: 'approved', parent_email: 'parent@example.com' };
    const res = await upload({ consent: 'yes' });
    const body = await res.json();
    // With the link, a player could approve their own photo
    expect(body).toEqual({ status: 'pending', emailed: true });
    expect(db.upserts[0]).toMatchObject({ status: 'pending', consent_by: 'parent' });
    expect(email.sent[0].to).toBe('parent@example.com');
    expect(email.sent[0].text).toContain(`http://localhost/parents/photo/${db.upserts[0].approval_token}`);
  });

  it('takes no under-16 photo while there is no way to email a parent', async () => {
    db.ageCheck = { is_16_plus: false, consent_status: 'approved', parent_email: 'parent@example.com' };
    email.configured = false;
    expect((await upload({ consent: 'yes' })).status).toBe(403);
    db.ageCheck = { is_16_plus: false, consent_status: 'approved', parent_email: null };
    email.configured = true;
    expect((await upload({ consent: 'yes' })).status).toBe(403);
    expect(db.uploads).toHaveLength(0);
  });

  it('keeps the photo hidden and the link private when the email fails', async () => {
    db.ageCheck = { is_16_plus: false, consent_status: 'approved', parent_email: 'parent@example.com' };
    email.fail = true;
    const res = await upload({ consent: 'yes' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('/parents/photo/');
    expect(db.upserts[0]).toMatchObject({ status: 'pending' });
  });

  it('takes no photo from an under-16 whose account a parent has not approved', async () => {
    db.ageCheck = { is_16_plus: false, consent_status: 'pending', parent_email: null };
    expect((await upload({ consent: 'yes' })).status).toBe(403);
    expect(db.uploads).toHaveLength(0);
  });
});

describe('changing who sees a photo', () => {
  it('asks a parent again before an under-16 photo is shown to more people', async () => {
    db.ageCheck = { is_16_plus: false, consent_status: 'approved', parent_email: 'parent@example.com' };
    db.photo = { path: 'user-1/a.jpg', created_at: '2026-10-01T00:00:00Z', status: 'approved', visibility: 'friends', approval_token: 'old' };
    expect(await (await patch('everyone')).json()).toEqual({ status: 'pending', emailed: true });
    expect(email.sent).toHaveLength(1);
    expect(db.updates[0]).toMatchObject({ visibility: 'everyone', status: 'pending', approved_at: null });
    expect(db.updates[0].approval_token).not.toBe('old');
  });

  it('lets anyone show their photo to fewer people without asking', async () => {
    db.ageCheck = { is_16_plus: false, consent_status: 'approved', parent_email: null };
    db.photo = { path: 'user-1/a.jpg', created_at: '2026-10-01T00:00:00Z', status: 'approved', visibility: 'everyone', approval_token: 'old' };
    expect(await (await patch('me')).json()).toEqual({ status: 'approved' });
    expect(db.updates[0]).toEqual({ visibility: 'me' });
  });

  it('leaves the photo as it was when a parent cannot be emailed', async () => {
    db.ageCheck = { is_16_plus: false, consent_status: 'approved', parent_email: 'parent@example.com' };
    email.configured = false;
    db.photo = { path: 'user-1/a.jpg', created_at: '2026-10-01T00:00:00Z', status: 'approved', visibility: 'friends', approval_token: 'old' };
    expect((await patch('everyone')).status).toBe(403);
    expect(db.updates).toHaveLength(0);
  });
});
