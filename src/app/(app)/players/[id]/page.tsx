// src/app/(app)/players/[id]/page.tsx
// A player's card: display name, level, season points, badges, streak (friends/teammates) and only
// the details they chose to show in Settings. Age is never shown. (player_card, migrations 00024
// and 00043, which added the level, the avatar and the photo when the viewer may see it)
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentProfile, checkIsOwner } from '@/lib/auth';
import { ResetNameButton } from './ResetNameButton';
import { FriendButton, type FriendState } from './FriendButton';
import { FollowButton } from './FollowButton';
import { FounderPostList } from '@/components/FounderPostList';
import type { FounderPost } from '@/lib/founderPosts';
import { createClient } from '@/lib/supabase/server';
import { asMeasurementSystem, formatHeight } from '@/lib/units';
import { countryName } from '@/lib/regions';
import { Award, Flame, Lock, MapPin, Shield, Trophy } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { BackButton } from '@/components/BackButton';
import { signedPhotoUrl } from '@/lib/photos-server';
import { ownersAmong } from '@/lib/owners-server';
import { FounderBadge } from '@/components/FounderBadge';
import { clubById } from '@/lib/clubs';
import { tierFor } from '@/lib/achievements';
import { TIER_THEME } from '@/lib/tierTheme';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Player - Deadeye' };

interface Card {
  user_id: string;
  display_name: string;
  is_me: boolean;
  is_friend: boolean;
  position: string | null;
  height_cm: number | null;
  country: string | null;
  region: string | null;
  badges: number;
  badge_titles: string[];
  season_points: number | null;
  streak: number | null;
  // From 00043; missing until it runs
  level?: number | null;
  avatar_emoji?: string | null;
  avatar_color?: string | null;
  photo_path?: string | null;
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [supabase, me, isOwner] = await Promise.all([createClient(), getCurrentProfile(), checkIsOwner()]);
  const { data } = await supabase.rpc('player_card', { p_user: id });
  const card = data as Card | null;
  // Where the two of you stand, for the Add friend button. Players can read
  // their own friendships (00021). Only asked once the card exists, so id is a
  // real player's uuid before it goes into the filter.
  let friend: FriendState = { kind: 'none' };
  if (card && !card.is_me) {
    const { data: row } = await supabase
      .from('friendships')
      .select('id, requester_id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${card.user_id}),and(requester_id.eq.${card.user_id},addressee_id.eq.${user.id})`)
      .maybeSingle();
    if (row?.status === 'accepted') friend = { kind: 'friends' };
    else if (row) friend = row.requester_id === user.id ? { kind: 'outgoing', friendshipId: row.id } : { kind: 'incoming', friendshipId: row.id };
  }
  const units = asMeasurementSystem(me?.measurement_system);
  // player_card only returns the path when this viewer may see the photo
  const [photoUrl, owners] = await Promise.all([signedPhotoUrl(card?.photo_path), ownersAmong(card ? [card.user_id] : [])]);
  const isFounder = !!card && owners.has(card.user_id);
  // Their club, only when they chose to show it and this viewer may see it
  // (00051). The function always gives a player their own club, so on their
  // own card it shows only when switched on, as others would see it.
  const [{ data: badgeClub }, { data: ownClub }] = card
    ? await Promise.all([
        supabase.rpc('player_club_badge', { p_user: card.user_id }),
        card.is_me ? supabase.from('player_clubs').select('show_on_card').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ])
    : [{ data: null }, { data: null }];
  const club = clubById(badgeClub);
  const clubOnCard = !!club && (!card?.is_me || ownClub?.show_on_card === true);
  // The founder card has Follow instead of Add friend, and their posts (00050).
  // Before 00050 runs these all fail, and the card shows neither.
  const [posts, follow, followers] = isFounder
    ? await Promise.all([
        supabase.from('founder_posts').select('id, kind, body, created_at').eq('author_id', card.user_id).order('created_at', { ascending: false }).limit(5),
        card.is_me
          ? null
          : supabase.from('follows').select('followed_id').eq('follower_id', user.id).eq('followed_id', card.user_id).maybeSingle(),
        card.is_me ? supabase.rpc('follower_count') : null,
      ])
    : [null, null, null];
  const founderPosts = (posts?.data ?? []) as FounderPost[];
  const tier = card?.level ? tierFor(card.level) : null;
  const theme = tier ? TIER_THEME[tier.name] : null;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-5">
        <BackButton fallback="/leaderboard" />

        {/* Owner only, and shown even on a private card: a rude name is on the
            leaderboard whether or not the card is private */}
        {isOwner && !card?.is_me && <ResetNameButton userId={id} name={card?.display_name ?? 'this player'} />}

        {!card ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
            <Lock className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <p className="font-semibold text-white">This profile is private</p>
            <p className="text-sm text-zinc-400">Only friends and teammates can see it.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-center">
              <Avatar
                name={card.display_name}
                emoji={card.avatar_emoji}
                color={card.avatar_color}
                photoUrl={photoUrl}
                size={80}
                className="mx-auto mb-3"
              />
              <h1 className="text-2xl font-black text-white">{card.display_name}</h1>
              {(isFounder || clubOnCard) && (
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  {isFounder && <FounderBadge className="px-2.5 py-0.5 text-xs" />}
                  {clubOnCard && club && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-200">
                      <Shield className="h-3 w-3 text-orange-300" aria-hidden />
                      {club.name}
                    </span>
                  )}
                </div>
              )}
              {tier && theme && (
                <div className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${theme.chip}`}>
                  Level {card.level} · {tier.name}
                </div>
              )}
              <p className="text-sm text-zinc-400">
                {[card.position, card.height_cm ? formatHeight(card.height_cm, units) : null].filter(Boolean).join(' · ')}
              </p>
              {(card.region || card.country) && (
                <p className="mt-1 text-xs text-zinc-500 flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" /> {[card.region, countryName(card.country)].filter(Boolean).join(', ')}
                </p>
              )}
              {card.is_me ? (
                <>
                  {isFounder && followers && !followers.error && (
                    <p className="mt-3 text-sm text-zinc-300">
                      <span className="font-bold text-white">{followers.data ?? 0}</span> following you ·{' '}
                      <Link href="/admin/posts" className="font-semibold text-orange-300 underline">
                        Write a post
                      </Link>
                    </p>
                  )}
                  <Link href="/settings" className="mt-3 block text-xs text-cyan-400 underline">
                    Choose what others see in Settings → Privacy
                  </Link>
                </>
              ) : isFounder && friend.kind === 'none' ? (
                // Follow instead of Add friend on the founder's card, which every
                // player on the public board can open. An existing friendship or
                // request keeps its button below.
                follow && !follow.error ? <FollowButton userId={card.user_id} initial={!!follow.data} /> : null
              ) : (
                <>
                  {/* Keyed on the state the server read, so a refresh after a
                      request starts it fresh with the new request's id */}
                  <FriendButton key={JSON.stringify(friend)} userId={card.user_id} initial={friend} />
                  {isFounder && follow && !follow.error && <FollowButton userId={card.user_id} initial={!!follow.data} />}
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                <Trophy className="h-5 w-5 text-amber-400 mx-auto" />
                <div className="text-xl font-black text-white">{card.season_points ?? 0}</div>
                <div className="text-[11px] text-zinc-500">season pts</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                <Award className="h-5 w-5 text-amber-300 mx-auto" />
                <div className="text-xl font-black text-white">{card.badges}</div>
                <div className="text-[11px] text-zinc-500">badges</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                <Flame className="h-5 w-5 text-orange-400 mx-auto" />
                <div className="text-xl font-black text-white">{card.streak ?? '–'}</div>
                <div className="text-[11px] text-zinc-500">day streak</div>
              </div>
            </div>

            {founderPosts.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <h2 className="text-sm font-semibold text-zinc-300 mb-2">Posts</h2>
                <FounderPostList posts={founderPosts} />
              </div>
            )}

            {card.badge_titles.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <h2 className="text-sm font-semibold text-zinc-300 mb-2">Recent badges</h2>
                <div className="flex flex-wrap gap-2">
                  {card.badge_titles.map((b, i) => (
                    <span key={`${b}-${i}`} className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
