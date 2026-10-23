# Deadeye design rules

How Deadeye looks, written down so every agent builds new screens the same way. Read it before
adding or changing UI. It describes the app as it is (taken from the code, 23 Oct 2026), so
follow the existing primitives before inventing new ones.

## The look

Dark only, quiet zinc surfaces, one orange for what to do next, heavy type for the numbers that
matter. A training tool, not a SaaS landing page.

## Building blocks

Use `src/components/ui/` first: `Button`, `Card`, `Badge`, `Alert`, `Input`, `Select`.

| Thing | Use |
| --- | --- |
| Page background | `--background` (#09090b, zinc-950). Set in `globals.css`. |
| Card | `rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4` (or `<Card>`) |
| Inner row, list item, small tile | `rounded-xl`, `bg-zinc-950/60` or `bg-zinc-900`, `p-3` |
| Pills, avatars, dots | `rounded-full` |
| Primary button | `<Button>` (orange-600, `rounded-xl`, `h-11`, the 44px touch target) |
| Secondary action | `<Button variant="secondary">` or `outline`; plain text links for the least important |
| Font | Geist sans (body), Geist mono only for code-like values |
| Icons | `lucide-react` only, `h-4 w-4` inline or `h-5 w-5` in buttons |

## Type

- Page title: `text-xl md:text-3xl font-black tracking-tight text-white`.
- Big numbers (makes, streak, XP): `font-black tabular-nums`.
- Section label: `text-xs font-semibold uppercase tracking-wider text-zinc-400`.
- Body: `text-sm text-zinc-300`. Secondary: `text-xs text-zinc-500`.
- No serif fonts. No gradient text.

## Colour means something

Keep each colour to its job, so a player can read a screen at a glance from the three-point line.

| Colour | Means | Examples |
| --- | --- | --- |
| Orange (`orange-500/600`, text `orange-300/400`) | The action to take, the brand | Primary buttons, "Today" card, focus rings |
| Red (`red-400`) | Brand mark and misses, errors | "Aim is earned" label, a missed shot, `Alert` error |
| Emerald (`emerald-400/600`) | Made, saved, done | A make, "Saved", success badges |
| Amber (`amber-400/500`) | Needs attention soon | Streak at risk, "check this one", heavy workload |
| Cyan (`cyan-400`) | Neutral information | Workload note icon |
| Zinc | Everything else | Surfaces, borders, body text |

Roughly 70% zinc, 20% supporting colour, 10% orange. If a screen looks orange all over, it has
lost its one call to action.

## Spacing

- Mobile first. Design at phone width, then add `sm:`/`md:`. No horizontal scroll.
- Inside a card: `p-4`; between rows `space-y-2` or `space-y-3`.
- Between cards in a page stack: **every card gets a gap below it.** On the dashboard each card
  owns `mb-4` (sections end with `mb-8`). A component dropped into that stack must carry its own
  `mb-4`; the "Pick your club" card did not, and sat flush on the box below (fixed 23 Oct). On a
  new page, prefer `space-y-4` on the parent so the gap cannot be forgotten.
- Touch targets at least 44px high (`h-11`) for anything tapped at a court.

## Motion

Short and for a reason: a shot call (`.deadeye-flash`), a level-up (`.deadeye-pop`), press
feedback (`active:scale-[0.98]`). 150-300ms for interface transitions. No entrance animations on
content, no combined hover transforms. Respect `prefers-reduced-motion`.

## Avoid (the AI-slop list)

Adapted from the community Unslop UI skill, trimmed to what applies here.

- **Icons in coloured rounded squares** as decoration. The app has a few (such as "Pick your
  club"); don't add more. Put the icon inline, or leave it out if it says nothing.
- **Emoji as UI.** Not in headings, cards or feature lists. Fine in user posts and in marketing
  captions.
- **Glassmorphism**: blur plus translucent card plus light border over a gradient. `Card` keeps a
  light `backdrop-blur-sm`; don't stack more blur on top.
- **Gradients everywhere.** One highlighted card per screen may use
  `bg-gradient-to-br from-orange-600/15 to-transparent` (the "Today" card pattern). Never on
  buttons or text.
- **Glowing coloured shadows.** Buttons keep their faint `shadow-*-950/20`; nothing stronger.
- **Cards inside cards.** Use type size, weight and colour for hierarchy, not another box.
- **Purple-to-blue, Inter, three identical cards in a row.** The generic SaaS look.
- **Claims the tracker can't back.** Copy says "counts your makes and misses", not "every"
  (see `docs/agent-os/marketing/2026-10-23-first-promo.md`).

## Before you ship a screen

- [ ] Checked at phone width (Playwright screenshot or a real phone)
- [ ] One obvious next action, in orange
- [ ] Colours match the table above
- [ ] Every card in a stack has a gap below it
- [ ] No new icon tiles, emoji, glow, gradient text or nested cards
- [ ] Works with `prefers-reduced-motion`
