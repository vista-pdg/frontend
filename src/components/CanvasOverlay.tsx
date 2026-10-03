import { useState, useEffect } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Square,
  Box,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { VisualizationMode } from '@/core';
import { CodePanel } from './CodePanel';
import { WorkContext } from './WorkContext';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';

const HIGHLIGHT_LABELS: Record<string, { label: string; color: string }> = {
  initial: { label: 'INICIO', color: 'text-muted-foreground' },
  insert: { label: 'INSERTAR', color: 'text-annotation-orange' },
  unbalanced: { label: 'DESBALANCE', color: 'text-destructive' },
  rotated: { label: 'ROTACIÓN', color: 'text-annotation-yellow' },
  balanced: { label: 'BALANCEADO', color: 'text-annotation-green' },
  visit: { label: 'VISITAR', color: 'text-annotation-orange' },
  frontier: { label: 'EN COLA', color: 'text-annotation-yellow' },
  done: { label: 'COMPLETO', color: 'text-annotation-green' },
  pop: { label: 'POP', color: 'text-red-400' },
  dequeue: { label: 'DEQUEUE', color: 'text-red-400' },
};

const STEP_INTERVAL_MS = 1400;

export function CanvasOverlay({ tutorialStep = null }: { tutorialStep?: number | null }) {
  const tutorialActive = tutorialStep !== null;
  const meta = useGraphStore((s) => s.meta);
  const autoRotate = useGraphStore((s) => s.autoRotate);
  const toggleAutoRotate = useGraphStore((s) => s.toggleAutoRotate);
  const resetCamera = useGraphStore((s) => s.resetCamera);
  const nodes = useGraphStore((s) => s.nodes);
  const clearAll = useGraphStore((s) => s.clearAll);

  // HU-18: modo de visualización. El selector cambia el adaptador; el estado es del motor.
  const mode = useGraphStore((s) => s.mode);
  const setMode = useGraphStore((s) => s.setMode);
  const webglAvailable = useGraphStore((s) => s.webglAvailable);
  const webglNoticeVisible = useGraphStore((s) => s.webglNoticeVisible);
  const dismissWebglNotice = useGraphStore((s) => s.dismissWebglNotice);
  const is3D = mode === '3D';

  const steps = useGraphStore((s) => s.steps);
  const hasCode = useGraphStore((s) => Boolean(s.code?.length));
  const currentStepIndex = useGraphStore((s) => s.currentStepIndex);
  const nextStep = useGraphStore((s) => s.nextStep);
  const prevStep = useGraphStore((s) => s.prevStep);
  const highlightType = useGraphStore((s) => s.highlightType);

  const [isPlaying, setIsPlaying] = useState(false);

  const inAlgorithmMode = steps.length > 0;
  const currentStep = inAlgorithmMode ? steps[currentStepIndex] : null;
  const hlInfo = currentStep ? HIGHLIGHT_LABELS[currentStep.highlightType] : null;
  const hasContent = nodes.length > 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Auto-advance: read current index from store directly to avoid stale closures
  useEffect(() => {
    if (!isPlaying || !inAlgorithmMode || tutorialActive) return;
    const timer = setInterval(() => {
      const { currentStepIndex: idx, steps: s } = useGraphStore.getState();
      if (idx >= s.length - 1) {
        setIsPlaying(false);
        return;
      }
      useGraphStore.getState().nextStep();
    }, STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPlaying, inAlgorithmMode, tutorialActive]);

  // External engine transitions pause playback without cascading state updates in an effect.
  useEffect(() => useGraphStore.subscribe((state) => {
    if (state.steps.length === 0 || state.currentStepIndex === state.steps.length - 1) {
      setIsPlaying(false);
    }
  }), []);

  // Keyboard navigation (only when in algorithm mode and not typing in an input)
  useEffect(() => {
    if (!inAlgorithmMode) return;
    function handleKey(e: KeyboardEvent) {
      if (document.querySelector('dialog[open]') || (e.target instanceof HTMLElement && (e.target.closest('input, textarea, select, [contenteditable], [data-cy=code-lines]') || (e.key === ' ' && e.target.closest('button, a'))))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); useGraphStore.getState().nextStep(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); useGraphStore.getState().prevStep(); }
      else if (e.key === ' ') { e.preventDefault(); setIsPlaying((p) => !p); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [inAlgorithmMode]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">

      {/* Top-left: structure badge or step info */}
      <div className="absolute top-4 max-sm:top-16 left-4 right-44 max-sm:right-4 pointer-events-auto flex flex-col items-start gap-2">
        <WorkContext />
        <div className="flex items-center gap-2 flex-wrap">
        {inAlgorithmMode && currentStep ? (
          <div className="flex items-center gap-2 border border-primary/30 bg-shell/85 px-3.5 py-2 backdrop-blur-md">
            {hlInfo && (
              <span className={cn('text-[10px] font-bold tracking-widest uppercase', hlInfo.color)}>
                {hlInfo.label}
              </span>
            )}
            <span className="text-[11px] font-semibold text-foreground truncate max-w-[220px] max-sm:max-w-[130px]">
              {currentStep.title}
            </span>
          </div>
        ) : meta ? (
          <div className="flex items-center gap-2 border border-primary/30 bg-shell/85 px-3.5 py-2 backdrop-blur-md">
            <span className="text-[11px] font-bold tracking-widest text-primary-light">
              {meta.type.toUpperCase()}
            </span>
            {meta.subtype && (
              <span className="px-1.5 py-0.5 text-[10px] bg-primary/15 text-muted-foreground">
                {meta.subtype}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground font-mono">
              {meta.nodeCount}N · {meta.edgeCount}A
            </span>
          </div>
        ) : null}

        {hasContent && (
          <button
            onClick={clearAll}
            data-cy="clear-canvas"
            className="flex items-center gap-1.5 bg-shell/85 border border-border hover:border-destructive/50 hover:text-destructive px-2.5 py-2 text-muted-foreground transition-colors duration-150 backdrop-blur-md"
            title="Limpiar lienzo y chat"
          >
            <Trash2 className="size-3.5" />
            <span className="text-[11px]">Limpiar</span>
          </button>
        )}
        </div>
      </div>

      {/* Canvas-specific view controls */}
      <div className="absolute top-4 right-4 pointer-events-auto flex items-center gap-2">
        <div
          role="group"
          aria-label="Modo de visualización"
          data-cy="mode-selector"
          className="flex items-center h-10 gap-[3px] px-[3px] bg-shell/85 border border-border backdrop-blur-md"
        >
          {(
            [
              { id: '2D', icon: Square },
              { id: '3D', icon: Box },
            ] as { id: VisualizationMode; icon: typeof Square }[]
          ).map(({ id, icon: Icon }) => {
            const active = mode === id;
            const disabled = id === '3D' && !webglAvailable;
            return (
              <button
                key={id}
                type="button"
                data-cy={`mode-${id.toLowerCase()}`}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => setMode(id)}
                title={
                  disabled
                    ? 'Tu navegador no soporta WebGL: la vista 3D no está disponible'
                    : `Ver en ${id}`
                }
                className={cn(
                  'flex items-center gap-1.5 px-3 py-[7px] text-[12px] font-semibold transition-colors duration-150',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  disabled && 'opacity-35 cursor-not-allowed hover:text-muted-foreground'
                )}
              >
                <Icon className="size-3.5" />
                {id}
              </button>
            );
          })}
        </div>


      </div>

      {/* HU-18 · CA-6: aviso de degradación sin WebGL. Informa, no bloquea. */}
      {webglNoticeVisible && (
        <div
          role="status"
          data-cy="webgl-fallback"
          className="absolute top-16 right-4 pointer-events-auto flex items-start gap-2.5 max-w-sm border border-yellow-main/40 bg-shell/90 px-3 py-2.5 backdrop-blur-md"
        >
          <TriangleAlert className="mt-px size-4 shrink-0 text-annotation-yellow" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12px] font-semibold text-annotation-yellow">Modo 2D activado automáticamente</span>
            <span className="text-[11px] leading-[1.5] text-muted-foreground">
              Tu navegador no dispone de aceleración WebGL, necesaria para la vista 3D. Puedes seguir
              trabajando con todas las funciones en 2D.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissWebglNotice}
            data-cy="webgl-fallback-dismiss"
            aria-label="Cerrar aviso"
            className="ml-1 p-0.5 text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Bottom controls: en modo algoritmo se muestran desde el paso 0, aunque el árbol esté vacío */}
      {(nodes.length > 0 || inAlgorithmMode) && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 flex-wrap max-sm:flex-nowrap max-sm:w-[calc(100%_-_2rem)] justify-center">
          {inAlgorithmMode ? (
            <>
              {/* Previous */}
              <button
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                data-cy="step-prev"
                className="flex items-center gap-1 bg-shell/85 border border-border hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-150 backdrop-blur-md"
                title="Paso anterior (←)"
              >
                <ChevronLeft className="size-3.5" />
                <span className="max-sm:hidden">Anterior</span>
              </button>

              {/* Play / Pause */}
              <button
                onClick={() => setIsPlaying((p) => !p)}
                disabled={isLastStep && !isPlaying}
                className={cn(
                  'flex items-center justify-center size-8 border transition-all duration-150 backdrop-blur-md',
                  isPlaying
                    ? 'bg-yellow-main/20 border-yellow-main/60 text-annotation-yellow hover:bg-yellow-main/30'
                    : 'bg-shell/85 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
              >
                {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              </button>

              {/* Counter */}
              <div
                data-cy="step-counter"
                className="bg-shell/85 border border-primary/30 px-4 py-1.5 text-[11px] font-mono text-primary-light backdrop-blur-md min-w-[60px] text-center whitespace-nowrap"
              >
                {currentStepIndex + 1} / {steps.length}
              </div>

              {/* Next */}
              <button
                onClick={nextStep}
                disabled={isLastStep}
                data-cy="step-next"
                className="flex items-center gap-1 bg-shell/85 border border-border hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-150 backdrop-blur-md"
                title="Siguiente paso (→)"
              >
                <span className="max-sm:hidden">Siguiente</span>
                <ChevronRight className="size-3.5" />
              </button>

              {/* Keyboard hint */}
              <div className="hidden sm:flex items-center gap-1 bg-shell/85 border border-border px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur-md">
                <span>← → Navegar · Espacio = Play</span>
              </div>
            </>
          ) : is3D ? (
            <>
              <button
                onClick={resetCamera}
                className="flex items-center gap-1.5 bg-shell/85 border border-border hover:border-primary/50 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-150 backdrop-blur-md"
                title="Reiniciar cámara"
              >
                <RotateCcw className="size-3" />
                <span>Reiniciar</span>
              </button>

              <button
                onClick={toggleAutoRotate}
                className={cn(
                  'flex items-center gap-1.5 border px-3 py-1.5 text-[11px] transition-all duration-150 backdrop-blur-md',
                  autoRotate
                    ? 'bg-primary/20 border-primary/50 text-primary-light hover:bg-primary/30'
                    : 'bg-shell/85 border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                )}
                title={autoRotate ? 'Detener rotación automática' : 'Activar rotación automática'}
              >
                {autoRotate ? <Pause className="size-3" /> : <Play className="size-3" />}
                <span>{autoRotate ? 'Pausar' : 'Rotar'}</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 bg-shell/85 border border-border px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-md">
                <span>Scroll = zoom</span>
                <span className="text-border">·</span>
                <span>Arrastrar = orbitar</span>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* HU-22a: panel de código sincronizado con el paso actual */}
      {inAlgorithmMode && <CodePanel tutorialExpanded={tutorialStep === 3} />}

      {tutorialStep === 3 && (!inAlgorithmMode || !hasCode) && (
        <div data-cy="tutorial-demo-area" className="absolute top-28 max-sm:top-24 bottom-4 left-4 w-[560px] max-w-[calc(100%_-_2rem)]" />
      )}

      {/* Step description bar (algo mode) */}
      {inAlgorithmMode && currentStep && highlightType && (
        <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 pointer-events-none max-w-md w-full px-4">
          <div className="bg-shell/90 border border-border px-4 py-2 text-center backdrop-blur-md">
            <p className="text-[12px] text-muted-foreground leading-snug max-sm:line-clamp-2">
              {currentStep.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
