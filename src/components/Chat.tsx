const sendMessage = async (content: string, type: string, metadata?: any) => {
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content,
        message_type: type,
        metadata
      });

    if (error) throw error;

  } catch (error) {
    console.error('Error sending message:', error);
  }
};