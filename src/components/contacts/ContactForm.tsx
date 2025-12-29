import { useState } from "react";
import { motion } from "framer-motion";
import { X, Save } from "lucide-react";
import { Contact } from "@/hooks/useContacts";
import { formatPhoneForDisplay } from "@/lib/phoneUtils";

interface ContactFormProps {
  contact?: Contact | null;
  onSubmit: (name: string, phone: string) => Promise<void>;
  onClose: () => void;
}

export default function ContactForm({ contact, onSubmit, onClose }: ContactFormProps) {
  const [name, setName] = useState(contact?.name || "");
  const [phone, setPhone] = useState(contact ? formatPhoneForDisplay(contact.phone_e164) : "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !phone.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), phone.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-card border border-primary/30 rounded-lg w-full max-w-sm p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-primary">
            {contact ? "EDITAR CONTATO" : "NOVO CONTATO"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-primary/10 rounded">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome do contato"
              required
              className="w-full px-3 py-2 bg-background/50 border border-primary/20 rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(85) 99999-9999"
              required
              className="w-full px-3 py-2 bg-background/50 border border-primary/20 rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Código do país (55) será adicionado automaticamente se necessário
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-primary/30 rounded text-sm text-muted-foreground hover:bg-primary/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !phone.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary/20 border border-primary/50 rounded text-sm text-primary hover:bg-primary/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
