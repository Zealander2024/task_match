-- Add recipient_id column to messages table
ALTER TABLE messages 
ADD COLUMN recipient_id UUID REFERENCES auth.users(id);

-- Update existing messages to set recipient_id
UPDATE messages m
SET recipient_id = CASE 
    WHEN m.sender_id = c.user1_id THEN c.user2_id
    ELSE c.user1_id
END
FROM conversations c
WHERE m.conversation_id = c.id;

-- Make recipient_id NOT NULL after updating existing messages
ALTER TABLE messages 
ALTER COLUMN recipient_id SET NOT NULL;

-- Update the messages policies
CREATE OR REPLACE POLICY "Users can view messages in their conversations"
    ON messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_id
            AND auth.uid() IN (user1_id, user2_id)
        )
    );

CREATE OR REPLACE POLICY "Users can update messages they received"
    ON messages FOR UPDATE
    TO authenticated
    USING (recipient_id = auth.uid());