import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Smartphone, FileUp, Search, MessageCircle, Pencil, Trash2, Loader2 } from "lucide-react";
import { useContacts, Contact } from "@/hooks/useContacts";
import { isContactPickerSupported, pickContactsFromDevice, formatPhoneForDisplay } from "@/lib/phoneUtils";
import { useToast } from "@/hooks/use-toast";
import ContactForm from "./ContactForm";
import FileImportModal from "./FileImportModal";

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact?: (contact: Contact) => void;
}

export default function ContactsModal({ isOpen, onClose, onSelectContact }: ContactsModalProps) {
  const { contacts, loading, addContact, updateContact, deleteContact, importContacts } = useContacts();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showFileImport, setShowFileImport] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_e164.includes(search.replace(/\D/g, ""))
  );

  const handleImportFromPhone = async () => {
    if (!isContactPickerSupported()) {
      toast({
        variant: "destructive",
        title: "Não suportado",
        description: "Importação de contatos não é suportada neste dispositivo/navegador. Use adicionar manualmente ou importar CSV.",
      });
      return;
    }

    try {
      setIsImporting(true);
      const rawContacts = await pickContactsFromDevice();
      
      if (rawContacts.length === 0) {
        toast({
          title: "Nenhum contato selecionado",
          description: "Selecione pelo menos um contato para importar.",
        });
        return;
      }

      await importContacts(rawContacts);
    } catch (err) {
      console.error("Import error:", err);
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: err instanceof Error ? err.message : "Falha ao importar contatos.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddContact = async (name: string, phone: string) => {
    const result = await addContact(name, phone, "manual");
    if (result) {
      setShowForm(false);
    }
  };

  const handleEditContact = async (name: string, phone: string) => {
    if (!editingContact) return;
    const success = await updateContact(editingContact.id, name, phone);
    if (success) {
      setEditingContact(null);
    }
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (confirm(`Remover ${contact.name}?`)) {
      await deleteContact(contact.id);
    }
  };

  const handleSendWhatsApp = (contact: Contact) => {
    if (onSelectContact) {
      onSelectContact(contact);
      onClose();
    }
  };

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
            <h2 className="font-display text-lg text-primary">CONTATOS</h2>
            <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-b border-primary/20 flex flex-wrap gap-2">
            <button
              onClick={handleImportFromPhone}
              disabled={isImporting}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded text-sm text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              Importar do Telefone
            </button>
            <button
              onClick={() => { setShowForm(true); setEditingContact(null); }}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded text-sm text-primary hover:bg-primary/20"
            >
              <UserPlus className="w-4 h-4" />
              Adicionar Manual
            </button>
            <button
              onClick={() => setShowFileImport(true)}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded text-sm text-primary hover:bg-primary/20"
            >
              <FileUp className="w-4 h-4" />
              Importar Arquivo
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-primary/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar contatos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background/50 border border-primary/20 rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? "Nenhum contato encontrado" : "Nenhum contato salvo. Importe ou adicione contatos."}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 bg-background/50 border border-primary/10 rounded hover:border-primary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPhoneForDisplay(contact.phone_e164)}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleSendWhatsApp(contact)}
                        className="p-2 text-green-400 hover:bg-green-400/10 rounded"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingContact(contact); setShowForm(true); }}
                        className="p-2 text-primary hover:bg-primary/10 rounded"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact)}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add/Edit Form Modal */}
          {showForm && (
            <ContactForm
              contact={editingContact}
              onSubmit={editingContact ? handleEditContact : handleAddContact}
              onClose={() => { setShowForm(false); setEditingContact(null); }}
            />
          )}

          {/* File Import Modal (CSV/VCF) */}
          {showFileImport && (
            <FileImportModal
              onImport={importContacts}
              onClose={() => setShowFileImport(false)}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
