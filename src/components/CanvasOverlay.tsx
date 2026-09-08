import { useState, useEffect } from 'react';
import {
  MessageSquare,
  RotateCcw,
  Play,
  Pause,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Square,
  Box,
  TriangleAlert,
  X,
} from 'lucide-react';
import type { VisualizationMode } from '@/core';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/store/graphStore';

const HIGHLIGHT_LABELS: Record<string, { label: string; color: string }> = {
  initial: { label: 'INICIO', color: 'text-muted-foreground' },
  insert: { label: 'INSERTAR', color: 'text-orange-main' },
  unbalanced: { label: 'DESBALANCE', color: 'text-destructive' },
  rotated: { label: 'ROTACIÓN', color: 'text-yellow-main' },
  balanced: { label: 'BALANCEADO', color: 'text-secondary' },
};

const STEP_INTERVAL_MS = 1400;

interface CanvasOverlayProps {
  chatOpen: boolean;
  onToggleChat: () => void;
  onToggleAlgorithm: () => void;
  algorithmOpen: boolean;
}

export function CanvasOverlay({ chatOpen, onToggleChat, onToggleAlgorithm, algorithmOpen }: CanvasOverlayProps) {
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
    if (!isPlaying || !inAlgorithmMode) return;
    const timer = setInterval(() => {
      const { currentStepIndex: idx, steps: s } = useGraphStore.getState();
      if (idx >= s.length - 1) {
        setIsPlaying(false);
        return;
      }
      useGraphStore.getState().nextStep();
    }, STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPlaying, inAlgorithmMode]);

  // Pause when leaving algorithm mode or reaching end
  useEffect(() => {
    if (!inAlgorithmMode) setIsPlaying(false);
  }, [inAlgorithmMode]);

  useEffect(() => {
    if (isLastStep) setIsPlaying(false);
  }, [isLastStep]);

  // Keyboard navigation (only when in algorithm mode and not typing in an input)
  useEffect(() => {
    if (!inAlgorithmMode) return;
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
      <div className="absolute top-4 left-4 pointer-events-auto flex items-center gap-2 flex-wrap">
        {inAlgorithmMode && currentStep ? (
          <div className="flex items-center gap-2 border border-primary/30 bg-black-main/85 px-3.5 py-2 backdrop-blur-md">
            {hlInfo && (
              <span className={cn('text-[10px] font-bold tracking-widest uppercase', hlInfo.color)}>
                {hlInfo.label}
              </span>
            )}
            <span className="text-[11px] font-semibold text-white truncate max-w-[220px]">
              {currentStep.title}
            </span>
          </div>
        ) : meta ? (
          <div className="flex items-center gap-2 border border-primary/30 bg-black-main/85 px-3.5 py-2 backdrop-blur-md">
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
            className="flex items-center gap-1.5 bg-black-main/85 border border-border hover:border-destructive/50 hover:text-destructive px-2.5 py-2 text-muted-foreground transition-colors duration-150 backdrop-blur-md"
            title="Limpiar lienzo y chat"
          >
            <Trash2 className="size-3.5" />
            <span className="text-[11px]">Limpiar</span>
          </button>
        )}
      </div>

      {/* Top-right: mode selector + panel toggle buttons */}
      <div className="absolute top-4 right-4 pointer-events-auto flex items-center gap-2">
        <div
          role="group"
          aria-label="Modo de visualización"
          data-cy="mode-selector"
          className="flex items-center h-10 gap-[3px] px-[3px] bg-black-main/85 border border-border backdrop-blur-md"
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
                  active ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white',
                  disabled && 'opacity-35 cursor-not-allowed hover:text-muted-foreground'
                )}
              >
                <Icon className="size-3.5" />
                {id}
              </button>
            );
          })}
        </div>

        <button
          onClick={onToggleAlgorithm}
          data-cy="algorithm-toggle"
          className={cn(
            'relative flex items-center justify-center size-10 border transition-all duration-200',
            algorithmOpen
              ? 'bg-yellow-main border-yellow-main text-black-main'
              : 'bg-black-main/85 border-border text-muted-foreground hover:bg-white/5 hover:border-primary/50 hover:text-white backdrop-blur-md'
          )}
          title={algorithmOpen ? 'Cerrar demo de algoritmo' : 'Abrir demo de algoritmo'}
        >
          <FlaskConical className="size-4 relative z-10" />
        </button>

        <button
          onClick={onToggleChat}
          data-cy="chat-toggle"
          className={cn(
            'relative flex items-center justify-center size-10 border transition-all duration-200',
            chatOpen
              ? 'bg-primary border-primary text-white'
              : 'bg-black-main/85 border-primary/40 text-primary-light hover:bg-primary/15 hover:border-primary/70 backdrop-blur-md'
          )}
          title={chatOpen ? 'Cerrar chat' : 'Abrir chat StructureAI'}
        >
          <MessageSquare className="size-4 relative z-10" />
          {!chatOpen && (
            <span
              className="absolute inset-0 border border-primary/50 animate-ping"
              style={{ animationDuration: '2s' }}
            />
          )}
        </button>
      </div>

      {/* HU-18 · CA-6: aviso de degradación sin WebGL. Informa, no bloquea. */}
      {webglNoticeVisible && (
        <div
          role="status"
          data-cy="webgl-fallback"
          className="absolute top-16 right-4 pointer-events-auto flex items-start gap-2.5 max-w-sm border border-yellow-main/40 bg-black-main/90 px-3 py-2.5 backdrop-blur-md"
        >
          <TriangleAlert className="mt-px size-4 shrink-0 text-yellow-main" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12px] font-semibold text-yellow-main">Modo 2D activado automáticamente</span>
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
            className="ml-1 p-0.5 text-muted-foreground hover:text-white transition-colors duration-150"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Bottom controls: en modo algoritmo se muestran desde el paso 0, aunque el árbol esté vacío */}
      {(nodes.length > 0 || inAlgorithmMode) && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 flex-wrap justify-center">
          {inAlgorithmMode ? (
            <>
              {/* Previous */}
              <button
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                data-cy="step-prev"
                className="flex items-center gap-1 bg-black-main/85 border border-border hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors duration-150 backdrop-blur-md"
                title="Paso anterior (←)"
              >
                <ChevronLeft className="size-3.5" />
                <span>Anterior</span>
              </button>

              {/* Play / Pause */}
              <button
                onClick={() => setIsPlaying((p) => !p)}
                disabled={isLastStep && !isPlaying}
                className={cn(
                  'flex items-center justify-center size-8 border transition-all duration-150 backdrop-blur-md',
                  isPlaying
                    ? 'bg-yellow-main/20 border-yellow-main/60 text-yellow-main hover:bg-yellow-main/30'
                    : 'bg-black-main/85 border-border text-muted-foreground hover:border-primary/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
              >
                {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              </button>

              {/* Counter */}
              <div
                data-cy="step-counter"
                className="bg-black-main/85 border border-primary/30 px-4 py-1.5 text-[11px] font-mono text-primary-light backdrop-blur-md min-w-[60px] text-center"
              >
                {currentStepIndex + 1} / {steps.length}
              </div>

              {/* Next */}
              <button
                onClick={nextStep}
                disabled={isLastStep}
                data-cy="step-next"
                className="flex items-center gap-1 bg-black-main/85 border border-border hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors duration-150 backdrop-blur-md"
                title="Siguiente paso (→)"
              >
                <span>Siguiente</span>
                <ChevronRight className="size-3.5" />
              </button>

              {/* Keyboard hint */}
              <div className="hidden sm:flex items-center gap-1 bg-black-main/85 border border-border px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur-md">
                <span>← → Navegar · Espacio = Play</span>
              </div>
            </>
          ) : is3D ? (
            <>
              <button
                onClick={resetCamera}
                className="flex items-center gap-1.5 bg-black-main/85 border border-border hover:border-primary/50 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors duration-150 backdrop-blur-md"
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
                    : 'bg-black-main/85 border-border text-muted-foreground hover:text-white hover:border-primary/50'
                )}
                title={autoRotate ? 'Detener rotación automática' : 'Activar rotación automática'}
              >
                {autoRotate ? <Pause className="size-3" /> : <Play className="size-3" />}
                <span>{autoRotate ? 'Pausar' : 'Rotar'}</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 bg-black-main/85 border border-border px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-md">
                <span>Scroll = zoom</span>
                <span className="text-border">·</span>
                <span>Arrastrar = orbitar</span>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Step description bar (algo mode) */}
      {inAlgorithmMode && currentStep && highlightType && (
        <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 pointer-events-none max-w-md w-full px-4">
          <div className="bg-black-main/90 border border-border px-4 py-2 text-center backdrop-blur-md">
            <p className="text-[12px] text-muted-foreground leading-snug">
              {currentStep.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
