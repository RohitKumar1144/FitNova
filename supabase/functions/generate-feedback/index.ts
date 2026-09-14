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

export interface AIPostWorkoutFeedback {
  summary: string;
  what_went_well: string[];
  improvements: string[];
  next_workout_recommendation: string;
  motivation: string;
}

export interface FallbackMetrics {
  exercise: string;
  total: number;
  good: number;
  bad: number;
  duration: number;
  accuracy: number;
  goal?: string;
  level?: string;
}

export function createDeterministicFallbackFeedback(metrics: FallbackMetrics): AIPostWorkoutFeedback {
  const { exercise, total, good, bad, duration, accuracy } = metrics;

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  // Standardize exercise name for display
  const exerciseDisplay =
    exercise === "bicep_curl"
      ? "Bicep Curls"
      : exercise === "pushup"
      ? "Push-ups"
      : exercise === "squat"
      ? "Squats"
      : exercise.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // 1. Summary: Real metrics + transparent disclaimer that AI was unavailable
  let summary: string;
  if (total === 0) {
    summary = `Session ended with 0 completed reps recorded over ${durationText}. Feedback generated from your workout metrics while the AI service was temporarily unavailable.`;
  } else {
    summary = `You completed ${total} ${exerciseDisplay.toLowerCase()} with ${accuracy}% form accuracy (${good} good, ${bad} needing improvement) over ${durationText}. Feedback generated from your workout metrics while the AI service was temporarily unavailable.`;
  }

  // 2. What Went Well (Derived from actual workout metrics)
  const whatWentWell: string[] = [];
  if (good > 0) {
    whatWentWell.push(`Completed ${good} rep${good === 1 ? "" : "s"} with verified, clean form execution.`);
  } else if (total > 0) {
    whatWentWell.push(`Logged ${total} movement attempt${total === 1 ? "" : "s"} during the workout.`);
  } else {
    whatWentWell.push("Took the initiative to begin and complete the movement session.");
  }

  if (accuracy >= 80) {
    whatWentWell.push(`Maintained high form discipline with ${accuracy}% overall accuracy.`);
  } else if (accuracy >= 50) {
    whatWentWell.push(`Demonstrated consistent effort across the ${durationText} workout window.`);
  } else {
    whatWentWell.push("Maintained steady pacing and persisted through the entire session.");
  }

  if (duration >= 30) {
    whatWentWell.push(`Sustained cardiovascular and muscular engagement for ${durationText}.`);
  } else {
    whatWentWell.push("Demonstrated sharp focus and prompt execution from start to finish.");
  }

  // 3. Exercise-specific Improvements / Focus Areas
  const improvements: string[] = [];
  if (exercise === "squat") {
    improvements.push("Depth: Descend until hips are parallel with knees while keeping weight centered through your mid-foot.");
    improvements.push("Knee Alignment: Keep knees tracking directly over your toes without buckling inward.");
    improvements.push("Torso Posture: Brace your core and maintain an upright chest to prevent excessive forward lean.");
  } else if (exercise === "pushup") {
    improvements.push("Plank & Body Alignment: Engage glutes and core to keep a straight line from head to heels without sagging hips.");
    improvements.push("Elbow Position: Keep elbows tucked at approximately a 45-degree angle to protect shoulders.");
    improvements.push("Range of Motion: Lower chest until elbows reach 90 degrees or below, then press to full lockout.");
  } else if (exercise === "bicep_curl") {
    improvements.push("Elbow Stability: Lock elbows firmly to your sides and eliminate shoulder swinging or torso momentum.");
    improvements.push("Range of Motion: Fully extend arms at the bottom and squeeze biceps at peak contraction at the top.");
    improvements.push("Controlled Movement: Lower the weight with a deliberate 2-second eccentric phase rather than dropping.");
  } else {
    improvements.push("Focus on steady movement tempo and full range of motion through both phases.");
    improvements.push("Maintain strict joint alignment and core tension during each repetition.");
  }

  // 4. Recommendation Logic: Progressive overload (>= 80%) vs Technique refinement (< 80%)
  let nextWorkoutRecommendation: string;
  if (accuracy >= 80) {
    if (exercise === "squat") {
      nextWorkoutRecommendation = `Excellent form accuracy (${accuracy}%). For your next session, increase volume by 2-3 reps or add a 1-second pause at the bottom of each squat for progressive overload.`;
    } else if (exercise === "pushup") {
      nextWorkoutRecommendation = `Outstanding form accuracy (${accuracy}%). Progress by adding 1-2 reps per set or slowing down the lowering phase for greater time under tension.`;
    } else if (exercise === "bicep_curl") {
      nextWorkoutRecommendation = `Strong form quality (${accuracy}%). Increase target reps by 2-3 or introduce a 2-second hold at peak contraction for progressive overload.`;
    } else {
      nextWorkoutRecommendation = `Great form quality (${accuracy}%). Progress gradually by increasing your repetition target by 2-3 reps in your next session.`;
    }
  } else {
    if (exercise === "squat") {
      nextWorkoutRecommendation = `Form accuracy was ${accuracy}%. Prioritize technique before adding volume: focus on reaching full parallel depth with an upright chest on every rep.`;
    } else if (exercise === "pushup") {
      nextWorkoutRecommendation = `Form accuracy was ${accuracy}%. Prioritize form over rep count: maintain a rigid plank and 45-degree elbow path before increasing workload.`;
    } else if (exercise === "bicep_curl") {
      nextWorkoutRecommendation = `Form accuracy was ${accuracy}%. Prioritize strict technique: anchor your elbows to eliminate momentum before raising your target repetitions.`;
    } else {
      nextWorkoutRecommendation = `Form accuracy was ${accuracy}%. Focus on refining your movement mechanics and full range of motion before increasing workout volume.`;
    }
  }

  // 5. Motivation
  let motivation: string;
  if (accuracy >= 80) {
    motivation = "Outstanding form quality and consistency—keep building on this fantastic momentum!";
  } else if (accuracy >= 50) {
    motivation = "Solid progress and great effort—consistent technique will take your fitness to the next level!";
  } else {
    motivation = "Every session builds vital neuromuscular coordination—stay dedicated and keep showing up!";
  }

  return {
    summary,
    what_went_well: whatWentWell.slice(0, 3),
    improvements: improvements.slice(0, 3),
    next_workout_recommendation: nextWorkoutRecommendation,
    motivation,
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

    // Parse workout session metrics from body
    const body = await req.json().catch(() => ({}));
    const exercise = String(body.exercise_type || "squat");
    const total = typeof body.rep_count === "number" ? body.rep_count : 0;
    const good = typeof body.good_form_reps === "number" ? body.good_form_reps : 0;
    const bad = typeof body.bad_form_reps === "number" ? body.bad_form_reps : 0;
    const duration = typeof body.duration_seconds === "number" ? body.duration_seconds : 0;
    const accuracy = typeof body.form_accuracy === "number"
      ? body.form_accuracy
      : (total > 0 ? Math.round((good / total) * 100) : 0);
    const goal = String(body.workout_goal || "improve_fitness");
    const level = String(body.fitness_level || "beginner");

    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    const systemPrompt = `You are FitNova's expert AI fitness coach evaluating a completed exercise workout session.
The computer vision system has ALREADY tracked and calculated the exact repetition and form metrics.
Interpret ONLY these actual workout metrics:
- Exercise: ${exercise}
- Total Repetitions: ${total}
- Good-Form Reps: ${good}
- Needs-Improvement Reps: ${bad}
- Duration: ${durationText} (${duration} seconds)
- Form Accuracy: ${accuracy}%
- User Goal: ${goal}
- User Fitness Level: ${level}

You MUST output ONLY valid, raw JSON (no markdown fences, no backticks, no explanatory prose).
Strict JSON Schema:
{
  "summary": "1-2 sentences of short overall assessment based on actual performance",
  "what_went_well": [
    "item 1",
    "item 2 (maximum 3 items total)"
  ],
  "improvements": [
    "item 1",
    "item 2 (maximum 3 items total)"
  ],
  "next_workout_recommendation": "1-2 sentences with concrete recommendation for next session",
  "motivation": "1 short encouraging sentence"
}

STRICT COACHING RULES:
1. summary: Exactly 1-2 concise sentences.
2. what_went_well: Array of up to 3 specific items praising real achievements. If reps were 0, praise taking initiative.
3. improvements: Array of up to 3 actionable, constructive cues for this specific exercise (e.g. depth for squats, elbow flare for pushups, elbow swing for curls).
4. next_workout_recommendation: 1-2 sentences. If accuracy < 70%, recommend form before volume. If >=80%, gradual progression.
5. motivation: Exactly 1 short, positive sentence.
6. NEVER invent medical information.
7. NEVER diagnose injuries or health conditions.
8. Keep advice encouraging, practical, and safe for beginners and students.`;

    // Call Gemini API with configurable model (default: gemini-3.8-flash)
    const modelName = (Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash").trim();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

    const requestBody = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
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
      }
    }

    let parsedFeedback: any = null;

    // 1. Try parsing successful Gemini response
    if (geminiRes && geminiRes.ok) {
      try {
        const geminiData = await geminiRes.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanJson = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          parsedFeedback = JSON.parse(cleanJson);
        }
      } catch (parseErr) {
        console.warn("Failed to parse Gemini feedback output:", parseErr);
      }
    }

    let sanitizedFeedback: AIPostWorkoutFeedback;

    if (parsedFeedback && typeof parsedFeedback === "object") {
      // Gemini succeeded and returned valid JSON
      sanitizedFeedback = {
        summary: typeof parsedFeedback.summary === "string" && parsedFeedback.summary.trim().length > 0
          ? parsedFeedback.summary.trim()
          : `You completed ${total} ${exercise}s with ${accuracy}% form accuracy. Great dedication!`,
        what_went_well: Array.isArray(parsedFeedback.what_went_well)
          ? parsedFeedback.what_went_well.slice(0, 3).map((item: any) => String(item).trim()).filter(Boolean)
          : ["Solid workout consistency and effort."],
        improvements: Array.isArray(parsedFeedback.improvements)
          ? parsedFeedback.improvements.slice(0, 3).map((item: any) => String(item).trim()).filter(Boolean)
          : ["Focus on controlled tempo and full range of motion."],
        next_workout_recommendation: typeof parsedFeedback.next_workout_recommendation === "string" && parsedFeedback.next_workout_recommendation.trim().length > 0
          ? parsedFeedback.next_workout_recommendation.trim()
          : (accuracy >= 80
            ? "Progress gradually by adding 2-3 reps next session."
            : "Keep the same repetition target and prioritize clean form execution."),
        motivation: typeof parsedFeedback.motivation === "string" && parsedFeedback.motivation.trim().length > 0
          ? parsedFeedback.motivation.trim()
          : "Every rep brings you closer to your fitness goals!",
      };
    } else {
      // Check for permanent configuration/authentication errors (e.g. 400, 401, 403, 404)
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

      // For transient failures (429 rate limit, 503 unavailable, network failures, or unparseable AI output)
      console.warn(
        `Gemini temporarily unavailable (status: ${lastTransientStatus || (geminiRes ? geminiRes.status : "network_failure")}). Generating deterministic fallback feedback.`
      );
      sanitizedFeedback = createDeterministicFallbackFeedback({
        exercise,
        total,
        good,
        bad,
        duration,
        accuracy,
        goal,
        level,
      });
    }

    // Save into Supabase `workout_sessions` table
    let savedSession = null;
    if (body.session_id) {
      const { data, error: updateErr } = await supabase
        .from("workout_sessions")
        .update({
          ai_feedback: sanitizedFeedback,
        })
        .eq("id", body.session_id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateErr) {
        console.warn("Failed to update workout session with ai_feedback:", updateErr.message);
      } else {
        savedSession = data;
      }
    } else {
      const { data, error: insertErr } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          exercise_type: exercise,
          rep_count: total,
          good_form_reps: good,
          bad_form_reps: bad,
          duration_seconds: duration,
          ai_feedback: sanitizedFeedback,
        })
        .select()
        .single();

      if (insertErr) {
        console.warn("Failed to insert workout session with ai_feedback:", insertErr.message);
      } else {
        savedSession = data;
      }
    }

    return new Response(
      JSON.stringify({
        data: savedSession,
        feedback: sanitizedFeedback,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Unexpected error in generate-feedback function:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred during feedback generation." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});