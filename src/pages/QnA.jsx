import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const initialAssistantMessage = {
  id: 'intro',
  role: 'assistant',
  content: 'Namaste! Main aapke receipts aur kharchon mein madad ke liye yahan hoon. Kuch bhi poochhiye ✨',
  cached: false,
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function QnA() {
  const { user, fetchWithAuth } = useAuth();

  const [messages, setMessages] = useState([initialAssistantMessage]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [typingState, setTypingState] = useState(null);

  const chatEndRef = useRef(null);
  const isBusy = Boolean(typingState);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingState]);

  useEffect(() => {
    if (!typingState || typingState.loading) return;

    if (typingState.currentText.length < typingState.fullText.length) {
      const timeout = setTimeout(() => {
        setTypingState((prev) => {
          if (!prev || prev.loading) return prev;
          return {
            ...prev,
            currentText: prev.fullText.slice(0, prev.currentText.length + 2),
          };
        });
      }, 14);
      return () => clearTimeout(timeout);
    }

    const completed = typingState;
    setTypingState(null);
    setMessages((prev) => [
      ...prev,
      { id: completed.id, role: 'assistant', content: completed.fullText, cached: completed.cached },
    ]);
  }, [typingState]);

  const sendQuestion = async () => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;

    if (!user) {
      setError('Please log in first.');
      return;
    }

    const userMessage = { id: createId(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError('');

    const tempId = createId();
    setTypingState({
      id: tempId,
      fullText: '',
      currentText: '',
      cached: false,
      loading: true,
    });

    try {
      const res = await fetchWithAuth('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      const answer = data?.answer || 'Hmm… iska jawab nahi mila.';

      setTypingState({
        id: tempId,
        fullText: answer,
        currentText: '',
        cached: Boolean(data?.cached),
        loading: false,
      });
    } catch {
      setTypingState(null);
      setMessages((prev) => [...prev, { id: createId(), role: 'assistant', content: '⚠️ Server busy. Try again later.' }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const MemoryBadge = () => (
    <span className="mb-1 inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
      ⚡ Answered from Memory
    </span>
  );

  return (
    <div className="min-h-screen w-full bg-pink-50/80 dark:bg-slate-950/70 py-6 px-4 md:px-8">
      <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-5xl flex-col rounded-3xl bg-white/90 p-6 shadow-[0_45px_120px_rgba(244,114,182,0.25)] dark:bg-slate-900/60">
        {/* Header */}
        <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">ReceiptWise AI Assistant</h1>
        <p className="text-sm text-slate-500">Ask anything about your expenses.</p>
        </div>

        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto space-y-5 rounded-2xl bg-pink-50/80 p-4 pr-1 dark:bg-slate-900/60">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                <Bot className="w-4 h-4 text-slate-700 dark:text-white" />
              </div>
            )}

            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white border-blue-500/40 rounded-br-md'
                  : 'bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border-slate-300/30 dark:border-slate-700/40 rounded-bl-md'
              }`}
            >
              {m.cached && <MemoryBadge />}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>

            {m.role === 'user' && (
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white shadow">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {typingState && (
          <div className="flex gap-3 justify-start">
            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
              <Bot className="w-4 h-4 text-slate-600 dark:text-white" />
            </div>

            <div className="max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-white/60 dark:bg-slate-800/60 border backdrop-blur border-slate-300/40 dark:border-slate-700/40">
              {typingState.cached && <MemoryBadge />}
              <p>{typingState.loading ? 'Thinking…' : typingState.currentText}</p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="pt-4 pb-3 border-t border-slate-300/40 dark:border-slate-700/40">
        <div className="flex gap-3 items-center">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            placeholder="Ask something…"
          />
          <button
            onClick={sendQuestion}
            disabled={!input.trim() || isBusy}
            className="rounded-xl px-4 py-2 bg-blue-600 text-white text-sm shadow disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
