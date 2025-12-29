-- Create table for WhatsApp messages
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_sid TEXT NOT NULL UNIQUE,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  status TEXT,
  num_media INTEGER DEFAULT 0,
  media_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for reading messages (public for now, can be restricted later)
CREATE POLICY "Allow read access to all messages" 
ON public.whatsapp_messages 
FOR SELECT 
USING (true);

-- Create policy for inserting messages (for the webhook)
CREATE POLICY "Allow insert for webhook" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_whatsapp_messages_from ON public.whatsapp_messages(from_number);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;