-- Add UPDATE policy for conversation_history (deny all updates to preserve integrity)
CREATE POLICY "Users can update their own conversation history" 
ON public.conversation_history FOR UPDATE 
USING (auth.uid() = user_id);