import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneNumber } from "@/lib/phoneUtils";
import { useToast } from "@/hooks/use-toast";

export interface Contact {
  id: string;
  name: string;
  phone_e164: string;
  source: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from("contacts")
        .select("*")
        .order("name", { ascending: true });
      
      if (fetchError) throw fetchError;
      
      setContacts(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch contacts";
      setError(message);
      console.error("Error fetching contacts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = useCallback(async (name: string, phone: string, source = "manual") => {
    const phone_e164 = normalizePhoneNumber(phone);
    
    if (!phone_e164) {
      toast({
        variant: "destructive",
        title: "Número inválido",
        description: "Por favor, insira um número de telefone válido.",
      });
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Não autenticado",
          description: "Você precisa estar logado para adicionar contatos.",
        });
        return null;
      }

      const { data, error } = await supabase
        .from("contacts")
        .insert({ name: name.trim(), phone_e164, source, user_id: user.id })
        .select()
        .single();
      
      if (error) {
        if (error.code === "23505") {
          toast({
            variant: "destructive",
            title: "Contato duplicado",
            description: "Este número já está salvo na lista de contatos.",
          });
          return null;
        }
        throw error;
      }
      
      setContacts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: "Contato adicionado",
        description: `${name} foi adicionado com sucesso.`,
      });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add contact";
      toast({
        variant: "destructive",
        title: "Erro ao adicionar",
        description: message,
      });
      console.error("Error adding contact:", err);
      return null;
    }
  }, [toast]);

  const updateContact = useCallback(async (id: string, name: string, phone: string) => {
    const phone_e164 = normalizePhoneNumber(phone);
    
    if (!phone_e164) {
      toast({
        variant: "destructive",
        title: "Número inválido",
        description: "Por favor, insira um número de telefone válido.",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("contacts")
        .update({ name: name.trim(), phone_e164 })
        .eq("id", id);
      
      if (error) {
        if (error.code === "23505") {
          toast({
            variant: "destructive",
            title: "Contato duplicado",
            description: "Este número já está salvo em outro contato.",
          });
          return false;
        }
        throw error;
      }
      
      setContacts(prev => 
        prev.map(c => c.id === id ? { ...c, name: name.trim(), phone_e164 } : c)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast({
        title: "Contato atualizado",
        description: `${name} foi atualizado com sucesso.`,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update contact";
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: message,
      });
      console.error("Error updating contact:", err);
      return false;
    }
  }, [toast]);

  const deleteContact = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setContacts(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Contato removido",
        description: "Contato removido com sucesso.",
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete contact";
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: message,
      });
      console.error("Error deleting contact:", err);
      return false;
    }
  }, [toast]);

  const importContacts = useCallback(async (rawContacts: Array<{ name: string; tel: string[] }>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Não autenticado",
        description: "Você precisa estar logado para importar contatos.",
      });
      return { imported: 0, skipped: 0 };
    }

    let imported = 0;
    let skipped = 0;
    
    for (const contact of rawContacts) {
      if (!contact.tel || contact.tel.length === 0) {
        skipped++;
        continue;
      }
      
      // Use the first phone number
      const phone = contact.tel[0];
      const phone_e164 = normalizePhoneNumber(phone);
      
      if (!phone_e164) {
        skipped++;
        continue;
      }
      
      try {
        const { error } = await supabase
          .from("contacts")
          .insert({ 
            name: contact.name || "Sem nome", 
            phone_e164, 
            source: "device",
            user_id: user.id
          });
        
        if (error) {
          if (error.code === "23505") {
            // Duplicate - skip silently
            skipped++;
          } else {
            console.error("Error importing contact:", error);
            skipped++;
          }
        } else {
          imported++;
        }
      } catch {
        skipped++;
      }
    }
    
    // Refresh the list
    await fetchContacts();
    
    toast({
      title: "Importação concluída",
      description: `${imported} contatos importados, ${skipped} ignorados.`,
    });
    
    return { imported, skipped };
  }, [fetchContacts, toast]);

  const findContactByName = useCallback((name: string): Contact[] => {
    const searchTerm = name.toLowerCase().trim();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(searchTerm)
    ).slice(0, 5);
  }, [contacts]);

  return {
    contacts,
    loading,
    error,
    addContact,
    updateContact,
    deleteContact,
    importContacts,
    findContactByName,
    refetch: fetchContacts,
  };
}
