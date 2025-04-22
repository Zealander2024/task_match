-- Create enum for verification status
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create table for user verification
CREATE TABLE user_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status verification_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for verification documents
CREATE TABLE verification_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_id UUID REFERENCES user_verifications(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    extracted_text TEXT,
    parsed_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own verification"
    ON user_verifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification"
    ON user_verifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own documents"
    ON verification_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_verifications
            WHERE user_verifications.id = verification_documents.verification_id
            AND user_verifications.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload their own documents"
    ON verification_documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_verifications
            WHERE user_verifications.id = verification_documents.verification_id
            AND user_verifications.user_id = auth.uid()
        )
    );

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', false);

-- Create policy for verification document uploads
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'verifications' AND
    (storage.foldername(name))[1] = auth.uid()::text
);