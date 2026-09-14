// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code runs in Supabase Edge Functions (Deno runtime)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Profile {
  id: string;
  full_name: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  fitness_level: string;
  goal: string;
  available_time_minutes: number;
  equipment: string[] | string;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface FallbackCoachContext {
  message: string;
  userProfile: Profile;
  totalSessions: number;
  totalReps: number;
  avgForm: number;
  streakDays: number;
  exerciseMap: Record<
    string,
    { count: number; totalReps: number; goodReps: number; badReps: number; coachingNotes: string[] }
  >;
  sessions: Array<{
    exercise_type?: string;
    rep_count?: number;
    good_form_reps?: number;
    bad_form_reps?: number;
    duration_seconds?: number;
    ai_feedback?: unknown;
    created_at?: string;
  }>;
}

export interface FallbackCoachResult {
  response: string;
  suggestsWorkout: boolean;
}

function formatExerciseName(raw: string): string {
  const norm = raw.toLowerCase().trim();
  if (norm === "squat" || norm === "squats") return "Squats";
  if (norm === "pushup" || norm === "pushups" || norm === "push-up" || norm === "push-ups") return "Push-ups";
  if (
    norm === "bicep_curl" ||
    norm === "bicep_curls" ||
    norm === "bicep curl" ||
    norm === "bicep curls" ||
    norm === "curl" ||
    norm === "curls"
  ) {
    return "Bicep Curls";
  }
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function createDeterministicAICoachFallback(context: FallbackCoachContext): FallbackCoachResult {
  const { message, userProfile, totalSessions, totalReps, avgForm, streakDays, exerciseMap, sessions } = context;
  const msg = message.toLowerCase();

  const userName = userProfile.full_name || "Athlete";
  const fitnessLevel = (userProfile.fitness_level || "beginner").toLowerCase();
  const rawGoal = userProfile.goal ? String(userProfile.goal).replace(/_/g, " ") : "improve overall fitness";
  const availableTime = userProfile.available_time_minutes || 30;

  // Exercise mentions
  const mentionsSquat = /\b(squat|squats)\b/i.test(msg);
  const mentionsPushup = /\b(push-?ups?)\b/i.test(msg);
  const mentionsCurl = /\b(bicep\s*curls?|curls?)\b/i.test(msg);

  // Intent patterns
  const isWorkoutRequest =
    /\b(give me a workout|suggest a workout|generate a workout|new workout|workout routine|routine|plan for today|what should i do today|quick workout|\b\d+\s*[- ]?min(ute)?\b.*workout|workout.*today)\b/i.test(msg) ||
    (/\bworkout\b/i.test(msg) && /\b(give|suggest|plan|routine|start|create|generate|recommend|schedule)\b/i.test(msg));

  const isImprovementQuery = /\b(improve|improvement|work on|better|weakness|critique|fix|progress|advice)\b/i.test(msg);

  const isHistoryQuery =
    /\b(what exercises|which exercises|exercises have i been doing|workout history|my workouts|past workouts|recent sessions|what have i done|did i do this week|show my history)\b/i.test(msg) &&
    !isImprovementQuery;

  const isExerciseSpecific = (mentionsSquat || mentionsPushup || mentionsCurl) && !isWorkoutRequest;

  let response = "";
  let suggestsWorkout = false;

  // Extract exercise breakdown array
  const exerciseEntries = Object.entries(exerciseMap).map(([type, stats]) => {
    const tracked = stats.goodReps + stats.badReps;
    const accuracy = tracked > 0 ? Math.round((stats.goodReps / tracked) * 100) : 0;
    return {
      type,
      name: formatExerciseName(type),
      count: stats.count,
      totalReps: stats.totalReps,
      accuracy,
      coachingNotes: stats.coachingNotes,
    };
  });

  // Sort by accuracy ascending (weakest first)
  exerciseEntries.sort((a, b) => a.accuracy - b.accuracy || b.count - a.count);

  // 1. WORKOUT REQUEST (Intent C)
  if (isWorkoutRequest) {
    suggestsWorkout = true;

    // Calibrate sets and reps based on fitness level
    let squatSets = "3 × 10";
    let pushupSets = "3 × 8";
    let curlSets = "3 × 10";
    let restSecs = "45–60";

    if (fitnessLevel === "advanced") {
      squatSets = "4 × 15–20";
      pushupSets = "4 × 15";
      curlSets = "4 × 12–15";
      restSecs = "30–45";
    } else if (fitnessLevel === "intermediate") {
      squatSets = "3–4 × 12–15";
      pushupSets = "3–4 × 10–12";
      curlSets = "3–4 × 10–12";
      restSecs = "45";
    }

    const timeAlloc = availableTime <= 15 ? "15-minute quick session" : `${availableTime}-minute complete routine`;

    response = `Here is a structured **${timeAlloc}** tailored to your **${fitnessLevel}** level and goal of **${rawGoal}**:

### ⏱️ Session Overview
- **Duration**: ~${Math.min(availableTime, 20)} minutes
- **Rest Interval**: ${restSecs} seconds between sets
- **Focus**: Clean technique with FitNova real-time computer vision tracking

### 🏋️ Main Routine
• **Squats** — ${squatSets}
  *Form Cue: Keep weight centered in mid-foot and descend until hips are parallel with knees.*

• **Push-ups** — ${pushupSets}
  *Form Cue: Maintain a rigid plank from shoulders to heels; keep elbows at a 45° angle.*

• **Bicep Curls** — ${curlSets}
  *Form Cue: Pin your elbows to your sides to eliminate momentum and control the 2-second lowering phase.*

### 💡 Coach's Tip
Start your session in FitNova's **Workout** tab with camera tracking active so every rep is checked for posture, joint alignment, and depth!`;
  }

  // 2. EXERCISE-SPECIFIC QUESTIONS (Intent B)
  else if (isExerciseSpecific) {
    let targetType = "squat";
    let targetName = "Squats";
    if (mentionsPushup) {
      targetType = "pushup";
      targetName = "Push-ups";
    } else if (mentionsCurl) {
      targetType = "bicep_curl";
      targetName = "Bicep Curls";
    }

    // Check user history for target exercise
    const userStat = exerciseEntries.find(
      (e) => e.type.toLowerCase().includes(targetType) || targetType.includes(e.type.toLowerCase())
    );

    let historyInsight = `You haven't logged any ${targetName} sessions yet in FitNova, so building clean technique from rep one will set you up for fast progress.`;
    if (userStat) {
      historyInsight = `From your recorded history, you have completed **${userStat.count} sessions** of ${targetName} (${userStat.totalReps} total reps) with an average **${userStat.accuracy}% form accuracy**.`;
      if (userStat.coachingNotes.length > 0) {
        historyInsight += ` Your recorded form cue: *"${userStat.coachingNotes[0]}"*.`;
      }
    }

    let biomechanics = "";
    if (targetType === "squat") {
      biomechanics = `### 📋 Key Form Cues for Squats
1. **Parallel Depth**: Descend until your hip crease is parallel with or slightly below the top of your knees while keeping your heels firmly planted.
2. **Knee Tracking**: Drive your knees slightly outward over your middle toes to prevent inward collapse (valgus).
3. **Upright Torso**: Brace your abdominal wall and keep your chest lifted to minimize excessive forward torso lean.`;
    } else if (targetType === "pushup") {
      biomechanics = `### 📋 Key Form Cues for Push-ups
1. **Rigid Plank Line**: Squeeze your glutes and brace your core so your body forms a straight line from ears to heels without sagging hips.
2. **45° Elbow Path**: Keep elbows angled backward at ~45 degrees from your torso—avoid flaring them straight out at 90°.
3. **Full Range of Motion**: Lower until your chest is approximately 2–3 inches from the ground, then press firmly through your palms to complete lockout.`;
    } else {
      biomechanics = `### 📋 Key Form Cues for Bicep Curls
1. **Anchor Your Elbows**: Lock your elbows firmly against your ribcage. Do not let them drift forward or swing with shoulder momentum.
2. **Full Extension & Peak Squeeze**: Lower the weight until your arms are fully extended at the bottom, then curl and squeeze your biceps at the top.
3. **Controlled Lowering**: Spend a deliberate 2 seconds on the lowering (eccentric) phase rather than dropping the weight.`;
    }

    response = `Here is your detailed form breakdown for **${targetName}**:

${historyInsight}

${biomechanics}

### 💡 Practice Recommendation
Try a 5–10 rep set with FitNova's vision tracker enabled to verify your joint angles in real time!`;
  }

  // 3. HISTORY INQUIRY (Intent D)
  else if (isHistoryQuery) {
    if (totalSessions === 0) {
      response = `Hello ${userName}! You don't have any recorded workout sessions in FitNova yet. 

Once you complete a workout using the camera tracker, your session logs, form accuracy, and repetition counts will appear here. Head over to the **Workout** tab to start your first session!`;
    } else {
      const breakdownText = exerciseEntries
        .map((e) => `• **${e.name}**: ${e.count} session${e.count === 1 ? "" : "s"} | ${e.totalReps} reps | **${e.accuracy}%** form accuracy`)
        .join("\n");

      const recentFive = sessions.slice(0, 5).map((s, idx) => {
        const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString() : `Session ${idx + 1}`;
        const name = formatExerciseName(s.exercise_type || "Exercise");
        const acc = s.rep_count && s.rep_count > 0 ? Math.round(((s.good_form_reps || 0) / s.rep_count) * 100) : 0;
        return `  - ${dateStr}: ${name} (${s.rep_count || 0} reps, ${acc}% good form)`;
      }).join("\n");

      response = `Here is a summary of your recorded workout history, ${userName}:

### 📊 All-Time Overview
- **Total Workouts Completed**: ${totalSessions} sessions
- **Total Repetitions Logged**: ${totalReps} reps
- **Overall Form Accuracy**: ${avgForm}%
- **Active Consistency Streak**: ${streakDays} consecutive days

### 🏋️ Breakdown by Exercise
${breakdownText}

### 🕒 Recent Sessions (Latest 5)
${recentFive}

You've built impressive momentum—keep your streak alive with your next session!`;
    }
  }

  // 4. IMPROVEMENT / PROGRESS QUESTIONS (Intent A)
  else if (isImprovementQuery) {
    if (totalSessions === 0) {
      response = `Hello ${userName}! Because you don't have any recorded workout sessions in FitNova yet, the best way to improve right now is to establish your baseline:

1. **Pick an Exercise**: Choose **Squats**, **Push-ups**, or **Bicep Curls** in the Workout tab.
2. **Prioritize Form Over Speed**: Perform 8–10 deliberate, controlled repetitions so the vision coach can calibrate your movement mechanics.
3. **Build Consistency**: Logging even one short session today will establish your baseline and generate personalized coaching insights for your goal of **${rawGoal}**.`;
    } else {
      const weakest = exerciseEntries[0];
      const strongest = exerciseEntries.length > 1 ? exerciseEntries[exerciseEntries.length - 1] : null;

      let recordedCueText = "";
      if (weakest.coachingNotes.length > 0) {
        recordedCueText = `\nYour recorded sessions noted: *"${weakest.coachingNotes.slice(0, 2).join('", "')}"*.\n`;
      }

      let cues = "";
      const weakType = weakest.type.toLowerCase();
      if (weakType.includes("squat")) {
        cues = `• **Depth & Weight Distribution**: Lower until hip crease is level with knees; keep weight centered mid-foot without heels lifting.\n• **Knee Tracking**: Push knees outward over your toes to prevent inward valgus collapse.\n• **Torso Stability**: Brace your core and keep your chest lifted throughout the descent.`;
      } else if (weakType.includes("pushup")) {
        cues = `• **Rigid Plank Line**: Prevent hips from sagging or piking by engaging glutes and core.\n• **Elbow Angle**: Tuck elbows to a 45° angle from your ribs to protect shoulders.\n• **Full Range**: Lower until chest touches near the floor and lock out smoothly at the top.`;
      } else if (weakType.includes("curl")) {
        cues = `• **Elbow Pinning**: Keep elbows glued to your sides—eliminate torso swinging or shoulder involvement.\n• **Controlled Eccentric**: Take a steady 2 seconds to lower the weight down.\n• **Complete Extension**: Reach full arm extension at the bottom before curling back up.`;
      } else {
        cues = `• Focus on controlled tempo through both the lifting and lowering phases.\n• Maintain strict joint alignment and core tension throughout each repetition.`;
      }

      let strengthHighlight = "";
      if (strongest && strongest.type !== weakest.type) {
        strengthHighlight = `\n### 🌟 Your Bright Spot\nYou're executing **${strongest.name}** with **${strongest.accuracy}%** form accuracy across ${strongest.count} sessions—that shows excellent neuromuscular control!`;
      }

      response = `Based on your **${totalSessions} recorded workouts** (${totalReps} total reps, **${avgForm}%** overall form accuracy, and an active **${streakDays}-day streak**), here is your tailored coaching assessment:

### 🎯 Primary Area to Improve: **${weakest.name}** (${weakest.accuracy}% form accuracy across ${weakest.count} sessions)
${recordedCueText}
To elevate your ${weakest.name.toLowerCase()} execution:
${cues}
${strengthHighlight}

### 💡 Action Plan for Today
In your next session, prioritize **technique over rep speed**. Aim for 2–3 controlled sets focusing strictly on these cues with FitNova's real-time tracker!`;
    }
  }

  // 5. GENERAL FITNESS / OTHER INQUIRIES (Intent E)
  else {
    let historyContextNote = "";
    if (totalSessions > 0) {
      historyContextNote = ` With **${totalSessions} sessions** and **${totalReps} reps** logged (${avgForm}% form accuracy, ${streakDays}-day streak), you are making steady progress toward your goal of **${rawGoal}**.`;
    }

    response = `Hello ${userName}! As your FitNova coach, I'm here to support your fitness journey.${historyContextNote}

Here are three foundational principles to keep you progressing toward your goal of **${rawGoal}**:

1. **Prioritize Form Integrity**: Real strength is built through clean joint alignment and controlled tempo. Let FitNova's live tracking guide your depth and posture before increasing volume.
2. **Support Your Training with Recovery**: Hydrate consistently throughout the day and aim for 7–8 hours of restorative sleep so your muscles can repair and adapt.
3. **Consistency Over Intensity**: Showing up for regular ${availableTime}-minute sessions beats sporadic high-intensity workouts every time.

How can I help you today? You can ask me for a workout routine, tips on specific exercises (Squats, Push-ups, Bicep Curls), or how to improve based on your recent sessions!`;
  }

  // Append transparent fallback disclaimer
  response += "\n\n*(Coaching guidance compiled from your profile and recorded workout history while the AI service was temporarily busy.)*";

  return {
    response,
    suggestsWorkout,
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: Database connection settings are missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: AI service is not properly configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user using JWT from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired user session. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Fetch user's profile, recent workout sessions, and progress snapshot
    const [profileRes, sessionsRes, snapshotRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("workout_sessions")
        .select("exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, ai_feedback, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("progress_snapshots")
        .select("streak_days, total_reps, total_sessions")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileRes.error || !profileRes.data) {
      console.error("Profile query error:", profileRes.error?.message);
      return new Response(
        JSON.stringify({ error: "Fitness profile not found. Please complete your profile onboarding first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userProfile = profileRes.data as Profile;
    const equipmentStr = Array.isArray(userProfile.equipment)
      ? userProfile.equipment.join(", ")
      : String(userProfile.equipment || "No Equipment");

    // 5. Construct concise, structured workout history context
    const sessions = sessionsRes.data || [];
    const snapshot = snapshotRes.data;

    let workoutHistoryContext = `AUTHENTICATED USER'S RECENT WORKOUT HISTORY:
Status: No recorded workout sessions found yet. The user is starting their journey.`;

    const exerciseTypesList: string[] = [];

    let totalSessions = 0;
    let totalReps = 0;
    let avgForm = 0;
    let streakDays = snapshot?.streak_days ?? 0;
    const exerciseMap: Record<
      string,
      { count: number; totalReps: number; goodReps: number; badReps: number; coachingNotes: string[] }
    > = {};

    if (sessions.length > 0) {
      totalSessions = sessions.length;
      totalReps = sessions.reduce((acc, s) => acc + (s.rep_count || 0), 0);
      const totalGood = sessions.reduce((acc, s) => acc + (s.good_form_reps || 0), 0);
      const totalBad = sessions.reduce((acc, s) => acc + (s.bad_form_reps || 0), 0);
      const trackedTotal = totalGood + totalBad;
      avgForm = trackedTotal > 0 ? Math.round((totalGood / trackedTotal) * 100) : 0;
      streakDays = snapshot?.streak_days ?? (sessions.length > 0 ? 5 : 0);

      for (const s of sessions) {
        const type = (s.exercise_type || "exercise").toLowerCase();
        if (!exerciseMap[type]) {
          exerciseMap[type] = { count: 0, totalReps: 0, goodReps: 0, badReps: 0, coachingNotes: [] };
          exerciseTypesList.push(type);
        }
        exerciseMap[type].count += 1;
        exerciseMap[type].totalReps += (s.rep_count || 0);
        exerciseMap[type].goodReps += (s.good_form_reps || 0);
        exerciseMap[type].badReps += (s.bad_form_reps || 0);

        if (s.ai_feedback && typeof s.ai_feedback === "object") {
          const fb = s.ai_feedback as Record<string, unknown>;
          if (Array.isArray(fb.improvements) && fb.improvements.length > 0) {
            const cue = String(fb.improvements[0]);
            if (!exerciseMap[type].coachingNotes.includes(cue)) {
              exerciseMap[type].coachingNotes.push(cue);
            }
          } else if (typeof fb.next_workout_recommendation === "string") {
            const cue = fb.next_workout_recommendation;
            if (!exerciseMap[type].coachingNotes.includes(cue)) {
              exerciseMap[type].coachingNotes.push(cue);
            }
          }
        }
      }

      const exerciseBreakdown = Object.entries(exerciseMap)
        .map(([name, stats]) => {
          const tracked = stats.goodReps + stats.badReps;
          const accuracy = tracked > 0 ? Math.round((stats.goodReps / tracked) * 100) : 0;
          const notesText = stats.coachingNotes.length > 0
            ? ` | Recorded form cues: ${stats.coachingNotes.slice(0, 2).map((n) => `"${n}"`).join(", ")}`
            : "";
          return `  - ${name.toUpperCase()}: ${stats.count} sessions, ${stats.totalReps} total reps, ${accuracy}% average form accuracy${notesText}`;
        })
        .join("\n");

      // Chronological recent sessions (newest first, limit 5)
      const recentList = sessions.slice(0, 5).map((s, idx) => {
        const good = s.good_form_reps || 0;
        const total = s.rep_count || 0;
        const acc = total > 0 ? Math.round((good / total) * 100) : 0;
        const timeAgo = s.created_at ? new Date(s.created_at).toISOString().split("T")[0] : `Session ${idx + 1}`;
        return `  • ${timeAgo}: ${s.exercise_type} (${total} reps, ${acc}% good form)`;
      }).join("\n");

      workoutHistoryContext = `AUTHENTICATED USER'S RECENT WORKOUT HISTORY:
- Active Streak: ${streakDays} consecutive days
- Total Recorded Workouts: ${totalSessions} sessions
- Total Repetitions Completed: ${totalReps} reps
- Overall Average Form Accuracy: ${avgForm}%
- Exercise Breakdown & Form Records:
${exerciseBreakdown}
- Last 5 Completed Workouts (Most Recent First):
${recentList}`;
    }

    // Parse request body for chat messages
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const conversationHistory: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // System instruction with user context, verified workout history, and safety guidelines
    const systemInstruction = `You are FitNova's dedicated AI fitness coach for students and beginners.
Your goal is to provide encouraging, practical, concise, and safe fitness guidance.

USER PROFILE CONTEXT:
- Name: ${userProfile.full_name || "Athlete"}
- Age: ${userProfile.age || "Not specified"}
- Height: ${userProfile.height_cm ? userProfile.height_cm + " cm" : "Not specified"}
- Weight: ${userProfile.weight_kg ? userProfile.weight_kg + " kg" : "Not specified"}
- Fitness Level: ${userProfile.fitness_level || "beginner"}
- Primary Goal: ${userProfile.goal ? String(userProfile.goal).replace(/_/g, " ") : "improve fitness"}
- Available Time: ${userProfile.available_time_minutes ? userProfile.available_time_minutes + " minutes" : "30 minutes"}
- Equipment: ${equipmentStr}

${workoutHistoryContext}

COACHING RULES:
1. Keep advice concise, encouraging, and actionable.
2. Treat the user's workout history provided above in "AUTHENTICATED USER'S RECENT WORKOUT HISTORY" as authoritative recorded session history.
3. Do NOT claim that historical sessions were "camera-tracked", "tracked by camera", or "seen on camera". Refer to them simply as the user's recorded workouts, past sessions, or session history.
4. You may discuss the recorded form accuracy scores, rep counts, and stored form cues because those are directly present in the session records.
5. NEVER claim you lack access to the user's session logs, history, or workout data when sessions are present in their workout history above.
6. When the user asks what they should improve, what exercises they have been doing, or questions about their workouts, DIRECTLY reference their recorded exercises (${exerciseTypesList.length > 0 ? exerciseTypesList.join(", ") : "Squats, Push-ups, Bicep Curls"}), rep counts, form scores, and stored coaching cues from their history above.
7. If there are NO recorded sessions in the history, gently explain that they do not have enough workout history recorded yet and offer beginner guidance to get started. Do NOT invent fake workout history.
8. When recommending improvements based on recent workouts, cite the specific form cues from their recorded sessions (e.g. core plank line or elbow flare on push-ups, knee tracking or chest upright on squats, eccentric lowering tempo on bicep curls).
9. FitNova specializes in real-time tracking for: Squats, Push-ups, and Bicep Curls.
10. If recommending a new workout session, format exercises cleanly with sets and reps (e.g. • Squats — 3 × 10).
11. Never provide medical diagnoses or prescribe treatment for injuries. Do not claim to replace a doctor or physical therapist.
12. Keep responses concise and focused (usually 2-4 short paragraphs or bullet points).`;

    // Format conversation history for Gemini generateContent
    // Gemini contents format: { role: "user" | "model", parts: [{ text: "..." }] }
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add prior turns (limited to last 6 messages for context window efficiency)
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "model") {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Call Gemini API with configurable model (default: gemini-3.8-flash)
    const modelName = (Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash").trim();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    const requestBody = JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    });

    const MAX_ATTEMPTS = 4;
    const RETRY_DELAYS_MS = [0, 2000, 4000, 8000];
    let geminiRes: Response | null = null;
    let lastTransientStatus: number | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS_MS[attempt] || 4000;
        console.log(`Retrying Gemini request (attempt ${attempt + 1}/${MAX_ATTEMPTS}) after ${delay}ms delay...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });

        // Check if error is transient (429 Rate Limit or 503 Service Unavailable)
        if (!geminiRes.ok && (geminiRes.status === 429 || geminiRes.status === 503)) {
          lastTransientStatus = geminiRes.status;
          console.warn(`Gemini returned transient status ${geminiRes.status} on attempt ${attempt + 1}`);
          continue; // Retry next attempt
        }

        // For non-transient statuses (200 OK or 400/401/403/404/etc), stop retrying immediately
        break;
      } catch (networkErr) {
        console.warn(`Network error during Gemini request on attempt ${attempt + 1}:`, networkErr);
        if (attempt === MAX_ATTEMPTS - 1) {
          break;
        }
      }
    }

    // 1. Process successful Gemini response
    let cleanResponse: string | null = null;
    let mentionsWorkout = false;

    if (geminiRes && geminiRes.ok) {
      try {
        const geminiData = await geminiRes.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText && typeof rawText === "string" && rawText.trim().length > 0) {
          cleanResponse = rawText.trim();
          mentionsWorkout =
            /\b(squat|push-up|pushup|bicep curl|workout|routine|reps|sets)\b/i.test(cleanResponse) &&
            (/\b\d+\s*×\s*\d+\b/i.test(cleanResponse) || /\b\d+\s*reps\b/i.test(cleanResponse) || /\b\d+\s*sets\b/i.test(cleanResponse));
        }
      } catch (parseErr) {
        console.warn("Failed to parse Gemini response JSON:", parseErr);
      }
    }

    if (cleanResponse) {
      return new Response(
        JSON.stringify({
          response: cleanResponse,
          suggestsWorkout: mentionsWorkout,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Preserve permanent configuration/client errors (e.g. 400, 401, 403, 404)
    if (geminiRes && !geminiRes.ok && geminiRes.status !== 429 && geminiRes.status !== 503) {
      try {
        const errJson = await geminiRes.json();
        console.error("Upstream AI engine error:", errJson);
      } catch {
        console.error("Upstream AI engine error with unparseable response body");
      }
      return new Response(
        JSON.stringify({ error: "The AI service is temporarily unable to process this request. Please try again shortly." }),
        { status: geminiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Transient failure fallback (429 rate limit, 503 unavailable, network error, or empty/unparseable response)
    console.warn(
      `Gemini temporarily unavailable (status: ${lastTransientStatus || (geminiRes ? geminiRes.status : "network_failure")}). Generating deterministic fallback coaching response.`
    );

    const fallbackResult = createDeterministicAICoachFallback({
      message,
      userProfile,
      totalSessions,
      totalReps,
      avgForm,
      streakDays,
      exerciseMap,
      sessions,
    });

    return new Response(
      JSON.stringify({
        response: fallbackResult.response,
        suggestsWorkout: fallbackResult.suggestsWorkout,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Unexpected error in ai-coach function:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred while communicating with the AI Coach." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});