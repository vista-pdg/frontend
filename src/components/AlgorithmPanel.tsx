import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';
import { algorithmKey } from '@/services/algorithmService';
import { structureFitsFamily } from '@/core';
import type { AlgorithmDescriptor } from '@/types/graph';
import { X, FlaskConical, ChevronLeft, ChevronRight, Loader2, AlertCircle, Play } from 'lucide-react';

/** Orden y nombre de las familias del syllabus en el panel (HU-19). */
const FAMILIES: { id: string; label: string }[] = [
  { id: 'graph', label: 'Grafos' },
  { id: 'tree', label: 'Árboles' },
  { id: 'stack', label: 'Pilas' },
  { id: 'queue', label: 'Colas' },
];

const ALGO_PRESETS: Record<string, { label: string; values: string; description: string }[]> = {
  'tree/avl/insert': [
    { label: 'Rotación Derecha (LL)', values: '10, 5, 3', description: 'Caso clásico LL: rotación simple derecha' },
    { label: 'Rotación Izquierda (RR)', values: '3, 5, 10', description: 'Caso clásico RR: rotación simple izquierda' },
    { label: 'Doble Rotación LR', values: '10, 3, 5', description: 'Caso LR: rotación izquierda luego derecha' },
    { label: 'Doble Rotación RL', values: '3, 10, 7', description: 'Caso RL: rotación derecha luego izquierda' },
    { label: 'AVL completo (7 nodos)', values: '10, 5, 15, 3, 7, 12, 20', description: 'Construcción completa con múltiples inserciones' },
    { label: 'AVL con todas las rotaciones', values: '10, 5, 2, 8, 15, 12, 20, 1', description: 'Inserciones que generan distintos tipos de rotación' },
  ],
  'stack/simple/pop': [
    { label: 'Pila de 4', values: '3, 42, 8, 17', description: 'De la base al tope; 17 sale primero' },
    { label: 'Pila de 6', values: '1, 2, 3, 4, 5, 6', description: 'Seis retiros, dos pasos cada uno' },
  ],
  'queue/simple/dequeue': [
    { label: 'Cola de 4', values: '5, 9, 1, 14', description: 'Del frente al final; 5 sale primero' },
    { label: 'Cola de 6', values: '10, 20, 30, 40, 50, 60', description: 'Seis retiros, dos pasos cada uno' },
  ],
};

const DEFAULT_VALUES: Record<string, string> = {
  'tree/avl/insert': '10, 5, 3, 7, 8',
  'tree/bst/inorder': '10, 5, 15, 3, 7',
  'stack/simple/pop': '3, 42, 8, 17',
  'queue/simple/dequeue': '5, 9, 1, 14',
};

const HIGHLIGHT_CONFIG: Record<string, { label: string; className: string }> = {
  initial: { label: 'INICIO', className: 'bg-muted/50 text-muted-foreground border-border' },
  insert: { label: 'INSERTAR', className: 'bg-orange-main/15 text-orange-main border-orange-main/40' },
  unbalanced: { label: 'DESBALANCE', className: 'bg-destructive/15 text-red-400 border-destructive/40' },
  rotated: { label: 'ROTACIÓN', className: 'bg-yellow-main/15 text-yellow-main border-yellow-main/40' },
  balanced: { label: 'BALANCEADO', className: 'bg-secondary/15 text-secondary border-secondary/40' },
  visit: { label: 'VISITAR', className: 'bg-orange-main/15 text-orange-main border-orange-main/40' },
  frontier: { label: 'EN COLA', className: 'bg-yellow-main/15 text-yellow-main border-yellow-main/40' },
  done: { label: 'COMPLETO', className: 'bg-secondary/15 text-secondary border-secondary/40' },
  pop: { label: 'POP', className: 'bg-destructive/15 text-red-400 border-destructive/40' },
  dequeue: { label: 'DEQUEUE', className: 'bg-destructive/15 text-red-400 border-destructive/40' },
};

interface AlgorithmPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AlgorithmPanel({ open, onClose }: AlgorithmPanelProps) {
  const catalog = useGraphStore((s) => s.catalog);
  const catalogLoading = useGraphStore((s) => s.catalogLoading);
  const loadCatalog = useGraphStore((s) => s.loadCatalog);
  const selected = useGraphStore((s) => s.selectedAlgorithm);
  const selectAlgorithm = useGraphStore((s) => s.selectAlgorithm);
  const runSelectedAlgorithm = useGraphStore((s) => s.runSelectedAlgorithm);
  const stepsLoading = useGraphStore((s) => s.stepsLoading);
  const steps = useGraphStore((s) => s.steps);
  const currentStepIndex = useGraphStore((s) => s.currentStepIndex);
  const setCurrentStep = useGraphStore((s) => s.setCurrentStep);
  const nextStep = useGraphStore((s) => s.nextStep);
  const prevStep = useGraphStore((s) => s.prevStep);
  const nodes = useGraphStore((s) => s.nodes);
  const meta = useGraphStore((s) => s.meta);

  // Valores por algoritmo (se conservan al cambiar de uno a otro) y nodo inicial elegido.
  const [valuesByKey, setValuesByKey] = useState<Record<string, string>>({});
  const [chosenStart, setChosenStart] = useState('');
  const [error, setError] = useState<string | null>(null);

  // El catálogo se pide al abrir el panel: es del servidor y no cambia con el modo (CA-4).
  useEffect(() => {
    if (open && catalog.length === 0) void loadCatalog();
  }, [open, catalog.length, loadCatalog]);

  const selectedKey = selected ? algorithmKey(selected) : null;
  const presets = selectedKey ? (ALGO_PRESETS[selectedKey] ?? []) : [];
  const valuesInput = selectedKey ? (valuesByKey[selectedKey] ?? DEFAULT_VALUES[selectedKey] ?? '') : '';
  const setValuesInput = (v: string) => {
    if (selectedKey) setValuesByKey((m) => ({ ...m, [selectedKey]: v }));
  };
  const choose = (d: AlgorithmDescriptor | null) => {
    setError(null);
    selectAlgorithm(d);
  };

  const byFamily = useMemo(() => {
    const groups = new Map<string, AlgorithmDescriptor[]>();
    for (const d of catalog) {
      const list = groups.get(d.family) ?? [];
      list.push(d);
      groups.set(d.family, list);
    }
    return groups;
  }, [catalog]);

  // Los algoritmos de entrada `structure` recorren lo que hay en el lienzo (BFS, inorden). Si el
  // lienzo está vacío y el algoritmo sabe construir su estructura con valores (inorden → BST), se
  // ofrece el formulario de valores; si no (BFS), se pide generar primero.
  const needsStructure = selected?.input === 'structure';
  const edges = useGraphStore((s) => s.edges);
  const canvasFits = needsStructure && selected !== null && structureFitsFamily(selected.family, { nodes, edges });
  const canvasNodes = canvasFits ? nodes : [];
  const canFallbackToValues = needsStructure && selectedKey !== null && DEFAULT_VALUES[selectedKey] !== undefined;
  const usesValues = selected?.input === 'values' || (needsStructure && canvasNodes.length === 0 && canFallbackToValues);
  const isGraphLike = needsStructure && selected?.type === 'graph';
  // Si el nodo elegido ya no está (otro grafo), se recurre al primero: derivado, no sincronizado.
  const start = canvasNodes.some((n) => n.id === chosenStart) ? chosenStart : (canvasNodes[0]?.id ?? '');
  void meta;

  const currentStep = steps[currentStepIndex] ?? null;
  const hlConfig = currentStep ? HIGHLIGHT_CONFIG[currentStep.highlightType] : null;

  function parseValues(raw: string): number[] | null {
    const parts = raw.split(/[\s,]+/).filter(Boolean);
    const nums = parts.map(Number);
    if (nums.some(isNaN)) return null;
    return nums;
  }

  async function handleRun() {
    if (!selected) return;
    setError(null);
    try {
      if (usesValues) {
        const values = parseValues(valuesInput);
        if (!values || values.length === 0) {
          setError('Ingresa valores numéricos separados por comas (ej: 10, 5, 3)');
          return;
        }
        await runSelectedAlgorithm({ values });
      } else {
        if (canvasNodes.length === 0) {
          setError('Genera una estructura desde el chat antes de recorrerla');
          return;
        }
        await runSelectedAlgorithm({ start: isGraphLike ? start : undefined });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar pasos');
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleRun();
  }

  const runDisabled =
    stepsLoading || !selected || (usesValues ? !valuesInput.trim() : canvasNodes.length === 0);

  return (
    <div
      data-cy="algorithm-panel"
      className={cn(
        'flex flex-col h-full border-l border-border bg-black-main shrink-0',
        'transition-all duration-300 ease-in-out overflow-hidden',
        open ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-yellow-main/8 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="size-4 text-yellow-main shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold tracking-wide text-white leading-none">
              Algoritmos
            </span>
            <span className="text-[10px] text-yellow-main tracking-widest uppercase leading-tight">
              {selected ? selected.label : `Catálogo · ${byFamily.size} familias`}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-white transition-colors duration-150 p-1 shrink-0"
          aria-label="Cerrar panel"
        >
          <X className="size-4" />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-3 py-3 scrollbar-custom">
        <div className="flex flex-col gap-4">
          {/* Catálogo por familia */}
          <div className="flex flex-col gap-3" data-cy="algo-catalog">
            {catalogLoading && catalog.length === 0 && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Cargando catálogo…
              </div>
            )}
            {FAMILIES.filter((f) => byFamily.has(f.id)).map((f) => (
              <div key={f.id} className="flex flex-col gap-1" data-cy={`algo-family-${f.id}`}>
                <p className="text-[9px] font-bold tracking-[0.15em] text-muted-foreground uppercase">{f.label}</p>
                {byFamily.get(f.id)!.map((d) => {
                  const key = algorithmKey(d);
                  const active = key === selectedKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      data-cy={`algo-item-${d.type}-${d.subtype}-${d.operation}`}
                      aria-pressed={active}
                      onClick={() => choose(active ? null : d)}
                      className={cn(
                        'text-left border px-3 py-2 transition-colors duration-150',
                        active
                          ? 'border-primary/40 bg-primary/15 text-white'
                          : 'border-border bg-card/40 hover:border-yellow-main/40 hover:bg-yellow-main/5 text-white'
                      )}
                    >
                      <div className={cn('text-[12px] font-medium', active ? 'text-primary-light' : 'text-white')}>{d.label}</div>
                      <div className="text-[10px] text-muted-foreground">{d.description}</div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Formulario según la entrada del algoritmo */}
          {selected && (
            <div className="flex flex-col gap-2 border-t border-border pt-3" data-cy="algo-form">
              {usesValues ? (
                <>
                  <label className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                    {needsStructure ? 'Valores (el lienzo está vacío: se construye un BST)' : 'Valores'}
                  </label>
                  <input
                    type="text"
                    value={valuesInput}
                    onChange={(e) => setValuesInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    data-cy="algo-values"
                    placeholder="Ej: 10, 5, 3, 7, 8"
                    className="w-full bg-card/60 border border-primary/30 text-white placeholder:text-muted-foreground text-[13px] px-3 py-2 focus:outline-none focus:border-primary/70 transition-colors duration-150"
                  />
                </>
              ) : !isGraphLike ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed" data-cy="algo-uses-canvas">
                  Se recorre la estructura del lienzo ({canvasNodes.length} nodos).
                </p>
              ) : (
                <>
                  <label className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                    Nodo inicial
                  </label>
                  {canvasNodes.length > 0 ? (
                    <select
                      value={start}
                      onChange={(e) => setChosenStart(e.target.value)}
                      data-cy="algo-start"
                      className="w-full bg-card/60 border border-primary/30 text-white text-[13px] px-3 py-2 focus:outline-none focus:border-primary/70"
                    >
                      {canvasNodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-muted-foreground leading-relaxed" data-cy="algo-needs-graph">
                      No hay grafo en el lienzo. Genera uno desde el chat (por ejemplo «grafo ciclo de 6 nodos») y
                      vuelve aquí.
                    </p>
                  )}
                </>
              )}
              {error && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-400" data-cy="algo-error">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                onClick={handleRun}
                data-cy="algo-generate"
                disabled={runDisabled}
                className="bg-yellow-main hover:bg-yellow-dark text-black-main font-semibold text-[12px] h-8 transition-colors duration-150"
              >
                {stepsLoading ? (
                  <>
                    <Loader2 className="size-3 animate-spin mr-1.5" />
                    Generando…
                  </>
                ) : (
                  <>
                    <Play className="size-3 mr-1.5" />
                    Ejecutar paso a paso
                  </>
                )}
              </Button>

              {presets.length > 0 && (
                <div className="flex flex-col gap-1 pt-1">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                    Ejemplos predefinidos
                  </p>
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setValuesInput(p.values)}
                      className="text-left border border-border hover:border-yellow-main/40 bg-card/40 hover:bg-yellow-main/5 px-3 py-2 transition-colors duration-150 group"
                    >
                      <div className="text-[12px] font-medium text-white group-hover:text-yellow-main transition-colors duration-150">
                        {p.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.description}</div>
                      <div className="text-[11px] font-mono text-primary-light mt-0.5">[{p.values}]</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step details */}
          {steps.length > 0 && currentStep && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Paso actual
                </p>
                <span className="text-[11px] font-mono text-primary-light">
                  {currentStepIndex + 1} / {steps.length}
                </span>
              </div>

              <div className="h-1 bg-border">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>

              <div className="border border-border bg-card/30 p-3 flex flex-col gap-2" data-cy="step-card">
                {hlConfig && (
                  <span className={cn(
                    'self-start px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border',
                    hlConfig.className
                  )}>
                    {hlConfig.label}
                  </span>
                )}
                <p className="text-[13px] font-semibold text-white leading-snug">
                  {currentStep.title}
                </p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {currentStep.description}
                </p>
                {currentStep.rotationType && (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo:</span>
                    <span className="text-[11px] font-mono text-yellow-main uppercase">
                      {currentStep.rotationType}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                  className="flex-1 border-border bg-transparent text-muted-foreground hover:text-white hover:border-primary/50 h-8 text-[12px] disabled:opacity-30"
                >
                  <ChevronLeft className="size-3.5 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextStep}
                  disabled={currentStepIndex === steps.length - 1}
                  className="flex-1 border-border bg-transparent text-muted-foreground hover:text-white hover:border-primary/50 h-8 text-[12px] disabled:opacity-30"
                >
                  Siguiente
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Todos los pasos
                </p>
                <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto scrollbar-custom pr-1">
                  {steps.map((step, i) => {
                    const cfg = HIGHLIGHT_CONFIG[step.highlightType];
                    return (
                      <button
                        key={step.index}
                        onClick={() => setCurrentStep(i)}
                        className={cn(
                          'flex items-center gap-2 text-left px-2.5 py-1.5 text-[11px] transition-colors duration-150 border',
                          i === currentStepIndex
                            ? 'bg-primary/15 border-primary/40 text-white'
                            : 'border-transparent hover:bg-white/5 text-muted-foreground hover:text-white'
                        )}
                      >
                        <span className="font-mono shrink-0 text-[10px] text-muted-foreground w-4 text-right">
                          {i + 1}
                        </span>
                        {cfg && (
                          <span className={cn(
                            'shrink-0 px-1 py-0.5 text-[8px] font-bold tracking-wider uppercase border',
                            cfg.className
                          )}>
                            {cfg.label}
                          </span>
                        )}
                        <span className="truncate">{step.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
