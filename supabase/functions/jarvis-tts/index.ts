import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jarvisify(text: string) {
  let t = text ?? "";

  // Remove emojis
  t = t.replace(/[\u{1F300}-\u{1FAFF}]/gu, "");

  // Collapse excessive punctuation
  t = t.replace(/([!?]){2,}/g, "$1");

  // Trim and limit length for cinematic delivery (avoid long monologues)
  t = t.trim();
  if (t.length > 320) {
    t = t.slice(0, 320);
    // Try to keep at most ~2 sentences
    const parts = t.split(". ");
    t = parts.slice(0, 2).join(". ");
    if (!t.endsWith(".")) t += ".";
  }

  // Add a Jarvis-style prefix if not already addressing the user
  if (!/comandante/i.test(t)) {
    t = `Entendido, Comandante. ${t}`;
  }

  return t.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Missing OPENAI_API_KEY. Configure it in server environment variables.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!text || String(text).trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = jarvisify(String(text));
    console.log("Generating JARVIS TTS for:", input.substring(0, 120) + "...");

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input,
        voice: "alloy",
        response_format: "mp3",
        speed: 0.9, // More cinematic / Jarvis-like cadence
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS error:", response.status, errorText);

      // Return clearer errors and avoid crashing the frontend
      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({
            error: "Invalid OpenAI API key or insufficient permissions.",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "TTS ocupado. Tente novamente em alguns segundos.",
            code: "RATE_LIMIT",
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              // Optional hint for clients
              "Retry-After": "5",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: `Falha ao gerar áudio (status ${response.status}).` }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("TTS generated successfully");

    // Return audio as binary stream
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("jarvis-tts error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
