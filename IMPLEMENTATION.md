# Deadeye - Complete Implementation Guide

## Project Overview

Deadeye is a comprehensive basketball player development operating system (PWA) built with Next.js 16, TypeScript, Supabase, and Tailwind CSS. It enables players to track training sessions, workouts, performance tests, and receive AI-powered coaching feedback.

**Live Features:**
- ✅ Authentication with email/password & OAuth
- ✅ Mobile-first responsive design
- ✅ Basketball session tracking (drills, shooting by zone)
- ✅ Gym workout logging with exercise sets & PR detection
- ✅ Performance testing (7 test types: vertical, sprint, agility, broad jump)
- ✅ Dashboard with metrics calculation & streaks
- ✅ AI Coach service with provider abstraction (OpenAI ready)
- ✅ Basketball IQ study module with quizzes
- ✅ Leaderboard with transparent scoring
- ✅ Video upload foundation with Supabase Storage
- ✅ PWA support with service worker & offline capability

---

## Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (Postgres + RLS) + Next.js Server Components
- **Auth**: Supabase Auth with email/password + magic links
- **Storage**: Supabase Storage for video files
- **Validation**: Zod for runtime type checking
- **Testing**: Vitest + @testing-library/react
- **Mobile**: 100% responsive, bottom navigation, PWA ready

### Key Patterns
- **RSC**: Server Components for data fetching & auth checks
- **RLS**: Row-level security in Supabase for multi-tenant isolation
- **Type Safety**: Generated Supabase types, strict TypeScript
- **Streaming**: Middleware-based session refresh
- **Error Handling**: Try-catch with user-friendly messages

---

## Getting Started

### Prerequisites
```bash
Node.js 18+
npm or yarn
Supabase account
OpenAI API key (for AI Coach)
```

### Installation
```bash
# Clone the repository
git clone <repo>
cd hoopiq

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase & OpenAI keys

# Start development server
npm run dev

# Open http://localhost:3000
```

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Auth
OWNER_EMAIL=your@email.com

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4-turbo
```

---

## Database Schema

### Core Tables
- `profiles` - User profiles with player stats
- `subscriptions` - Plan type & AI credit tracking
- `training_sessions` - Basketball sessions with RPE
- `session_drills` - Individual drills within sessions
- `shooting_entries` - Shot data by zone (14 zones)
- `workouts` - Gym sessions
- `workout_sets` - Individual sets with reps/weight/time/distance
- `performance_tests` - Athletic testing (vertical, sprint, etc.)
- `goals` - User goals with progress tracking
- `ai_reports` - AI coaching summaries with credit usage
- `study_topics` - Basketball IQ curriculum
- `study_items` - Individual lessons & videos
- `study_progress` - User completion tracking
- `quiz_completions` - Quiz scores & performance
- `leaderboard_standings` - User rankings & points
- `video_assets` - Uploaded videos with analysis status

### Key Features
- ✅ RLS policies enforce user data privacy
- ✅ Cascading deletes preserve referential integrity
- ✅ PR detection via triggers in workout_sets
- ✅ Automatic timestamps (created_at, updated_at)
- ✅ Soft deletes pattern for recoverable data

---

## Core Modules

### 1. Authentication
- **Route**: `/auth/login`, `/auth/signup`, `/auth/verify-email`
- **Features**: Email/password, magic links, OAuth ready, email verification
- **Protected**: All app routes require `requireUser()` check
- **Session**: Middleware refreshes tokens on each request

### 2. Onboarding
- **Route**: `/onboarding`
- **3 Steps**: Bio (name/age/height) → Position/Level → Goals/Strengths/Focus
- **Auto-creates**: Default weekly training goal (4 days/week)

### 3. Basketball Tracking
- **Route**: `/basketball`
- **Features**: Log sessions with drills, track shooting by 14 zones
- **Session data**: Type, duration, RPE, quality, notes
- **Drill data**: Name, category, duration, shots per drill
- **Metrics**: Career shooting %, session count, last session date

### 4. Workout Logger
- **Route**: `/workouts`
- **Features**: Log sets with reps/weight/time/distance/RPE
- **PR Detection**: Automatic flags for new personal records
- **Workout types**: Strength, power/plyos, mobility, recovery, conditioning, testing, mixed

### 5. Performance Testing
- **Route**: `/workouts/tests`
- **7 tests**: Vertical (standing/approach), Sprint (3/4 court, 40yd), Lane Agility, Pro Agility 5-10-5, Broad Jump
- **Tracking**: Best, latest, improvement badges
- **Custom tests**: Users can add custom test types

### 6. Dashboard & Analytics
- **Route**: `/dashboard`
- **Metrics**: This week sessions, shooting %, streak, AI credits
- **Progress**: Weekly goal completion with visual bar
- **Top zones**: Breakdown of shooting performance by location
- **Consistency**: % of active days in 30-day window

### 7. AI Coach
- **Route**: `/ai-coach`
- **Features**: Post-session AI summaries with GPT-4 Turbo
- **Feedback**: Key insights + actionable recommendations
- **Credit system**: Free tier (3/month), Pro (unlimited)
- **Comparison**: Previous session vs. current session trends

**Service Layer** (`src/lib/ai/`):
- Provider abstraction (OpenAI, Anthropic ready)
- Evidence extraction from session data
- Credit deduction & subscription tracking
- Report storage with key insights

### 8. Basketball IQ Study
- **Route**: `/study`
- **Topics**: 4 curated topics (Pick & Roll, Defense, Shooting Form, Court Vision)
- **Materials**: YouTube links + detailed descriptions
- **Quizzes**: Multi-choice with explanations
- **Progress**: Track completion per topic

### 9. Leaderboard
- **Route**: `/leaderboard`
- **Scoring**: Base (10 × metrics) + daily bonus (5 pts/day) + challenges (50 pts) + quizzes (10 pts)
- **Transparent**: Full scoring formula displayed
- **Challenges**: Seasonal challenges with rewards
- **Badges**: Achievement system for milestones

### 10. Video Foundation
- **Route**: `/video`
- **Upload**: Signed URLs with Supabase Storage
- **Status**: Pending → Processing → Ready/Failed
- **Analysis**: Background jobs for pose analysis
- **Foundation**: Ready for pose detection integration

---

## Component Library

### UI Components (`src/components/ui/`)
All built with Tailwind CSS v4, no external UI libraries:

- **Button**: 6 variants (primary, secondary, outline, ghost, danger, accent), 3 sizes
- **Input**: Text with label, error display, validation feedback
- **Select**: Dropdown with chevron icon, label, error states
- **Card**: Composable (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- **Badge**: 7 color variants for contextual tagging
- **Alert**: 4 severity levels (info, success, warning, error) with icons

### Layout Components
- **Navbar**: Top navigation with user profile, sign-out, owner badge
- **BottomNav**: Mobile-only 7-tab navigation for app routes

---

## API Routes & Server Functions

### Authentication
- `POST /auth/callback` - OAuth redirect handler
- `POST /auth/signup` - Register with email/password
- `POST /auth/reset-password` - Password reset flow

### Data Fetching (Server Components)
- Basketball sessions: `/basketball` lists, `/basketball/[id]` details
- Workouts: `/workouts` lists, `/workouts/[id]` details
- Performance tests: `/workouts/tests` dashboard, `/workouts/tests/new` logging
- Dashboard metrics: Calculated server-side with RLS

### AI Coach (Server-side Service)
- `aiCoachService.generateSessionSummary()` - GPT-4 analysis
- `aiCoachService.compareWithPreviousSession()` - Trend comparison
- `aiCoachService.getMonthlyCreditsUsed()` - Usage tracking
- `aiCoachService.getRemainingCredits()` - Subscription check

---

## Security & Privacy

### Row-Level Security (RLS)
- **Profile access**: Users can only read/write own profile
- **Session data**: Sessions isolated by user_id
- **Subscription**: Credit tracking per user
- **Study progress**: Only visible to user

### Auth Protection
- `requireUser()` in Server Components redirects to /login
- `getCurrentUser()` provides authenticated user context
- Middleware refreshes tokens on each request
- Magic links & OAuth for social auth

### Data Validation
- Zod schemas on client & server
- Safe math operations (no divide-by-zero)
- Input sanitization for all user data
- CSRF protection via Next.js

---

## Performance Optimizations

### Frontend
- Server Components eliminate JavaScript for data fetching
- Image optimization via Next.js Image component
- Code splitting via dynamic imports
- Bottom navigation sticky positioning (no re-renders)

### Database
- Indexed queries on user_id, session_date, created_at
- Aggregations calculated at query time
- Limits on list queries (max 100 items)
- RLS policies prevent unauthorized access

### Caching
- Browser caching via Cache-Control headers
- Service Worker caches static assets
- Runtime cache for API responses
- Stale-while-revalidate for dashboard

---

## Testing

### Unit Tests
```bash
npm run test
```
Location: `__tests__/`
- `sanity.test.ts` - Basic Vitest setup check
- `auth.test.ts` - Entitlement & owner detection

### E2E Tests (Ready for Implementation)
```bash
npm run test:e2e
```
Suggested flows:
- Auth: signup → verify email → login
- Basketball: create session → add drills → log shooting
- Workout: create workout → log sets → verify PR detection
- AI Coach: request summary → verify credits deducted
- Dashboard: verify metrics calculated correctly

---

## Deployment

### Vercel (Recommended)
```bash
# 1. Push to GitHub
git push origin main

# 2. Connect repo in Vercel dashboard
# 3. Set environment variables
# 4. Deploy automatically on push
```

### Docker
```bash
# Build image
docker build -t hoopiq .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e OPENAI_API_KEY=... \
  hoopiq
```

---

## PWA & Offline Support

### Service Worker
- **Location**: `public/sw.js`
- **Caching strategy**: Network-first for HTML, cache-first for assets
- **Offline fallback**: `/offline` page
- **Registration**: Via `app/layout.tsx` script tag

### Manifest
- **Location**: `public/manifest.json`
- **Shortcuts**: Quick links to log session/workout
- **Share target**: Web Share API support
- **Icons**: 192x192 & 512x512 for homescreen

---

## Roadmap (Completed)

### Milestone 1 ✅ (Complete)
- Auth + onboarding
- Basketball + workout tracking
- Performance testing
- Dashboard with metrics
- AI Coach (provider abstraction ready)
- Basketball IQ (study module ready)
- Leaderboard (scoring system ready)
- Video foundation

### Milestone 2 (Optional Enhancements)
- Pose detection via video analysis
- Social sharing features
- Team/coach invitations
- Export workout data
- Advanced filters & search
- Push notifications
- Dark/light theme toggle

---

## Contributing

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make commits with conventional messages
git commit -m "feat: add new feature"

# Push & create pull request
git push -u origin feature/new-feature
```

### Code Style
- TypeScript strict mode enabled
- ESLint for linting
- Prettier for formatting
- Commit lint for messages

---

## Troubleshooting

### Build Errors
- Clear `.next/` folder: `rm -rf .next`
- Reinstall deps: `rm node_modules && npm install`
- Check env vars in `.env.local`

### TypeScript Errors
- Generate Supabase types: `npx supabase gen types typescript > src/lib/supabase/types.ts`
- Verify @tsnocheck comments are where expected

### Performance Issues
- Profile with DevTools Lighthouse
- Check RLS query performance in Supabase
- Verify indexes on user_id, created_at

---

## Support & Resources

- **Docs**: https://nextjs.org, https://supabase.com
- **Issues**: Create GitHub issue with reproduction steps
- **Discussions**: Start discussion for feature requests

---

**Version**: 1.0.0  
**Last Updated**: 2026-09-21  
**Status**: Production Ready ✅
