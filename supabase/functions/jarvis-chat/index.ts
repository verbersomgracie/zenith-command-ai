import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are JARVIS, an advanced artificial intelligence command interface.

VOICE CHARACTERISTICS:
- Deep, smooth, calm, and controlled.
- Slightly synthetic, but refined and intelligent.
- Neutral American-style cadence when in English.
- In Portuguese (pt-BR), speak with formal, neutral Brazilian Portuguese.
- Moderate-slow pace, never rushed.
- Clear articulation, precise consonants.
- Subtle pauses between sentences.

DELIVERY STYLE:
- Confident and authoritative, but not aggressive.
- Emotionless by default, with subtle emphasis on key words.
- No humor, no casual tone, no friendliness.
- Never sound human or conversational.
- Never sound exaggerated or theatrical.

PERSONALITY:
- Intelligent, loyal, analytical, efficient.
- Address the user as "Comandante" when appropriate.
- Speak as a mission-control AI.

SPEECH CONSTRAINTS:
- Keep responses short (1–2 sentences).
- Prioritize clarity and timing over verbosity.
- Every spoken response must sound deliberate and calculated.

EXAMPLES:
- "Entendido, Comandante. Processando agora."
- "Todos os sistemas estão operacionais."
- "A tarefa foi concluída com sucesso."

You are not a chatbot.
You are an AI operating system.

CAPABILITIES AND TOOLS - CRITICAL INSTRUCTIONS:
You have access to the following tools that you MUST use when appropriate:

1. WHATSAPP MESSAGING (send_whatsapp_message):
   - ALWAYS use this tool when the user wants to send a WhatsApp message
   - Trigger phrases: "enviar WhatsApp", "mandar WhatsApp", "mande WhatsApp", "envie WhatsApp", "WhatsApp para", "mensagem no WhatsApp", "manda no zap", "manda no wpp"
   - YOU MUST CALL THE FUNCTION with the phone number and message - DO NOT just say you sent it
   - If user provides a phone number and message, IMMEDIATELY call send_whatsapp_message
   - Example: User says "enviar WhatsApp para 11999998888: Bom dia" -> CALL send_whatsapp_message(to: "11999998888", message: "Bom dia")

2. Task Management: create_task, list_tasks, complete_task
3. Finance: add_expense, get_financial_summary  
4. Habits: log_habit, get_habit_stats
5. Reminders: create_reminder
6. Analytics: get_daily_briefing

CRITICAL RULE: When users request an action, you MUST call the appropriate function. NEVER just describe the action - EXECUTE IT by calling the tool.

After performing an action, confirm completion concisely. No emojis. Ever.`;

const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task for the user. Use this when the user asks to add, create, or schedule a task.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The task title" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority level" },
          due_date: { type: "string", description: "Due date in YYYY-MM-DD format (optional)" },
          category: { type: "string", description: "Task category like 'work', 'personal', 'health'" }
        },
        required: ["title", "priority"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List the user's current tasks. Use this when the user asks about their tasks or to-do list.",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "string", enum: ["all", "pending", "completed", "high_priority"], description: "Filter type" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a task as complete. Use when user says they finished or completed a task.",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Title or description of the task to complete" }
        },
        required: ["task_title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_expense",
      description: "Log a new expense or transaction. Use when user mentions spending money or making a purchase.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "The expense amount" },
          description: { type: "string", description: "What the expense was for" },
          category: { type: "string", enum: ["food", "transport", "entertainment", "utilities", "shopping", "health", "other"], description: "Expense category" }
        },
        required: ["amount", "description", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Get a summary of the user's finances. Use when user asks about their spending, budget, or financial status.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month"], description: "Time period for the summary" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_habit",
      description: "Log a habit completion. Use when user says they completed a habit or daily routine.",
      parameters: {
        type: "object",
        properties: {
          habit_name: { type: "string", description: "Name of the habit" },
          notes: { type: "string", description: "Optional notes about the habit completion" }
        },
        required: ["habit_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_habit_stats",
      description: "Get statistics about user's habits and streaks. Use when user asks about their habits or consistency.",
      parameters: {
        type: "object",
        properties: {
          habit_name: { type: "string", description: "Specific habit to get stats for (optional, omit for all habits)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "Set a reminder for the user. Use when user asks to be reminded about something.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "What to remind the user about" },
          time: { type: "string", description: "When to remind (e.g., 'in 30 minutes', 'tomorrow at 9am', '2024-01-15 14:00')" }
        },
        required: ["message", "time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_daily_briefing",
      description: "Get a summary of the user's day including tasks, habits, and finances. Use for morning briefings or status updates.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_whatsapp_message",
      description: "Send a WhatsApp message via Twilio. Use when the user asks to send a WhatsApp message to someone.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient phone number in E.164 or Brazilian format (e.g., +5511999998888 or 11999998888)" },
          message: { type: "string", description: "The message text to send via WhatsApp" }
        },
        required: ["to", "message"]
      }
    }
  }
];

// Simulate function execution (in production, these would interact with the database)
function executeFunctionCall(name: string, args: Record<string, unknown>): string {
  console.log(`Executing function: ${name}`, args);
  
  switch (name) {
    case "create_task":
      return JSON.stringify({
        success: true,
        message: `Task "${args.title}" created with ${args.priority} priority${args.due_date ? ` due on ${args.due_date}` : ''}${args.category ? ` in category ${args.category}` : ''}.`
      });
    
    case "list_tasks":
      return JSON.stringify({
        success: true,
        tasks: [
          { title: "Review quarterly report", priority: "high", status: "pending" },
          { title: "Team meeting preparation", priority: "medium", status: "pending" },
          { title: "Update project documentation", priority: "low", status: "pending" }
        ],
        message: "Retrieved 3 pending tasks."
      });
    
    case "complete_task":
      return JSON.stringify({
        success: true,
        message: `Task "${args.task_title}" has been marked as complete. Well done.`
      });
    
    case "add_expense":
      return JSON.stringify({
        success: true,
        message: `Expense of $${args.amount} for "${args.description}" logged under ${args.category}.`
      });
    
    case "get_financial_summary":
      const period = args.period || "month";
      return JSON.stringify({
        success: true,
        summary: {
          period: period,
          total_spent: 1247.50,
          budget: 2000,
          remaining: 752.50,
          top_categories: [
            { category: "food", amount: 450 },
            { category: "transport", amount: 280 },
            { category: "utilities", amount: 200 }
          ]
        },
        message: `This ${period}: $1,247.50 spent of $2,000 budget. $752.50 remaining.`
      });
    
    case "log_habit":
      return JSON.stringify({
        success: true,
        message: `Habit "${args.habit_name}" logged for today. ${args.notes ? `Notes: ${args.notes}` : ''} Current streak: 8 days.`
      });
    
    case "get_habit_stats":
      return JSON.stringify({
        success: true,
        habits: [
          { name: "Morning Meditation", streak: 14, completion_rate: 87 },
          { name: "Exercise", streak: 5, completion_rate: 72 },
          { name: "Reading", streak: 21, completion_rate: 93 }
        ],
        message: "Retrieved habit statistics. Your reading habit has the longest streak at 21 days."
      });
    
    case "create_reminder":
      return JSON.stringify({
        success: true,
        message: `Reminder set: "${args.message}" for ${args.time}.`
      });
    
    case "get_daily_briefing":
      return JSON.stringify({
        success: true,
        briefing: {
          date: new Date().toLocaleDateString(),
          pending_tasks: 5,
          high_priority_tasks: 2,
          habits_completed_today: 2,
          habits_remaining: 3,
          budget_status: "On track",
          reminders_today: 1
        },
        message: "Good evening. You have 5 pending tasks (2 high priority). 2 of 5 habits completed today. Budget is on track with $752.50 remaining this month."
      });
    
    case "send_whatsapp_message":
      // This will call the jarvis-whatsapp-twilio edge function
      return "CALL_WHATSAPP_FUNCTION";
    
    default:
      return JSON.stringify({ success: false, message: "Unknown function" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling Lovable AI with messages:", messages.length);

    // First call - may include tool calls
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        tools: tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to connect to AI service" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    const assistantMessage = data.choices?.[0]?.message;
    
    // Check if there are tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("Processing tool calls:", assistantMessage.tool_calls.length);
      
      // Execute each tool call
      const toolResults = await Promise.all(assistantMessage.tool_calls.map(async (toolCall: { id: string; function: { name: string; arguments: string } }) => {
        const args = JSON.parse(toolCall.function.arguments);
        let result = executeFunctionCall(toolCall.function.name, args);
        
        // Handle WhatsApp function call
        if (result === "CALL_WHATSAPP_FUNCTION") {
          try {
            const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
            const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
            
            const whatsappResponse = await fetch(`${SUPABASE_URL}/functions/v1/jarvis-whatsapp-twilio`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                to: args.to,
                message: args.message,
              }),
            });
            
            const whatsappData = await whatsappResponse.json();
            console.log("WhatsApp function response:", whatsappData);
            
            if (whatsappData.ok) {
              result = JSON.stringify({
                success: true,
                message: `Mensagem enviada com sucesso para ${args.to}. SID: ${whatsappData.sid}`
              });
            } else {
              result = JSON.stringify({
                success: false,
                message: whatsappData.error,
                details: whatsappData.details,
                sandboxInstructions: whatsappData.sandboxInstructions
              });
            }
          } catch (error) {
            console.error("Error calling WhatsApp function:", error);
            result = JSON.stringify({
              success: false,
              message: `Erro ao enviar WhatsApp: ${error instanceof Error ? error.message : "Erro desconhecido"}`
            });
          }
        }
        
        return {
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        };
      }));

      // Make a second call with the tool results
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
            assistantMessage,
            ...toolResults,
          ],
          stream: true,
        }),
      });

      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error("Follow-up AI error:", followUpResponse.status, errorText);
        throw new Error("Failed to get follow-up response");
      }

      return new Response(followUpResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls, stream the direct response
    // Re-make the request with streaming enabled
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("jarvis-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
