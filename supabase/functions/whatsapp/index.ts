import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Normalizes an Indian mobile number to 91XXXXXXXXXX
 * - Removes +, spaces, hyphens, brackets
 * - Prepends 91 if exactly 10 digits
 */
function normalizeMobile(phone: string): string {
  let cleaned = phone.replace(/[\+\s\-\(\)]/g, "");
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned;
  } else if (cleaned.length === 13 && cleaned.startsWith("91")) {
    return cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Sleeps for a given number of milliseconds
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the WhatAPI n8n Webhook with automatic retries and logging
 */
async function callWhatApiWebhook(payload: Record<string, any>) {
  const webhookUrl = Deno.env.get("WHATAPI_WEBHOOK_URL");
  const apiKey = Deno.env.get("WHATAPI_API_KEY");
  
  if (!webhookUrl || !apiKey) {
    console.error("[Webhook Error] Configuration Error: Missing environment variables.");
    throw new Error("Configuration Error");
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    const requestTime = new Date().toISOString();
    
    try {
      console.log(`[OUTGOING WHATSAPP REQUEST] Timestamp: ${requestTime}`);
      console.log(`[OUTGOING WHATSAPP REQUEST] Action/Trigger Source: ${payload.action || 'Unknown (Raw Webhook)'}`);
      console.log(`[OUTGOING WHATSAPP REQUEST] Template: ${payload.template}`);
      console.log(`[OUTGOING WHATSAPP REQUEST] Type: ${payload.type}`);
      console.log(`[OUTGOING WHATSAPP REQUEST] Phone: ${payload.phone || payload.number}`);
      console.log(`[OUTGOING WHATSAPP REQUEST] Full Payload:`, JSON.stringify(payload));

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const status = response.status;

      // Logging requirement: Phone Number, Message Type, Request Time, HTTP Status, Error Message
      const logInfo = `Phone: ${payload.number || payload.phone} | Type: ${payload.message || payload.type} | Time: ${requestTime} | Status: ${status}`;
      
      if (status === 200) {
        console.log(`[Success] ${logInfo}`);
        const data = await response.json().catch(() => ({}));
        return data;
      } 
      
      if ([400, 401, 403, 404].includes(status)) {
        let errorMsg = "Unknown Error";
        if (status === 400) errorMsg = "Validation Error";
        if (status === 401 || status === 403) errorMsg = "Authentication Error";
        if (status === 404) errorMsg = "Configuration Error";
        
        console.error(`[Failed] ${logInfo} | Error: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      if ([500, 502, 503, 504].includes(status)) {
        console.warn(`[Retry ${attempt}/${maxRetries}] ${logInfo} | Server Error`);
        if (attempt <= maxRetries) {
          await sleep(1000 * attempt); // Exponential backoff
          continue;
        } else {
          console.error(`[Failed] ${logInfo} | Error: Max retries exceeded`);
          throw new Error("Max retries exceeded");
        }
      }

      // Any other status
      console.error(`[Failed] ${logInfo} | Error: Unexpected HTTP status`);
      throw new Error("Unexpected HTTP status");

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg === "Validation Error" || errorMsg === "Authentication Error" || errorMsg === "Configuration Error") {
        throw err; // Already logged and fatal
      }
      
      const logInfo = `Phone: ${payload.number || payload.phone} | Type: ${payload.message || payload.type} | Time: ${requestTime} | Status: Network Error`;
      console.warn(`[Retry ${attempt}/${maxRetries}] ${logInfo} | Error: ${errorMsg}`);
      
      if (attempt <= maxRetries) {
        await sleep(1000 * attempt);
        continue;
      } else {
        console.error(`[Failed] ${logInfo} | Error: Max retries exceeded`);
        throw new Error("Max retries exceeded");
      }
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    // ==========================================
    // ACTION: generateOtp
    // ==========================================
    if (payload.action === "generateOtp") {
      const phone = normalizeMobile(payload.phone);
      
      console.log(`[generateOtp] Request received for phone: ${phone}`);
      
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log("[generateOtp] Generated OTP for testing:", otpCode);
      
      const encoder = new TextEncoder();
      const data = encoder.encode(otpCode);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedOtp = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      console.log(`[generateOtp] OTP generated and hashed.`);

      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: dbError } = await supabase.from('whatsapp_otp').insert({
        mobile_number: phone,
        otp_code: hashedOtp,
        expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
      });

      if (dbError) {
        console.error("[generateOtp] DB Insert Error:", JSON.stringify(dbError));
        throw new Error("Failed to store OTP");
      }

      const webhookPayload = {
        phone: phone,
        number: phone,
        template: "otp",
        data: {
          otp: otpCode
        },
        otp: otpCode,
        var1: otpCode,
        verificationType: "Login",
        var2: "Login",
        message: "otp",
        type: "otp",
        action: "generateOtp"
      };

      const webhookResponse = await callWhatApiWebhook(webhookPayload);
      console.log(`[generateOtp] Webhook Response:`, JSON.stringify(webhookResponse));

      return new Response(JSON.stringify({ success: true, webhookResponse }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ACTION: verifyOtp
    // ==========================================
    if (payload.action === "verifyOtp") {
      const phone = normalizeMobile(payload.phone);
      const token = payload.token;

      console.log(`[verifyOtp] Request received for phone: ${phone}`);

      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedOtp = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: otpData, error: otpError } = await supabase
        .from('whatsapp_otp')
        .select('*')
        .eq('mobile_number', phone)
        .eq('consumed', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log(`[verifyOtp] OTP Hash Verification Result:`, otpData ? "MATCH" : "NO MATCH", otpError ? JSON.stringify(otpError) : "");

      if (!otpData || otpData.otp_code !== hashedOtp) {
        if (otpData) {
          await supabase.from('whatsapp_otp').update({ attempts: otpData.attempts + 1 }).eq('id', otpData.id);
          if (otpData.attempts + 1 >= otpData.max_attempts) {
             await supabase.from('whatsapp_otp').update({ consumed: true }).eq('id', otpData.id);
          }
        }
        return new Response(JSON.stringify({ error: "Invalid OTP" }), { status: 400, headers: corsHeaders });
      }

      await supabase.from('whatsapp_otp').update({ consumed: true, verified: true }).eq('id', otpData.id);

      const newSecurePassword = crypto.randomUUID();
      let existingUserId = null;

      // 1. Try public.rms_candidate_profiles
      const { data: profile } = await supabase.from('rms_candidate_profiles').select('user_id').eq('mobile', phone).single();
      if (profile?.user_id) existingUserId = profile.user_id;

      // 2. Fallback to auth.admin.listUsers pagination if not found in profiles
      if (!existingUserId) {
         let page = 1;
         while (true) {
           const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
           if (listError) {
             console.error("[verifyOtp] listUsers error:", JSON.stringify(listError));
             break;
           }
           if (!usersData || !usersData.users || usersData.users.length === 0) break;
           const user = usersData.users.find(u => u.phone === phone || u.phone === phone.replace('+', ''));
           if (user) { existingUserId = user.id; break; }
           page++;
         }
      }

      console.log(`[verifyOtp] Existing user lookup result: existingUserId=${existingUserId}`);

      const isNewUser = !existingUserId;

      if (existingUserId) {
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(existingUserId, {
          password: newSecurePassword,
          phone_confirm: true
        });
        console.log(`[verifyOtp] updateUserById() response: Data=${JSON.stringify(updateData)}, Error=${JSON.stringify(updateError)}`);
        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: corsHeaders });
        }
      } else {
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          phone,
          password: newSecurePassword,
          phone_confirm: true
        });
        console.log(`[verifyOtp] createUser() response: Data=${JSON.stringify(createData)}, Error=${JSON.stringify(createError)}`);
        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), { status: 500, headers: corsHeaders });
        }
      }

      if (isNewUser) {
        console.log(`[verifyOtp] New user detected (will be returned in response).`);
      }

      return new Response(JSON.stringify({ success: true, password: newSecurePassword, isNewUser }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // PATH B: Manual Template Trigger (Frontend)
    // ==========================================
    if (payload.action === "sendTemplate") {
      const phone = normalizeMobile(payload.phone);
      const template = payload.template;
      const variables = payload.variables || [];
      
      let webhookPayload: Record<string, any> = {};

      if (template === "welcome" || template === "welcome_recruitment" || template === "welcome_to_recruitment_portal") {
        webhookPayload = {
          phone: phone,
          number: phone,
          template: "welcome_to_recruitment_portal",
          data: {},
          otp: "",
          var1: "",
          verificationType: "",
          var2: "",
          message: "welcome_recruitment",
          type: "welcome_recruitment",
          action: "sendTemplate"
        };
      } else {
        const varsObj = variables.reduce((acc: any, val: any, i: number) => ({ ...acc, [`var${i+1}`]: val }), {});
        webhookPayload = {
          phone: phone,
          number: phone,
          template: template,
          data: varsObj,
          message: template,
          ...varsObj
        };
      }

      console.log(`[Path B] Final Webhook Payload:`, JSON.stringify(webhookPayload));
      const webhookResponse = await callWhatApiWebhook(webhookPayload);
      console.log(`[Path B] Webhook Response:`, JSON.stringify(webhookResponse));

      return new Response(JSON.stringify({ success: true, webhookResponse }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unrecognized payload
    return new Response(JSON.stringify({ error: "Unrecognized payload format" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
