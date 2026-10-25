# Deadeye - Vercel Deployment Guide

**Target**: Deploy Deadeye to production via Vercel  
**Time**: ~10-15 minutes  
**Requirements**: GitHub account, Vercel account, environment variables

---

## Step 1: Prepare Git Repository

### 1.1 Initialize Git (if not already done)
```bash
cd /c/Users/Vivobook\ S16/Documents/hoopiq
git init
git add .
git commit -m "chore: initial Deadeye implementation

- Complete basketball player development platform
- Next.js 16 + Supabase + TypeScript
- Authentication, session tracking, AI coaching
- Study module, leaderboard, video uploads
- PWA with offline support"
```

### 1.2 Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `hoopiq`
3. Description: "Basketball player development operating system"
4. Public or Private (your choice)
5. Click "Create repository"

### 1.3 Connect Local to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/hoopiq.git
git branch -M main
git push -u origin main
```

**Verify**: Check https://github.com/YOUR_USERNAME/hoopiq to confirm code is pushed

---

## Step 2: Set Up Vercel Project

### 2.1 Create Vercel Account
1. Visit https://vercel.com
2. Click "Sign Up"
3. Choose "GitHub" to sign up with GitHub account
4. Authorize Vercel to access your GitHub

### 2.2 Import Project
1. Go to https://vercel.com/new
2. Select "Continue with GitHub"
3. Search for `hoopiq` repository
4. Click "Import"

### 2.3 Configure Project
**Project Name**: `hoopiq` (or your preferred name)
**Framework Preset**: Next.js (auto-detected)
**Root Directory**: `./` (default)

---

## Step 3: Set Environment Variables

### 3.1 In Vercel Dashboard
1. After importing, go to "Environment Variables" section
2. Add the following variables:

| Variable | Value | Type |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[project].supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Secret |
| `OPENAI_API_KEY` | Your OpenAI API key | Secret |
| `OWNER_EMAIL` | Your admin email | Secret |
| `AI_PROVIDER` | `openai` | Public |
| `AI_MODEL` | `gpt-4-turbo` | Public |

### 3.2 Get Values From:

**Supabase Keys**:
1. https://app.supabase.com → Your Project
2. Settings → API
3. Copy `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
4. Copy `anon public key` (NEXT_PUBLIC_SUPABASE_ANON_KEY)
5. Copy `service_role key` (SUPABASE_SERVICE_ROLE_KEY)

**OpenAI Key**:
1. https://platform.openai.com/api-keys
2. Create new API key
3. Copy and paste as `OPENAI_API_KEY`

**Owner Email**:
- Use your email address (admin account)

### 3.3 Add Variables
Click "Add New" for each variable and fill in the values.

---

## Step 4: Deploy

### 4.1 Start Deployment
1. Click "Deploy" button in Vercel dashboard
2. Vercel starts building:
   - Installs dependencies
   - Runs `npm run build`
   - Optimizes assets
   - Deploys to CDN

**Expected time**: 2-5 minutes

### 4.2 Monitor Build
- Watch the build progress in Vercel dashboard
- Check for any build errors
- Logs are available in real-time

### 4.3 Deployment Complete
Once complete, you'll see:
- ✅ Build successful
- ✅ Deployment complete
- 🌐 Production URL: `https://deadeyeapp.vercel.app` (and your custom domain, once you have one: `deadeye.ie` is not bought yet)

---

## Step 5: Database Setup

### 5.1 Run Migrations
1. Go to https://app.supabase.com → Your Project
2. SQL Editor → New Query
3. Copy & paste each migration file in order:
   - `supabase/migrations/00001_profiles_and_auth.sql`
   - `00002_training_and_basketball.sql`
   - `00003_workouts_and_testing.sql`
   - `00004_goals_and_ai.sql`
   - `00005_study_and_leaderboard.sql`
   - `00006_video_foundation.sql`

**Run**: Click "Run" for each migration

### 5.2 Verify Migrations
- Check "Database" → "Tables"
- Should see 25 tables created
- RLS policies should be active

---

## Step 6: Test Production Site

### 6.1 Visit Your Site
```
https://deadeyeapp.vercel.app
```

### 6.2 Test Core Flows

**1. Sign Up**
- Click "Create an account"
- Enter email: `test@example.com`
- Enter password: `SecurePassword123!`
- Check email for verification link
- Click link to verify

**2. Onboarding**
- Complete 3-step wizard (bio → level → goals)
- Should redirect to dashboard

**3. Log Basketball Session**
- Dashboard → "Log Basketball Session"
- Fill in session details
- Add 2 drills
- Log 20 makes / 30 attempts
- Save

**4. Check AI Coach**
- Dashboard → "Get AI Coaching"
- Should show AI-generated insights (if OpenAI API works)
- Should deduct credits from subscription

**5. Study Module**
- Navigation → "Study"
- Click first topic (Pick & Roll)
- Read content
- Take quiz
- Should see score

**6. Leaderboard**
- Navigation → "Leaderboard"
- Should see your rank and points

---

## Step 7: Configure Custom Domain (Optional)

### 7.1 Add Domain
1. Vercel Dashboard → Project Settings → Domains
2. Enter your domain (e.g., `deadeye.ie`, once it is bought; the steps for the move are in `docs/launch-checklist.md`)
3. Follow DNS configuration instructions
4. Usually takes 5-30 minutes to propagate

### 7.2 SSL Certificate
- Vercel automatically provisions free SSL
- HTTPS enabled automatically

---

## Step 8: Set Up Monitoring (Recommended)

### 8.1 Error Tracking - Sentry
```bash
npm install @sentry/nextjs
```

Add to `.env.local`:
```
SENTRY_DSN=https://[key]@sentry.io/[project]
```

Then redeploy to Vercel.

### 8.2 Analytics
Enable Vercel Analytics in Project Settings → Analytics

---

## Troubleshooting

### Build Fails
**Check**:
- Are all environment variables set?
- Is the Supabase project active?
- Is the OpenAI API key valid?

**Fix**:
- Review build logs in Vercel
- Update environment variables
- Trigger new deployment

### Auth Not Working
**Check**:
- Supabase project URL correct?
- Anon key correct?
- Email verification enabled in Supabase Auth?

**Fix**:
- Verify credentials in Supabase console
- Check Auth → Providers settings

### AI Coach Returns Errors
**Check**:
- OpenAI API key valid?
- Account has credits?
- Model `gpt-4-turbo` available in region?

**Fix**:
- Test API key: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
- Add credits to OpenAI account

### Database Queries Fail
**Check**:
- All 6 migrations ran?
- RLS policies enabled?
- Service role key correct?

**Fix**:
- Run migrations again in Supabase SQL editor
- Check RLS policies in Tables section

---

## After Deployment

### 1. Invite Beta Testers
Share your production URL:
```
https://deadeyeapp.vercel.app
```

Create test accounts for testers to use.

### 2. Monitor Error Logs
- Vercel Dashboard → Deployments → Logs
- Watch for errors in first hour
- Be ready to deploy hotfixes

### 3. Track User Feedback
- Set up feedback form (Google Form, Typeform)
- Monitor Sentry for errors
- Log feature requests

### 4. Set Up Analytics
- Google Analytics: Track user behavior
- Vercel Analytics: Monitor performance
- Sentry: Track errors

---

## Auto-Deploy Configuration

### GitHub → Vercel Auto-Deploy
Vercel automatically deploys when you push to main:

```bash
# Make a change
git add .
git commit -m "feat: add new feature"
git push origin main

# Vercel automatically builds and deploys
# Check status at https://vercel.com/dashboard
```

---

## Quick Reference Commands

```bash
# Push code to GitHub
git add .
git commit -m "message"
git push origin main

# View deployment logs
vercel logs --follow

# Environment variables
vercel env ls

# Trigger manual deployment
vercel deploy --prod

# Local testing
npm run dev
npm run build
npm run start
```

---

## Success Checklist

- [ ] GitHub repository created
- [ ] Code pushed to main branch
- [ ] Vercel project imported
- [ ] Environment variables set (7 total)
- [ ] Deployment triggered
- [ ] Build succeeded
- [ ] Database migrations ran (6 files)
- [ ] Production URL accessible
- [ ] Auth flow tested (signup → verify → login)
- [ ] Basketball session logged
- [ ] AI Coach working
- [ ] Study quiz completed
- [ ] Leaderboard visible
- [ ] Beta testers invited

---

## Production URLs

**Live Site**: https://deadeyeapp.vercel.app (`deadeye.ie` once it is bought)  
**Vercel Dashboard**: https://vercel.com/dashboard  
**Supabase Console**: https://app.supabase.com  
**OpenAI Dashboard**: https://platform.openai.com  

---

## Next Steps

1. **User Testing** (Week 1)
   - Invite 5-10 beta testers
   - Collect feedback
   - Fix critical bugs

2. **Feature Improvements** (Week 2-4)
   - Implement top-voted features
   - Optimize performance
   - Add analytics

3. **Scale** (Month 2+)
   - Add pose detection
   - Implement push notifications
   - Expand study curriculum
   - Launch mobile app

---

**Deployment Ready! 🚀**

**Next command**: Go to https://github.com/new to create your repository, then return here to complete deployment steps.
