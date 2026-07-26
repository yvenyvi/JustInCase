import { supabase } from '../lib/supabase';

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const MISSING_TABLE_CODE = 'PGRST205';
let isAiChatDbAvailable = true;

const isMissingAiChatTableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const raw = error as { code?: string; message?: string };
  if (raw.code !== MISSING_TABLE_CODE) return false;
  const message = (raw.message || '').toLowerCase();
  return (
    message.includes('ai_conversations') ||
    message.includes('ai_messages') ||
    message.includes('could not find the table')
  );
};

const createLocalId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createLocalConversation = (userId: string, title: string): AIConversation => {
  const now = new Date().toISOString();
  return {
    id: createLocalId('local-conversation'),
    user_id: userId,
    title,
    created_at: now,
    updated_at: now,
  };
};

const createLocalMessage = (
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): AIMessage => ({
  id: createLocalId('local-message'),
  conversation_id: conversationId,
  role,
  content,
  created_at: new Date().toISOString(),
});

export const aiChatService = {
  async getConversations() {
    if (!isAiChatDbAvailable) {
      return [];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      if (isMissingAiChatTableError(error)) {
        isAiChatDbAvailable = false;
        console.warn('[AI Chat Service] ai_conversations table missing. Falling back to local chat mode.');
        return [];
      }
      console.error('[AI Chat Service] Error fetching conversations:', error);
      throw error;
    }
    return data as AIConversation[];
  },

  async createConversation(title: string = 'New Legal Query') {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!isAiChatDbAvailable || !userId) {
      return createLocalConversation(userId || 'local-user', title);
    }

    const convId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('ai_conversations')
      .insert([{ id: convId, user_id: userId, title, created_at: now, updated_at: now }]);

    if (error) {
      if (isMissingAiChatTableError(error)) {
        isAiChatDbAvailable = false;
      }
      console.warn('[AI Chat Service] Unable to create DB conversation. Using local conversation mode.', error);
      return createLocalConversation(userId, title);
    }

    return { id: convId, user_id: userId, title, created_at: now, updated_at: now } as AIConversation;
  },

  async getMessages(conversationId: string) {
    if (!isAiChatDbAvailable || conversationId.startsWith('local-conversation-')) {
      return [];
    }

    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingAiChatTableError(error)) {
        isAiChatDbAvailable = false;
        console.warn('[AI Chat Service] ai_messages table missing. Using local messages for this session.');
        return [];
      }
      console.error('[AI Chat Service] Error fetching messages:', error);
      throw error;
    }
    return data as AIMessage[];
  },

  async sendMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
    if (!isAiChatDbAvailable || conversationId.startsWith('local-conversation-')) {
      return createLocalMessage(conversationId, role, content);
    }

    const { data, error } = await supabase
      .from('ai_messages')
      .insert([{ conversation_id: conversationId, role, content }])
      .select()
      .single();

    if (error) {
      if (isMissingAiChatTableError(error)) {
        isAiChatDbAvailable = false;
        return createLocalMessage(conversationId, role, content);
      }
      console.error('[AI Chat Service] Error sending message:', error);
      throw error;
    }
    
    // Update the conversation's updated_at timestamp
    const { error: updateError } = await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (updateError && !isMissingAiChatTableError(updateError)) {
      console.warn('[AI Chat Service] Unable to update conversation timestamp:', updateError);
    }

    return data as AIMessage;
  }
};
