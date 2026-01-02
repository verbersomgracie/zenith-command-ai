import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionCall } from '@/utils/RealtimeAgent';
import { useToast } from '@/hooks/use-toast';

interface ContactResult {
  success: boolean;
  contact?: { name: string; phone: string };
  multiple?: boolean;
  contacts?: { name: string; phone: string }[];
  message: string;
}

export function useRealtimeTools() {
  const { toast } = useToast();

  // Resolve contact by name from database
  const resolveContactByName = useCallback(async (name: string): Promise<string> => {
    try {
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
          message: `Nenhum contato encontrado com o nome "${name}". Peça ao usuário para adicionar o contato primeiro.`
        });
      }
      
      if (contacts.length === 1) {
        return JSON.stringify({
          success: true,
          contact: {
            name: contacts[0].name,
            phone: contacts[0].phone_e164
          },
          message: `Contato encontrado: ${contacts[0].name} - ${contacts[0].phone_e164}`
        });
      }
      
      // Multiple matches
      return JSON.stringify({
        success: true,
        multiple: true,
        contacts: contacts.map(c => ({ name: c.name, phone: c.phone_e164 })),
        message: `Encontrados ${contacts.length} contatos: ${contacts.map(c => c.name).join(", ")}`
      });
    } catch (err) {
      console.error("Error in resolveContactByName:", err);
      return JSON.stringify({
        success: false,
        message: "Erro interno ao buscar contatos."
      });
    }
  }, []);

  // Send WhatsApp message
  const sendWhatsAppMessage = useCallback(async (to: string, message: string): Promise<string> => {
    try {
      console.log('[useRealtimeTools] Sending WhatsApp to:', to);
      
      const { data, error } = await supabase.functions.invoke('jarvis-whatsapp-twilio', {
        body: { to, message }
      });

      if (error) {
        console.error('WhatsApp send error:', error);
        return JSON.stringify({
          success: false,
          message: `Erro ao enviar WhatsApp: ${error.message}`
        });
      }

      if (data?.ok) {
        toast({
          title: 'WhatsApp Enviado',
          description: `Mensagem enviada para ${to}`,
        });
        return JSON.stringify({
          success: true,
          message: `Mensagem enviada com sucesso para ${to}`,
          sid: data.sid
        });
      }

      return JSON.stringify({
        success: false,
        message: data?.error || 'Erro desconhecido ao enviar mensagem'
      });
    } catch (err) {
      console.error('WhatsApp error:', err);
      return JSON.stringify({
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao enviar WhatsApp'
      });
    }
  }, [toast]);

  // Get weather (using Open-Meteo API)
  const getWeather = useCallback(async (location: string): Promise<string> => {
    try {
      // First, geocode the location using Open-Meteo's geocoding
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=pt&format=json`
      );
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        return JSON.stringify({
          success: false,
          message: `Localização "${location}" não encontrada.`
        });
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      // Get weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );
      const weatherData = await weatherResponse.json();

      const current = weatherData.current;
      const weatherDescriptions: Record<number, string> = {
        0: 'Céu limpo',
        1: 'Predominantemente limpo',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Névoa',
        48: 'Névoa com geada',
        51: 'Chuvisco leve',
        53: 'Chuvisco moderado',
        55: 'Chuvisco intenso',
        61: 'Chuva leve',
        63: 'Chuva moderada',
        65: 'Chuva forte',
        71: 'Neve leve',
        73: 'Neve moderada',
        75: 'Neve forte',
        80: 'Pancadas de chuva leves',
        81: 'Pancadas de chuva',
        82: 'Pancadas de chuva fortes',
        95: 'Tempestade',
        96: 'Tempestade com granizo',
        99: 'Tempestade com granizo forte',
      };

      return JSON.stringify({
        success: true,
        location: `${name}, ${country}`,
        temperature: `${current.temperature_2m}°C`,
        humidity: `${current.relative_humidity_2m}%`,
        wind: `${current.wind_speed_10m} km/h`,
        condition: weatherDescriptions[current.weather_code] || 'Desconhecido',
        message: `Em ${name}: ${current.temperature_2m}°C, ${weatherDescriptions[current.weather_code] || 'Condições atuais'}, umidade ${current.relative_humidity_2m}%, vento ${current.wind_speed_10m} km/h`
      });
    } catch (err) {
      console.error('Weather error:', err);
      return JSON.stringify({
        success: false,
        message: 'Erro ao consultar clima.'
      });
    }
  }, []);

  // Web search (mock - would need an actual search API)
  const webSearch = useCallback(async (query: string): Promise<string> => {
    // For now, return a message that search isn't implemented
    // In production, you'd use an API like SerpAPI, Brave Search, or DuckDuckGo
    return JSON.stringify({
      success: false,
      message: `Pesquisa web não está implementada no momento. Consulta: "${query}"`
    });
  }, []);

  // List routines
  const listRoutines = useCallback(async (filter?: string): Promise<string> => {
    try {
      const { data: routines, error } = await supabase
        .from('daily_routines')
        .select('*')
        .eq('is_active', true)
        .order('scheduled_time');

      if (error) throw error;

      if (!routines || routines.length === 0) {
        return JSON.stringify({
          success: true,
          routines: [],
          message: 'Nenhuma rotina encontrada.'
        });
      }

      const routineList = routines.map(r => ({
        title: r.title,
        time: r.scheduled_time,
        category: r.category
      }));

      return JSON.stringify({
        success: true,
        routines: routineList,
        message: `Você tem ${routines.length} rotinas: ${routines.map(r => `${r.title} às ${r.scheduled_time}`).join(', ')}`
      });
    } catch (err) {
      console.error('List routines error:', err);
      return JSON.stringify({
        success: false,
        message: 'Erro ao listar rotinas.'
      });
    }
  }, []);

  // Create routine
  const createRoutine = useCallback(async (title: string, scheduled_time: string, category?: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('daily_routines')
        .insert({
          title,
          scheduled_time,
          category: category || 'general',
          days_of_week: [0, 1, 2, 3, 4, 5, 6],
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Rotina Criada',
        description: `${title} às ${scheduled_time}`,
      });

      return JSON.stringify({
        success: true,
        routine: { title, scheduled_time, category },
        message: `Rotina "${title}" criada para ${scheduled_time}`
      });
    } catch (err) {
      console.error('Create routine error:', err);
      return JSON.stringify({
        success: false,
        message: 'Erro ao criar rotina.'
      });
    }
  }, [toast]);

  // Complete routine
  const completeRoutine = useCallback(async (routineTitle: string): Promise<string> => {
    try {
      // Find the routine
      const { data: routines, error: findError } = await supabase
        .from('daily_routines')
        .select('id, title')
        .ilike('title', `%${routineTitle}%`)
        .limit(1);

      if (findError) throw findError;

      if (!routines || routines.length === 0) {
        return JSON.stringify({
          success: false,
          message: `Rotina "${routineTitle}" não encontrada.`
        });
      }

      const routine = routines[0];
      const today = new Date().toISOString().split('T')[0];

      // Check if already completed today
      const { data: existing } = await supabase
        .from('routine_completions')
        .select('id')
        .eq('routine_id', routine.id)
        .eq('completion_date', today)
        .single();

      if (existing) {
        return JSON.stringify({
          success: true,
          message: `Rotina "${routine.title}" já foi concluída hoje.`
        });
      }

      // Mark as complete
      const { error: insertError } = await supabase
        .from('routine_completions')
        .insert({
          routine_id: routine.id,
          completion_date: today
        });

      if (insertError) throw insertError;

      toast({
        title: 'Rotina Concluída',
        description: routine.title,
      });

      return JSON.stringify({
        success: true,
        message: `Rotina "${routine.title}" marcada como concluída.`
      });
    } catch (err) {
      console.error('Complete routine error:', err);
      return JSON.stringify({
        success: false,
        message: 'Erro ao completar rotina.'
      });
    }
  }, [toast]);

  // Main function call handler
  const handleFunctionCall = useCallback(async (call: FunctionCall): Promise<string> => {
    console.log('[useRealtimeTools] Handling function:', call.name, call.arguments);

    try {
      const args = JSON.parse(call.arguments);

      switch (call.name) {
        case 'send_whatsapp_message':
          return await sendWhatsAppMessage(args.to, args.message);

        case 'resolve_contact_by_name':
          return await resolveContactByName(args.name);

        case 'get_weather':
          return await getWeather(args.location);

        case 'web_search':
          return await webSearch(args.query);

        case 'list_routines':
          return await listRoutines(args.filter);

        case 'create_routine':
          return await createRoutine(args.title, args.scheduled_time, args.category);

        case 'complete_routine':
          return await completeRoutine(args.routine_title);

        default:
          console.warn('[useRealtimeTools] Unknown function:', call.name);
          return JSON.stringify({
            success: false,
            message: `Função "${call.name}" não implementada.`
          });
      }
    } catch (err) {
      console.error('[useRealtimeTools] Error parsing arguments:', err);
      return JSON.stringify({
        success: false,
        message: 'Erro ao processar argumentos da função.'
      });
    }
  }, [sendWhatsAppMessage, resolveContactByName, getWeather, webSearch, listRoutines, createRoutine, completeRoutine]);

  return { handleFunctionCall };
}
