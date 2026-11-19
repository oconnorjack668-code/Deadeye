// src/lib/competitionRules.ts
// The founding competition rules as shown on /competition, taken from
// docs/sales/founding-competition-rules.md (without the founder-only checklist
// at its top). Change both together: the doc is what the founder and their
// parent sign off, this is what entrants read.
//
// Text is plain with two marks the page renders: **bold** and [label](/path).
// Links are paths, never a full address, so the page works on any domain.
// {operator} and {email} are filled in by the page from the environment
// (src/lib/legal.ts), like the privacy policy.

export type RulesBlock = { p: string } | { ul: string[] } | { ol: string[] };
export type RulesSection = { heading: string; blocks: RulesBlock[] };

export const RULES_UPDATED = '18 November 2026';

export const RULES_INTRO = 'Free to enter. No purchase needed. Nobody pays anything to enter, to win or to claim a prize.';

/** How long the entry list is kept after the offer closes (rules section 10). */
export const DELETE_PERIOD = '6 months';

export const COMPETITION_RULES: RulesSection[] = [
  {
    heading: '1. Who runs it',
    blocks: [
      {
        p: 'Deadeye (the "promoter"), operated by {operator}. Questions: {email}. Clubs can read more on [the page for clubs](/clubs).',
      },
    ],
  },
  {
    heading: '2. Who can enter',
    blocks: [
      {
        ul: [
          '**Players:** anyone aged 13 or over who lives in the Republic of Ireland. Deadeye is for players aged 13 and over. Under-16s already need a parent or guardian to approve their account in the app. Anyone under 18 also needs a parent or guardian’s permission to enter this competition (see section 9).',
          '**Clubs:** a basketball club, school or academy based in the Republic of Ireland, entered by one of its coaches (18 or over) who has the club’s permission to enter. One entry per club.',
          '**Not eligible:** the promoter, their family, and anyone who helps run or judge the competition.',
        ],
      },
    ],
  },
  {
    heading: '3. How to enter as a player',
    blocks: [
      { p: 'All three steps, by the closing time in section 5:' },
      {
        ol: [
          'Create a free Deadeye account.',
          'Log at least one training session in the app.',
          'Open the competition page (this page), press **Enter**, tell us one thing you liked and one thing you would change, and agree to these rules.',
        ],
      },
      { p: 'If you are under 18, your entry counts once your parent or guardian approves it (section 9).' },
      {
        p: 'Your feedback can be honest, good or bad. It does not have to be positive. We do not ask you to post a review anywhere. One entry per person.',
      },
    ],
  },
  {
    heading: '4. How to enter as a club',
    blocks: [
      { p: 'All three steps, by the closing time in section 5:' },
      {
        ol: [
          'A coach (18 or over) sets up on Coach Free with at least one team. Head coaches confirm their Garda vetting in the app.',
          'At least one player on that team logs a training session.',
          'The coach opens the competition page, chooses **Enter my club**, picks the team, and sends the club’s feedback.',
        ],
      },
      {
        p: 'The coach confirms the club (for example its committee or Children’s Officer) knows about the entry. One entry per club. Players on the team can also enter as players if they meet section 2.',
      },
    ],
  },
  {
    heading: '5. Closing time',
    blocks: [{ p: '23:59 Irish time on 31 December 2026. Anything not complete by then does not count.' }],
  },
  {
    heading: '6. Prizes',
    blocks: [
      {
        ul: [
          '**10 players** each win **Deadeye Pro for life**: Pro for as long as Deadeye offers a Pro plan. If Pro is replaced by a similar paid plan, the winner gets that. If Deadeye closes, the prize ends. Pro costs EUR 49.99 a year. Not transferable. No cash or other alternative.',
          '**1 club** wins **one year of the Club plan free**: up to 8 teams, worth EUR 899. It starts when the club accepts it. Not transferable. No cash alternative.',
        ],
      },
      { p: 'The promoter may swap a prize for one of equal or greater value only if it cannot be provided as described.' },
    ],
  },
  {
    heading: '7. How winners are chosen',
    blocks: [
      {
        p: 'This is a competition of skill, not a draw. Winners are the entries whose feedback is most useful for making Deadeye better, judged by 15 January 2027 on:',
      },
      {
        ul: [
          'how specific it is (what happened, where in the app, what you expected);',
          'how much it would help other players or coaches if we acted on it;',
          'whether it is honest. Critical feedback scores as well as praise.',
        ],
      },
      {
        p: 'Two adults judge: the promoter and one other adult who is not entering. Names are hidden while judging. Players and clubs are judged separately. The promoter checks each winner’s entry is valid before confirming them. If a winner is not valid or cannot be reached within 14 days, the next best entry wins.',
      },
      {
        p: 'Before confirming a winner under 18, the promoter speaks to their parent or guardian by phone or in person. Adult winners confirm they are 18 or over.',
      },
      { p: 'The judges’ decision is final.' },
    ],
  },
  {
    heading: '8. What everyone else gets',
    blocks: [
      {
        p: 'Everyone who enters, and does not win, gets **25% off their first year**. This is not a prize, and nobody has to claim anything to get it.',
      },
      {
        ul: [
          '**Players:** 25% off Pro yearly (EUR 49.99 becomes EUR 37.49 for the first year).',
          '**Clubs:** 25% off the first year of a Team Pass (EUR 179) or the Club plan (EUR 899).',
          'Valid until 31 March 2027. We email each adult entrant how to take it up, and for a player under 18, the parent or guardian who approved the entry.',
          'It does not stack with the founding member or founding club price. Each entrant gets whichever is better for them.',
          'Nobody has to buy. A player under 18 needs a parent or guardian to make any purchase.',
        ],
      },
    ],
  },
  {
    heading: '9. Under-18s',
    blocks: [
      {
        ul: [
          'Players under 18 need a parent or guardian’s permission to enter. When they enter, we email their parent or guardian a link to approve or decline the entry. The entry only counts once it is approved.',
          'For under-16s we email the parent or guardian who approved their Deadeye account. For 16 and 17 year olds, the player gives a parent or guardian’s email when entering (not their own).',
          'A winner under 18 is contacted through their parent or guardian, not directly.',
          'A winner’s name is published only with permission, and never a child’s full name or photo. A first name or "a Wexford player" is the most we would use for a child.',
          'Nothing about the competition changes how Deadeye protects children: coaches cannot message a player privately, and coaches see only what the coach screens show.',
        ],
      },
    ],
  },
  {
    heading: '10. Your data',
    blocks: [
      {
        ul: [
          'Your feedback is used to improve the app. It is read by the two judges (the promoter and one other adult), with names hidden.',
          'Entry details come from your Deadeye account and your feedback. They are handled under the [privacy notice](/privacy). Nothing is sold and nothing is shared for advertising.',
          `The entry list is used to judge the competition, to contact winners and to send the section 8 offer. It is deleted ${DELETE_PERIOD} after the offer closes.`,
          'You can ask to see or delete your data any time (email above, or delete your account in the app).',
        ],
      },
    ],
  },
  {
    heading: '11. What disqualifies an entry',
    blocks: [
      {
        ul: [
          'Missing a step, or finishing after the closing time.',
          'More than one entry per person or per club, or using other people’s accounts.',
          'A fake account, or a session or feedback made up just to enter.',
          'A coach under 18, or a club entry without the club’s permission.',
          'An under-18 entry without a parent or guardian’s permission.',
          'Abusive or harmful feedback.',
        ],
      },
    ],
  },
  {
    heading: '12. Other',
    blocks: [
      {
        ul: [
          'The promoter may change or end the competition if something outside its control means it cannot run fairly. If so, it will say so on the page for clubs and email entrants.',
          'These rules are governed by Irish law.',
          'Winners’ names (with permission) will be shared on the competition page after judging.',
        ],
      },
    ],
  },
];
