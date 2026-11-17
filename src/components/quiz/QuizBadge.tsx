import { cn } from '@/lib/utils';
import type { QuizTone } from '@/lib/quiz';

const tones: Record<QuizTone, string> = {
  primary: 'border-primary bg-primary/15',
  warning: 'border-annotation-yellow bg-annotation-yellow/15',
  success: 'border-annotation-green bg-annotation-green/15',
  neutral: 'border-muted-foreground/60 bg-muted',
  danger: 'border-destructive bg-destructive/15',
};

/** Etiqueta de estado. El color acompaña al texto; nunca es el único portador del significado. */
export function QuizBadge({ label, tone, className, ...rest }: { label: string; tone: QuizTone; className?: string; 'data-cy'?: string }) {
  return (
    <span {...rest} className={cn('inline-flex shrink-0 items-center border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground', tones[tone], className)}>
      {label}
    </span>
  );
}
