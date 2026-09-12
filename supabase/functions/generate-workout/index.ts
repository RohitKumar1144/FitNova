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
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired user session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Fetch user's profile from `profiles`
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Fitness profile not found. Please complete your profile onboarding first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userProfile = profile as Profile;
    const equipmentStr = Array.isArray(userProfile.equipment)
      ? userProfile.equipment.join(", ")
      : String(userProfile.equipment || "No Equipment");

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

2. TRACKED EXERCISES RESTRICTION:
   FitNova uses real-time computer vision to track form and reps. For the "exercises" array, you MUST use ONLY these exact "exercise_type" values:
   - "squat"
   - "pushup"
   - "bicep_curl"
   DO NOT use any other string for "exercise_type". If the user does not have dumbbells or equipment for bicep_curl, focus on squats and pushups (or suitable bodyweight/household variations, e.g. backpack curls).

3. The duration_minutes MUST be ${userProfile.available_time_minutes || 30}.
4. Provide realistic sets (e.g. 2-4), reps (e.g. 8-15), and rest_seconds (e.g. 30-90).
5. Output format must strictly match this JSON schema:
{
  "title": "string",
  "description": "string",
  "duration_minutes": number,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "goal": "string",
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
      "instructions": "string"
    }
  ],
  "cooldown": [
    { "name": "string", "duration_seconds": number }
  ]
}`;

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI service is currently busy. Please try again shortly." }),
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
    let parsedPlan: WorkoutPlan;
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

    // Validate fields & exercise_type safety
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
    }

    // Ensure fallback fields
    parsedPlan.duration_minutes = parsedPlan.duration_minutes || userProfile.available_time_minutes || 30;
    parsedPlan.difficulty = parsedPlan.difficulty || userProfile.fitness_level || "beginner";
    parsedPlan.goal = parsedPlan.goal || userProfile.goal || "improve_fitness";
    parsedPlan.warmup = Array.isArray(parsedPlan.warmup) ? parsedPlan.warmup : [];
    parsedPlan.cooldown = Array.isArray(parsedPlan.cooldown) ? parsedPlan.cooldown : [];

    // 4. Save into Supabase `workout_plans` table
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