import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Select nativo con el chevron del sistema de diseño: a 12 px del borde y con espacio para que el
 * texto no lo toque (pen: «Entrada Curso», padding horizontal de 12 px). La flecha nativa de cada
 * navegador quedaba pegada al borde derecho.
 */
export function NativeSelect({ className, wrapperClassName, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <span className={cn('relative block min-w-0', wrapperClassName)}>
      <select {...props} className={cn(className, 'appearance-none pr-10')} />
      <ChevronDown aria-hidden="true"
        className={cn('pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground', props.disabled && 'opacity-50')} />
    </span>
  );
}
