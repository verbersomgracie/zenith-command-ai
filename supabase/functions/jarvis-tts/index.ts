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

function clampNumber(v: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Allow optional tuning params from client, but keep safe defaults from env
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text : "";
    const clientVoice = typeof body?.voice === "string" ? body.voice : undefined;
    const clientSpeed = typeof body?.speed === "number" ? body.speed : undefined;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")?.trim();
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing OPENAI_API_KEY. Configure it in server environment variables.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Jarvis-like tuning knobs (change without code via Secrets) ---
    // Try these voices in Secrets: onyx (more deep), echo (more synthetic), alloy (safe fallback)
    const ENV_VOICE = (Deno.env.get("OPENAI_TTS_VOICE") ?? "onyx").trim();
    const ENV_SPEED_RAW = Number(Deno.env.get("OPENAI_TTS_SPEED") ?? "0.92");

    // Allow client overrides if you want; otherwise env controls everything
    const voice = (clientVoice ?? ENV_VOICE) || "onyx";
    const speed = clampNumber(clientSpeed ?? ENV_SPEED_RAW, 0.75, 1.15, 0.92);

    const input = jarvisify(text);
    console.log(`Generating JARVIS TTS (voice=${voice}, speed=${speed}) for:`, input.substring(0, 120) + "...");

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input,
        voice,
        response_format: "mp3",
        speed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS error:", response.status, errorText);

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Invalid OpenAI API key or insufficient permissions." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "TTS ocupado. Tente novamente em alguns segundos.", code: "RATE_LIMIT" }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": "5",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({ error: `Falha ao gerar áudio (status ${response.status}).` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("jarvis-tts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
