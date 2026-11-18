// src/app/competition/page.tsx
// The founding competition (docs/sales/founding-competition-rules.md). Public:
// a signed-out visitor reads what it is, the prizes and the full rules, and is
// asked to sign up. A signed-in player gets an entry card, and an adult head
// coach a club entry card as well. Entries are saved by /api/competition.
import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { getCurrentUser } from '@/lib/auth';
import { emailConfigured } from '@/lib/email';
import { operator } from '@/lib/legal';
import { maskEmail } from '@/lib/parentApproval';
import { CLOSING_TEXT, JUDGED_BY_TEXT, OFFER_ENDS_TEXT, canResendParentLink, competitionLive, entryStatusText, isCompetitionOpen, NO_APPROVING_PARENT } from '@/lib/competition';
import { COMPETITION_RULES, RULES_INTRO, RULES_UPDATED, type RulesBlock } from '@/lib/competitionRules';
import { loadCompetitionState, type CompetitionState, type OwnEntry } from '@/lib/competition-server';
import { ClubEntryCard, PlayerEntryCard, type EntryView } from './EntryCards';

export const metadata = {
  title: 'Founding competition - Deadeye',
  description: 'Tell us what you think of Deadeye. 10 players win Pro for life, 1 club wins a year of the Club plan. Free to enter.',
};
export const dynamic = 'force-dynamic';

/** The rules text's two marks: **bold** and [label](/path). */
function Inline({ text, fill }: { text: string; fill: Record<string, string> }) {
  const filled = text.replace(/\{(\w+)\}/g, (_, key: string) => fill[key] ?? '');
  return (
    <>
      {filled.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/[^)]*\))/g).map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i} className="font-semibold text-white">{bold[1]}</strong>;
        const link = part.match(/^\[([^\]]+)\]\((\/[^)]*)\)$/);
        if (link) {
          return (
            <Link key={i} href={link[2]} className="text-orange-400 underline">
              {link[1]}
            </Link>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function Block({ block, fill }: { block: RulesBlock; fill: Record<string, string> }) {
  if ('p' in block) return <p><Inline text={block.p} fill={fill} /></p>;
  const items = 'ul' in block ? block.ul : block.ol;
  const List = 'ul' in block ? 'ul' : 'ol';
  return (
    <List className={`space-y-1 pl-5 ${'ul' in block ? 'list-disc' : 'list-decimal'}`}>
      {items.map((item) => (
        <li key={item}>
          <Inline text={item} fill={fill} />
        </li>
      ))}
    </List>
  );
}

function view(entry: OwnEntry, emailOn: boolean, teamName?: string | null): EntryView {
  return {
    feedback: entry.feedback,
    status: entry.status,
    statusText: entry.kind === 'club' ? 'Your club is entered. Good luck!' : entryStatusText(entry, emailOn),
    canResend: emailOn && canResendParentLink(entry),
    clubName: entry.club_name,
    teamName,
  };
}

/** null when signed out; state null when it could not be loaded (for example before 00067 runs) */
async function signedInState(load: boolean): Promise<{ state: CompetitionState | null } | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  if (!load) return { state: null };
  try {
    return { state: await loadCompetitionState(user.id) };
  } catch (err) {
    console.error('Competition: loading the entry state failed', err);
    return { state: null };
  }
}

export default async function CompetitionPage() {
  // Before launch (COMPETITION_LIVE) the page is the rules and prizes only
  const live = competitionLive();
  const closed = !isCompetitionOpen();
  const open = live && !closed;
  const signedIn = await signedInState(live);
  const state = signedIn?.state ?? null;
  const emailOn = emailConfigured();
  const runBy = operator();
  const fill = {
    operator: runBy ? `${runBy.name}${runBy.address ? `, ${runBy.address}` : ''}` : 'its founder, from Ireland',
    email: process.env.SUPPORT_EMAIL || 'getdeadeye@gmail.com',
  };
  const teams = state?.coachTeams ?? null;

  return (
    <div className="flex-1 bg-zinc-950 px-4 py-10">
      <main className="mx-auto max-w-xl space-y-6">
        <Link href={signedIn ? '/dashboard' : '/'} className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-lg font-black uppercase tracking-tight text-white">Deadeye</span>
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">Free to enter</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">The Deadeye founding competition</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Deadeye is new, and the players and clubs using it now decide what it becomes. Train with it, then tell us one thing
            you liked and one thing you would change. The most useful feedback wins.
          </p>
        </div>

        <section aria-labelledby="prizes-heading" className="space-y-3 rounded-2xl border border-zinc-800 bg-gradient-to-br from-orange-600/15 to-transparent p-4">
          <h2 id="prizes-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Prizes
          </h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>
              <span className="font-black text-white">10 players</span> win <span className="font-semibold text-white">Deadeye Pro for life</span>.
            </li>
            <li>
              <span className="font-black text-white">1 club</span> wins <span className="font-semibold text-white">a year of the Club plan free</span>, worth €899.
            </li>
            <li>
              <span className="font-semibold text-white">Everyone who enters gets 25% off their first year</span> (until {OFFER_ENDS_TEXT}).
            </li>
          </ul>
        </section>

        <section aria-labelledby="how-heading" className="space-y-2 text-sm text-zinc-300">
          <h2 id="how-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            How it works
          </h2>
          <p>
            <span className="font-semibold text-white">Closes</span> at {CLOSING_TEXT}.
          </p>
          <p>
            <span className="font-semibold text-white">Winners are judged, not drawn.</span> Two adults pick the most useful
            feedback by {JUDGED_BY_TEXT}, with names hidden: how specific it is, how much it would help other players or coaches,
            and whether it is honest. Critical feedback scores as well as praise.
          </p>
          <p>Players under 18 need a parent or guardian&apos;s permission to enter: we email them a link to approve.</p>
        </section>

        {!live ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-base font-bold text-white">Opening soon</p>
            <p className="mt-1 text-sm text-zinc-300">
              Entries are not open yet. Read the rules below, and come back here when it opens.
            </p>
          </div>
        ) : closed ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
            The competition has closed. Thank you to everyone who entered. Winners will be told by {JUDGED_BY_TEXT}.
          </p>
        ) : null}

        {!live ? null : !signedIn ? (
          open && (
            <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-sm text-zinc-300">Entering takes an account and one logged training session.</p>
              <Link
                href="/signup"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:brightness-110"
              >
                Sign up free to enter
              </Link>
              <p className="text-center text-sm text-zinc-400">
                Already have an account?{' '}
                <Link href="/login?redirectTo=%2Fcompetition" className="font-semibold text-orange-400 underline">
                  Log in
                </Link>
              </p>
            </div>
          )
        ) : !state ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
            Entries cannot be loaded right now. Please try again later.
          </p>
        ) : (
          (open || state.playerEntry || state.clubEntry) && (
            <>
              <PlayerEntryCard
                route={state.route}
                blockedText={
                  state.route === 'needs-account-approval' && state.facts.ageCheck?.consent_status === 'approved'
                    ? NO_APPROVING_PARENT
                    : null
                }
                hasSession={state.hasSession}
                entry={state.playerEntry ? view(state.playerEntry, emailOn) : null}
                open={open}
                parentEmailMasked={state.facts.ageCheck?.parent_email ? maskEmail(state.facts.ageCheck.parent_email) : null}
                noAgeRange={!state.facts.ageBracket}
              />
              {teams && (state.clubEntry || open) && (
                <ClubEntryCard
                  teams={teams.map((t) => ({ id: t.id, name: t.name, ready: t.playersWhoTrained > 0 }))}
                  entry={
                    state.clubEntry
                      ? view(state.clubEntry, emailOn, teams.find((t) => t.id === state.clubEntry?.team_id)?.name ?? null)
                      : null
                  }
                  open={open}
                  defaultClubName={teams.find((t) => t.clubName)?.clubName ?? state.coachClubName ?? ''}
                />
              )}
            </>
          )
        )}

        <section id="rules" aria-labelledby="rules-heading" className="scroll-mt-4 space-y-4 text-sm leading-6 text-zinc-300">
          <div>
            <h2 id="rules-heading" className="text-xl font-black text-white">
              Official rules
            </h2>
            <p className="text-sm text-zinc-500">Last updated: {RULES_UPDATED}</p>
            <p className="mt-2">{RULES_INTRO}</p>
          </div>
          {COMPETITION_RULES.map((section) => (
            <div key={section.heading} className="space-y-2">
              <h3 className="text-base font-bold text-white">{section.heading}</h3>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} fill={fill} />
              ))}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
