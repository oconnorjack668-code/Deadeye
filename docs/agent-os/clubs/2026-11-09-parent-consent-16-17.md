# Parent view for 16 and 17 year olds: wording draft (call c4-consent)

Draft by club-growth with the safety reviewer's checklist, 2026-11-09. **For the founder to edit and approve.**
Nothing here is live and nothing has been sent. Not legal advice: Irish data-protection law needs a
solicitor's read before it ships (see "Needs a decision first").

## The situation in plain words

- Under 16, a parent must approve the account, and that parent sees what coaches post to their child.
- At 16 and over, a player agrees for themselves (Irish digital age of consent is 16). Deadeye asks for
  no parent email, so a parent of a 16 or 17 year old currently sees nothing.
- A DSCO (club Children's Officer) and some parents of a U16 to U18 team will ask: "can the parent see
  what an adult posts to my child?" Today the answer for 16 and 17 is no.
- Backlog item C4 builds a read-only view. This file is the wording it needs.

## Needs a decision first (founder)

1. **Opt-in or by default?** Recommended: **the player chooses** to invite a parent ("Let a parent see
   coach posts"). A parent email entered by the player is the player's choice and the player can remove
   it. Requiring it for every 16 or 17 year old would treat them as under-16s and is the riskiest
   reading under data-protection law. Ask the solicitor.
2. **Is the parent's email verified?** Recommended: yes, the parent confirms by link, same as under 16s,
   so a player cannot send posts to someone else's inbox.
3. **Who stops it?** Recommended: either the player or the parent can switch it off at any time, and it
   ends when the player turns 18.
4. **Does a club need it?** Only if the Blazers (or another club) want a U16 to U18 team. Younger
   teams do not need it.

## Draft 1: what the 16 or 17 year old sees (settings screen)

> **Let a parent see what your coach posts**
> A parent or guardian can get a read-only view of the assignments and answers your coaches post to you.
> They cannot see your training notes, videos or profile, and they cannot message you or your coach.
> You can switch it off any time.
>
> Parent or guardian email: [______]   [Send invite]

Plain note under it: "We email them once to ask if they want this. If they say no, or you remove them, nothing is shared."

## Draft 2: the email to the parent (sent by the app only after the player enters it)

> Subject: [Name] would like you to see their Deadeye coach posts
>
> Hello,
>
> [Name], who is 16 or 17, uses Deadeye, a basketball training app. They asked us to let you see what
> their team coaches post to them, such as weekly training tasks. It is read-only.
>
> What you would see: assignments and answers from coaches to [Name], by coach first name.
> What you would not see: [Name]'s training notes, videos, profile or friends. Coaches cannot message
> players privately; posts go to the whole team.
> What we keep: your email address and the time you said yes, only for this.
> You can stop it at any time using the link in this email, or [Name] can. It ends when they turn 18.
> Deadeye has no ads and does not sell data. Details: [privacy policy link].
>
> [Yes, show me coach posts]   [No thanks]
>
> If you did not expect this email, ignore it: nothing is shared unless you press Yes.

## Draft 3: parent page heading (read-only view)

> **What [Name]'s coaches post.** [Name] chose to share this with you. You can stop at any time
> [Stop sharing]. It ends on [Name]'s 18th birthday.

## Safety reviewer checklist (run before any code)

- [ ] Player-chosen and revocable by both sides; nothing is sent to a parent before the player enters the email and the parent says yes.
- [ ] Parent email stored only for this, deleted when sharing stops or the player turns 18 or deletes the account.
- [ ] Parent sees coach posts only: no profile, notes, video, friends or other players.
- [ ] No marketing to the parent email, ever.
- [ ] Privacy policy and the data-protection impact assessment (`docs/legal/dpia.md`, risk R4) updated in the same change; solicitor has read the opt-in wording.
- [ ] Wording stays plain, no pressure on the player to invite a parent.
- [ ] Club messaging says exactly this: "16 and 17 year olds can invite a parent to see coach posts", never "parents of all players see posts".

## If approved

Next step is the builder doing backlog item C4 under these words; that is code, so it will come back
as a pull request for you to approve. Until then, tell any club the true position: parents of players
under 16 see coach posts; for 16 and 17 it is the player's choice and is not built yet.
