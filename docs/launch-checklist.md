# Deadeye launch checklist (Ireland and the EU)

Written 16 October 2026. Nothing here has been bought or switched on yet; the
code is ready for each step.

## Domains

| Domain | Use | Status when checked (16 Oct 2026) |
|---|---|---|
| `deadeye.ie` | Main address | Available (checked with the .ie registry) |
| `deadeyebasketball.com` | Redirects to `deadeye.ie` | Available |

- A `.ie` needs an address in Ireland. Register both in the name of the adult
  who holds the other accounts (below).
- Rough prices: `.ie` about €7 the first year, then €22–40/yr depending on the
  registrar. `.com` about $10.50/yr at Cloudflare.

## Who holds what until the founder is 18

The founder is 16. Google Play needs an account holder aged 18 or over, Stripe
needs a parent or guardian as the legal representative of anyone under 18,
and Irish company directors must be 18. Until then, a parent holds these accounts
in their own name, with their own ID and card:

- Google Play developer account ($25 once)
- Stripe (the parent is the "representative")
- Domain registrations
- Vercel Pro and Supabase Pro, once paid plans are needed

Their name and postal address go in `LEGAL_NAME` and `LEGAL_ADDRESS` in Vercel.
The privacy policy and terms show them (`src/lib/legal.ts`). Change those two
values when the founder turns 18 and the accounts move over.

## Moving to the new domain

1. Buy both domains.
2. Vercel → Settings → Domains: add `deadeye.ie`, `www.deadeye.ie` and
   `deadeyebasketball.com`. Make `deadeye.ie` primary and redirect the others
   to it. The live address is `deadeye-deadeyeapp.vercel.app`; the older `deadeye-hoop-iq` and `hoopiq-hoop-iq` addresses stopped updating when the Vercel team was renamed. Create the DNS records Vercel shows at
   the registrar. HTTPS is automatic.
3. Supabase → Authentication → URL Configuration: Site URL
   `https://deadeye.ie`, and add it to the redirect URLs. **Skip this and
   password-reset and sign-up emails link to the old address.**
4. Email: create a Resend account, verify `deadeye.ie` (it gives DNS records),
   then set `RESEND_API_KEY` and `EMAIL_FROM` (`Deadeye <no-reply@deadeye.ie>`)
   in Vercel. Also add Resend as custom SMTP in Supabase → Authentication →
   Emails, so sign-in mail comes from the same domain. The free tier covers
   a launch.
5. Set `SUPPORT_EMAIL` to an address at `deadeye.ie`.
6. Stripe: webhook endpoint `https://deadeye.ie/api/webhooks/stripe`, and the
   business website in account settings. Checkout already uses whatever domain
   the request came in on.
7. Then, and only then, build the Play app (`docs/play-store/README.md`). It is
   tied to one web address.

Existing users lose what the browser stored under the old address: drafts,
saved rims, sound choices, and push reminders (turn them back on). Anything
saved offline should be synced before the switch. The `hoopiq-` storage keys in
the code are internal names, not branding; leave them, or every player loses
that data again.

## Before launch

- [x] `LEGAL_NAME` and `LEGAL_ADDRESS` set (18 October 2026). Add the town, county and Eircode to the address.
- [ ] Set `SUPPORT_EMAIL` to an address at `deadeye.ie` once the domain is bought.
- [ ] Set up email (step 4 above). Until then, parents approve straight from the
      link with no email check, which is weaker. Approvals made that way are
      marked `approval_method = 'link'` in `age_checks`, so they can be found and
      asked to confirm by email once it works.
- [x] Supabase is in `eu-west-1` (Ireland), so `vercel.json` sets
      `"regions": ["dub1"]` and the server runs in Dublin next to the database.
      Before that it ran in Vercel's default, Washington DC, and every query
      crossed the Atlantic and back.
- [x] Run `00036_parent_approval.sql` (done 18 October 2026).
- [ ] Vercel Pro ($20/month) before taking real payments. The free plan is for
      non-commercial use only.
- [ ] Supabase Pro ($25/month) is recommended once there are real users: no
      pausing after a quiet week, and daily backups.
- [ ] Stripe: live mode, Pro priced in EUR.
- [ ] Register as a sole trader with Revenue (free), and the business name
      "Deadeye" with the CRO (about €20 online) - in the parent's name until 18.
- [ ] Search "Deadeye" on TMview (free) for trademark conflicts before
      spending on branding.

## Tax, once money comes in

- No Irish VAT registration needed until about €42,500 a year of sales.
- Once sales to consumers in *other* EU countries pass €10,000 a year, VAT is
  due at each customer's own rate, filed quarterly through the One-Stop Shop
  (OSS) on ROS. Stripe Tax tracks the threshold for free.
- Sales through Google Play billing: Google handles the VAT.

## What the code already does for EU law

- **Under-16s** (Irish digital age of consent is 16): sign-up asks the age;
  13–15 year olds are locked out until a parent approves from a link
  (`supabase/migrations/00036_parent_approval.sql` explains the design).
  Unapproved accounts are deleted after 30 days.
- **14-day withdrawal** (required from 19 June 2026): a "Withdraw from contract"
  button on the Pro page for 14 days after buying, with a full refund and an
  email receipt (`src/lib/withdrawal.ts`).
- **Privacy policy**: names who runs Deadeye, the legal basis for each use,
  how long data is kept, and the AI company actually configured
  (`aiProviderCompany()`), so it cannot drift from where the data goes.
- **Cookies**: only the login cookie, so no cookie banner is needed. Adding
  analytics would change that.
