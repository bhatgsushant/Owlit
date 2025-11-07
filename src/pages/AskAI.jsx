import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpCircle, Loader2, Database, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const INITIAL_ASSISTANT_MESSAGE =
  "Hi! I'm your expense analyst. Ask me things like “What’s my grocery spend this month?” or “Show receipts with coffee last week.”";

const STARTER_SUGGESTIONS = [
  "What did I spend on coffee last week?",
  "Show all receipts mentioning milk in January.",
  "Which merchant did I spend the most on this month?",
];

const MessageBubble = ({ role, content, sqlQuery, followUps = [], onFollowUp }) => {
  const isAssistant = role === 'assistant';
  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[90%] rounded-3xl px-5 py-4 shadow-lg ${
          isAssistant
            ? 'bg-white/80 text-slate-900 dark:bg-slate-900/80 dark:text-slate-50'
            : 'bg-gradient-to-br from-emerald-500 via-emerald-400 to-cyan-500 text-white'
        }`}
        style={{ whiteSpace: 'pre-line' }}
      >
        <p className="text-base leading-relaxed">{content}</p>
        {sqlQuery && (
          <div className="mt-4 rounded-2xl border border-white/20 bg-black/60 p-3 text-xs font-mono text-white/80">
            <div className="flex items-center gap-2 text-white mb-2">
              <Database size={14} />
              <span>SQL preview</span>
            </div>
            <pre className="whitespace-pre-wrap">{sqlQuery}</pre>
          </div>
        )}
        {!!followUps.length && (
          <div className="mt-4 flex flex-wrap gap-2">
            {followUps.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onFollowUp?.(suggestion)}
                className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold transition hover:border-white/60"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function AskAI() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: INITIAL_ASSISTANT_MESSAGE }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (textOverride) => {
    const payload = (textOverride ?? input).trim();
    if (!payload || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', content: payload }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: payload }),
      });

      if (!response.ok) {
        throw new Error('The Ask AI service is temporarily unavailable.');
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.final_answer || 'I could not interpret that question.',
          sqlQuery: data.sql_query,
          followUps: data.follow_ups || [],
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Something went wrong: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const showStarterSuggestions = messages.length <= 1;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1f1b2c,_#090a13_70%)] text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-20 pt-32">
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em]"
          >
            <MessageCircle size={14} />
            Ask AI
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold sm:text-5xl"
          >
            Conversational spending insights
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-base text-white/70 sm:text-lg"
          >
            Ask natural questions about your receipts and let AI translate them into real database queries.
          </motion.p>
        </div>

        <div className="rounded-[30px] border border-white/15 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          <div className="flex justify-between pb-4 text-sm text-white/70">
            <span>Chat</span>
            <Link to="/dashboard" className="text-white hover:underline">
              Back to dashboard
            </Link>
          </div>

          <div className="flex h-[480px] flex-col gap-4 overflow-y-auto pr-2">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.role}-${index}`}
                {...message}
                onFollowUp={(suggestion) => sendMessage(suggestion)}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-3xl bg-white/70 px-4 py-3 text-slate-900 shadow">
                  <Loader2 className="animate-spin" size={16} />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showStarterSuggestions && (
            <div className="mt-6 flex flex-wrap gap-3">
              {STARTER_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/60"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-end gap-3 rounded-3xl border border-white/15 bg-black/30 p-4">
            <textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your receipts..."
              className="max-h-32 w-full resize-none bg-transparent text-base text-white placeholder-white/40 focus:outline-none"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 p-3 text-white shadow-lg transition hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ArrowUpCircle size={24} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
