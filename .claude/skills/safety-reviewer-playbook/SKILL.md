---
name: safety-reviewer-playbook
description: How a professional child-safety and data-protection reviewer works, written for Deadeye - the standards, the review method, the tools and the quality bar. Loaded by the safety-reviewer agent; use it for any review of a Deadeye branch, video or plan that touches under-18 players or personal data.
---

# Safety reviewer playbook

A professional privacy and child-safety reviewer does three things an amateur
does not: works from named standards rather than a feeling, traces every new
piece of data from where it is collected to where it is deleted, and writes
findings a developer can fix without asking a question. The rules and
permissions in `.claude/agents/safety-reviewer.md` win over this file.
Gold-standard reviews to aim at: `examples.md` in this folder.

## The standards you review against

Name the standard in every finding (`DPC F7`, `GDPR Art 25`, `ASVS V8`).

| Standard | What it covers for Deadeye | Status |
| --- | --- | --- |
| GDPR (EU 2016/679): Art 5 principles, Art 8 child consent, Art 12 plain language, Art 17 erasure, Art 20 portability, Art 25 data protection by design and default, Art 35 DPIA | Every new field, event, screen and processor | law |
| Data Protection Act 2018 (Ireland) s31 | Digital age of consent is 16: under-16s need a parent's consent where consent is the lawful basis | law |
| DPC "Fundamentals for a Child-Oriented Approach to Data Processing" (Dec 2021), 14 Fundamentals | The Irish regulator's yardstick for services children use; a child is anyone under 18 | regulator |
| ICO Age Appropriate Design Code (UK), 15 standards: best interests, DPIA, age-appropriate application, transparency, detrimental use, policies, default settings, data minimisation, data sharing, geolocation, parental controls, profiling, nudge techniques, connected devices, online tools | The most detailed benchmark; applies to UK players and is the model the DPC follows | benchmark (law in the UK) |
| EU Digital Services Act Art 28 and the Commission's 2025 guidelines on protecting minors | Online platforms accessible to minors: privacy, safety and security by default, no profiling-based ads to minors | law, check whether Deadeye is in scope |
| OWASP ASVS (v5.0) and OWASP Top 10 | Access control, input handling, secrets, logging | benchmark |
| ASAI Code (Ireland), the children section | Any promo or upsell copy a child sees | regulator (self-regulatory) |
| Children First Act 2015 and Basketball Ireland safeguarding policy | Coach and club features: no private adult-to-child channels | law and governing body |

Your findings file (`docs/agent-os/knowledge/findings/safety-reviewer.md`)
holds the detail and sources. Re-check a standard there before you cite it.

## Method

1. **Scope.** `git diff origin/main...<branch> --stat`, then the full diff.
   List every changed file. Mark each as `data` (collects, stores, sends or
   shows personal data), `surface` (something another person sees),
   `message` (text sent to a player or parent), `access` (routes, RLS,
   auth), `copy` (marketing or upsell) or `none`.
2. **Data map.** For every new or changed piece of personal data, fill one
   row: what it is, who it is about, why it is needed, lawful basis, where it
   is stored (table and column), who can read it (RLS policy), where it is
   sent (processor, AI provider), whether the export includes it
   (`src/app/api/account/export`), whether deletion removes it
   (`src/lib/accountDeletion.ts`), and how long it is kept. A blank cell is a
   finding.
3. **Defaults and age.** For each `surface` and `message`: what does a
   13-year-old see by default, what does a 16-year-old see, and what changes
   with parent approval (`src/lib/parentApproval.ts`)? Default must be the
   most private setting (GDPR Art 25(2), DPC, ICO standard 7).
4. **Access.** For each `access` file: is the user checked server-side
   (`src/lib/auth.ts`), does every new table have RLS enabled with a policy
   per operation, and can a user read or change another user's row by
   changing an id? Check the migration SQL itself, not only the TypeScript.
5. **Nudges and copy.** Read every new string a player sees as a 13-year-old
   would. Flag guilt, fake urgency, streak-loss pressure, pester power and
   anything that makes the private option harder to pick (ICO standard 13).
6. **Rules and checklist.** Apply the rules in the agent file and the
   checklist in your knowledge file to every file marked other than `none`.
7. **Severity.** `BLOCK` for anything that breaks law, a DPC Fundamental, the
   parent gate, RLS, or the deletion and export promises. `FIX SOON` for a
   benchmark miss that is not a legal breach. `NOTE` for good practice.
   Only `BLOCK` stops a merge.
8. **Write the verdict** in the backlog item's Safety line: `PASS` or
   `BLOCK`, then each finding as `file:line - what is wrong - standard - the
   fix`, then the data map. A developer must be able to fix each finding
   without asking you anything.

## Trade tools

- **Supabase security advisors** (`mcp__supabase__get_advisors`, type
  `security`): lists tables without RLS, exposed functions and weak
  policies. It returns names and settings, never rows. Run it when a branch
  adds a migration, in a session where the Supabase connection works; quote
  only advisor findings that touch the branch. It is the only Supabase tool
  you may use.
- **security-review skill**: run it on the diff for access and secrets.
- **Chrome** is not yours; release-checker looks at the live preview.

If a tool is not connected, say so in the review and do the check by reading
the code instead.

## Quality bar

- Every finding has a file and line, a standard, and a fix.
- Every new piece of personal data has a full data-map row.
- You say what you did not check and why (for example, "migration not run,
  RLS read from SQL only").
- No false alarms dressed as blocks: if it is not a breach, it is `FIX SOON`.
- Plain words. The founder reads this without a solicitor.

## Common mistakes

- Reviewing the TypeScript and missing that the migration has no RLS policy.
- Checking the default for adults and not for a 13-year-old.
- Missing that a new event or log line carries free text or a user id.
- Forgetting the export and deletion paths for a new table.
- Treating "the player can turn it off" as a privacy default.
