-- Add user_id to contacts table
ALTER TABLE public.contacts 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to whatsapp_messages table
ALTER TABLE public.whatsapp_messages 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to conversation_history table
ALTER TABLE public.conversation_history 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to daily_routines table
ALTER TABLE public.daily_routines 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to routine_completions table
ALTER TABLE public.routine_completions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing contacts policies
DROP POLICY IF EXISTS "Allow all delete access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow all insert access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow all read access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow all update access to contacts" ON public.contacts;

-- Create new RLS policies for contacts
CREATE POLICY "Users can view their own contacts" 
ON public.contacts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" 
ON public.contacts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
ON public.contacts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
ON public.contacts FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing whatsapp_messages policies
DROP POLICY IF EXISTS "Allow insert for webhook" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Allow read access to all messages" ON public.whatsapp_messages;

-- Create new RLS policies for whatsapp_messages
CREATE POLICY "Users can view their own messages" 
ON public.whatsapp_messages FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages" 
ON public.whatsapp_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Drop existing conversation_history policies
DROP POLICY IF EXISTS "Allow all access to conversation_history" ON public.conversation_history;

-- Create new RLS policies for conversation_history
CREATE POLICY "Users can view their own conversation history" 
ON public.conversation_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation history" 
ON public.conversation_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation history" 
ON public.conversation_history FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing daily_routines policies
DROP POLICY IF EXISTS "Allow all delete access to daily_routines" ON public.daily_routines;
DROP POLICY IF EXISTS "Allow all insert access to daily_routines" ON public.daily_routines;
DROP POLICY IF EXISTS "Allow all read access to daily_routines" ON public.daily_routines;
DROP POLICY IF EXISTS "Allow all update access to daily_routines" ON public.daily_routines;

-- Create new RLS policies for daily_routines
CREATE POLICY "Users can view their own routines" 
ON public.daily_routines FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own routines" 
ON public.daily_routines FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines" 
ON public.daily_routines FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines" 
ON public.daily_routines FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing routine_completions policies
DROP POLICY IF EXISTS "Allow all delete access to routine_completions" ON public.routine_completions;
DROP POLICY IF EXISTS "Allow all insert access to routine_completions" ON public.routine_completions;
DROP POLICY IF EXISTS "Allow all read access to routine_completions" ON public.routine_completions;

-- Create new RLS policies for routine_completions
CREATE POLICY "Users can view their own completions" 
ON public.routine_completions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own completions" 
ON public.routine_completions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions" 
ON public.routine_completions FOR DELETE 
USING (auth.uid() = user_id);