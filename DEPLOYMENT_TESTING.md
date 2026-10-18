# Deadeye - Deployment & User Testing Guide

## Phase 1: Pre-Deployment Checklist

### Environment & Configuration
- [ ] Verify all `.env.local` variables are set correctly
- [ ] Test Supabase connection in development
- [ ] Verify OpenAI API key and model availability
- [ ] Check OAuth provider configuration (if using)
- [ ] Confirm domain/URL for production

### Database
- [ ] Run all 6 migrations in Supabase
- [ ] Verify seed data loaded (27 exercises, 4 study topics)
- [ ] Test RLS policies with multiple test users
- [ ] Confirm table indexes exist
- [ ] Backup production database plan

### Security Review
- [ ] Review RLS policies on all 25 tables
- [ ] Verify auth middleware on protected routes
- [ ] Test input validation with edge cases
- [ ] Confirm no secrets in code/git
- [ ] Enable HTTPS/SSL certificate
- [ ] Set up CORS properly for API endpoints

### Performance Optimization
- [ ] Run Lighthouse audit (target: 90+)
- [ ] Verify Core Web Vitals
- [ ] Test service worker caching
- [ ] Compress images in public/
- [ ] Enable HTTP/2 push on CDN
- [ ] Set up caching headers

### Testing
- [ ] Run unit tests: `npm run test`
- [ ] Manual smoke test of all 13 pages
- [ ] Test auth flow: signup → verify → login
- [ ] Test each session type (basketball, workout, tests)
- [ ] Verify AI Coach with real OpenAI call
- [ ] Test offline mode with service worker
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile device testing (iOS, Android)

---

## Phase 2: Deployment Steps

### Option A: Vercel (Recommended)

**Step 1: Prepare Repository**
```bash
# Ensure git is clean
git status

# Create production branch
git checkout -b production/v1.0.0

# Add deployment files
git add .
git commit -m "chore: production deployment v1.0.0"

# Push to GitHub
git push origin production/v1.0.0
```

**Step 2: Vercel Setup**
1. Visit vercel.com and sign in with GitHub
2. Click "Add New" → "Project"
3. Import the Deadeye repository
4. Configure project name: `hoopiq`
5. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `OWNER_EMAIL`
   - `AI_PROVIDER`
   - `AI_MODEL`

**Step 3: Deploy**
```bash
# Vercel auto-deploys on git push
git push origin production/v1.0.0
# Or manual deploy from dashboard: "Deploy"
```

**Step 4: Configure Domain**
- In Vercel dashboard: Settings → Domains
- Add custom domain or use `deadeye-hoop-iq.vercel.app`
- Configure DNS records if custom domain
- Enable automatic HTTPS

---

### Option B: Docker Deployment

**Step 1: Create Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build app
COPY . .
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

**Step 2: Build & Test Locally**
```bash
docker build -t hoopiq:1.0.0 .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  hoopiq:1.0.0
```

**Step 3: Push to Registry**
```bash
# Docker Hub
docker tag hoopiq:1.0.0 username/hoopiq:1.0.0
docker push username/hoopiq:1.0.0

# Or AWS ECR, GCP Container Registry, etc.
```

**Step 4: Deploy to Container Orchestration**
- Kubernetes, AWS ECS, Google Cloud Run, etc.
- Configure environment variables
- Set up load balancer & SSL
- Enable auto-scaling

---

## Phase 3: User Testing Plan

### User Testing Strategy

**1. Recruit Testers** (10-20 users)
- Basketball players (all skill levels)
- Coaches who want to track players
- Sports tech enthusiasts
- Mix of iOS & Android users
- Mix of desktop & mobile usage

**2. Create Testing Scenarios**

#### Scenario A: New User Onboarding (30 min)
1. Visit deadeye.ie
2. Sign up with email
3. Verify email
4. Complete onboarding (bio → level → goals)
5. Navigate dashboard
**Metrics**: Signup time, confusion points, goal clarity

#### Scenario B: Log Basketball Session (20 min)
1. From dashboard, click "Log Basketball Session"
2. Select session type and date
3. Add 2 drills with different shot zones
4. Log shooting attempts (50 shots total across drills)
5. Rate session quality
6. Save and view in history
**Metrics**: Time to completion, data accuracy, UI clarity

#### Scenario C: Log Workout with PR (15 min)
1. Click "Log Workout"
2. Select workout type (strength)
3. Add 3 exercises with sets
4. Mark one set as personal record attempt
5. Save and view details
**Metrics**: Exercise data entry flow, PR detection, visual feedback

#### Scenario D: View Dashboard (10 min)
1. Return to dashboard
2. Review stats (sessions, shooting %, streak)
3. Check top shooting zones
4. View upcoming features
**Metrics**: Dashboard clarity, metric understanding, engagement

#### Scenario E: Study Basketball IQ (15 min)
1. Navigate to study module
2. Select first topic (Pick & Roll)
3. Watch YouTube link or read content
4. Mark as complete
5. Start quiz (5 questions)
6. Submit and review score
**Metrics**: Content clarity, quiz difficulty, learning value

---

### User Testing Questions

**Post-Scenario Feedback** (Survey after each scenario):
1. How easy was this task? (1-5)
2. Did anything confuse you?
3. What would you change?
4. Would you use this feature regularly?
5. Any missing features?

**Post-Testing Interview** (30 min):
1. What's your athletic background?
2. How do you currently track training?
3. First impressions of Deadeye?
4. Which features are most valuable?
5. Which features are least useful?
6. Would you pay for this? (Price point?)
7. Features you'd like added?
8. Overall satisfaction? (1-10)

---

### Testing Checklist

#### Authentication
- [ ] Signup with email works
- [ ] Email verification link works
- [ ] Login with registered email works
- [ ] Password reset works
- [ ] Session persists across page refreshes
- [ ] Logout works

#### Basketball Module
- [ ] Create session without errors
- [ ] Add multiple drills per session
- [ ] Log shooting data for all 14 zones
- [ ] Verify makes ≤ attempts validation
- [ ] View session history
- [ ] Shooting % calculates correctly

#### Workout Module
- [ ] Create workout with multiple exercise types
- [ ] Log sets with reps, weight, time, distance
- [ ] PR detection flags correctly
- [ ] View workout details
- [ ] Edit/delete workouts (if applicable)

#### Performance Tests
- [ ] Log vertical jump test
- [ ] Log sprint time
- [ ] Log custom test
- [ ] View test dashboard with PR/latest/improved badges
- [ ] Historical test comparison

#### Dashboard
- [ ] This week sessions updates
- [ ] Shooting % matches data
- [ ] Streak counter accurate
- [ ] Weekly goal progress shows
- [ ] Top zones ranked correctly

#### AI Coach
- [ ] Request summary after session (if credits available)
- [ ] AI report displays correctly
- [ ] Key insights legible
- [ ] Recommendations actionable
- [ ] Credit deduction shows

#### Study Module
- [ ] Topic list loads
- [ ] Topic detail page renders
- [ ] YouTube links work
- [ ] Quiz displays questions
- [ ] Quiz scoring correct
- [ ] Results show percentage

#### Leaderboard
- [ ] User's rank visible
- [ ] Points calculation explained
- [ ] Top 10 players show
- [ ] Active challenges display
- [ ] Challenge rewards clear

#### PWA & Offline
- [ ] App installable from browser
- [ ] Offline page shows when disconnected
- [ ] Cached data available offline
- [ ] Data syncs when reconnected

#### Mobile/Responsive
- [ ] Bottom navigation sticky
- [ ] All forms responsive on mobile
- [ ] Touch targets adequate (48px minimum)
- [ ] Landscape mode works
- [ ] No horizontal scroll on mobile

#### Performance
- [ ] Dashboard loads <1s (cached)
- [ ] Session creation <2s
- [ ] Smooth scrolling
- [ ] No janky animations
- [ ] Service worker caching works

---

## Phase 4: Bug Tracking & Iteration

### Bug Report Template
```
**Title**: [Brief description]
**Severity**: Critical / High / Medium / Low
**Device**: iOS / Android / Desktop
**Browser**: Chrome / Safari / Firefox
**Steps to Reproduce**:
1. ...
2. ...
3. ...
**Expected**: 
**Actual**: 
**Screenshot/Video**: [if applicable]
```

### Common Issues to Watch For
- [ ] Supabase RLS blocking valid queries
- [ ] Auth token expiration during session
- [ ] Shooting zone selection confusion
- [ ] PR detection false positives
- [ ] AI Coach timeout or API errors
- [ ] Offline sync losing data
- [ ] Mobile layout broken at certain screen sizes
- [ ] Service worker not updating
- [ ] TypeScript errors in production

---

## Phase 5: Launch Checklist

### 48 Hours Before Launch
- [ ] Final smoke test on production
- [ ] All tests passing
- [ ] No console errors
- [ ] Lighthouse score reviewed
- [ ] Support email/contact set up
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Launch announcement prepared

### Launch Day
- [ ] Monitor error tracking (Sentry if configured)
- [ ] Check analytics dashboard
- [ ] Be ready for support questions
- [ ] Have team available for quick fixes
- [ ] Post on social media
- [ ] Update status page

### Post-Launch (First Week)
- [ ] Daily check-ins on user feedback
- [ ] Hot fixes for critical bugs
- [ ] Gather user testing insights
- [ ] Plan next iteration based on feedback
- [ ] Monitor performance metrics
- [ ] Check server logs for errors

---

## Phase 6: Monitoring & Maintenance

### Ongoing Monitoring
```bash
# Set up error tracking
npm install @sentry/nextjs

# Add to next.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Health Checks
- [ ] Supabase connection status
- [ ] OpenAI API availability
- [ ] Database query performance
- [ ] Service worker updates
- [ ] Certificate expiration dates

### Metrics to Track
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Feature adoption rates
- AI Coach credit usage
- Error rates
- Page load times
- API response times
- Video upload success rate

---

## Success Criteria

### Week 1
- ✅ 0 critical bugs
- ✅ <2s average dashboard load
- ✅ >95% authentication success
- ✅ Positive user feedback on UX

### Week 4
- ✅ 50+ active users
- ✅ >80% onboarding completion
- ✅ >2 sessions/user on average
- ✅ 3+ study topics started

### Month 1
- ✅ 200+ registered users
- ✅ 1000+ training sessions logged
- ✅ 500+ AI Coach reports generated
- ✅ Net Promoter Score >50

---

## Feedback Collection

### Surveys
- In-app satisfaction survey (NPS)
- Feature request form
- Bug report form
- Exit survey (if users churn)

### Analytics Events to Track
```typescript
// User actions
trackEvent('session_logged', { type, duration })
trackEvent('workout_logged', { exercises, prs })
trackEvent('ai_summary_requested', { credits_used })
trackEvent('study_quiz_completed', { score, percentage })
trackEvent('leaderboard_viewed', { user_rank })
```

---

## Post-Launch Roadmap

### Week 2-4
- [ ] Collect user feedback
- [ ] Fix reported bugs
- [ ] Optimize slow queries
- [ ] Add analytics dashboard

### Month 2
- [ ] Implement push notifications
- [ ] Add social sharing
- [ ] Integrate Stripe for subscriptions
- [ ] Begin pose detection integration

### Month 3+
- [ ] Team/coach features
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] Integration marketplace

---

**Ready to deploy Deadeye to production! 🚀**
