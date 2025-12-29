import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw, Image as ImageIcon } from "lucide-react";
import { useWhatsAppMessages, WhatsAppMessage } from "@/hooks/useWhatsAppMessages";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsAppHistoryModal({ isOpen, onClose }: WhatsAppHistoryModalProps) {
  const { messages, loading, refetch } = useWhatsAppMessages();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-primary/30 rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-400" />
              <h2 className="font-display text-lg text-primary">HISTÓRICO WHATSAPP</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => refetch()} 
                className="p-2 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary"
                title="Atualizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma mensagem ainda.</p>
                <p className="text-xs mt-2">As mensagens enviadas e recebidas aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <MessageItem key={msg.id} message={msg} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-primary/20 text-center">
            <p className="text-xs text-muted-foreground">
              Mensagens são atualizadas em tempo real
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MessageItem({ message }: { message: WhatsAppMessage }) {
  const isInbound = message.direction === 'inbound';
  const phone = isInbound ? message.from_number : message.to_number;
  const cleanPhone = phone.replace(/^whatsapp:\+?/, '');
  
  // Format phone for display
  const formatPhone = (p: string): string => {
    if (p.startsWith('55') && p.length >= 12) {
      const ddd = p.slice(2, 4);
      const num = p.slice(4);
      if (num.length === 9) {
        return `+55 (${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
      } else if (num.length === 8) {
        return `+55 (${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
      }
    }
    return `+${p}`;
  };

  const timeAgo = formatDistanceToNow(new Date(message.created_at), { 
    addSuffix: true, 
    locale: ptBR 
  });

  return (
    <div className={`p-3 rounded-lg border ${
      isInbound 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-primary/10 border-primary/30'
    }`}>
      <div className="flex items-start gap-2">
        <div className={`p-1 rounded ${isInbound ? 'bg-green-500/20' : 'bg-primary/20'}`}>
          {isInbound ? (
            <ArrowDownLeft className="w-3 h-3 text-green-400" />
          ) : (
            <ArrowUpRight className="w-3 h-3 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground truncate">
              {isInbound ? 'De:' : 'Para:'} {formatPhone(cleanPhone)}
            </p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
          </div>
          <p className="text-sm text-foreground mt-1 break-words">{message.body}</p>
          
          {/* Media indicator */}
          {message.num_media && message.num_media > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <ImageIcon className="w-3 h-3" />
              <span>{message.num_media} mídia(s)</span>
            </div>
          )}
          
          {/* Status for outbound */}
          {!isInbound && message.status && (
            <p className="text-xs text-muted-foreground mt-1">
              Status: {message.status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
