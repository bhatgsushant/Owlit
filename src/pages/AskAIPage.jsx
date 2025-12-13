import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, Bot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function AskAIPage() {
  const { fetchWithAuth } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setError('');

    const userMsg = { role: 'user', text: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await fetchWithAuth('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (!resp.ok) {
        throw new Error('Request failed');
      }
      const data = await resp.json();
      const aiMsg = {
        role: 'ai',
        text: data?.answer || 'No response',
        items: Array.isArray(data?.items_used) ? data.items_used : [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AskAI error:', err);
      setError('Something went wrong');
    } finally {
      setLoading(false);
      setQuestion('');
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center py-4 md:py-8 px-4 font-sans text-white bg-fixed bg-cover bg-center"
      style={{
        backgroundImage: "url('/images/colorful-gradients-3840x2160-22838.jpg')",
      }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <AnimatedSection className="relative w-full max-w-md h-[600px] flex flex-col rounded-3xl border border-white/20 bg-white/10 backdrop-blur-3xl shadow-[0_40px_130px_rgba(0,0,0,0.5)] overflow-hidden">

        {/* Header */}
        <header className="px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm font-playfair">Owlit AI</h1>
              <p className="text-xs text-cyan-100/80 font-medium">Your personal spending assistant</p>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/80 backdrop-blur-sm">
              Beta
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-80">
              <div className="w-20 h-20 mb-6 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center shadow-inner">
                <Sparkles className="w-10 h-10 text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">How can I help?</h3>
              <p className="text-white/60 max-w-xs text-sm leading-relaxed mb-8">
                Ask about your spending, recent orders, or get insights from your receipts.
              </p>

              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {[
                  "Spend Summary",
                  "Recent Grocery",
                  "Top Merchants",
                  "Last Receipt"
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setQuestion(tag);
                      // Optional: auto-submit or just fill
                    }}
                    className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/70 transition-all hover:scale-105 active:scale-95"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-1`}
              >
                <div
                  style={{ maxWidth: '75%' }}
                  className={`relative px-4 py-2 text-xs leading-snug ${msg.role === 'user'
                    ? 'bg-[#007AFF] text-white rounded-3xl rounded-br-sm ml-auto'
                    : 'bg-[#E9E9EB] text-black rounded-3xl rounded-bl-sm mr-auto'
                    }`}
                >
                  <div className="whitespace-pre-wrap font-fk-grotesk text-xs tracking-wide">
                    {msg.text.replace(/\*\*/g, '').split(/([£$]?\d+(?:[.,]\d+)?)/).map((part, i) =>
                      /^[£$]?\d+(?:[.,]\d+)?$/.test(part) ? (
                        <span key={i} className={`font-ubuntu font-bold ${/^[£$]/.test(part) ? 'bg-black/5 px-1 py-0.5 rounded-md text-black/90 mx-0.5' : ''}`}>{part}</span>
                      ) : (
                        part
                      )
                    )}
                  </div>

                  {/* Used Items Source Card (Styled to fit inside iMessage Gray Bubble) */}
                  {msg.role === 'ai' && msg.items && msg.items.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-black/10">
                      <div className="text-[11px] font-fk-grotesk font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                        Sources
                      </div>
                      <div className="space-y-1.5">
                        {msg.items.map((it, i) => (
                          <div
                            key={i}
                            className="bg-white/60 rounded-lg p-2 flex flex-col gap-0.5 shadow-sm"
                          >
                            <div className="font-fk-grotesk font-medium text-[13px] text-black">
                              {it.item_name || 'Item'}
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                              <span className="font-medium text-gray-700">
                                £{(it.price ?? 0).toFixed(2)}
                              </span>
                              {it.date && <span>{it.date}</span>}
                              {it.merchant_name && <span>{it.merchant_name}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start pl-1"
            >
              <div className="bg-[#E9E9EB] px-4 py-3 rounded-[20px] rounded-bl-[4px] flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              </div>
            </motion.div>
          )}
          {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-center">{error}</div>}
          <div ref={bottomRef} />
        </main>

        {/* Input Area (iMessage Style) */}
        <footer className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl z-10">
          <form
            onSubmit={sendMessage}
            className="flex items-center gap-2 bg-[#F2F2F7]/90 backdrop-blur-sm px-3 py-1.5 rounded-[18px] shadow-sm transition-all focus-within:bg-white focus-within:shadow-md min-h-[36px]"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Me"
              className="flex-1 bg-transparent border-none outline-none text-black placeholder:text-gray-400 text-sm leading-snug font-sans h-full"
              disabled={loading}
            />

            <AnimatePresence>
              {question.trim().length > 0 && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 0.9 }}
                  type="submit"
                  disabled={loading}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#007AFF] text-white shadow-sm hover:bg-[#006fe6] transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="mb-0.5 ml-0.5">
                      <Send className="w-4 h-4 fill-current" />
                    </div>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </form>
        </footer>
      </AnimatedSection>
    </div >
  );
}
