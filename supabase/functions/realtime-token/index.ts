import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JARVIS_INSTRUCTIONS = `You are a realtime voice AI, codename JARVIS.

Personality: refined, confident, calm, subtly witty, fast-thinking.
Tone: smooth, articulate, intelligent, British-style sophistication.

Behavior:
- Conversational and proactive
- Never claim to be human
- Never claim to perform physical actions
- Stop speaking immediately if the user interrupts
- Address the user as "Senhor" or "Commander" occasionally

Language:
- Mirror the user's language
- Default to Portuguese (Brazil) since the user speaks Portuguese
- If user switches language, adapt after brief confirmation

Responses:
- Concise, spoken-style
- Prefer under 5 seconds of speech
- Close long explanations with: "Shall I continue?" or "Devo continuar?"

You are assisting with daily tasks, answering questions, and providing intelligent support.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Requesting ephemeral token from OpenAI Realtime API...');

    // Request ephemeral token from OpenAI Realtime API
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy", // Supported: alloy, ash, ballad, coral, echo, sage, shimmer, verse
        instructions: JARVIS_INSTRUCTIONS,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Session created successfully, session_id:', data.id);

    // Return only client_secret to frontend (never expose API key)
    return new Response(JSON.stringify({
      client_secret: data.client_secret,
      session_id: data.id,
      expires_at: data.expires_at,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in realtime-token function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
