import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppPanelProps {
  onOpenHistory: () => void;
}

export default function WhatsAppPanel({ onOpenHistory }: WhatsAppPanelProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  // Get count of recent inbound messages (last 24h as "unread" indicator)
  useEffect(() => {
    const fetchRecentCount = async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count } = await supabase
        .from("whatsapp_messages")
        .select("*", { count: "exact", head: true })
        .eq("direction", "inbound")
        .gte("created_at", yesterday.toISOString());
      
      setUnreadCount(count || 0);
    };

    fetchRecentCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('whatsapp-panel-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          if (payload.new && (payload.new as any).direction === 'inbound') {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="hud-panel">
      <div className="hud-panel-header">
        <MessageCircle className="w-3 h-3" />
        <span>WHATSAPP</span>
        {unreadCount > 0 && (
          <span className="ml-auto bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>
      <div className="p-2">
        <button
          onClick={onOpenHistory}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400 hover:bg-green-500/20 transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          Ver Histórico
        </button>
      </div>
    </div>
  );
}
