import { cn } from '@/lib/utils';
import { percent } from '@/lib/analytics';
import type { TopicLevel } from '@/types/analytics';

const fill: Record<TopicLevel, string> = {
  DIFICIL: 'bg-destructive', EN_PROGRESO: 'bg-annotation-orange', DOMINADO: 'bg-annotation-green', SIN_DATOS: 'bg-muted-foreground',
};

/** Barra de acierto; el porcentaje va en texto al lado, el color solo acompaña. */
export function AccuracyBar({ value, level, className, fillClass }: { value: number | null; level: TopicLevel; className?: string; fillClass?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span className="h-1.5 min-w-16 flex-1 bg-muted" aria-hidden="true">
        <span className={cn('block h-full', fillClass ?? fill[level])} style={{ width: `${Math.max(0, Math.min(1, value ?? 0)) * 100}%` }} />
      </span>
      <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums">{percent(value)}</span>
    </span>
  );
}
