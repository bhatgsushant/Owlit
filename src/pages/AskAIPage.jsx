import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b py-4 px-4 md:px-8 flex items-center justify-center">
        <h1 className="text-xl md:text-2xl font-semibold text-emerald-700">Ask Owlit AI</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'} `}>
                <div className="text-xs font-semibold mb-1 opacity-80">
                  {msg.role === 'user' ? 'You' : 'Owlit AI'}
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                {msg.role === 'ai' && msg.items && msg.items.length > 0 && (
                  <div className="mt-3 bg-white text-gray-800 rounded-xl border border-emerald-100 p-3 shadow-sm text-sm">
                    <div className="font-semibold text-emerald-700 mb-2">Used Items</div>
                    <div className="space-y-2">
                      {msg.items.map((it, i) => (
                        <div key={i} className="border border-gray-100 rounded-lg px-2 py-1">
                          <div className="font-semibold text-gray-900">{it.item_name || 'Item'}</div>
                          <div className="text-gray-700 flex flex-wrap gap-3 text-xs">
                            <span>£{(it.price ?? 0).toFixed(2)}</span>
                            {it.date && <span>{it.date}</span>}
                            {it.merchant_name && <span>{it.merchant_name}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 rounded-2xl px-4 py-3 shadow">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="sticky bottom-0 w-full bg-white border-t">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-center gap-3 px-4 md:px-8 py-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your purchases, totals, trends..."
            className="flex-1 rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 
            <span>Send</span>
          </button>
        </form>
      </footer>
    </div>
  );
}
