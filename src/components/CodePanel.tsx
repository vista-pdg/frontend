import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, ChevronRight, GripVertical, Layers, MoveDiagonal2, RotateCcw, Variable } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';
import { useFloatingPanel } from '@/hooks/useFloatingPanel';

/**
 * Panel de código sincronizado (HU-22a) con inspector de variables y pila de llamadas (HU-22b).
 *
 * <p>Lee el mismo rastro que los adaptadores: la línea activa, las variables y los marcos son los
 * del paso actual del motor, así que el resaltado de línea y el del nodo salen del mismo paso y no
 * hay nada que sincronizar. Sólo se monta cuando el rastro trae código; las secciones de estado
 * sólo cuando el paso trae datos.
 */
export function CodePanel({ tutorialExpanded = false }: { tutorialExpanded?: boolean }) {
  const pseudocode = useGraphStore((s) => s.code);
  const representations = useGraphStore((s) => s.representations);
  const steps = useGraphStore((s) => s.steps);
  const currentStepIndex = useGraphStore((s) => s.currentStepIndex);
  const selected = useGraphStore((s) => s.selectedAlgorithm);
  const [copyStatus, setCopyStatus] = useState('');
  const [language, setLanguage] = useState('pseudocode');
  const linesRef = useRef<HTMLOListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);
  const [userCollapsed, setCollapsed] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const collapsed = userCollapsed && !tutorialExpanded;
  const [varsOpen, setVarsOpen] = useState(true);
  const [stackOpen, setStackOpen] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const instructionsId = useId();
  const adjustmentId = useId();

  const representation = representations.find(r => r.language === language);
  const code = representation?.code ?? pseudocode;
  const current = steps[currentStepIndex];
  const logicalLine = current?.line ?? null;
  const activeLines = representation
    ? (logicalLine === null ? [] : representation.lineMap[logicalLine] ?? []).filter(n => n > 0 && n <= (code?.length ?? 0))
    : (logicalLine === null ? [] : [logicalLine]);
  const activeLine = activeLines[0] ?? null;
  const label = representation?.label ?? 'Pseudocódigo';
  const hasCode = Boolean(code?.length && steps.length);
  const { panelRef, action, announcement, adjust, reset, pointerDown, pointerMove, pointerUp, keyboard, cancel, allowClick, style } = useFloatingPanel(hasCode, collapsed);

  // Scroll only the code scroller; the canvas, page and action buttons stay in place.
  useLayoutEffect(() => {
    const list = linesRef.current;
    const line = activeRef.current;
    if (!list || !line || collapsed) return;
    const top = line.offsetTop;
    if (top < list.scrollTop || top + line.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = Math.max(0, top - list.clientHeight / 2);
    }
  }, [activeLine, language, collapsed, style?.height, adjustOpen]);

  if (!code || code.length === 0 || steps.length === 0) return null;
  const variables = current?.variables ?? null;
  const callStack = current?.callStack ?? null;
  const varEntries = variables ? Object.entries(variables) : [];
  const frames = callStack ? [...callStack].reverse() : [];
  const pointed = current?.highlightedNodeIds?.length ? current.highlightedNodeIds[0] : null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code!.join('\n'));
      setCopyStatus('Código copiado.');
    } catch {
      setCopyStatus('No se pudo copiar. Puedes descargar el archivo.');
    }
  }

  function downloadCode() {
    const url = URL.createObjectURL(new Blob([code!.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = representation?.fileName ?? `${selected?.type ?? 'estructura'}-${selected?.operation ?? 'algoritmo'}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Código del algoritmo"
      data-cy="code-panel"
      data-panel-action={action ?? 'idle'}
      data-active-line={activeLine ?? ''}
      data-language={representation?.language ?? 'pseudocode'}
      style={style}
      className={cn('absolute bottom-[112px] left-4 pointer-events-auto flex flex-col w-[380px] max-w-[calc(100%_-_2rem)] overflow-hidden border border-border bg-shell/90 backdrop-blur-md', action && 'select-none')}
    >
      <p id={instructionsId} className="sr-only">Arrastra para ajustar el panel o haz clic para abrir los botones de ajuste. Usa las flechas; Mayús mueve 32 píxeles. Inicio restablece el panel. Escape cancela el arrastre.</p>
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
      <div className="flex h-[43px] shrink-0 items-center justify-between gap-1 pr-2 border-b border-border">
        <button type="button" data-cy="code-move" aria-label="Mover panel de código"
          title="Arrastra para mover o haz clic para ajustar" aria-describedby={instructionsId}
          aria-expanded={adjustOpen && !collapsed} aria-controls={adjustmentId}
          onPointerDown={event => pointerDown(event, 'move')} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={event => keyboard(event, 'move')}
          onClick={event => { if (allowClick(event.detail)) { setCollapsed(false); setAdjustOpen(open => !open); } }}
          className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left cursor-grab active:cursor-grabbing touch-none hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring">
          <GripVertical aria-hidden="true" className="size-4 text-primary-light shrink-0" />
          <span className="text-[12px] font-semibold text-foreground truncate">{selected?.label ?? 'Código'}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[11px] font-mono tabular-nums text-primary-light" data-cy="code-step-counter">
            {currentStepIndex + 1} / {steps.length}
          </span>
          <button type="button" data-cy="code-layout-reset" aria-label="Restablecer posición y tamaño del código"
            title="Restablecer posición y tamaño" onClick={() => { reset(); setAdjustOpen(false); }}
            className="flex size-8 items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <RotateCcw aria-hidden="true" className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Mostrar código' : 'Ocultar código'}
            data-cy="code-toggle"
            className="flex size-8 items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {collapsed ? <ChevronRight aria-hidden="true" className="size-3.5" /> : <ChevronDown aria-hidden="true" className="size-3.5" />}
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain">
          <div id={adjustmentId} hidden={!adjustOpen} data-cy="code-layout-controls" className="shrink-0 border-b border-border px-3 py-2">
            {(['move', 'resize'] as const).map(kind => (
              <div key={kind} role="group" aria-label={kind === 'move' ? 'Posición del código' : 'Tamaño del código'} className="flex items-center gap-1 py-0.5">
                <span className="mr-auto text-[11px] text-muted-foreground">{kind === 'move' ? 'Posición' : 'Tamaño'}</span>
                {([{ id: 'left', Icon: ArrowLeft, dx: -32, dy: 0, name: kind === 'move' ? 'Mover a la izquierda' : 'Reducir ancho' },
                  { id: 'up', Icon: ArrowUp, dx: 0, dy: -32, name: kind === 'move' ? 'Mover arriba' : 'Reducir alto' },
                  { id: 'down', Icon: ArrowDown, dx: 0, dy: 32, name: kind === 'move' ? 'Mover abajo' : 'Aumentar alto' },
                  { id: 'right', Icon: ArrowRight, dx: 32, dy: 0, name: kind === 'move' ? 'Mover a la derecha' : 'Aumentar ancho' }]).map(({ id, Icon, dx, dy, name }) => (
                  <button key={id} type="button" aria-label={name} title={name} data-cy={`code-${kind}-${id}`}
                    onClick={() => adjust(kind, dx, dy)}
                    className="flex size-8 items-center justify-center border border-border text-foreground hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring">
                    <Icon aria-hidden="true" className="size-3.5" />
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-[11px]">
            <div role="group" aria-label="Vista del código" className="mr-auto flex items-center gap-1">
              {[{ language: 'pseudocode', label: 'Pseudocódigo' }, ...representations].map(r => (
                <button key={r.language} type="button" data-cy={`code-view-${r.language}`}
                  aria-pressed={(representation?.language ?? 'pseudocode') === r.language}
                  onClick={() => { setLanguage(r.language); setCopyStatus(''); }}
                  className={cn('px-1 py-1 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring',
                    (representation?.language ?? 'pseudocode') === r.language ? 'text-primary-light font-semibold' : 'text-muted-foreground')}>
                  {r.label}
                </button>
              ))}
            </div>
            <button type="button" data-cy="code-copy" onClick={() => void copyCode()} className="border border-border px-2 py-1 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring text-foreground">Copiar</button>
            <button type="button" data-cy="code-download" onClick={downloadCode} className="border border-border px-2 py-1 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring text-foreground">Descargar</button>
          </div>
          <p role="status" className="shrink-0 px-3 text-[11px] text-muted-foreground">{copyStatus}</p>
          <p className="shrink-0 px-3 pb-1 text-[10px] text-muted-foreground" data-cy="code-source">
            {representation?.sourceUrl
              ? <a href={representation.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline focus-visible:outline-2 focus-visible:outline-ring">{representation.sourceLabel}</a>
              : representation?.sourceLabel ?? 'Pseudocódigo de VISTA'} · Solo lectura
          </p>
          {activeLine === null && <p className="shrink-0 px-3 text-[11px] text-muted-foreground" data-cy="code-no-line">
            {logicalLine === null ? 'Este paso es un resumen; no ejecuta una línea.' : 'Sin línea equivalente instrumentada en esta vista.'}
          </p>}
          <ol ref={linesRef} tabIndex={0} translate="no" className="focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring relative min-h-20 flex-1 overflow-auto overscroll-contain py-1.5 font-mono text-[12px]" aria-label={label} data-cy="code-lines">
            {code.map((text, i) => {
              const n = i + 1;
              const active = activeLines.includes(n);
              return (
                <li
                  key={n}
                  ref={n === activeLine ? activeRef : undefined}
                  data-cy={`code-line-${n}`}
                  data-active={active ? 'true' : 'false'}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-[3px] border-l-2 whitespace-pre',
                    active ? 'bg-primary/20 border-primary text-foreground font-semibold' : 'border-transparent text-code-text'
                  )}
                >
                  <span className={cn('w-6 shrink-0 tabular-nums text-right text-[11px]', active ? 'text-primary-light' : 'text-muted-foreground')}>
                    {n}
                  </span>
                  <span className="flex-1">{text}</span>
                  {active && <span aria-hidden="true" className="text-annotation-orange">◀</span>}
                </li>
              );
            })}
          </ol>

          <div className="max-h-[40%] shrink-0 overflow-y-auto overscroll-contain">
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
                    nodo apuntado: <span className="font-mono text-annotation-orange">{pointed.replace(/^node-/, '')}</span>
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
                      <dt className={cn(i === 0 ? 'text-annotation-orange' : 'text-muted-foreground')}>{name}</dt>
                      <dd className="text-foreground truncate" data-cy={`var-${name}-value`}>
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
                        <span className={cn(i === 0 ? 'text-primary-light font-semibold' : 'text-code-text')}>
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
          </div>
          </div>
          <div className="flex h-8 shrink-0 items-center justify-between border-t border-border pl-3">
            <span className="text-[11px] text-muted-foreground">Arrastra para mover</span>
            <button type="button" data-cy="code-resize" aria-label="Redimensionar panel de código"
              title="Arrastra para ajustar el tamaño o haz clic para ajustar" aria-describedby={instructionsId}
              aria-expanded={adjustOpen} aria-controls={adjustmentId}
              onPointerDown={event => pointerDown(event, 'resize')} onPointerMove={pointerMove} onPointerUp={pointerUp}
              onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={event => keyboard(event, 'resize')}
              onClick={event => { if (allowClick(event.detail)) setAdjustOpen(open => !open); }}
              className="flex size-8 items-center justify-center cursor-nwse-resize touch-none text-primary-light hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring">
              <MoveDiagonal2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
