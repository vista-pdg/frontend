import type { ReactNode } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared feedback; field validation still belongs beside its input. */
export function Alert({ children, tone = 'error', className }: {
  children: ReactNode;
  tone?: 'error' | 'success';
  className?: string;
}) {
  const Icon = tone === 'error' ? CircleAlert : CheckCircle2;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 border-l-2 px-3 py-3 text-[13px] leading-relaxed text-foreground',
        tone === 'error' ? 'border-destructive bg-destructive/10' : 'border-annotation-green bg-secondary/10',
        className)}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', tone === 'error' ? 'text-destructive' : 'text-annotation-green')} />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
