// src/lib/video/rimSync.ts
// Keeps measured hoops with the player's account as well as on the phone
// (00055_saved_rims.sql).
//
// rimMemory.ts kept them on the device only, on purpose: a rim measurement
// fits one camera position, and offering a driveway rim measured on a phone
// to a laptop would offer a measurement that cannot be right. That still
// holds, so a hoop that came from the account and was not measured in this
// browser is marked `fromAccount`, and the tracker never starts on it
// straight away: it opens in the magnified view, already placed, to check.
// What syncing adds is not having to measure again after clearing site
// data, installing the app to the home screen, or changing phones and
// putting the tripod in the same spot.
//
// The account copy is a convenience. Every call here fails quietly - before
// 00055 has been run, signed out, offline - and the phone's copy carries on.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { isUsableRim, MAX_RIM_NAME, MAX_SAVED_RIMS, type SavedRim } from './rimMemory';
import type { Rim } from './shotDetector';

export interface AccountRim {
  name: string;
  rim: Rim;
  /** Epoch ms. */
  usedAt: number;
}

type Client = SupabaseClient<Database>;

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The phone's hoops with the account's added. A hoop on both keeps the
 * phone's measurement: it is the one taken from where this phone stands.
 * One only in the account comes in marked fromAccount, to be checked before
 * use. Most recently used first, as many as the phone keeps.
 */
export function mergeRims(local: SavedRim[], account: AccountRim[]): SavedRim[] {
  const merged = [...local];
  for (const a of account) {
    if (merged.some((s) => sameName(s.name, a.name))) continue;
    merged.push({ id: `account:${a.name.toLowerCase()}`, name: a.name, rim: a.rim, usedAt: a.usedAt, fromAccount: true });
  }
  return merged.sort((a, b) => b.usedAt - a.usedAt).slice(0, MAX_SAVED_RIMS);
}

/** Rows from saved_rims, keeping only ones that could be a rim. */
export function parseAccountRims(rows: Array<{ name: unknown; rim: unknown; used_at: unknown }>): AccountRim[] {
  const out: AccountRim[] = [];
  for (const row of rows) {
    if (typeof row.name !== 'string' || !row.name.trim() || row.name.length > MAX_RIM_NAME) continue;
    if (!isUsableRim(row.rim)) continue;
    const usedAt = typeof row.used_at === 'string' ? Date.parse(row.used_at) : NaN;
    out.push({ name: row.name, rim: row.rim, usedAt: Number.isFinite(usedAt) ? usedAt : 0 });
  }
  return out;
}

/** A name for an ilike match that means exactly that name, % and _ included. */
export function exactLike(name: string): string {
  return name.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** The player's hoops from their account, or null when they cannot be read. */
export async function loadAccountRims(client: Client): Promise<AccountRim[] | null> {
  try {
    const { data, error } = await client.from('saved_rims').select('name, rim, used_at').order('used_at', { ascending: false }).limit(MAX_SAVED_RIMS);
    if (error || !data) return null;
    return parseAccountRims(data);
  } catch {
    return null;
  }
}

async function userId(client: Client): Promise<string | null> {
  try {
    const { data } = await client.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Saves a hoop to the account, replacing one with the same name. */
export async function saveAccountRim(client: Client, name: string, rim: Rim, usedAt: number): Promise<void> {
  try {
    const uid = await userId(client);
    if (!uid) return;
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, MAX_RIM_NAME);
    if (!clean) return;
    const row = { name: clean, rim: rim as unknown as Database['public']['Tables']['saved_rims']['Row']['rim'], used_at: new Date(usedAt).toISOString() };
    const { data: existing } = await client.from('saved_rims').select('id').eq('user_id', uid).ilike('name', exactLike(clean)).limit(1);
    if (existing && existing.length) await client.from('saved_rims').update(row).eq('id', existing[0].id);
    else await client.from('saved_rims').insert({ ...row, user_id: uid });
  } catch {
    // The phone has it; the account copy can wait for the next save
  }
}

export async function deleteAccountRim(client: Client, name: string): Promise<void> {
  try {
    const uid = await userId(client);
    if (!uid) return;
    await client.from('saved_rims').delete().eq('user_id', uid).ilike('name', exactLike(name));
  } catch {
    // Still gone from the phone, which is what the player sees
  }
}
