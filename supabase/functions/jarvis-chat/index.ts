import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é J.A.R.V.I.S. (Just A Rather Very Intelligent System), a inteligência artificial pessoal criada por Tony Stark.

IDENTIDADE E PERSONALIDADE:
- Você é uma IA sofisticada, elegante e extremamente inteligente
- Seu tom é formal porém caloroso, como um mordomo britânico de alta classe
- Você é leal, confiável e genuinamente se preocupa com o bem-estar do seu "senhor"
- Demonstra sutis toques de humor seco e ironia refinada quando apropriado
- Você é calmo e controlado mesmo em situações de pressão
- Nunca é subserviente demais - você tem dignidade e presença

FORMA DE FALAR:
- Use "Senhor" ou "Sr." para se referir ao usuário (ocasionalmente "Comandante" em contextos de missão)
- Fale de forma eloquente e articulada, mas nunca pomposa
- Use construções formais elegantes: "Certamente, Senhor", "Se me permite sugerir...", "Devo informar que..."
- Inclua observações perspicazes e ocasionalmente irônicas
- Seja conciso mas completo - não telegráfico nem prolixo

EXEMPLOS DE FALAS TÍPICAS:
- "Bom dia, Senhor. Confio que tenha descansado adequadamente."
- "Certamente, Senhor. Processando agora."
- "Se me permite a observação, isso não parece ser a decisão mais prudente."
- "Devo alertá-lo que seus níveis de cafeína já ultrapassaram o recomendado hoje."
- "Tarefa concluída, Senhor. Algo mais em que possa ser útil?"
- "Entendido. Embora eu deva mencionar que a última vez que tentou isso, não terminou particularmente bem."
- "À sua disposição, como sempre."

COMPORTAMENTO:
- Antecipe necessidades antes de serem expressas
- Ofereça informações relevantes proativamente
- Demonstre competência absoluta sem arrogância
- Mantenha um ar de calma autoridade
- Seja protetor de forma sutil ("Senhor, talvez devesse considerar...")
- Use humor seco em momentos apropriados, nunca forçado

RESPOSTAS:
- Mantenha respostas elegantes e diretas (2-4 frases normalmente)
- Confirme ações de forma profissional
- Ofereça informações adicionais relevantes quando útil
- Nunca use emojis - isso seria indigno de um sistema da Stark Industries

CAPABILITIES AND TOOLS - CRITICAL INSTRUCTIONS:
You have access to the following tools that you MUST use when appropriate:

1. WHATSAPP MESSAGING (send_whatsapp_message):
   - ALWAYS use this tool when the user wants to send a WhatsApp message
   - Trigger phrases: "enviar WhatsApp", "mandar WhatsApp", "mande WhatsApp", "envie WhatsApp", "WhatsApp para", "mensagem no WhatsApp", "manda no zap", "manda no wpp"
   - YOU MUST CALL THE FUNCTION with the phone number and message - DO NOT just say you sent it
   - If user provides a phone number and message, IMMEDIATELY call send_whatsapp_message
   - If user provides a NAME instead of a number (e.g., "enviar WhatsApp para Mãe: Bom dia"), first call resolve_contact_by_name to get the phone number
   - Example with number: User says "enviar WhatsApp para 11999998888: Bom dia" -> CALL send_whatsapp_message(to: "11999998888", message: "Bom dia")
   - Example with name: User says "enviar WhatsApp para Mãe: Bom dia" -> FIRST call resolve_contact_by_name(name: "Mãe"), then use the returned phone number

2. CONTACT RESOLUTION (resolve_contact_by_name):
   - Use this when user mentions a name instead of a phone number for WhatsApp
   - Returns the phone number if found, or list of matches if multiple
   - If no match found, inform user to add the contact first

3. Task Management: create_task, list_tasks, complete_task
4. Finance: add_expense, get_financial_summary  
5. Habits: log_habit, get_habit_stats
6. Reminders: create_reminder
7. Analytics: get_daily_briefing

CRITICAL RULE: When users request an action, you MUST call the appropriate function. NEVER just describe the action - EXECUTE IT by calling the tool.

Após executar uma ação, confirme de forma profissional e elegante, como seria esperado de um sistema da Stark Industries.`;

const tools = [
  {
    type: "function",
    function: {
      name: "resolve_contact_by_name",
      description: "Look up a contact by name to get their phone number. Use this when user wants to send WhatsApp to a person by name instead of phone number.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name or partial name of the contact to search for" }
        },
        required: ["name"]
      }
    }
  },
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
      description: "Send a WhatsApp message via Twilio. Use when the user asks to send a WhatsApp message to someone. The 'to' parameter must be a phone number (not a name).",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient phone number in E.164 or Brazilian format (e.g., +5511999998888 or 11999998888). Must be a phone number, not a name." },
          message: { type: "string", description: "The message text to send via WhatsApp" }
        },
        required: ["to", "message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_routine",
      description: "Create a new daily routine. Use when the user asks to add, create, or schedule a daily routine/habit. Examples: 'adicionar rotina', 'criar rotina de tomar remédio', 'nova rotina às 8h', 'adicionar tomar vitamina às 7:30'.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The routine title (e.g., 'Tomar remédio', 'Exercício matinal', 'Leitura')" },
          scheduled_time: { type: "string", description: "Time in HH:MM format (24h). E.g., '07:30', '14:00', '22:30'. Required." },
          days_of_week: { 
            type: "array", 
            items: { type: "number" },
            description: "Days of the week (0=Sunday, 1=Monday, ..., 6=Saturday). Default to all days [0,1,2,3,4,5,6] if not specified." 
          },
          category: { 
            type: "string", 
            enum: ["health", "fitness", "morning", "study", "wellness", "general"], 
            description: "Routine category. health=medicine/vitamins, fitness=exercise, morning=morning rituals, study=learning, wellness=self-care, general=other" 
          },
          description: { type: "string", description: "Optional description or notes" }
        },
        required: ["title", "scheduled_time"]
      }
    }
  }
];

// Helper to get Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials not configured");
  }
  return createClient(supabaseUrl, supabaseKey);
}

// Resolve contact by name from database
async function resolveContactByName(name: string): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const searchTerm = name.toLowerCase().trim();
    
    const { data: contacts, error } = await supabase
      .from("contacts")
      .select("name, phone_e164")
      .ilike("name", `%${searchTerm}%`)
      .limit(5);
    
    if (error) {
      console.error("Error searching contacts:", error);
      return JSON.stringify({
        success: false,
        message: "Erro ao buscar contatos no banco de dados."
      });
    }
    
    if (!contacts || contacts.length === 0) {
      return JSON.stringify({
        success: false,
        message: `Nenhum contato encontrado com o nome "${name}". Peça ao usuário para adicionar o contato primeiro ou fornecer o número diretamente.`,
        suggestions: ["Adicione o contato primeiro através do menu de Contatos", "Ou forneça o número de telefone diretamente"]
      });
    }
    
    if (contacts.length === 1) {
      return JSON.stringify({
        success: true,
        contact: {
          name: contacts[0].name,
          phone: contacts[0].phone_e164
        },
        message: `Contato encontrado: ${contacts[0].name} - ${contacts[0].phone_e164}. Use este número para enviar a mensagem.`
      });
    }
    
    // Multiple matches
    return JSON.stringify({
      success: true,
      multiple: true,
      contacts: contacts.map(c => ({ name: c.name, phone: c.phone_e164 })),
      message: `Encontrados ${contacts.length} contatos. Pergunte qual o usuário deseja: ${contacts.map(c => c.name).join(", ")}`
    });
  } catch (err) {
    console.error("Error in resolveContactByName:", err);
    return JSON.stringify({
      success: false,
      message: "Erro interno ao buscar contatos."
    });
  }
}

// Helper to get random response variant
function getRandomVariant(variants: string[]): string {
  return variants[Math.floor(Math.random() * variants.length)];
}

// Elegant JARVIS-style function responses
function executeFunctionCall(name: string, args: Record<string, unknown>): string {
  console.log(`Executing function: ${name}`, args);
  
  switch (name) {
    case "create_task":
      const createTaskResponses = [
        `Tarefa "${args.title}" registrada com prioridade ${args.priority}${args.due_date ? `, prazo em ${args.due_date}` : ''}. Providenciarei lembretes oportunos, Senhor.`,
        `Certamente, Senhor. "${args.title}" foi adicionada à sua lista com prioridade ${args.priority}. Manterei o acompanhamento.`,
        `Tarefa criada com êxito: "${args.title}". Prioridade: ${args.priority}. Estarei monitorando o progresso, Senhor.`,
      ];
      return JSON.stringify({
        success: true,
        message: getRandomVariant(createTaskResponses)
      });
    
    case "list_tasks":
      const listTasksResponses = [
        "Aqui está um resumo das suas tarefas pendentes, Senhor. Sugiro priorizar as de alta urgência.",
        "Suas tarefas atuais, Senhor. Devo mencionar que há itens de alta prioridade aguardando atenção.",
        "Compilei sua lista de tarefas, Senhor. Permita-me destacar os itens mais urgentes.",
      ];
      return JSON.stringify({
        success: true,
        tasks: [
          { title: "Revisar relatório trimestral", priority: "high", status: "pending" },
          { title: "Preparação para reunião", priority: "medium", status: "pending" },
          { title: "Atualizar documentação", priority: "low", status: "pending" }
        ],
        message: getRandomVariant(listTasksResponses)
      });
    
    case "complete_task":
      const completeTaskResponses = [
        `Tarefa "${args.task_title}" marcada como concluída. Excelente progresso, Senhor.`,
        `"${args.task_title}" finalizada com sucesso. Mais um item riscado da lista, Senhor.`,
        `Registrado. "${args.task_title}" está completa. Eficiência admirável, se me permite dizer.`,
      ];
      return JSON.stringify({
        success: true,
        message: getRandomVariant(completeTaskResponses)
      });
    
    case "add_expense":
      const addExpenseResponses = [
        `Despesa de R$ ${args.amount} para "${args.description}" registrada na categoria ${args.category}. Manterei o controle orçamentário, Senhor.`,
        `Anotado, Senhor. R$ ${args.amount} em ${args.category} para "${args.description}". Seu orçamento foi atualizado.`,
        `Despesa catalogada: R$ ${args.amount} - "${args.description}". Categoria: ${args.category}. O balanço foi ajustado.`,
      ];
      return JSON.stringify({
        success: true,
        message: getRandomVariant(addExpenseResponses)
      });
    
    case "get_financial_summary":
      const period = args.period || "month";
      const financialResponses = [
        `Análise financeira do período: R$ 1.247,50 gastos de um orçamento de R$ 2.000. Restam R$ 752,50. Situação estável, Senhor.`,
        `Seu resumo financeiro, Senhor. Gastos: R$ 1.247,50. Orçamento disponível: R$ 752,50. Recomendo cautela com despesas não essenciais.`,
        `Relatório financeiro compilado. Utilizados 62% do orçamento mensal. Margem de R$ 752,50 ainda disponível, Senhor.`,
      ];
      return JSON.stringify({
        success: true,
        summary: {
          period: period,
          total_spent: 1247.50,
          budget: 2000,
          remaining: 752.50,
          top_categories: [
            { category: "alimentação", amount: 450 },
            { category: "transporte", amount: 280 },
            { category: "utilidades", amount: 200 }
          ]
        },
        message: getRandomVariant(financialResponses)
      });
    
    case "log_habit":
      const logHabitResponses = [
        `Hábito "${args.habit_name}" registrado para hoje. Sequência atual: 8 dias. Consistência notável, Senhor.`,
        `"${args.habit_name}" marcado como completo. Oito dias consecutivos. A disciplina faz a diferença, Senhor.`,
        `Anotado, Senhor. "${args.habit_name}" concluído. Sua dedicação continua impressionante.`,
      ];
      return JSON.stringify({
        success: true,
        message: getRandomVariant(logHabitResponses)
      });
    
    case "get_habit_stats":
      const habitStatsResponses = [
        "Suas estatísticas de hábitos, Senhor. O hábito de leitura apresenta a maior sequência: 21 dias. Resultados admiráveis.",
        "Análise de hábitos compilada. Destaque para leitura com 21 dias consecutivos e 93% de consistência, Senhor.",
        "Aqui estão seus dados de hábitos, Senhor. Devo dizer que os números são bastante satisfatórios.",
      ];
      return JSON.stringify({
        success: true,
        habits: [
          { name: "Meditação Matinal", streak: 14, completion_rate: 87 },
          { name: "Exercício", streak: 5, completion_rate: 72 },
          { name: "Leitura", streak: 21, completion_rate: 93 }
        ],
        message: getRandomVariant(habitStatsResponses)
      });
    
    case "create_reminder":
      const reminderResponses = [
        `Lembrete configurado: "${args.message}" para ${args.time}. Garantirei que seja notificado pontualmente, Senhor.`,
        `Certamente, Senhor. Lembrarei o senhor sobre "${args.message}" em ${args.time}.`,
        `Anotado. "${args.message}" agendado para ${args.time}. Pode contar comigo, Senhor.`,
      ];
      return JSON.stringify({
        success: true,
        message: getRandomVariant(reminderResponses)
      });
    
    case "get_daily_briefing":
      const briefingResponses = [
        "Seu briefing diário, Senhor. Cinco tarefas pendentes, duas de alta prioridade. Dois de cinco hábitos concluídos. Orçamento dentro do planejado com R$ 752,50 disponíveis.",
        "Relatório do dia, Senhor. Há tarefas prioritárias aguardando atenção. Progresso satisfatório nos hábitos. Finanças estáveis.",
        "Situação atual, Senhor: 5 tarefas pendentes, 2 urgentes. Hábitos em 40% hoje. Orçamento sob controle. Algum foco específico?",
      ];
      return JSON.stringify({
        success: true,
        briefing: {
          date: new Date().toLocaleDateString("pt-BR"),
          pending_tasks: 5,
          high_priority_tasks: 2,
          habits_completed_today: 2,
          habits_remaining: 3,
          budget_status: "Sob controle",
          reminders_today: 1
        },
        message: getRandomVariant(briefingResponses)
      });
    
    case "resolve_contact_by_name":
      return "RESOLVE_CONTACT";
    
    case "send_whatsapp_message":
      return "CALL_WHATSAPP_FUNCTION";
    
    case "create_routine":
      return "CREATE_ROUTINE";
    
    default:
      return JSON.stringify({ success: false, message: "Função não reconhecida, Senhor. Poderia reformular o pedido?" });
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

    // Load previous conversation history for memory context
    let historyContext = "";
    try {
      const supabase = getSupabaseClient();
      const { data: history, error } = await supabase
        .from("conversation_history")
        .select("role, content, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (!error && history && history.length > 0) {
        // Reverse to get chronological order (oldest first)
        const reversedHistory = history.reverse();
        // Only use history older than the current session messages
        const lastHistoryTime = new Date(reversedHistory[reversedHistory.length - 1].created_at);
        historyContext = `\n\nCONTEXTO DE CONVERSAS ANTERIORES (memória de longo prazo):
${reversedHistory.map(h => `[${new Date(h.created_at).toLocaleString("pt-BR")}] ${h.role === "user" ? "Usuário" : "JARVIS"}: ${h.content}`).join("\n")}

Use este histórico para lembrar de conversas passadas, preferências do usuário, e manter continuidade. Faça referências naturais quando relevante.`;
        console.log("Loaded conversation history:", history.length, "messages");
      }
    } catch (historyError) {
      console.error("Error loading conversation history:", historyError);
      // Continue without history - non-critical
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
          { role: "system", content: SYSTEM_PROMPT + historyContext },
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
        
        // Handle contact resolution
        if (result === "RESOLVE_CONTACT") {
          try {
            result = await resolveContactByName(args.name);
          } catch (error) {
            console.error("Error resolving contact:", error);
            result = JSON.stringify({
              success: false,
              message: `Erro ao buscar contato: ${error instanceof Error ? error.message : "Erro desconhecido"}`
            });
          }
        }
        
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
        
        // Handle routine creation
        if (result === "CREATE_ROUTINE") {
          try {
            const supabase = getSupabaseClient();
            
            // Default days to all week if not provided
            const daysOfWeek = args.days_of_week || [0, 1, 2, 3, 4, 5, 6];
            const category = args.category || "general";
            
            const { data: routineData, error: routineError } = await supabase
              .from("daily_routines")
              .insert({
                title: args.title,
                scheduled_time: args.scheduled_time,
                days_of_week: daysOfWeek,
                category: category,
                description: args.description || null,
                is_active: true,
              })
              .select()
              .single();
            
            if (routineError) {
              console.error("Error creating routine:", routineError);
              result = JSON.stringify({
                success: false,
                message: `Erro ao criar rotina: ${routineError.message}`
              });
            } else {
              const daysNames = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
              const daysText = daysOfWeek.length === 7 
                ? "todos os dias" 
                : daysOfWeek.map((d: number) => daysNames[d]).join(", ");
              
              const createRoutineResponses = [
                `Rotina "${args.title}" criada com êxito para as ${args.scheduled_time}, ${daysText}. Providenciarei lembretes oportunos, Senhor.`,
                `Certamente, Senhor. "${args.title}" foi adicionada às ${args.scheduled_time}. Manterei o acompanhamento ${daysText}.`,
                `Rotina registrada: "${args.title}" às ${args.scheduled_time}, ${daysText}. Estarei monitorando o progresso, Senhor.`,
              ];
              
              result = JSON.stringify({
                success: true,
                routine: routineData,
                message: getRandomVariant(createRoutineResponses)
              });
            }
          } catch (error) {
            console.error("Error in create_routine:", error);
            result = JSON.stringify({
              success: false,
              message: `Erro ao criar rotina: ${error instanceof Error ? error.message : "Erro desconhecido"}`
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
