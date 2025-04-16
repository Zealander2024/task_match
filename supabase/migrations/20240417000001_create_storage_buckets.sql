-- Safely create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'company-assets', 'company-assets', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'company-assets'
);

INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

INSERT INTO storage.buckets (id, name, public)
SELECT 'resumes', 'resumes', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'resumes'
);

-- Create or replace policies for company-assets bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Authenticated Users Can Upload" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload"
ON storage.objects FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND bucket_id = 'company-assets'
);

-- Allow users to update their own uploads
DROP POLICY IF EXISTS "Users Can Update Own Objects" ON storage.objects;
CREATE POLICY "Users Can Update Own Objects"
ON storage.objects FOR UPDATE
USING (auth.uid() = owner)
WITH CHECK (bucket_id = 'company-assets');

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users Can Delete Own Objects" ON storage.objects;
CREATE POLICY "Users Can Delete Own Objects"
ON storage.objects FOR DELETE
USING (
    auth.uid() = owner
    AND bucket_id = 'company-assets'
);