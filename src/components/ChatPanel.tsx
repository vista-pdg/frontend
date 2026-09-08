import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';
import { SendHorizonal, X, Trash2, TriangleAlert, CircleAlert, Timer } from 'lucide-react';

const SUGGESTIONS_BY_TYPE: Record<string, string[]> = {
  graph: [
    'Grafo dirigido con 5 nodos en ciclo',
    'Grafo completo K4',
    'Grafo bipartito 3x3',
    'Grafo ponderado con 6 nodos y pesos aleatorios',
  ],
  'tree/avl': [
    'AVL tree insertando 10, 5, 15, 3, 7',
    'AVL con rotación derecha: 10, 5, 3',
    'AVL con rotación izquierda: 3, 5, 10',
    'AVL con doble rotación LR: 10, 3, 5',
  ],
  'tree/bst': [
    'BST insertando 8, 3, 10, 1, 6, 14, 4, 7',
    'BST con valores 5, 3, 7, 1, 4, 6, 8',
  ],
  'tree/heap': [
    'Max-heap insertando 5, 3, 7, 1, 9, 2',
    'Heap mínimo con valores 4, 8, 2, 10, 1, 6',
  ],
  tree: [
    'BST insertando 8, 3, 10, 1, 6, 14, 4, 7',
    'AVL tree con valores 10, 5, 15, 3, 7',
    'Árbol binario con 7 nodos pre-construido',
  ],
  heap: [
    'Max-heap insertando 5, 3, 7, 1, 9, 2',
    'Heap mínimo con valores 4, 8, 2, 10, 1, 6',
    'Max-heap con 8 elementos: 12, 5, 17, 3, 9, 1, 7, 4',
  ],
  'linked-list': [
    'Lista simple con [1, 2, 3, 4, 5]',
    'Lista doblemente enlazada [10, 20, 30, 40]',
    'Lista circular con 4 nodos: 7, 14, 21, 28',
  ],
  'hash-table': [
    'Tabla hash 7 cubetas con [15, 22, 35, 8, 43, 10]',
    'Hash table tamaño 5 con [3, 8, 13, 18, 23]',
    'Tabla hash tamaño 3 con colisiones: [1, 4, 7, 10]',
  ],
};

const DEFAULT_SUGGESTIONS = [
  'Grafo dirigido con 5 nodos en ciclo',
  'BST insertando 10, 5, 15, 3, 7',
  'Lista simple con [1, 2, 3, 4, 5]',
  'Tabla hash 7 cubetas con [15, 22, 35]',
  'Max-heap insertando 5, 3, 7, 1, 9',
];

const PLACEHOLDER_BY_TYPE: Record<string, string> = {
  graph: 'Describe el grafo… (Enter para enviar)',
  tree: 'Describe el árbol… (Enter para enviar)',
  heap: 'Describe el heap… (Enter para enviar)',
  'linked-list': 'Describe la lista enlazada… (Enter para enviar)',
  'hash-table': 'Describe la tabla hash… (Enter para enviar)',
};

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const messages = useGraphStore((s) => s.messages);
  const loading = useGraphStore((s) => s.loading);
  const sendPrompt = useGraphStore((s) => s.sendPrompt);
  const activeStructureType = useGraphStore((s) => s.activeStructureType);
  const activeSubtype = useGraphStore((s) => s.activeSubtype);
  const clearAll = useGraphStore((s) => s.clearAll);
  const quota = useGraphStore((s) => s.quota);
  const assistantBlocked = useGraphStore((s) => s.assistantBlocked);
  const rateLimitUntil = useGraphStore((s) => s.rateLimitUntil);
  const loadQuota = useGraphStore((s) => s.loadQuota);
  const clearAssistantBlock = useGraphStore((s) => s.clearAssistantBlock);

  // El contador se pide al abrir el panel (CA-5: al entrar, 40 de 40), no al montar la app.
  useEffect(() => {
    if (open) void loadQuota();
  }, [open, loadQuota]);

  // Cuenta regresiva del bloqueo por ráfaga. Los segundos se DERIVAN del instante en que vence en
  // cada render —no se guardan en estado— para que el primer pintado ya muestre el valor correcto y
  // un tab en segundo plano no la desincronice. El intervalo sólo fuerza un re-render por segundo.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (assistantBlocked !== 'rate' || !rateLimitUntil) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [assistantBlocked, rateLimitUntil]);
  const secondsLeft =
    assistantBlocked === 'rate' && rateLimitUntil
      ? Math.max(0, Math.ceil((rateLimitUntil - now) / 1000))
      : 0;
  useEffect(() => {
    if (assistantBlocked === 'rate' && rateLimitUntil && secondsLeft === 0) clearAssistantBlock();
  }, [assistantBlocked, rateLimitUntil, secondsLeft, clearAssistantBlock]);

  const exhausted = assistantBlocked === 'daily';
  const rateLimited = assistantBlocked === 'rate';
  const counterText = quota ? `${quota.remaining} mensajes restantes hoy` : '';
  const counterClass = !quota
    ? 'text-muted-foreground'
    : quota.remaining === 0
      ? 'text-red-400'
      : quota.warning
        ? 'text-yellow-main'
        : 'text-muted-foreground';

  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const subtypeKey = activeStructureType && activeSubtype
    ? `${activeStructureType}/${activeSubtype}`
    : activeStructureType;

  const suggestions =
    subtypeKey && SUGGESTIONS_BY_TYPE[subtypeKey]
      ? SUGGESTIONS_BY_TYPE[subtypeKey]
      : activeStructureType && SUGGESTIONS_BY_TYPE[activeStructureType]
      ? SUGGESTIONS_BY_TYPE[activeStructureType]
      : DEFAULT_SUGGESTIONS;

  const placeholder =
    activeStructureType && PLACEHOLDER_BY_TYPE[activeStructureType]
      ? PLACEHOLDER_BY_TYPE[activeStructureType]
      : 'Describe la estructura de datos… (Enter para enviar)';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function submit() {
    const prompt = input.trim();
    if (!prompt || loading || assistantBlocked) return;
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

  const showSuggestions = messages.length === 1;

  return (
    <div
      className={cn(
        'flex flex-col h-full border-l border-border bg-black-main shrink-0',
        'transition-all duration-300 ease-in-out overflow-hidden',
        open ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none'
      )}
    >

      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary/10 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2 rounded-full bg-secondary shadow-[0_0_6px_#4cb979] shrink-0 animate-pulse" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold tracking-wide text-white truncate">
              StructureAI
            </span>
            {counterText && (
              <span
                data-cy="quota-counter"
                className={cn('text-[11px] font-medium tracking-[0.02em] leading-tight', counterClass)}
              >
                {counterText}
              </span>
            )}
          </div>
          {activeStructureType && (
            <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary-light uppercase tracking-wider shrink-0">
              {activeSubtype ?? activeStructureType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 1 && (
            <button
              onClick={clearAll}
              className="text-muted-foreground hover:text-destructive transition-colors duration-150 p-1"
              title="Limpiar chat y lienzo"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors duration-150 p-1"
            title="Cerrar panel"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-3 py-3 scrollbar-custom">
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              data-cy={`chat-message-${msg.role}`}
              className={cn(
                'max-w-[88%] px-3 py-2 text-[13px] leading-relaxed break-words',
                msg.role === 'user'
                  ? 'self-end bg-primary/40 text-white'
                  : msg.role === 'error'
                  ? 'self-start border border-destructive/40 bg-destructive/10 text-red-300'
                  : 'self-start bg-card/80 text-muted-foreground'
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
            <div className="self-start flex items-center gap-1 bg-card/80 px-3 py-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-primary animate-bounce"
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
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setInput(s);
                textareaRef.current?.focus();
              }}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] text-primary-light hover:bg-primary/20 transition-colors duration-150 cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* HU-17: estado de la cuota. Una franja, nunca un modal: el lienzo sigue utilizable. */}
      {exhausted && (
        <div
          data-cy="quota-exhausted"
          role="status"
          className="flex items-start gap-2.5 border-t border-destructive/40 bg-destructive/10 px-3 py-2.5 shrink-0"
        >
          <CircleAlert className="mt-px size-3.5 shrink-0 text-red-400" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-semibold leading-snug text-red-400">
              Alcanzaste tu límite diario. Se restablece a medianoche.
            </span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              Puedes seguir explorando la estructura actual en el lienzo.
            </span>
          </div>
        </div>
      )}
      {rateLimited && (
        <div
          data-cy="rate-limited"
          role="status"
          className="flex items-start gap-2.5 border-t border-orange-main/40 bg-orange-main/10 px-3 py-2.5 shrink-0"
        >
          <Timer className="mt-px size-3.5 shrink-0 text-orange-main" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-semibold leading-snug text-orange-main">
              Demasiados mensajes seguidos
            </span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              Podrás enviar de nuevo en {secondsLeft} s.
            </span>
          </div>
        </div>
      )}
      {!exhausted && !rateLimited && quota?.warning && (
        <div
          data-cy="quota-warning"
          role="status"
          className="flex items-start gap-2.5 border-t border-yellow-main/40 bg-yellow-main/10 px-3 py-2.5 shrink-0"
        >
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-yellow-main" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-semibold leading-snug text-yellow-main">
              Te quedan {quota.remaining} mensajes hoy
            </span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              La cuota se restablece a medianoche.
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2 border-t border-border px-3 py-2.5 shrink-0"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            exhausted
              ? 'Cuota agotada hasta medianoche'
              : rateLimited
                ? 'Espera un momento…'
                : placeholder
          }
          disabled={loading || exhausted || rateLimited}
          rows={2}
          data-cy="chat-input"
          className="flex-1 resize-none bg-card/60 border-primary/30 text-white placeholder:text-muted-foreground text-[13px] focus-visible:ring-primary/40"
        />
        <Button
          type="submit"
          size={rateLimited ? 'sm' : 'icon'}
          data-cy="chat-send"
          disabled={loading || !input.trim() || exhausted || rateLimited}
          className="self-end bg-primary hover:bg-primary-light text-white shrink-0 transition-colors duration-150 disabled:opacity-45"
        >
          {rateLimited ? (
            <span data-cy="chat-send-countdown" className="text-[12px] font-semibold tabular-nums">
              {secondsLeft} s
            </span>
          ) : (
            <SendHorizonal className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
