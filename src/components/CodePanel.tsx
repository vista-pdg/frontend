import { useState } from 'react';
import { ChevronDown, ChevronRight, Code, Layers, Variable } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';

/**
 * Panel de código sincronizado (HU-22a) con inspector de variables y pila de llamadas (HU-22b).
 *
 * <p>Lee el mismo rastro que los adaptadores: la línea activa, las variables y los marcos son los
 * del paso actual del motor, así que el resaltado de línea y el del nodo salen del mismo paso y no
 * hay nada que sincronizar. Sólo se monta cuando el rastro trae código; las secciones de estado
 * sólo cuando el paso trae datos.
 */
export function CodePanel() {
  const code = useGraphStore((s) => s.code);
  const steps = useGraphStore((s) => s.steps);
  const currentStepIndex = useGraphStore((s) => s.currentStepIndex);
  const selected = useGraphStore((s) => s.selectedAlgorithm);
  const [collapsed, setCollapsed] = useState(false);
  const [varsOpen, setVarsOpen] = useState(true);
  const [stackOpen, setStackOpen] = useState(true);

  if (!code || code.length === 0 || steps.length === 0) return null;
  const current = steps[currentStepIndex];
  const activeLine = current?.line ?? null;
  const variables = current?.variables ?? null;
  const callStack = current?.callStack ?? null;
  const varEntries = variables ? Object.entries(variables) : [];
  const frames = callStack ? [...callStack].reverse() : [];
  const pointed = current?.highlightedNodeIds?.length ? current.highlightedNodeIds[0] : null;

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
        <>
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

          {/* HU-22b · CA-2: variables vigentes del paso */}
          {variables && (
            <section className="border-t border-border" data-cy="code-variables" aria-label="Variables">
              <button
                type="button"
                onClick={() => setVarsOpen((o) => !o)}
                aria-expanded={varsOpen}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
              >
                {varsOpen ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
                <Variable className="size-3 text-muted-foreground" />
                <span className="text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Variables</span>
                {pointed && (
                  <span className="ml-auto text-[10px] text-muted-foreground" data-cy="code-pointed-node">
                    nodo apuntado: <span className="font-mono text-orange-main">{pointed.replace(/^node-/, '')}</span>
                  </span>
                )}
              </button>
              {varsOpen && (
                <dl className="pb-1.5 font-mono text-[11px]">
                  {varEntries.map(([name, value], i) => (
                    <div
                      key={name}
                      data-cy={`var-${name}`}
                      className={cn('flex items-center justify-between gap-3 px-3 py-[3px] pl-8', i === 0 && 'bg-orange-main/10')}
                    >
                      <dt className={cn(i === 0 ? 'text-orange-main' : 'text-muted-foreground')}>{name}</dt>
                      <dd className="text-white truncate" data-cy={`var-${name}-value`}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}

          {/* HU-22b · CA-3: pila de llamadas, el tope arriba */}
          {callStack && (
            <section className="border-t border-border" data-cy="call-stack" data-depth={callStack.length} aria-label="Pila de llamadas">
              <button
                type="button"
                onClick={() => setStackOpen((o) => !o)}
                aria-expanded={stackOpen}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
              >
                {stackOpen ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
                <Layers className="size-3 text-muted-foreground" />
                <span className="text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Pila de llamadas · {callStack.length}
                </span>
              </button>
              {stackOpen && (
                <ol className="pb-1.5 font-mono text-[11px]" reversed>
                  {frames.map((f, i) => {
                    const depth = callStack.length - i;
                    const params = Object.entries(f.params ?? {})
                      .map(([k, v]) => `${k}=${v}`)
                      .join(', ');
                    return (
                      <li
                        key={`${depth}-${f.name}-${params}`}
                        data-cy={`frame-${depth}`}
                        data-top={i === 0 ? 'true' : 'false'}
                        className={cn('flex items-center gap-2 px-3 py-[3px] pl-8', i === 0 && 'bg-primary/15')}
                      >
                        <span className="w-4 text-right text-[10px] text-muted-foreground">{depth}</span>
                        <span className={cn(i === 0 ? 'text-primary-light font-semibold' : 'text-[#d4d4d8]')}>
                          {f.name}({params})
                        </span>
                        {i === 0 && <span className="ml-auto text-[10px] text-muted-foreground">← tope</span>}
                      </li>
                    );
                  })}
                  {frames.length === 0 && <li className="px-3 pl-8 text-[10px] text-muted-foreground">(vacía)</li>}
                </ol>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
