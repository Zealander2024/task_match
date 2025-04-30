-- Create employer verification requests table
CREATE TABLE IF NOT EXISTS public.employer_verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add RLS policies for employer verification requests
ALTER TABLE public.employer_verification_requests ENABLE ROW LEVEL SECURITY;

-- Policy for employers to view their own verification requests
CREATE POLICY employer_verification_select_policy
  ON public.employer_verification_requests
  FOR SELECT
  USING (auth.uid() = employer_id);

-- Policy for employers to insert their own verification requests
CREATE POLICY employer_verification_insert_policy
  ON public.employer_verification_requests
  FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

-- Policy for admin to view all verification requests
CREATE POLICY admin_verification_select_policy
  ON public.employer_verification_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for admin to update verification requests
CREATE POLICY admin_verification_update_policy
  ON public.employer_verification_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX employer_verification_employer_id_idx ON public.employer_verification_requests(employer_id);
CREATE INDEX employer_verification_status_idx ON public.employer_verification_requests(status); 