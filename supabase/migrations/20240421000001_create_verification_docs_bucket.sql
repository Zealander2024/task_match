-- Create verification-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'verification-documents', 'verification-documents', false
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'verification-documents'
);

-- Create policies for verification-documents bucket
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'verification-documents' AND
    (storage.foldername(name))[1] = 'verification-docs'
);

-- Allow users to read their own verification documents
CREATE POLICY "Users can read verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'verification-documents' AND
    (storage.foldername(name))[1] = 'verification-docs'
);