# Deadeye on Google Play — launch kit

Everything needed to publish **Deadeye AI Basketball Trainer** on Google Play as a Trusted Web Activity
(the website wrapped as an Android app with PWABuilder). Updates to the website appear in the app
automatically — you only rebuild the app for icon/name/package changes.

Files in this folder:
- `feature-graphic-1024x500.png` — the Play Store feature graphic (required)
- App icon for the store: `public/icon-store-1024.png` (Play wants 512×512 — PWABuilder/Play resize it, or use `public/icon-play-512.png`)

---

## 1. Store listing (copy/paste)

**App name** (max 30): `Deadeye AI Basketball Trainer`

**Short description** (max 80):
`Track every shot, check your shooting form with AI and train like the pros.`

**Full description** (max 4000):

```
Deadeye is the all-in-one basketball trainer for players who want to get better every day.

🏀 TRACK EVERY SHOT
• Tap the court to log makes and misses from every zone
• Automatic shot tracking from video: point your phone at the hoop and Deadeye counts makes, misses and your %
• Shot charts, hot and cold zones, timed shooting challenges and streaks

🎥 AI FORM CHECK
• Film your jumper and see a skeleton overlay of your shot
• Knee bend, elbow angle, release angle, release time, jump height and landing balance
• Video analysis runs on your phone — your videos never leave your device

🤖 AI COACH
• Personal feedback on your sessions: what went well, what to fix, what to do next
• Choose whether the AI looks at your shooting numbers, your mechanics or both

⭐ NBA PLAY STYLE MATCH
• Find out which NBA players your game looks like, adjusted for your height
• Learn their signature moves with drills to copy them

💪 TRAIN WITH A PLAN
• Training programmes for shooting, handles, finishing, athleticism and more (3 free, every one with Pro)
• 150 basketball drills with instructions
• Gym logger organised by muscle group with 160+ exercises, rest timer, previous sets and personal records
• Athletic tests: vertical jump, sprint, agility

🧠 BASKETBALL IQ
• Study sections on offence, defence, reads and rules with quizzes
• Guides on nutrition, recovery, mindset and more

🏆 STAY MOTIVATED
• Weekly challenges, badges and XP ranks from Rookie to GOAT
• Goals, streaks, leaderboard and training reminders
• Works offline in the gym: sessions upload when you're back online

For players aged 13+ (players under 16 need a parent or guardian to approve their account). Deadeye is free to start. Deadeye Pro adds unlimited AI coaching, every training programme and Basketball IQ section, your all-time shot chart and form trends, and team coaching.
```

**Category:** Sports  **Tags:** Basketball, Fitness, Training
**Contact email:** your support email  **Website:** `https://deadeye.ie`
**Privacy policy URL:** `https://deadeye.ie/privacy`

**Screenshots** (phone, 2–8 images, portrait): take them on your phone from the live app. Suggested order:
1. Dashboard (with the Today card and rank)
2. Shot tracker court with a few shots logged
3. Video → Form check with the skeleton overlay
4. AI Coach report
5. Programs list
6. NBA Style Match results
7. IQ Study quiz
8. Achievements / badges

---

## 2. App content answers (Play Console → Policy → App content)

| Question | Answer |
|---|---|
| Privacy policy | `https://deadeye.ie/privacy` |
| Ads | **No**, the app has no ads |
| App access | "All or some functionality is restricted" → give a **test login** (create a spare account, e.g. reviewer@…, with some sessions logged) |
| Target audience | **13–15, 16–17, 18+** (do **not** tick under 13). Under-16s cannot use the app until a parent approves the account from a link the player sends them |
| Content rating | Category **Reference/Utility/Sports**; no violence, sex, drugs, gambling. Users interact? **Yes** — players can add friends by code (requests must be accepted) and see each other's display names, training totals and badges. Coaches can create teams that players join by code (roster shows training totals and game averages; coaches post assignments). There is **no chat or messaging between players** and no user photos/videos are shared. Players can remove friends at any time |
| News app | No |
| Health apps | Tick **"Fitness"** only; not a medical device |
| Financial features | None |
| Government app | No |
| Account deletion | Yes → URL `https://deadeye.ie/account-deletion` |

### Data safety form

**Does your app collect or share user data?** Yes, collects. **Shared with third parties?** No
(Supabase, Vercel, the AI provider (Anthropic or OpenAI), Stripe and Resend are *service providers* processing on your behalf — Google does not count that as sharing.)
**Encrypted in transit?** Yes. **Can users request deletion?** Yes.

| Data type | Collected | Optional? | Purpose |
|---|---|---|---|
| Personal info → Email address | Yes | Required | Account management |
| Personal info → Name (display name) | Yes | Required | App functionality, account management |
| Personal info → User IDs | Yes | Required | Account management |
| Health & fitness → Fitness info | Yes | Required | App functionality, personalisation |
| Photos & videos → Videos | Yes | Optional (only if the player uploads) | App functionality |
| App activity → Other user-generated content (notes, AI Coach chat messages) | Yes | Optional | App functionality |
| App activity → Other actions (friends list) | Yes | Optional | App functionality, social features |
| Personal info → Name and Email address of a parent or guardian (players under 16 only) | Yes | Optional (under-16s only) | Account management (parent approval) |
| App info & performance → Crash logs | Yes | Required | Analytics (fixing bugs) |
| Financial info → Purchase history | Yes | Optional (Pro only) | App functionality |
| Personal info → Other info (country, county/region, time zone you choose) | Yes | Optional | App functionality (regional leaderboards, reminders) |

Processed ephemerally? No. Location, contacts, messages, audio, files: **not collected**.

---

## 3. Build the Android app with PWABuilder

1. **Do this only after `deadeye.ie` is live.** The app is tied to one web address through `assetlinks.json`; building it on `vercel.app` means rebuilding and resubmitting after the move. Wait for Vercel to finish deploying.
2. Go to **https://www.pwabuilder.com**, paste `https://deadeye.ie`, click **Start**.
3. Click **Package for stores → Android → Generate package** and open **All settings**:
   - **Package ID:** pick one and never change it, e.g. `ie.deadeye.app`
   - **App name:** `Deadeye AI Basketball Trainer` · **Launcher name:** `Deadeye`
   - **Start URL:** `/dashboard?app=play` (lets Deadeye know it's the Play app, so Pro checkout is hidden — Google requires Play Billing for in-app subscriptions)
   - **Theme / background colour:** `#09090b` · **Status bar:** `#09090b`
   - **Signing key:** *Create new* — fill in your name and "Ireland"
4. Download the zip. **Keep `signing.keystore` and `signing-key-info.txt` safe forever** (back them up to Google Drive). Without them you can never update the app.
5. The zip contains `assetlinks.json`. Open it and copy the `sha256_cert_fingerprints` value.

## 4. Connect the app to the website (removes the browser bar)

In **Vercel → Settings → Environment Variables** add:
- `ANDROID_PACKAGE_NAME` = your Package ID (e.g. `ie.deadeye.app`)
- `ANDROID_SHA256_FINGERPRINTS` = the fingerprint from step 3.5

After you upload to Play (next step), go to **Play Console → Test and release → Setup → App signing**, copy the
**App signing key certificate SHA-256** and add it to `ANDROID_SHA256_FINGERPRINTS` with a comma:
`AA:BB:...,CC:DD:...`. Redeploy. Check `https://deadeye.ie/.well-known/assetlinks.json` shows both.

## 5. Publish on Google Play

1. Create a developer account at **https://play.google.com/console** ($25 once, ID verification — use a *personal* account).
   **The account holder must be 18 or over**, so it is created by a parent, in their name, with their ID and card. Google asks every developer selling in the EU whether they are a "trader"; a trader's name, address, phone and email are shown on the store listing. The same details go in `LEGAL_NAME` / `LEGAL_ADDRESS` in Vercel, so the privacy policy and terms match.
2. **Create app** → name `Deadeye AI Basketball Trainer`, App, Free, accept declarations.
3. Fill in **Store listing** (section 1) and **App content** (section 2).
4. **Testing → Closed testing → Create track**, upload the `.aab` from the PWABuilder zip, add testers by email.
   **New personal accounts must run a closed test with at least 12 testers for 14 days in a row** before
   production access is unlocked — ask teammates, friends and family to join and keep the app installed.
5. After 14 days: **Apply for production** → answer the questions → roll out to production.

## Checklist before you submit
- [ ] Migrations run in Supabase (including `00036_parent_approval.sql`)
- [ ] `deadeye.ie` live, `deadeyebasketball.com` redirecting to it (see `docs/launch-checklist.md`)
- [ ] `LEGAL_NAME`, `LEGAL_ADDRESS`, `RESEND_API_KEY` and `EMAIL_FROM` set in Vercel
- [ ] `SUPPORT_EMAIL` set in Vercel (shows on Privacy, Terms and Account deletion pages)
- [ ] `/privacy`, `/terms`, `/account-deletion` open without logging in
- [ ] Test login created for Google's reviewers
- [ ] `assetlinks.json` shows your package and fingerprints
