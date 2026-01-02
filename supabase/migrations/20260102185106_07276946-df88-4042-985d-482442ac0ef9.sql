-- Create audit_logs table for tracking access to sensitive data
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs FOR SELECT
USING (auth.uid() = user_id);

-- Allow inserts from authenticated users (for their own logs)
CREATE POLICY "Users can create their own audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Create function to log access (can be called from edge functions or client)
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action text,
    p_table_name text,
    p_record_id uuid DEFAULT NULL,
    p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
    VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;