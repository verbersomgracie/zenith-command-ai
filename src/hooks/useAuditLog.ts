import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AuditAction = 
  | 'view' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'import' 
  | 'export'
  | 'send_message';

type AuditTable = 
  | 'contacts' 
  | 'whatsapp_messages' 
  | 'conversation_history' 
  | 'daily_routines';

interface AuditDetails {
  [key: string]: unknown;
}

export const useAuditLog = () => {
  const logEvent = useCallback(async (
    action: AuditAction,
    tableName: AuditTable,
    recordId?: string,
    details?: AuditDetails
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('log_audit_event', {
        p_action: action,
        p_table_name: tableName,
        p_record_id: recordId || null,
        p_details: details ? JSON.stringify(details) : null
      });

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (err) {
      console.error('Audit log error:', err);
    }
  }, []);

  const logContactAccess = useCallback((action: AuditAction, contactId?: string, details?: AuditDetails) => {
    return logEvent(action, 'contacts', contactId, details);
  }, [logEvent]);

  const logMessageAccess = useCallback((action: AuditAction, messageId?: string, details?: AuditDetails) => {
    return logEvent(action, 'whatsapp_messages', messageId, details);
  }, [logEvent]);

  const logConversationAccess = useCallback((action: AuditAction, details?: AuditDetails) => {
    return logEvent(action, 'conversation_history', undefined, details);
  }, [logEvent]);

  return {
    logEvent,
    logContactAccess,
    logMessageAccess,
    logConversationAccess
  };
};
