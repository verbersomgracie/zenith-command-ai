-- Create table for conversation history
CREATE TABLE public.conversation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (open access for single-user app)
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single-user app)
CREATE POLICY "Allow all access to conversation_history"
ON public.conversation_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for faster queries by date
CREATE INDEX idx_conversation_history_created_at ON public.conversation_history(created_at DESC);