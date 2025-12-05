-- Create the branding table
CREATE TABLE IF NOT EXISTS public.branding (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    branding_logo TEXT,
    branding_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own branding" 
ON public.branding FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own branding" 
ON public.branding FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own branding" 
ON public.branding FOR UPDATE 
USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT ALL ON TABLE public.branding TO authenticated;
GRANT ALL ON TABLE public.branding TO service_role;
