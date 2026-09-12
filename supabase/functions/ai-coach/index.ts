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
        JSON.stringify({ error: "Server misconfiguration: Supabase environment variables missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: GEMINI_API_KEY is not configured in Edge Function secrets." }),
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

    if (sessions.length > 0) {
      const totalSessions = sessions.length;
      const totalReps = sessions.reduce((acc, s) => acc + (s.rep_count || 0), 0);
      const totalGood = sessions.reduce((acc, s) => acc + (s.good_form_reps || 0), 0);
      const totalBad = sessions.reduce((acc, s) => acc + (s.bad_form_reps || 0), 0);
      const trackedTotal = totalGood + totalBad;
      const avgForm = trackedTotal > 0 ? Math.round((totalGood / trackedTotal) * 100) : 0;
      const streakDays = snapshot?.streak_days ?? (sessions.length > 0 ? 5 : 0);

      // Aggregate stats per exercise type
      const exerciseMap: Record<
        string,
        { count: number; totalReps: number; goodReps: number; badReps: number; coachingNotes: string[] }
      > = {};

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
          throw networkErr;
        }
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      let errDetail = "AI service is temporarily busy. Please try again in a moment.";
      if (geminiRes) {
        try {
          const errJson = await geminiRes.json();
          // For permanent errors (non-429/503), surface message; for 429/503 keep user-friendly message
          if (geminiRes.status !== 429 && geminiRes.status !== 503 && errJson?.error?.message) {
            errDetail = `AI engine: ${errJson.error.message}`;
          }
        } catch {
          // ignore
        }
      }
      return new Response(
        JSON.stringify({ error: errDetail }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Failed to receive response from AI Coach." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanResponse = rawText.trim();

    // Check if the response contains workout recommendation (e.g. mentions sets, reps, or exercises)
    const mentionsWorkout = /\b(squat|push-up|pushup|bicep curl|workout|routine|reps|sets)\b/i.test(cleanResponse) &&
      (/\b\d+\s*×\s*\d+\b/i.test(cleanResponse) || /\b\d+\s*reps\b/i.test(cleanResponse) || /\b\d+\s*sets\b/i.test(cleanResponse));

    return new Response(
      JSON.stringify({
        response: cleanResponse,
        suggestsWorkout: mentionsWorkout,
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