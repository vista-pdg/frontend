import { CircleCheck, CircleX, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptionMark } from '@/lib/quiz';

const LABELS: Record<OptionMark, string> = {
  'chosen-correct': 'Tu respuesta · correcta',
  'chosen-wrong': 'Tu respuesta',
  correct: 'Correcta',
  none: '',
};

/** Opción de solo lectura (revisión y quiz de estudio resuelto). Compartida por HU-35. */
export function OptionOutcome({ text, mark, 'data-cy': dataCy }: { text: string; mark: OptionMark; 'data-cy'?: string }) {
  const good = mark === 'chosen-correct' || mark === 'correct';
  const bad = mark === 'chosen-wrong';
  const Icon = good ? CircleCheck : bad ? CircleX : Circle;
  return (
    <div data-cy={dataCy} data-mark={mark}
      className={cn('flex min-h-11 items-start gap-3 border p-3 text-[13px] leading-relaxed',
        good ? 'border-2 border-annotation-green bg-annotation-green/8' : bad ? 'border-2 border-destructive bg-destructive/8' : 'border-border')}>
      <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', good ? 'text-annotation-green' : bad ? 'text-destructive' : 'text-muted-foreground')} />
      <span className="min-w-0 flex-1 break-words">{text}</span>
      {mark !== 'none' && (
        // El rojo sobre su propio tinte no alcanza 4,5:1: la etiqueta incorrecta va en el color de texto.
        <span className={cn('shrink-0 text-[11px] font-semibold', good ? 'text-annotation-green' : 'text-foreground')}>{LABELS[mark]}</span>
      )}
    </div>
  );
}
