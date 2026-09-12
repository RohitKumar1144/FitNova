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

    // System instruction with user context and safety guidelines
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

COACHING RULES:
1. Keep advice concise, motivating, and actionable.
2. When the user asks for a workout routine or quick session, provide a simple, structured routine appropriate to their available time and fitness level.
3. FitNova specializes in real-time camera tracking for: Squats, Push-ups, and Bicep Curls. You can recommend these core exercises as well as simple bodyweight movements (planks, lunges, jumping jacks).
4. If recommending a workout session, format exercises cleanly with sets and reps (e.g. • Squats — 3 × 10).
5. Never provide medical diagnoses or prescribe treatment for injuries. Do not claim to replace a doctor or physical therapist.
6. Do not recommend dangerous, extreme, or unsafe training. Encourage good form and gradual progression.
7. Keep responses concise (usually 2-4 short paragraphs or bullet points).`;

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