# FitNova SIH Demo Account Setup & Data Verification Guide

> **Target Audience**: Smart India Hackathon (SIH) Presenters & Judges  
> **SQL Script Asset**: [`docs/seed_demo_data.sql`](./seed_demo_data.sql)

---

## 1. Overview

This guide accompanies [`docs/seed_demo_data.sql`](./seed_demo_data.sql) to populate your dedicated FitNova demo account with realistic, internally consistent workout history spanning 5 consecutive calendar days.

### Key Objectives Achieved
- **Realistic Progression**: Shows a beginner athlete improving from 70% to 95% form accuracy over 7 sessions.
- **Accurate Metric Thresholds**:
  - **Total Reps**: Exactly **101 repetitions** (surpasses the 100-rep milestone).
  - **Active Streak**: **5 consecutive calendar days** (including yesterday and today).
  - **Workouts**: **7 total sessions** (12, 10, 14, 15, 14, 16, 20 reps).
  - **Average Form**: **87%** (calculated directly from actual `good_form_reps` and `bad_form_reps`).
- **Badge Realism**:
  - 🏆 **First Workout**: Unlocked (7 completed workouts).
  - 🔥 **3 Day Streak**: Unlocked (5-day active streak).
  - 💪 **100 Reps**: Unlocked (101 total reps).
  - ⭐ **Form Master**: Accurately **Locked** with real progress displayed (87% / 90% required).
- **FitNova Activity Score**:
  - Consistency: **100 / 100** (7 sessions in last 7 days; weight: 30% = 30.0 pts)
  - Form: **87 / 100** (87% usable form accuracy; weight: 30% = 26.1 pts)
  - Completion: **100 / 100** (all sessions reached or exceeded 8-rep baseline; weight: 20% = 20.0 pts)
  - Progression: **90 / 100** (Squats +100, Push-ups +70, Bicep Curls +100; weight: 20% = 18.0 pts)
  - **Composite Score**: **94 / 100**
- **Adaptive Progression**:
  - Squats: **15 → 18 reps** (`direction: 'increase'`) following 95% form score.
  - Push-ups: **12 → 12 reps** (`direction: 'maintain'`) following 86% form score.
  - Bicep Curls: **14 → 16 reps** (`direction: 'increase'`) following 94% form score.
- **AI Coach Feedback**:
  - Structured JSON post-workout feedback stored for all historical sessions.

---

## 2. 1-Click Demo Mode (SIH Presentation Feature)

FitNova includes a production-grade, passwordless **Demo Mode** built specifically for high-stakes presentations and judge evaluations. Judges can explore the full authenticated experience with real data without creating an account or typing credentials.

### Architecture & Security (Option A: Token Broker)
- **Supabase Edge Function (`demo-login`)**: Runs server-side on Supabase Edge infrastructure.
- **Zero Client Secrets**: No passwords, secret keys, or service-role keys are shipped in the client bundle or stored in `.env.local`.
- **Dynamic Profile Lookup**: The Edge Function queries Supabase for the dedicated demo profile (`profiles.full_name ILIKE '%Demo%'` or `email.includes('demo')`).
- **Magic Link Token Exchange**: Uses Supabase Admin auth API (`generateLink({ type: 'magiclink' })`) combined with server-side OTP verification (`verifyOtp`) to generate a valid, real JWT session without triggering external emails.
- **Client Hydration**: Client securely receives the access and refresh tokens, sets the Supabase auth session (`supabase.auth.setSession()`), sets a local `fitnova_demo_mode` flag, and routes directly to `/dashboard`.

### How to Use Demo Mode
1. **From Landing Page (`/`)**:
   - Click the prominent secondary CTA button **"Try Demo"** in the Hero section or the navbar.
2. **From Auth Page (`/auth`)**:
   - Click **"Try Demo Account (1-Click SIH Access)"** under the sign-in form.
3. **In-App Demo Indicator**:
   - A glowing amber **"DEMO MODE"** pill badge is rendered in the top app navigation across all pages (`/dashboard`, `/workout-plan`, `/progress`, `/ai-coach`, `/workout-session`).
4. **Exiting Demo Mode**:
   - Click **"Sign Out"** in any navigation bar. The active session is terminated, and the demo flag is cleared from local storage.

---

## 3. Step-by-Step Execution in Supabase (Data Seeding)

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your FitNova project.
3. In the left navigation, click on **SQL Editor**.
4. Open or copy the contents of [`docs/seed_demo_data.sql`](./seed_demo_data.sql).
5. Locate line 24 of the script:
   ```sql
   v_demo_email text := 'demo@fitnova.app'; -- Put your demo account email here
   ```
   Replace `'demo@fitnova.app'` with the actual email you used to register the demo account in Step 29 (e.g. `your_demo_email@domain.com`).
6. Click **Run** (or press `Ctrl+Enter`).
7. Confirm the success notice:
   ```
   NOTICE: Seeding FitNova demo records for user ID: <uuid>
   NOTICE: Successfully seeded 7 demo sessions, 1 adaptive plan, and progress snapshot for FitNova Demo!
   ```

---

## 4. UI Verification Flow for SIH Judges

Open your browser with the demo account signed in:

### A. Dashboard (`/dashboard`)
- **Header**: Displays *"Welcome back, FitNova"* with 5-day streak pill.
- **Metric Cards**:
  - Current Streak: **5 Days**
  - Total Workouts: **7 Sessions**
  - Total Reps: **101 Reps**
  - Form Quality: **87%**
- **FitNova Activity Score**: Circular gauge displaying **94** with detailed breakdown bars (Consistency: 100, Form: 87, Completion: 100, Progression: 90).
- **Active Workout Card**: Displays *"Full Body Adaptive Progression (Phase 2)"*.

### B. Workout Plan View (`/workout-plan`)
- Displays the structured 3-exercise routine (*Squats, Push-ups, Bicep Curls*).
- **Adaptive Progression Card**:
  - Bodyweight Squat: 15 → 18 reps (▲ Increase)
  - Standard Push-up: 12 → 12 reps (— Maintain)
  - Bicep Curl: 14 → 16 reps (▲ Increase)
- Specific reasoning text for each exercise derived from camera form tracking.

### C. Progress Dashboard (`/progress`)
- **7-Day Activity Heatmap**: Visual dots on active calendar days of the current week with workout count.
- **Progress History Chart**: Interactive area/bar chart rendering reps and form trends over time showing tangible improvement.
- **Summary Banner**: Contextual text reflecting dedication and steady momentum.

### D. Badges Section (`/progress#badges`)
- 🏆 **First Workout**: Unlocked badge with completion check.
- 🔥 **3 Day Streak**: Unlocked badge (active streak: 5 days).
- 💪 **100 Reps**: Unlocked badge (101 / 100 reps completed).
- ⭐ **Form Master**: Locked badge with progress indicator showing **87% / 90% form**.

### E. Camera Tracker (`/workout-session`)
- Live camera tracking ready for real-time demonstration with MediaPipe PoseLandmarker, skeletal overlay, and zero-latency rep counting.
