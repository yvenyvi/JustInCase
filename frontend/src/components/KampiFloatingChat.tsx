import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader2, MessageCircle } from 'lucide-react';
import { aiChatService, AIMessage } from '../services/aiChatService';
import { rightsService } from '../services/rightsService';
import { kampiService } from '../services/kampiService';
import styles from './KampiFloatingChat.module.css';

// ── Lightweight markdown → React nodes (assistant replies only) ──────────────

function parseInline(text: string, prefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let last = 0, i = 0, m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const k = `${prefix}-${i++}`;
    if (m[1]) parts.push(<strong key={k}><em>{m[1]}</em></strong>);
    else if (m[2]) parts.push(<strong key={k}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={k}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={k}>{m[4]}</code>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function formatMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let listItems: string[] = [];
  let ordered = false;
  let key = 0;

  const flushList = () => {
    if (!listItems.length) return;
    const Tag = ordered ? 'ol' : 'ul';
    out.push(
      <Tag key={key++} className={styles.mdList}>
        {listItems.map((item, i) => <li key={i}>{parseInline(item, `li${key}${i}`)}</li>)}
      </Tag>
    );
    listItems = [];
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { flushList(); continue; }

    const heading = t.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      flushList();
      out.push(<p key={key++} className={styles.mdHeading}>{parseInline(heading[1], `h${key}`)}</p>);
      continue;
    }

    const ul = t.match(/^[-•*]\s+(.+)/);
    if (ul) {
      if (listItems.length && ordered) flushList();
      ordered = false;
      listItems.push(ul[1]);
      continue;
    }

    const ol = t.match(/^\d+\.\s+(.+)/);
    if (ol) {
      if (listItems.length && !ordered) flushList();
      ordered = true;
      listItems.push(ol[1]);
      continue;
    }

    flushList();
    out.push(<p key={key++}>{parseInline(t, `p${key}`)}</p>);
  }
  flushList();
  return out;
}

const KampiFloatingChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (!conversationId) {
        initChat();
      } else {
        // Auto-scroll on open
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      }
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initChat = async () => {
    try {
      setIsLoading(true);
      const convs = await aiChatService.getConversations();
      if (convs.length > 0) {
        setConversationId(convs[0].id);
        const msgs = await aiChatService.getMessages(convs[0].id);
        setMessages(msgs);
      } else {
        const newConv = await aiChatService.createConversation('Quick Question');
        setConversationId(newConv.id);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      // Always ensure conversationId is set so the user can still chat (local fallback)
      setConversationId(`local-conversation-${Date.now()}-fallback`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !conversationId || isLoading) return;

    const userQuery = inputText.trim();
    setInputText('');
    
    try {
      setIsLoading(true);
      
      const userMsg = await aiChatService.sendMessage(conversationId, 'user', userQuery);
      setMessages(prev => [...prev, userMsg]);

      // Search rights DB and generate response
      const kampiResponse = await generateKampiResponse(userQuery);
      const assistantMsg = await aiChatService.sendMessage(conversationId, 'assistant', kampiResponse);
      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);

    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const generateKampiResponse = async (query: string): Promise<string> => {
    // Rights search is best-effort — a bad query or missing table must not block the AI reply
    const results = await rightsService.searchArticles(query).catch(() => []);
    const rightsContext = results.slice(0, 5).map((item) => {
      const category = (item as any).rights_categories;
      return {
        title: item.title,
        detail: item.detail,
        lawSection: item.law_section,
        lawReference: category?.law_reference || null,
      };
    });

    const history = messages.slice(-8).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const response = await kampiService.chat({ message: query, history, rightsContext });
      return response.reply;
    } catch (err) {
      console.error('Error generating Kampi response:', err);
      return "Pasensya na, hindi ko ma-access ang AI service ngayon. Subukan ulit mamaya. Kung legal concern ito, maaari mo ring i-check ang Rights Library.";
    }
  };

  return (
    <div className={styles.floatingContainer}>
      {isOpen && (
        <div className={styles.chatPopover}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={styles.avatar}><Bot size={18} /></div>
              <div className={styles.headerText}>
                <h3>Kampi</h3>
                <span>AI General Helper</span>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className={styles.disclaimer}>
            Paalala: Si Kampi ay para sa pangkalahatang tulong at impormasyon, at hindi pormal na payong legal.
          </div>

          <div className={styles.messagesContainer}>
            {messages.length === 0 && !isLoading ? (
              <div className={styles.emptyState}>
                <MessageCircle size={32} opacity={0.3} />
                <h4>Kumusta! Ako si Kampi.</h4>
                <p>Nandito ako para tulungan ka sa pag-navigate ng iyong account at magbigay ng basic legal info.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`${styles.messageRow} ${msg.role === 'user' ? styles.sent : styles.received}`}>
                  <div className={styles.messageBubble}>
                    {msg.role !== 'user'
                      ? <div className={styles.mdContent}>{formatMarkdown(msg.content)}</div>
                      : msg.content
                    }
                    <span className={styles.messageTime}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
            {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
              <div className={`${styles.messageRow} ${styles.received}`}>
                <div className={styles.messageBubble} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Nag-iisip...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.inputArea} onSubmit={handleSendMessage}>
             <textarea 
               ref={inputRef}
               className={styles.textInput}
               placeholder="Paano kita matutulungan?" 
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSendMessage();
                 }
               }}
               rows={1}
             />
             <button 
               type="submit" 
               className={styles.sendBtn} 
               disabled={!inputText.trim() || isLoading}
             >
               {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
             </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button className={styles.floatingBtn} onClick={() => setIsOpen(true)}>
          <Bot size={28} />
        </button>
      )}
    </div>
  );
};

export default KampiFloatingChat;
