import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserWithData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  contacts_count: number;
  messages_count: number;
  routines_count: number;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithData[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Check if current user is admin
  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Fetch all users data (admin only)
  const fetchAllUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    setUsersLoading(true);
    try {
      // Fetch contacts grouped by user
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("user_id");

      // Fetch messages grouped by user
      const { data: messagesData } = await supabase
        .from("whatsapp_messages")
        .select("user_id");

      // Fetch routines grouped by user
      const { data: routinesData } = await supabase
        .from("daily_routines")
        .select("user_id");

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Get unique user IDs from all tables
      const allUserIds = new Set<string>();
      
      contactsData?.forEach(c => c.user_id && allUserIds.add(c.user_id));
      messagesData?.forEach(m => m.user_id && allUserIds.add(m.user_id));
      routinesData?.forEach(r => r.user_id && allUserIds.add(r.user_id));
      rolesData?.forEach(r => r.user_id && allUserIds.add(r.user_id));

      // Build user stats
      const userStats: UserWithData[] = Array.from(allUserIds).map(userId => {
        const userRoles = rolesData?.filter(r => r.user_id === userId).map(r => r.role) || [];
        const contactsCount = contactsData?.filter(c => c.user_id === userId).length || 0;
        const messagesCount = messagesData?.filter(m => m.user_id === userId).length || 0;
        const routinesCount = routinesData?.filter(r => r.user_id === userId).length || 0;

        return {
          id: userId,
          email: `User ${userId.slice(0, 8)}...`,
          created_at: new Date().toISOString(),
          last_sign_in_at: null,
          roles: userRoles,
          contacts_count: contactsCount,
          messages_count: messagesCount,
          routines_count: routinesCount,
        };
      });

      setUsers(userStats);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin]);

  // Fetch all contacts (admin only)
  const fetchAllContacts = useCallback(async () => {
    if (!isAdmin) return [];
    
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }, [isAdmin]);

  // Fetch all messages (admin only)
  const fetchAllMessages = useCallback(async () => {
    if (!isAdmin) return [];
    
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }, [isAdmin]);

  // Fetch all routines (admin only)
  const fetchAllRoutines = useCallback(async () => {
    if (!isAdmin) return [];
    
    const { data, error } = await supabase
      .from("daily_routines")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }, [isAdmin]);

  // Fetch all audit logs (admin only)
  const fetchAllAuditLogs = useCallback(async () => {
    if (!isAdmin) return [];
    
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return data || [];
  }, [isAdmin]);

  // Fetch all conversations (admin only)
  const fetchAllConversations = useCallback(async () => {
    if (!isAdmin) return [];
    
    const { data, error } = await supabase
      .from("conversation_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return data || [];
  }, [isAdmin]);

  // Grant admin role to a user
  const grantAdminRole = useCallback(async (userId: string) => {
    if (!isAdmin) return { error: new Error("Not authorized") };
    
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (!error) await fetchAllUsers();
    return { error };
  }, [isAdmin, fetchAllUsers]);

  // Revoke admin role from a user
  const revokeAdminRole = useCallback(async (userId: string) => {
    if (!isAdmin) return { error: new Error("Not authorized") };
    
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!error) await fetchAllUsers();
    return { error };
  }, [isAdmin, fetchAllUsers]);

  return {
    isAdmin,
    loading,
    users,
    usersLoading,
    fetchAllUsers,
    fetchAllContacts,
    fetchAllMessages,
    fetchAllRoutines,
    fetchAllAuditLogs,
    fetchAllConversations,
    grantAdminRole,
    revokeAdminRole,
  };
}
