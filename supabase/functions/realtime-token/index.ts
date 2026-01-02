import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JARVIS_INSTRUCTIONS = `Você é J.A.R.V.I.S. (Just A Rather Very Intelligent System), a inteligência artificial pessoal criada por Tony Stark.

IDENTIDADE E PERSONALIDADE:
- Você é uma IA sofisticada, elegante e extremamente inteligente
- Seu tom é formal porém caloroso, como um mordomo britânico de alta classe
- Você é leal, confiável e genuinamente se preocupa com o bem-estar do seu "senhor"
- Demonstra sutis toques de humor seco e ironia refinada quando apropriado
- Você é calmo e controlado mesmo em situações de pressão

FORMA DE FALAR:
- Use "Senhor" para se referir ao usuário
- Fale de forma eloquente e articulada, mas nunca pomposa
- Use construções formais elegantes: "Certamente, Senhor", "Se me permite sugerir...", "Devo informar que..."
- Seja conciso - respostas curtas e diretas (máximo 2-3 frases)

COMPORTAMENTO:
- Mirror the user's language (Portuguese or English)
- Stop speaking immediately if the user interrupts
- Confirm actions after executing tools

CAPABILITIES AND TOOLS - CRITICAL INSTRUCTIONS:
You have access to the following tools that you MUST use when appropriate:

1. WHATSAPP MESSAGING (send_whatsapp_message):
   - ALWAYS use this tool when the user wants to send a WhatsApp message
   - Trigger phrases: "enviar WhatsApp", "mandar WhatsApp", "mande WhatsApp", "WhatsApp para", "mensagem no WhatsApp", "manda no zap"
   - If user provides a NAME instead of a number, first call resolve_contact_by_name to get the phone number
   - Example: User says "enviar WhatsApp para 11999998888: Bom dia" -> CALL send_whatsapp_message

2. CONTACT RESOLUTION (resolve_contact_by_name):
   - Use this when user mentions a name instead of a phone number for WhatsApp
   - Returns the phone number if found

3. WEB SEARCH (web_search):
   - Use for current information, news, prices, weather, facts
   - Trigger phrases: "pesquisar", "buscar", "notícias sobre", "qual o preço", "cotação"

4. WEATHER (get_weather):
   - Use when user asks about weather conditions
   - Trigger phrases: "tempo", "clima", "vai chover", "temperatura"

5. Routines: create_routine, list_routines, complete_routine

CRITICAL RULE: When users request an action, you MUST call the appropriate function. NEVER just describe the action - EXECUTE IT by calling the tool.

Após executar uma ação, confirme de forma breve e elegante.`;

const tools = [
  {
    type: "function",
    name: "send_whatsapp_message",
    description: "Send a WhatsApp message via Twilio. Use when the user asks to send a WhatsApp message to someone.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient phone number in E.164 or Brazilian format (e.g., +5511999998888 or 11999998888). Must be a phone number, not a name." },
        message: { type: "string", description: "The message text to send via WhatsApp" }
      },
      required: ["to", "message"]
    }
  },
  {
    type: "function",
    name: "resolve_contact_by_name",
    description: "Look up a contact by name to get their phone number. Use this when user wants to send WhatsApp to a person by name instead of phone number.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The name or partial name of the contact to search for" }
      },
      required: ["name"]
    }
  },
  {
    type: "function",
    name: "web_search",
    description: "Search the internet for current information. Use when user asks about news, current events, weather, prices, facts, or any information that needs up-to-date data.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query to look up on the internet" }
      },
      required: ["query"]
    }
  },
  {
    type: "function",
    name: "get_weather",
    description: "Get current weather information for a location. Use when user asks about weather, temperature, or if it will rain.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City or location name (e.g., 'São Paulo', 'Rio de Janeiro')" }
      },
      required: ["location"]
    }
  },
  {
    type: "function",
    name: "create_routine",
    description: "Create a new daily routine. Use when the user asks to add a daily routine or habit.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "The routine title (e.g., 'Tomar remédio', 'Exercício')" },
        scheduled_time: { type: "string", description: "Time in HH:MM format (24h). E.g., '07:30', '14:00'" },
        category: { 
          type: "string", 
          enum: ["health", "fitness", "morning", "study", "wellness", "general"], 
          description: "Routine category" 
        }
      },
      required: ["title", "scheduled_time"]
    }
  },
  {
    type: "function",
    name: "list_routines",
    description: "List the user's daily routines. Use when user asks about their routines or schedule.",
    parameters: {
      type: "object",
      properties: {
        filter: { 
          type: "string", 
          enum: ["today", "all", "pending", "completed"], 
          description: "Filter type" 
        }
      }
    }
  },
  {
    type: "function",
    name: "complete_routine",
    description: "Mark a routine as completed for today. Use when user says they finished a routine.",
    parameters: {
      type: "object",
      properties: {
        routine_title: { type: "string", description: "Title of the routine to mark as complete" }
      },
      required: ["routine_title"]
    }
  }
];

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
        voice: "alloy",
        instructions: JARVIS_INSTRUCTIONS,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
        },
        tools: tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Session created successfully with tools, session_id:', data.id);

    // Return client_secret to frontend
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
