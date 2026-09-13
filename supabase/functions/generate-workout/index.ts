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

interface WarmupItem {
  name: string;
  duration_seconds: number;
}

interface ExerciseItem {
  name: string;
  exercise_type: "squat" | "pushup" | "bicep_curl";
  sets: number;
  reps: number;
  rest_seconds: number;
  instructions: string;
}

interface CooldownItem {
  name: string;
  duration_seconds: number;
}

interface AdaptationResult {
  exercise_type: string;
  previous_reps: number;
  next_reps: number;
  direction: "increase" | "maintain" | "decrease";
  form_accuracy: number;
  completion_rate: number;
  reason: string;
}

interface WorkoutPlan {
  title: string;
  description: string;
  duration_minutes: number;
  difficulty: string;
  goal: string;
  warmup: WarmupItem[];
  exercises: ExerciseItem[];
  cooldown: CooldownItem[];
  coach_note?: string;
  adaptations?: AdaptationResult[];
}

// Deterministic adaptation calculation
function computeExerciseAdaptation(
  exerciseType: string,
  completedReps: number,
  goodFormReps: number,
  badFormReps: number,
  targetReps?: number
): AdaptationResult {
  const minReps = 5;
  const maxReps = 30;
  const defaultBaseline = 10;
  const trackedReps = goodFormReps + badFormReps;

  const previousReps = targetReps && targetReps > 0
    ? targetReps
    : (completedReps > 0 ? completedReps : defaultBaseline);

  const formAccuracy = trackedReps > 0
    ? Math.round((goodFormReps / trackedReps) * 100)
    : (completedReps > 0 ? 80 : 0);

  const completionRate = previousReps > 0 ? completedReps / previousReps : 1.0;

  // 1. Zero reps / aborted session
  if (completedReps === 0) {
    return {
      exercise_type: exerciseType,
      direction: "maintain",
      previous_reps: previousReps,
      next_reps: Math.max(minReps, previousReps),
      form_accuracy: 0,
      completion_rate: 0,
      reason: "No completed reps recorded -- maintaining target to establish baseline.",
    };
  }

  // 2. Substantial under-completion: completed < 80% of target
  if (completedReps < 0.8 * previousReps) {
    const stepDown = Math.max(1, Math.round(previousReps * 0.15));
    const nextReps = Math.max(minReps, previousReps - stepDown);
    if (formAccuracy < 75) {
      return {
        exercise_type: exerciseType,
        direction: "decrease",
        previous_reps: previousReps,
        next_reps: nextReps,
        form_accuracy: formAccuracy,
        completion_rate: Math.round(completionRate * 100),
        reason: "Form needs improvement -- reducing reps and prioritizing clean technique.",
      };
    }

    return {
      exercise_type: exerciseType,
      direction: "decrease",
      previous_reps: previousReps,
      next_reps: nextReps,
      form_accuracy: formAccuracy,
      completion_rate: Math.round(completionRate * 100),
      reason: "Good form, but completion was below target -- keeping the workload steady.",
    };
  }

  // 3. Form Accuracy Rules (with completion >= 80%)
  if (formAccuracy >= 90) {
    const rawStep = Math.round(previousReps * 0.15);
    const stepUp = Math.min(
      Math.max(1, rawStep),
      Math.max(1, Math.floor(previousReps * 0.20))
    );
    const nextReps = Math.min(maxReps, previousReps + stepUp);
    return {
      exercise_type: exerciseType,
      direction: nextReps > previousReps ? "increase" : "maintain",
      previous_reps: previousReps,
      next_reps: nextReps,
      form_accuracy: formAccuracy,
      completion_rate: Math.round(completionRate * 100),
      reason: "Excellent form and full completion -- increasing reps slightly.",
    };
  }

  if (formAccuracy >= 75) {
    return {
      exercise_type: exerciseType,
      direction: "maintain",
      previous_reps: previousReps,
      next_reps: previousReps,
      form_accuracy: formAccuracy,
      completion_rate: Math.round(completionRate * 100),
      reason: "Good form and completion -- building consistency with current workload.",
    };
  }

  // Poor form (< 75%): decrease by ~10-20%
  const stepDown = Math.max(1, Math.round(previousReps * 0.15));
  const nextReps = Math.max(minReps, previousReps - stepDown);
  return {
    exercise_type: exerciseType,
    direction: "decrease",
    previous_reps: previousReps,
    next_reps: nextReps,
    form_accuracy: formAccuracy,
    completion_rate: Math.round(completionRate * 100),
    reason: "Form needs improvement -- reducing reps and prioritizing clean technique.",
  };
}

// Deterministic fallback plan compiled when Gemini is temporarily unavailable
function createDeterministicFallbackPlan(
  userProfile: Profile,
  adaptationsMap: Map<string, AdaptationResult>,
  adaptationsList: AdaptationResult[]
): WorkoutPlan {
  const fitnessLevel = userProfile.fitness_level || "beginner";
  const durationMinutes = userProfile.available_time_minutes || 30;
  const goal = userProfile.goal || "improve_fitness";

  const defaultSets = fitnessLevel === "advanced" ? 4 : fitnessLevel === "intermediate" ? 3 : 3;
  const defaultRest = fitnessLevel === "advanced" ? 45 : 60;

  const exercises: ExerciseItem[] = [
    {
      name: "Bodyweight Squat",
      exercise_type: "squat",
      sets: defaultSets,
      reps: adaptationsMap.get("squat")?.next_reps ?? (fitnessLevel === "advanced" ? 20 : fitnessLevel === "intermediate" ? 15 : 12),
      rest_seconds: defaultRest,
      instructions: "Stand shoulder-width apart. Lower hips until thighs are parallel to the floor, driving knees out and keeping chest elevated.",
      reason: adaptationsMap.get("squat")?.reason ?? "Builds functional lower-body foundation and posterior chain stability.",
    },
    {
      name: "Standard Push-up",
      exercise_type: "pushup",
      sets: defaultSets,
      reps: adaptationsMap.get("pushup")?.next_reps ?? (fitnessLevel === "advanced" ? 15 : fitnessLevel === "intermediate" ? 12 : 8),
      rest_seconds: defaultRest,
      instructions: "Maintain a rigid plank line. Lower chest with elbows at 45 degrees, bracing core and glutes throughout.",
      reason: adaptationsMap.get("pushup")?.reason ?? "Develops upper body pushing endurance and reinforces core plank integrity.",
    },
    {
      name: "Bicep Curl",
      exercise_type: "bicep_curl",
      sets: defaultSets,
      reps: adaptationsMap.get("bicep_curl")?.next_reps ?? (fitnessLevel === "advanced" ? 16 : fitnessLevel === "intermediate" ? 12 : 10),
      rest_seconds: 45,
      instructions: "Keep elbows fixed at your sides. Curl with control to peak contraction and lower slowly over 2 seconds.",
      reason: adaptationsMap.get("bicep_curl")?.reason ?? "Isolates arm flexion mechanics with emphasis on eccentric tempo control.",
    },
  ];

  const warmup: WarmupItem[] = [
    { name: "Arm Circles & Shoulder Dislocates", duration_seconds: 60 },
    { name: "Bodyweight Hip Hinges", duration_seconds: 60 },
    { name: "Dynamic Leg Swings", duration_seconds: 60 },
  ];

  const cooldown: CooldownItem[] = [
    { name: "Standing Quad & Hip Flexor Stretch", duration_seconds: 60 },
    { name: "Doorway Chest Opener", duration_seconds: 60 },
    { name: "Child's Pose Spine Decompression", duration_seconds: 60 },
  ];

  const plan: WorkoutPlan = {
    title: "Full Body Adaptive Progression (Calibrated Routine)",
    description: `Calibrated for your ${fitnessLevel} foundation with adaptive rep scaling based on exercise form history.`,
    duration_minutes: durationMinutes,
    difficulty: fitnessLevel,
    goal: goal,
    warmup,
    exercises,
    cooldown,
    coach_note: "Adaptive fallback routine calibrated from your profile and recent exercise form metrics.",
  };

  if (adaptationsList.length > 0) {
    plan.adaptations = adaptationsList;
  }

  return plan;
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

    // 4. Fetch user's profile from `profiles`
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile query error:", profileError?.message);
      return new Response(
        JSON.stringify({ error: "Fitness profile not found. Please complete your profile onboarding first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userProfile = profile as Profile;
    const equipmentStr = Array.isArray(userProfile.equipment)
      ? userProfile.equipment.join(", ")
      : String(userProfile.equipment || "No Equipment");

    // Optional request body (client pre-calculated adaptations)
    let clientAdaptations: AdaptationResult[] | null = null;
    if (req.body) {
      try {
        const bodyJson = await req.json();
        if (Array.isArray(bodyJson?.adaptations) && bodyJson.adaptations.length > 0) {
          clientAdaptations = bodyJson.adaptations;
        }
      } catch {
        // Empty or non-JSON body
      }
    }

    // 5. Fetch user's recent workout performance for deterministic adaptation
    const { data: recentSessions } = await supabase
      .from("workout_sessions")
      .select("exercise_type, rep_count, good_form_reps, bad_form_reps, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Compute deterministic adaptations for each unique exercise
    const adaptationsMap = new Map<string, AdaptationResult>();

    if (clientAdaptations && clientAdaptations.length > 0) {
      for (const adapt of clientAdaptations) {
        adaptationsMap.set(adapt.exercise_type, adapt);
      }
    } else if (recentSessions && recentSessions.length > 0) {
      const seenTypes = new Set<string>();
      for (const s of recentSessions) {
        if (s.exercise_type && !seenTypes.has(s.exercise_type)) {
          seenTypes.add(s.exercise_type);
          const computed = computeExerciseAdaptation(
            s.exercise_type,
            s.rep_count || 0,
            s.good_form_reps || 0,
            s.bad_form_reps || 0
          );
          adaptationsMap.set(s.exercise_type, computed);
        }
      }
    }

    const adaptationsList = Array.from(adaptationsMap.values());

    let adaptationConstraintsText = "";
    if (adaptationsList.length > 0) {
      const bulletPoints = adaptationsList
        .map(
          (a) =>
            `- ${a.exercise_type}: MUST use exactly ${a.next_reps} reps per set (Previous: ${a.previous_reps} reps, Form score: ${a.form_accuracy}%, Reason: ${a.reason})`
        )
        .join("\n");
      adaptationConstraintsText = `\n\nDETERMINISTIC PROGRESSION TARGETS (STRICT REQUIREMENT):\nThe following exercise targets were computed based on previous form quality:\n${bulletPoints}\nYou MUST respect these exact 'reps' numbers for any of these exercises you include. Do NOT alter or recalculate the reps.`;
    }

    let performanceContext = "No prior workout sessions recorded.";
    if (recentSessions && recentSessions.length > 0) {
      performanceContext = recentSessions
        .slice(0, 5)
        .map(
          (s: { exercise_type: string; rep_count: number; good_form_reps: number; bad_form_reps: number }) =>
            `- ${s.exercise_type}: ${s.rep_count} total reps (${s.good_form_reps || 0} good form, ${s.bad_form_reps || 0} needs improvement)`
        )
        .join("\n");
    }

    // 6. Construct carefully constrained prompt for Gemini
    const systemPrompt = `You are FitNova's certified AI fitness trainer, specialized in designing safe, science-backed workout plans for students and beginners.
You MUST output ONLY valid, raw JSON (no markdown fences, no backticks, no explanatory prose).

CRITICAL CONSTRAINTS:
1. The user's profile is:
   - Full Name: ${userProfile.full_name || "Athlete"}
   - Age: ${userProfile.age || 20}
   - Height: ${userProfile.height_cm || 170} cm
   - Weight: ${userProfile.weight_kg || 65} kg
   - Fitness Level: ${userProfile.fitness_level || "beginner"}
   - Primary Goal: ${userProfile.goal || "improve_fitness"}
   - Available Time: ${userProfile.available_time_minutes || 30} minutes
   - Available Equipment: ${equipmentStr}

2. RECENT WORKOUT PERFORMANCE CONTEXT:
${performanceContext}${adaptationConstraintsText}

3. TRACKED EXERCISES RESTRICTION:
   FitNova uses real-time computer vision to track form and reps. For the "exercises" array, you MUST use ONLY these exact "exercise_type" values:
   - "squat"
   - "pushup"
   - "bicep_curl"
   DO NOT use any other string for "exercise_type". If the user has no equipment for bicep_curl, focus on squats and pushups (or suitable bodyweight/household variations like backpack curls).

4. The duration_minutes MUST be ${userProfile.available_time_minutes || 30}.
5. Provide realistic sets (e.g. 2-4), reps (e.g. 8-15), and rest_seconds (e.g. 30-90).
6. Output format must strictly match this JSON schema:
{
  "title": "string",
  "description": "string",
  "duration_minutes": number,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "goal": "string",
  "coach_note": "string",
  "warmup": [
    { "name": "string", "duration_seconds": number }
  ],
  "exercises": [
    {
      "name": "string",
      "exercise_type": "squat" | "pushup" | "bicep_curl",
      "sets": number,
      "reps": number,
      "rest_seconds": number,
      "instructions": "string",
      "reason": "string"
    }
  ],
  "cooldown": [
    { "name": "string", "duration_seconds": number }
  ]
}`;

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
        if (attempt === MAX_ATTEMPTS - 1) {
          throw networkErr;
        }
      }
    }

    let parsedPlan: any = null;

    // 1. Try parsing successful Gemini response
    if (geminiRes && geminiRes.ok) {
      try {
        const geminiData = await geminiRes.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanJson = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          parsedPlan = JSON.parse(cleanJson);
        }
      } catch (parseErr) {
        console.warn("Failed to parse Gemini output:", parseErr);
      }
    }

    // 2. Fallback or Permanent Error Handling
    if (!parsedPlan) {
      // Check for permanent configuration/authentication errors (e.g. 400, 401, 403, 404)
      if (geminiRes && !geminiRes.ok && geminiRes.status !== 429 && geminiRes.status !== 503) {
        let errDetail = "AI engine error.";
        try {
          const errJson = await geminiRes.json();
          if (errJson?.error?.message) {
            errDetail = `AI engine: ${errJson.error.message}`;
          }
        } catch {
          // ignore
        }
        return new Response(
          JSON.stringify({ error: errDetail }),
          { status: geminiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For transient failures (429 rate limit, 503 unavailable, network failures, or unparseable AI output)
      // Compile deterministic personalized workout routine from user's profile and adaptations
      console.warn(
        `Gemini temporarily unavailable (status: ${lastTransientStatus || (geminiRes ? geminiRes.status : "network_failure")}). Compiling deterministic adaptive fallback routine.`
      );
      parsedPlan = createDeterministicFallbackPlan(userProfile, adaptationsMap, adaptationsList);
    }

    // Comprehensive validation
    if (!parsedPlan || typeof parsedPlan !== "object") {
      return new Response(
        JSON.stringify({ error: "AI returned invalid response structure." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!parsedPlan.title || typeof parsedPlan.title !== "string") {
      parsedPlan.title = "Personalized Full-Body Session";
    }

    const allowedTypes = new Set(["squat", "pushup", "bicep_curl"]);
    if (!Array.isArray(parsedPlan.exercises) || parsedPlan.exercises.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI response did not include any exercises." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const ex of parsedPlan.exercises) {
      if (!allowedTypes.has(ex.exercise_type)) {
        console.error("Invalid exercise_type returned:", ex.exercise_type);
        return new Response(
          JSON.stringify({ error: "Invalid exercise type detected in generated routine." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!ex.name || typeof ex.sets !== "number" || typeof ex.reps !== "number") {
        return new Response(
          JSON.stringify({ error: "Invalid exercise structure in generated routine." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Enforce deterministic adaptation reps if present
      const targetAdapt = adaptationsMap.get(ex.exercise_type);
      if (targetAdapt) {
        ex.reps = targetAdapt.next_reps;
      }

      // Ensure rest_seconds and instructions are present
      ex.rest_seconds = typeof ex.rest_seconds === "number" ? ex.rest_seconds : 45;
      ex.instructions = ex.instructions || ex.reason || "Maintain controlled cadence and full range of motion.";
      ex.reason = ex.reason || ex.instructions;
    }

    // Attach deterministic adaptations to plan
    if (adaptationsList.length > 0) {
      parsedPlan.adaptations = adaptationsList;
    }

    // Ensure fallback fields
    parsedPlan.duration_minutes = typeof parsedPlan.duration_minutes === "number"
      ? parsedPlan.duration_minutes
      : userProfile.available_time_minutes || 30;
    parsedPlan.difficulty = typeof parsedPlan.difficulty === "string"
      ? parsedPlan.difficulty
      : userProfile.fitness_level || "beginner";
    parsedPlan.goal = typeof parsedPlan.goal === "string"
      ? parsedPlan.goal
      : userProfile.goal || "improve_fitness";
    parsedPlan.description = parsedPlan.description || parsedPlan.coach_note || "AI calibrated routine for form accuracy.";
    parsedPlan.coach_note = parsedPlan.coach_note || parsedPlan.description;
    parsedPlan.warmup = Array.isArray(parsedPlan.warmup) ? parsedPlan.warmup : [];
    parsedPlan.cooldown = Array.isArray(parsedPlan.cooldown) ? parsedPlan.cooldown : [];

    // Save into Supabase `workout_plans` table
    const { data: savedPlan, error: saveError } = await supabase
      .from("workout_plans")
      .insert({
        user_id: user.id,
        plan_json: parsedPlan,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Database save error:", saveError);
      return new Response(
        JSON.stringify({ error: "Failed to save generated workout to database." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ data: savedPlan, plan: parsedPlan }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Unexpected error in generate-workout function:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred during workout generation." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});