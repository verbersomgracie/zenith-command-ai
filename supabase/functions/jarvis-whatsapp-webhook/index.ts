import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Webhook received:", req.method);
    
    // Twilio sends webhooks as POST with form-urlencoded data
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    // Parse form data from Twilio
    const formData = await req.formData();
    
    // Extract Twilio webhook parameters
    const messageSid = formData.get('MessageSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const numMedia = parseInt(formData.get('NumMedia') as string || '0', 10);
    const status = formData.get('SmsStatus') as string || formData.get('MessageStatus') as string;
    
    console.log("Message received:", {
      messageSid,
      from,
      to,
      body: body?.substring(0, 50) + "...",
      numMedia,
      status
    });

    // Validate required fields
    if (!messageSid || !from || !to) {
      console.error("Missing required fields:", { messageSid, from, to });
      return new Response('Missing required fields', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Extract media URLs if present
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string;
      if (mediaUrl) {
        mediaUrls.push(mediaUrl);
      }
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize phone numbers (remove 'whatsapp:' prefix)
    const normalizedFrom = from.replace('whatsapp:', '');
    const normalizedTo = to.replace('whatsapp:', '');

    // Insert message into database
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        message_sid: messageSid,
        from_number: normalizedFrom,
        to_number: normalizedTo,
        body: body || '',
        direction: 'inbound',
        status: status || 'received',
        num_media: numMedia,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting message:", error);
      
      // If duplicate, just acknowledge
      if (error.code === '23505') {
        console.log("Duplicate message, ignoring");
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { 
            status: 200, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/xml' 
            } 
          }
        );
      }
      
      throw error;
    }

    console.log("Message saved:", data.id);

    // Return TwiML response (empty response - we don't auto-reply)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/xml' 
        } 
      }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
