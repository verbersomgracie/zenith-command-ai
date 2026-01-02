-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create daily_routines table for recurring tasks like medicine, gym, etc.
CREATE TABLE public.daily_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create routine_completions table to track daily completion
CREATE TABLE public.routine_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID NOT NULL REFERENCES public.daily_routines(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(routine_id, completion_date)
);

-- Enable RLS
ALTER TABLE public.daily_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_routines
CREATE POLICY "Allow all read access to daily_routines" ON public.daily_routines FOR SELECT USING (true);
CREATE POLICY "Allow all insert access to daily_routines" ON public.daily_routines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update access to daily_routines" ON public.daily_routines FOR UPDATE USING (true);
CREATE POLICY "Allow all delete access to daily_routines" ON public.daily_routines FOR DELETE USING (true);

-- RLS policies for routine_completions
CREATE POLICY "Allow all read access to routine_completions" ON public.routine_completions FOR SELECT USING (true);
CREATE POLICY "Allow all insert access to routine_completions" ON public.routine_completions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all delete access to routine_completions" ON public.routine_completions FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_daily_routines_updated_at
  BEFORE UPDATE ON public.daily_routines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();