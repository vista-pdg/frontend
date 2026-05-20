import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';
import { SendHorizonal } from 'lucide-react';

const SUGGESTIONS = [
  'Grafo dirigido con 5 nodos en ciclo',
  'Grafo completo K4',
  'Grafo bipartito 3x3',
  'Grafo ponderado con 6 nodos y pesos aleatorios',
  'Red de 4 routers conectados en malla',
];

export default function GraphChat() {
  const messages = useGraphStore((s) => s.messages);
  const loading = useGraphStore((s) => s.loading);
  const sendPrompt = useGraphStore((s) => s.sendPrompt);

  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function submit() {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setInput('');
    await sendPrompt(prompt);
    textareaRef.current?.focus();
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleForm(e: { preventDefault(): void }) {
    e.preventDefault();
    submit();
  }

  const showSuggestions = messages.length === 1;

  return (
    <div className="flex w-80 max-h-[70vh] flex-col rounded-xl border border-indigo-500/20 bg-slate-950/90 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-indigo-500/20 bg-indigo-500/10 px-4 py-3 shrink-0 rounded-t-xl">
        <span className="size-2 rounded-full bg-green-400 shadow-[0_0_6px_var(--color-green-400)]" />
        <span className="text-sm font-semibold tracking-wide text-slate-100">
          GraphBuilder AI
        </span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-28 px-3 py-3">
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-relaxed wrap-break-word',
                msg.role === 'user'
                  ? 'self-end rounded-br-sm bg-indigo-500/40 text-slate-100'
                  : msg.role === 'error'
                  ? 'self-start rounded-bl-sm border border-red-500/40 bg-red-500/10 text-red-300'
                  : 'self-start rounded-bl-sm bg-slate-800/80 text-slate-400'
              )}
            >
              {msg.text.split('\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </div>
          ))}

          {loading && (
            <div className="self-start flex items-center gap-1 rounded-xl rounded-bl-sm bg-slate-800/80 px-3 py-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2 shrink-0">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setInput(s); textareaRef.current?.focus(); }}
              className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleForm}
        className="flex gap-2 border-t border-indigo-500/20 px-3 py-2.5 shrink-0"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Describe tu grafo… (Enter para enviar)"
          disabled={loading}
          rows={2}
          className="flex-1 resize-none bg-slate-800/60 border-indigo-500/20 text-slate-100 placeholder:text-slate-500 text-[13px] focus-visible:ring-indigo-500/40"
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || !input.trim()}
          className="self-end bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
        >
          <SendHorizonal className="size-4" />
        </Button>
      </form>
    </div>
  );
}
