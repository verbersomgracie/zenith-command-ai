import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WhatsAppMessage {
  id: string;
  message_sid: string;
  from_number: string;
  to_number: string;
  body: string;
  direction: string;
  status: string | null;
  media_urls: string[] | null;
  num_media: number | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppMessages() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (fetchError) throw fetchError;
      
      setMessages(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch messages";
      setError(message);
      console.error("Error fetching WhatsApp messages:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log("New WhatsApp message received:", payload);
          const newMessage = payload.new as WhatsAppMessage;
          
          setMessages(prev => [newMessage, ...prev]);
          
          // Show toast for incoming messages
          if (newMessage.direction === 'inbound') {
            toast({
              title: `Nova mensagem de ${formatPhone(newMessage.from_number)}`,
              description: newMessage.body.slice(0, 100) + (newMessage.body.length > 100 ? '...' : ''),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
  };
}

// Helper to format phone numbers for display
function formatPhone(phone: string): string {
  // Remove whatsapp: prefix if present
  const clean = phone.replace(/^whatsapp:\+?/, '');
  
  if (clean.startsWith('55') && clean.length >= 12) {
    const ddd = clean.slice(2, 4);
    const num = clean.slice(4);
    if (num.length === 9) {
      return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    } else if (num.length === 8) {
      return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
    }
  }
  return clean;
}
