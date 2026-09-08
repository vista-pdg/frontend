import { useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';
import { X, FlaskConical, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

const ALGO_PRESETS: Record<string, { label: string; values: string; description: string }[]> = {
  'tree/avl/insert': [
    { label: 'Rotación Derecha (LL)', values: '10, 5, 3', description: 'Caso clásico LL: rotación simple derecha' },
    { label: 'Rotación Izquierda (RR)', values: '3, 5, 10', description: 'Caso clásico RR: rotación simple izquierda' },
    { label: 'Doble Rotación LR', values: '10, 3, 5', description: 'Caso LR: rotación izquierda luego derecha' },
    { label: 'Doble Rotación RL', values: '3, 10, 7', description: 'Caso RL: rotación derecha luego izquierda' },
    { label: 'AVL completo (7 nodos)', values: '10, 5, 15, 3, 7, 12, 20', description: 'Construcción completa con múltiples inserciones' },
    { label: 'AVL con todas las rotaciones', values: '10, 5, 2, 8, 15, 12, 20, 1', description: 'Inserciones que generan distintos tipos de rotación' },
  ],
};

const HIGHLIGHT_CONFIG: Record<string, { label: string; className: string }> = {
  initial: { label: 'INICIO', className: 'bg-muted/50 text-muted-foreground border-border' },
  insert: { label: 'INSERTAR', className: 'bg-orange-main/15 text-orange-main border-orange-main/40' },
  unbalanced: { label: 'DESBALANCE', className: 'bg-destructive/15 text-red-400 border-destructive/40' },
  rotated: { label: 'ROTACIÓN', className: 'bg-yellow-main/15 text-yellow-main border-yellow-main/40' },
  balanced: { label: 'BALANCEADO', className: 'bg-secondary/15 text-secondary border-secondary/40' },
};

interface AlgorithmPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AlgorithmPanel({ open, onClose }: AlgorithmPanelProps) {
  const algorithmType = useGraphStore((s) => s.algorithmType);
  const algorithmSubtype = useGraphStore((s) => s.algorithmSubtype);
  const algorithmOperation = useGraphStore((s) => s.algorithmOperation);
  const loadAlgorithmSteps = useGraphStore((s) => s.loadAlgorithmSteps);
  const stepsLoading = useGraphStore((s) => s.stepsLoading);
  const steps = useGraphStore((s) => s.steps);
  const currentStepIndex = useGraphStore((s) => s.currentStepIndex);
  const setCurrentStep = useGraphStore((s) => s.setCurrentStep);
  const nextStep = useGraphStore((s) => s.nextStep);
  const prevStep = useGraphStore((s) => s.prevStep);

  const [valuesInput, setValuesInput] = useState('10, 5, 3, 7, 8');
  const [error, setError] = useState<string | null>(null);

  const algoKey = `${algorithmType}/${algorithmSubtype}/${algorithmOperation}`;
  const presets = ALGO_PRESETS[algoKey] ?? [];

  const currentStep = steps[currentStepIndex] ?? null;
  const hlConfig = currentStep ? HIGHLIGHT_CONFIG[currentStep.highlightType] : null;

  function parseValues(raw: string): number[] | null {
    const parts = raw.split(/[\s,]+/).filter(Boolean);
    const nums = parts.map(Number);
    if (nums.some(isNaN)) return null;
    return nums;
  }

  async function handleGenerate() {
    if (!algorithmType || !algorithmSubtype || !algorithmOperation) return;
    const values = parseValues(valuesInput);
    if (!values || values.length === 0) {
      setError('Ingresa valores numéricos separados por comas (ej: 10, 5, 3)');
      return;
    }
    setError(null);
    try {
      await loadAlgorithmSteps(algorithmType, algorithmSubtype, algorithmOperation, values);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar pasos');
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleGenerate();
  }

  const subtypeLabel = algorithmSubtype?.toUpperCase() ?? '';
  const opLabel = algorithmOperation === 'insert' ? 'Inserción' : algorithmOperation ?? '';

  return (
    <div
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
              Demo Algoritmo
            </span>
            {algorithmSubtype && (
              <span className="text-[10px] text-yellow-main tracking-widest uppercase leading-tight">
                {subtypeLabel} · {opLabel}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-white transition-colors duration-150 p-1 shrink-0"
        >
          <X className="size-4" />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-3 py-3 scrollbar-custom">
        <div className="flex flex-col gap-4">

          {/* Values input */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              Valores a insertar
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
            {error && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                <AlertCircle className="size-3 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button
              onClick={handleGenerate}
              data-cy="algo-generate"
              disabled={stepsLoading || !valuesInput.trim()}
              className="bg-yellow-main hover:bg-yellow-dark text-black-main font-semibold text-[12px] h-8 transition-colors duration-150"
            >
              {stepsLoading ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                  Generando…
                </>
              ) : (
                'Generar pasos'
              )}
            </Button>
          </div>

          {/* Presets */}
          {presets.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                Ejemplos predefinidos
              </p>
              <div className="flex flex-col gap-1">
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
            </div>
          )}

          {/* Step details */}
          {steps.length > 0 && currentStep && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Paso actual
                </p>
                <span className="text-[11px] font-mono text-primary-light">
                  {currentStepIndex + 1} / {steps.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-border">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>

              {/* Step card */}
              <div className="border border-border bg-card/30 p-3 flex flex-col gap-2">
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

              {/* Step navigation */}
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

              {/* All steps overview */}
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
