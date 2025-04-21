-- Enable RLS for conversations and messages tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Conversations policies
CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IN (user1_id, user2_id)
    );

CREATE POLICY "Users can view their own conversations"
    ON conversations FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (user1_id, user2_id)
    );

CREATE POLICY "Users can update their own conversations"
    ON conversations FOR UPDATE
    TO authenticated
    USING (
        auth.uid() IN (user1_id, user2_id)
    );

-- Messages policies
CREATE POLICY "Users can create messages in their conversations"
    ON messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_id
            AND auth.uid() IN (user1_id, user2_id)
        )
    );

CREATE POLICY "Users can view messages in their conversations"
    ON messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_id
            AND auth.uid() IN (user1_id, user2_id)
        )
    );

CREATE POLICY "Users can update their own messages"
    ON messages FOR UPDATE
    TO authenticated
    USING (
        sender_id = auth.uid()
    );
