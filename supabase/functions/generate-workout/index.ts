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

interface WorkoutPlan {
  title: string;
  description: string;
  duration_minutes: number;
  difficulty: string;
  goal: string;
  warmup: WarmupItem[];
  exercises: ExerciseItem[];
  cooldown: CooldownItem[];
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

    // 5. Fetch user's recent workout performance for mild progression
    const { data: recentSessions } = await supabase
      .from("workout_sessions")
      .select("exercise_type, rep_count, good_form_reps, bad_form_reps, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    let performanceContext = "No prior workout sessions recorded.";
    if (recentSessions && recentSessions.length > 0) {
      performanceContext = recentSessions
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
${performanceContext}
   Use this performance history for mild progression or appropriate adjustments. If the user demonstrated good form, you may slightly progress volume. If form needed improvement, prioritize clean form cues and manageable volume.

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
        JSON.stringify({ error: "Failed to generate workout plan from AI." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse & Validate JSON
    let parsedPlan: any;
    try {
      const cleanJson = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      parsedPlan = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("Failed to parse Gemini output:", rawText, parseErr);
      return new Response(
        JSON.stringify({ error: "Received malformed data from AI engine. Please retry." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      // Ensure rest_seconds and instructions are present
      ex.rest_seconds = typeof ex.rest_seconds === "number" ? ex.rest_seconds : 45;
      ex.instructions = ex.instructions || ex.reason || "Maintain controlled cadence and full range of motion.";
      ex.reason = ex.reason || ex.instructions;
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