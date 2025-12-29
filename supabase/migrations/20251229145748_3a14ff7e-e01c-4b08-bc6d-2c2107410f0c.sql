-- Create contacts table for storing phone contacts
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone_e164 TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'device',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on phone number to prevent duplicates
CREATE UNIQUE INDEX idx_contacts_phone_unique ON public.contacts(phone_e164);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Since there's no auth in this app, allow all operations (single-user mode)
CREATE POLICY "Allow all read access to contacts"
ON public.contacts
FOR SELECT
USING (true);

CREATE POLICY "Allow all insert access to contacts"
ON public.contacts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all update access to contacts"
ON public.contacts
FOR UPDATE
USING (true);

CREATE POLICY "Allow all delete access to contacts"
ON public.contacts
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_contacts_updated_at_trigger
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_contacts_updated_at();