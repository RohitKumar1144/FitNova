# FitNova System Architecture & Technical Specifications

> **Project**: FitNova — AI-Powered Adaptive Fitness Coach  
> **Event / Context**: Smart India Hackathon (SIH)  
> **Diagram Reference**: [`docs/architecture.svg`](./architecture.svg) (16:9 Presentation Quality)

---

## 1. Executive Summary

FitNova combines **low-latency, 100% private client-side computer vision** with **secure server-side generative AI** to deliver personalized workout plans, real-time biomechanical feedback, and adaptive fitness progression for beginners and students.

### Architectural Highlights
- **Privacy First**: Raw webcam frames never leave the user's browser. No video is streamed to or processed by remote servers or AI models.
- **Zero-Lag Rep Tracking**: MediaPipe PoseLandmarker runs entirely on-device via WebAssembly/WebGL, achieving 60 FPS real-time feedback.
- **Secure AI Orchestration**: Google Gemini 3.8 Flash is accessed exclusively through Supabase Edge Functions with secret API keys stored server-side.
- **Hardened Persistence**: Row Level Security (RLS) ensures complete data isolation across user profiles, plans, sessions, and activity scores.

---

## 2. Multi-Layer Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                             LAYER 1: USER / ATHLETE                            │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │
┌───────────────────────────────────────▼────────────────────────────────────────┐
│                   LAYER 2: FITNOVA FRONTEND (React SPA)                        │
│   • Auth & Onboarding  • Workout Plan Viewer  • Camera Hero  • AI Coach Drawer │
│   • Dashboard / Progress  • 4 Gamified Badges  • Activity Score Engine         │
└───────────────────┬─────────────────────────────────────────┬──────────────────┘
                    │                                         │
┌───────────────────▼─────────────────────┐ ┌─────────────────▼──────────────────┐
│  LAYER 3: CLIENT-SIDE INTELLIGENCE      │ │ LAYER 4: SUPABASE BACKEND (Postgres)│
│  (100% In-Browser / Zero Cloud Latency) │ │ • profiles (fitness level & goals)  │
│  • Browser Webcam (MediaDevices 60 FPS) │ │ • workout_plans (target volume)    │
│  • MediaPipe PoseLandmarker (WASM/GPU)  │ │ • workout_sessions (reps, score)   │
│  • 33 3D Skeletal Landmark Points       │ │ • progress_snapshots & badges      │
│  • Smoothing & Joint Angles Vector Math │ │ • Row-Level Security (RLS) Policies │
│  • Exercise Analyzers:                  │ └─────────────────┬──────────────────┘
│    - Squat (Depth < 95°, Back > 45°)    │                   │
│    - Push-up (Elbow < 95°, Plank > 145°)│ ┌─────────────────▼──────────────────┐
│    - Bicep Curl (Flexion < 50°, Drift)  │ │ LAYER 5: SERVER-SIDE AI ENGINE     │
│  • Instant Rep Counter & Audio Cues     │ │ • Supabase Edge Functions (Deno)   │
│  • Biomechanical Form Score (0-100%)    │ │   - generate-workout               │
└─────────────────────────────────────────┘ │   - post-workout-feedback          │
                                            │   - ai-coach                       │
                                            │ • Google Gemini 3.8 Flash          │
                                            │   - Structured JSON outputs        │
                                            │   - Beginner safety guardrails     │
                                            └─────────────────┬──────────────────┘
                                                              │
┌─────────────────────────────────────────────────────────────▼──────────────────┐
│                           LAYER 6: HOSTING & TOPOLOGY                          │
│   • Frontend: Vercel Edge Network (Global Anycast CDN)                         │
│   • Backend: Supabase Cloud Managed PostgreSQL & Deno Edge Network             │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer-by-Layer Technical Breakdown

### Layer 1: User / Athlete
- Interacts through any modern desktop or mobile browser with a standard webcam.
- Zero special wearable hardware or external sensors required.

### Layer 2: Frontend Single Page Application (SPA)
- **Framework**: React 19, TypeScript, Vite, Tailwind CSS.
- **Routing**: `react-router-dom` with client-side guarded routes (`/auth`, `/dashboard`, `/plan`, `/workout`, `/progress`).
- **State Management**: Reactive React hooks coupled with optimistic local updates and Supabase subscriptions.
- **UI Highlights**:
  - **Camera Hero (`WorkoutSessionPage`)**: High-visibility mirrored video feed, skeletal overlay, prominent rep counter, form feedback pill, audio cues, and workout completion modal.
  - **AI Coach**: Sliding interactive drawer with conversational history and user-specific fitness context.
  - **Progress Dashboard**: Weekly activity heatmap, volume breakdown, and 4 unlocked achievement badges (*First Workout, 3-Day Streak, 100 Reps, Form Master*).

### Layer 3: Client-Side Intelligence & Computer Vision
- **MediaPipe Tasks Vision**: Loads `PoseLandmarker` WebAssembly and WebGL delegates locally.
- **33 3D Skeletal Keypoints**: Extracts landmark coordinates at up to 60 FPS directly from the HTML video canvas.
- **Biomechanical Analysis**:
  - Joint angles computed using 3D Euclidean vector math (`calculateAngle`).
  - Exponential moving average smoothing (`applyExponentialSmoothing`) filters landmark jitter.
- **Deterministic State Machines**:
  - **Squat Analyzer**: Tracks hip-knee-ankle flexion depth ($< 95^\circ$), torso posture ($> 45^\circ$), and knee valgus.
  - **Push-up Analyzer**: Measures elbow flexion ($< 95^\circ$), full extension lock ($> 155^\circ$), and body plank alignment ($> 145^\circ$).
  - **Bicep Curl Analyzer**: Tracks concentric flexion ($< 50^\circ$), eccentric extension ($> 150^\circ$), and shoulder drift.
- **Zero Remote Latency**: Because the vision loop runs entirely inside the client thread, rep counting and form feedback happen with sub-16ms latency.

### Layer 4: Supabase Backend & Database
- **Supabase Auth**: JWT-based session verification with refresh token rotation.
- **PostgreSQL Database**:
  - `profiles`: User onboarding preferences (fitness level, primary goal, available time, equipment).
  - `workout_plans`: Structured JSON workout routines generated by AI.
  - `workout_sessions`: Hardened workout telemetry (target reps, completed reps, average form score, duration, completion status).
  - `progress_snapshots`: Historical aggregates, streaks, and FitNova Activity Score.
- **Row Level Security (RLS)**: Strict SQL policies (`auth.uid() = user_id`) enforce that users can only read and write their own records.

### Layer 5: Server-Side Generative AI Engine
- **Supabase Edge Functions (Deno Runtime)**:
  - `generate-workout`: Constructs personalized sessions tailored to fitness level and equipment.
  - `post-workout-feedback`: Analyzes completed session stats to produce actionable coaching insights.
  - `ai-coach`: Powers a multi-turn fitness chat assistant with safety guardrails.
- **Google Gemini 3.8 Flash**:
  - Configured with beginner-safe prompt guardrails to prevent overtraining or injury.
  - Returns strictly typed JSON responses parsed by client services.
- **Security Perimeter**: The `GEMINI_API_KEY` is securely injected as an environment secret into Deno Edge Functions and is **never** bundled or exposed to the client.

### Layer 6: Hosting & Production Infrastructure
- **Frontend**: Hosted on **Vercel** with global edge caching and instant atomic deployments.
- **Backend & AI**: Hosted on **Supabase Cloud** (managed Postgres, SSL/TLS 1.3 encryption in transit and at rest, and globally distributed serverless Deno Edge runtime).

---

## 4. Privacy & Performance Architecture

| Dimension | FitNova Architecture | Traditional Cloud Vision |
|---|---|---|
| **Video Processing** | **100% In-Browser (MediaPipe WASM)** | Streamed to cloud server |
| **Bandwidth Usage** | **0 KB video uploaded** | Hundreds of MBs per session |
| **Feedback Latency** | **< 16 ms (Real-time 60 FPS)** | 200–800 ms network round-trip |
| **User Privacy** | **Zero camera frames stored or transmitted** | Camera frames exposed to remote servers |
| **Cloud Inference Cost** | **$0 for computer vision** | Expensive GPU server instances |
| **Gemini AI Role** | **Structured JSON text generation only** | N/A |

---

## 5. End-to-End System Data Flows

### A. Live Camera Workout Flow (Local Loop)
```
Browser Webcam
      │
      ▼
MediaPipe PoseLandmarker (WASM) ──► 33 3D Pose Landmarks
                                           │
                                           ▼
                               Joint Vector Calculation & Smoothing
                                           │
                                           ▼
                               Exercise State Machine Analyzer
                               (Squat / Push-up / Bicep Curl)
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
             Automated Rep Counter                 Form Correction Feedback
                        │                                     │
                        └──────────────────┬──────────────────┘
                                           ▼
                        React Camera Hero Canvas / Audio Cues
```

### B. Session Completion & Progression Flow
```
User Completes Workout
      │
      ▼
Save Guard (`hasSavedSessionRef` prevents duplicate persistence)
      │
      ▼
Supabase REST API (Encrypted TLS) ──► `workout_sessions` Table (RLS Enforced)
      │
      ├───────────────────────────────► Trigger `post-workout-feedback` Edge Function
      │                                       │
      │                                       ▼
      │                                 Gemini 3.8 Flash AI Coach Analysis
      │                                       │
      │                                       ▼
      │                                 Personalized Recovery & Form Summary
      ▼
Update FitNova Activity Score (30% Consistency + 30% Form + 20% Completion + 20% Progression)
      │
      ▼
Evaluate 4 Gamified Badges ──► Update Progress Dashboard UI
```

### C. AI Coach Interactive Chat Flow
```
User Enters Query in AI Coach Drawer
      │
      ▼
Supabase Edge Function (`ai-coach`) with Bearer JWT
      │
      ▼
Hydrate System Prompt with User Profile & Recent Workout Metrics
      │
      ▼
Gemini 3.8 Flash Generates Structured Multi-Turn Response
      │
      ▼
Render Response in FitNova UI Chat Stream
```

---

## 6. Security Checklist

- [x] Zero API keys or tokens embedded in client builds.
- [x] Supabase Row Level Security (RLS) enabled on all tables.
- [x] Gemini API key stored strictly in Supabase Edge Function Secrets Vault.
- [x] Zero webcam pixels or video streams transmitted over network.
- [x] Strict state-machine validation prevents artificial repetition spoofing.
