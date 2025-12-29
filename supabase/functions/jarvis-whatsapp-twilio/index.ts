import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize phone number to E.164 format
function normalizePhoneNumber(phone: string, defaultCountryCode: string = "55"): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");
  
  // If it starts with 0, remove it (local format)
  if (digits.startsWith("0")) {
    digits = digits.substring(1);
  }
  
  // If it doesn't have country code (less than 12 digits for Brazil), add default
  if (digits.length <= 11) {
    digits = defaultCountryCode + digits;
  }
  
  return "+" + digits;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message } = await req.json();

    // Validate inputs
    if (!to || typeof to !== "string" || to.trim() === "") {
      return new Response(
        JSON.stringify({ ok: false, error: "Número de telefone é obrigatório." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message || typeof message !== "string" || message.trim() === "") {
      return new Response(
        JSON.stringify({ ok: false, error: "Mensagem não pode estar vazia." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Twilio credentials from environment
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ ok: false, error: "Credenciais do Twilio não configuradas." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize the phone number
    const defaultCountryCode = Deno.env.get("WHATSAPP_DEFAULT_COUNTRY_CODE") || "55";
    const normalizedPhone = normalizePhoneNumber(to, defaultCountryCode);
    const twilioTo = `whatsapp:${normalizedPhone}`;

    console.log(`Sending WhatsApp message to: ${twilioTo}`);
    console.log(`From: ${TWILIO_WHATSAPP_FROM}`);
    console.log(`Message length: ${message.length} characters`);

    // Build Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    // Create Basic Auth header
    const authString = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // Build form data
    const formData = new URLSearchParams();
    formData.append("From", TWILIO_WHATSAPP_FROM);
    formData.append("To", twilioTo);
    formData.append("Body", message.trim());

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const responseData = await response.json();
    console.log("Twilio response status:", response.status);
    console.log("Twilio response:", JSON.stringify(responseData, null, 2));

    if (response.ok) {
      return new Response(
        JSON.stringify({ ok: true, sid: responseData.sid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle specific Twilio errors
    const errorCode = responseData.code;
    const errorMessage = responseData.message || "Erro desconhecido do Twilio";

    // Error 21608: The number is not registered in the sandbox
    if (errorCode === 21608 || errorMessage.includes("sandbox")) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "O destinatário não está registrado no Sandbox do Twilio WhatsApp.",
          details: responseData.message,
          sandboxInstructions: `Para usar o WhatsApp Sandbox do Twilio, o destinatário precisa:\n1. Abrir o WhatsApp\n2. Enviar a mensagem de ativação para o número ${TWILIO_WHATSAPP_FROM.replace('whatsapp:', '')}\n3. Após confirmação, tente novamente.`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Error 21211: Invalid 'To' phone number
    if (errorCode === 21211) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Número de telefone inválido. Verifique o formato.",
          details: responseData.message
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Error 20003: Authentication error
    if (response.status === 401 || errorCode === 20003) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Erro de autenticação com o Twilio. Verifique as credenciais.",
          details: responseData.message
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Error 429: Rate limit
    if (response.status === 429) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Limite de mensagens atingido. Aguarde alguns minutos.",
          details: responseData.message
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generic error
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Falha ao enviar mensagem: ${errorMessage}`,
        details: responseData.message
      }),
      { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("jarvis-whatsapp-twilio error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
