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
      const safeLogPayload: Record<string, unknown> = { ...payload };
      if ("otp" in safeLogPayload) safeLogPayload.otp = "******";
      if (safeLogPayload.template === "otp" && "var1" in safeLogPayload) safeLogPayload.var1 = "******";
      if (safeLogPayload.data && typeof safeLogPayload.data === "object" && "otp" in (safeLogPayload.data as Record<string, unknown>)) {
        safeLogPayload.data = { ...(safeLogPayload.data as Record<string, unknown>), otp: "******" };
      }
      console.log(`[OUTGOING WHATSAPP REQUEST] Payload:`, JSON.stringify(safeLogPayload));

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
      const clientIp = (req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").trim();
      
      console.log(`[generateOtp] Request received for phone: ${phone} (IP: ${clientIp ? 'provided' : 'none'})`);
      
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const encoder = new TextEncoder();
      const data = encoder.encode(otpCode);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedOtp = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Concurrency-safe atomic RPC enforcing:
      // 1. Cross-OTP temporary lockout (10 failed verification attempts in last 15m)
      // 2. Minimum 30-second cooldown per mobile number
      // 3. Maximum 15 OTP requests per rolling 24 hours per mobile number
      // 4. IP burst limiter (60/hour)
      const { data: requestResult, error: rpcError } = await supabase.rpc('whatsapp_request_otp_secure', {
        p_mobile: phone,
        p_otp_hash: hashedOtp,
        p_ip: clientIp || null,
      });

      if (rpcError) {
        console.error("[generateOtp] RPC Error:", JSON.stringify(rpcError));
        return new Response(JSON.stringify({ success: false, error: "Failed to process OTP request" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!requestResult.success) {
        console.warn(`[generateOtp] Request blocked: Code=${requestResult.code}, Status=${requestResult.status}, Msg=${requestResult.message}`);
        const responseHeaders: Record<string, string> = {
          ...corsHeaders,
          "Content-Type": "application/json",
        };
        if (requestResult.retry_after) {
          responseHeaders["Retry-After"] = String(requestResult.retry_after);
        }
        return new Response(JSON.stringify({
          success: false,
          error: requestResult.message,
          code: requestResult.code,
          retryAfter: requestResult.retry_after,
        }), {
          status: requestResult.status || 429,
          headers: responseHeaders,
        });
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

      return new Response(JSON.stringify({
        success: true,
        webhookResponse,
        expiresAt: requestResult.expires_at,
      }), {
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
      const clientIp = (req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").trim();

      console.log(`[verifyOtp] Request received for phone: ${phone}`);

      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedOtp = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Concurrency-safe atomic verification RPC enforcing:
      // 1. Cross-OTP temporary lockout (10 failed verification attempts in last 15m)
      // 2. Row-level lock (SELECT ... FOR UPDATE) preventing concurrent race conditions
      // 3. Strict 5-attempt limit per OTP record
      const { data: verifyResult, error: rpcError } = await supabase.rpc('whatsapp_verify_otp_secure', {
        p_mobile: phone,
        p_otp_hash: hashedOtp,
        p_ip: clientIp || null,
      });

      if (rpcError) {
        console.error("[verifyOtp] RPC Error:", JSON.stringify(rpcError));
        return new Response(JSON.stringify({ success: false, error: "Verification system error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[verifyOtp] Verification RPC Result:`, JSON.stringify(verifyResult));

      if (!verifyResult.success) {
        const responseHeaders: Record<string, string> = {
          ...corsHeaders,
          "Content-Type": "application/json",
        };
        if (verifyResult.retry_after) {
          responseHeaders["Retry-After"] = String(verifyResult.retry_after);
        }
        return new Response(JSON.stringify({
          success: false,
          error: verifyResult.message || "Invalid OTP",
          code: verifyResult.code,
          remaining: verifyResult.remaining,
          retryAfter: verifyResult.retry_after,
        }), {
          status: verifyResult.status || 400,
          headers: responseHeaders,
        });
      }

      // Verification passed atomically in DB. Proceed with Auth session setup.
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
      const supabase = createClient(supabaseUrl, supabaseKey);

      const isWelcomeTemplate = (
        template === "welcome" ||
        template === "welcome_recruitment" ||
        template === "welcome_to_recruitment_portal"
      );

      // ── 24-Hour Cooldown ONLY for Welcome Template ──────────────────────────
      if (isWelcomeTemplate) {
        // 1. Check if a Welcome message was already successfully sent within the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentSent, error: checkError } = await supabase
          .from('whatsapp_message_logs')
          .select('id, sent_at, status')
          .eq('mobile_number', phone)
          .in('template_name', ['welcome', 'welcome_recruitment', 'welcome_to_recruitment_portal'])
          .eq('status', 'sent')
          .gt('sent_at', twentyFourHoursAgo)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (checkError) {
          console.error('[sendTemplate:welcome] Error checking cooldown in DB:', JSON.stringify(checkError));
        }

        if (recentSent) {
          console.log(`[sendTemplate:welcome] Cooldown active for ${phone}. Last sent at ${recentSent.sent_at}. Skipping send.`);
          return new Response(JSON.stringify({
            success: true,
            skipped: true,
            cooldownActive: true,
            lastSentAt: recentSent.sent_at,
            message: 'Welcome message already sent to this number within the previous 24 hours.'
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 2. Concurrency protection: Check if an in-flight request is already processing within the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: inFlight } = await supabase
          .from('whatsapp_message_logs')
          .select('id, created_at')
          .eq('mobile_number', phone)
          .in('template_name', ['welcome', 'welcome_recruitment', 'welcome_to_recruitment_portal'])
          .eq('status', 'in_flight')
          .gt('created_at', twoMinutesAgo)
          .limit(1)
          .maybeSingle();

        if (inFlight) {
          console.warn(`[sendTemplate:welcome] Concurrent in-flight request detected for ${phone}. Skipping duplicate.`);
          return new Response(JSON.stringify({
            success: true,
            skipped: true,
            concurrentRequest: true,
            message: 'A welcome message is currently being dispatched to this number.'
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 3. Insert in-flight reservation lock before calling webhook
        const { data: reservedLog, error: reserveError } = await supabase
          .from('whatsapp_message_logs')
          .insert({
            mobile_number: phone,
            template_name: 'welcome_to_recruitment_portal',
            status: 'in_flight',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (reserveError) {
          console.error('[sendTemplate:welcome] Error reserving lock in DB:', JSON.stringify(reserveError));
        }

        const logId = reservedLog?.id;

        // 4. Construct payload for WhatAPI webhook
        const webhookPayload = {
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

        console.log(`[sendTemplate:welcome] Dispatching to webhook for ${phone}...`);
        try {
          const webhookResponse = await callWhatApiWebhook(webhookPayload);
          console.log(`[sendTemplate:welcome] Webhook response:`, JSON.stringify(webhookResponse));

          // 5. Provider accepted the request -> Mark as 'sent' with sent_at = now()
          if (logId) {
            await supabase
              .from('whatsapp_message_logs')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                api_response: webhookResponse || {},
                updated_at: new Date().toISOString()
              })
              .eq('id', logId);
          }

          return new Response(JSON.stringify({ success: true, webhookResponse, sent: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (webhookErr) {
          // 6. Provider failed -> Mark as 'failed', DO NOT mark as 'sent'
          const errMsg = webhookErr instanceof Error ? webhookErr.message : String(webhookErr);
          console.error(`[sendTemplate:welcome] Webhook call failed for ${phone}:`, errMsg);

          if (logId) {
            await supabase
              .from('whatsapp_message_logs')
              .update({
                status: 'failed',
                failed: true,
                error_message: errMsg,
                updated_at: new Date().toISOString()
              })
              .eq('id', logId);
          }

          throw webhookErr;
        }
      }

      // ── Other Templates (completely unaffected by welcome cooldown) ─────────
      const varsObj = variables.reduce((acc: any, val: any, i: number) => ({ ...acc, [`var${i+1}`]: val }), {});
      const webhookPayload = {
        phone: phone,
        number: phone,
        template: template,
        data: varsObj,
        message: template,
        ...varsObj
      };

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
