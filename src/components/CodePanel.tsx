import { useState } from 'react';
import { ChevronDown, ChevronRight, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';

/**
 * Panel de código sincronizado (HU-22a).
 *
 * <p>Lee el mismo rastro que los adaptadores: la línea activa es `steps[stepIndex].line`, así que
 * el resaltado de línea y el del nodo salen del mismo paso y no hay nada que sincronizar. Sólo se
 * monta cuando el rastro trae código; los algoritmos no instrumentados no lo muestran.
 */
export function CodePanel() {
  const code = useGraphStore((s) => s.code);
  const steps = useGraphStore((s) => s.steps);
  const currentStepIndex = useGraphStore((s) => s.currentStepIndex);
  const selected = useGraphStore((s) => s.selectedAlgorithm);
  const [collapsed, setCollapsed] = useState(false);

  if (!code || code.length === 0 || steps.length === 0) return null;
  const current = steps[currentStepIndex];
  const activeLine = current?.line ?? null;

  return (
    <div
      data-cy="code-panel"
      data-active-line={activeLine ?? ''}
      className="absolute bottom-[112px] left-4 pointer-events-auto w-[380px] max-w-[calc(100%-2rem)] border border-border bg-black-main/90 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Code className="size-3.5 text-primary-light shrink-0" />
          <span className="text-[12px] font-semibold text-white truncate">{selected?.label ?? 'Código'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-primary-light" data-cy="code-step-counter">
            {currentStepIndex + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Mostrar código' : 'Ocultar código'}
            data-cy="code-toggle"
            className="p-0.5 text-muted-foreground hover:text-white transition-colors duration-150"
          >
            {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
      </div>
      {!collapsed && (
        <ol className="py-1.5 font-mono text-[12px]" aria-label="Pseudocódigo" data-cy="code-lines">
          {code.map((text, i) => {
            const n = i + 1;
            const active = n === activeLine;
            return (
              <li
                key={n}
                data-cy={`code-line-${n}`}
                data-active={active ? 'true' : 'false'}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-[3px] border-l-2 whitespace-pre',
                  active ? 'bg-primary/20 border-primary text-white font-semibold' : 'border-transparent text-[#d4d4d8]'
                )}
              >
                <span className={cn('w-4 text-right text-[11px]', active ? 'text-primary-light' : 'text-muted-foreground')}>
                  {n}
                </span>
                <span className="flex-1">{text}</span>
                {active && <span aria-hidden="true" className="text-orange-main">◀</span>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
