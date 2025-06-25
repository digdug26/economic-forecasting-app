import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, role, name } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let redirectTo = Deno.env.get("INVITE_REDIRECT_URL") ?? undefined;
    if (!redirectTo) {
      const siteUrl =
        Deno.env.get("REACT_APP_SITE_URL") || Deno.env.get("NEXT_PUBLIC_SITE_URL");
      if (siteUrl) {
        redirectTo = siteUrl.replace(/\/+$/, "") + "/signup";
      }
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.rpc('create_user_invitation', {
      user_email: email,
      user_name: name ?? '',
      user_role: role ?? 'forecaster'
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: { name, role }
      }
    );

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
