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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    // Prioritize standard service role key or secret key from Supabase Edge Vault
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Missing required server-side Supabase configuration keys.");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: Service credentials missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Initialize Admin client (server-side only, never exposed to client)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Identify dedicated FitNova demo account authoritatively
    // DEMO_USER_EMAIL is the authoritative demo-user identifier.
    // If not configured, fall back to exact default "demo@fitnova.app".
    const targetEmail = (Deno.env.get("DEMO_USER_EMAIL") || "demo@fitnova.app").trim().toLowerCase();

    // Verify the user exists in Supabase Auth by exact email (no wildcard matching)
    const { data: userListData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 100,
    });

    if (listError) {
      console.error("Error verifying demo user in auth:", listError);
      return new Response(
        JSON.stringify({ error: "Failed to verify demo user status." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const demoUser = userListData?.users?.find(
      (u) => u.email?.toLowerCase() === targetEmail
    );

    if (!demoUser) {
      console.error(`Dedicated demo account not found for configured email: ${targetEmail}`);
      return new Response(
        JSON.stringify({
          error: `Dedicated demo account (${targetEmail}) not found. Please ensure the demo user exists in Supabase.`,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Programmatically generate a secure, one-time magic link token hash for the demo account
    // This generates the cryptographic token directly without sending an external email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Demo link generation error:", linkError);
      return new Response(
        JSON.stringify({ error: linkError?.message || "Failed to generate demo session token." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Exchange the token hash on the server for a valid access_token and refresh_token
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

    let session = null;

    // Try verifying token with type 'email'
    const { data: verifyData } = await supabaseAnon.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "email",
    });

    if (verifyData?.session) {
      session = verifyData.session;
    } else {
      // Try verifying with type 'magiclink'
      const { data: verifyData2, error: verifyError2 } = await supabaseAnon.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

      if (verifyData2?.session) {
        session = verifyData2.session;
      } else {
        console.error("Token verification failure:", verifyError2);
        return new Response(
          JSON.stringify({ error: "Failed to exchange demo authentication token." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Return only the minimal authenticated session required by browser
    return new Response(
      JSON.stringify({
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          token_type: session.token_type,
          user: {
            id: session.user.id,
            email: session.user.email,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    console.error("Unexpected error in demo-login function:", errorMsg);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred during demo authentication." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
