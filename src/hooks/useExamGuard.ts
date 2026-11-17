import { useCallback, useEffect, useRef, useState } from 'react';
import { blockedShortcut } from '@/lib/quiz';
import type { IntegrityEventType } from '@/types/quiz';

const FOCUS_INCIDENTS: readonly IntegrityEventType[] = ['FOCUS_LOST', 'TAB_HIDDEN', 'FULLSCREEN_EXIT'];

/**
 * Protecciones del modo de prueba (HU-34 · CA-6).
 *
 * <p>Mientras `active` es verdadero: bloquea portapapeles, menú contextual, selección, arrastre,
 * impresión y atajos de captura; avisa antes de cerrar la pestaña; y, al perder el foco o salir de
 * pantalla completa, marca la vista como `obscured` para que el contenido se oculte. Cada incidente
 * se informa por `onIncident` para que quede registrado en el servidor.
 *
 * <p>Un navegador no puede impedir una captura del sistema operativo ni una foto con otro
 * dispositivo: esto disuade y deja rastro, no es una garantía.
 */
export function useExamGuard(active: boolean, onIncident: (type: IntegrityEventType) => void) {
  const [obscured, setObscured] = useState(false);
  const report = useRef(onIncident);
  const lastFocusIncident = useRef(0);
  useEffect(() => { report.current = onIncident; }, [onIncident]);

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.classList.add('exam-mode');

    const incident = (type: IntegrityEventType) => {
      if (FOCUS_INCIDENTS.includes(type)) {
        // Cambiar de pestaña dispara «blur» y «visibilitychange»: es un solo incidente.
        const now = Date.now();
        if (now - lastFocusIncident.current < 1000) return;
        lastFocusIncident.current = now;
        setObscured(true);
      }
      report.current(type);
    };
    const block = (type: IntegrityEventType | null) => (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (type) incident(type);
    };
    const onCopy = block('COPY');
    const onCut = block('CUT');
    const onPaste = block('PASTE');
    const silent = block(null);
    const onKeyDown = (event: KeyboardEvent) => {
      const type = blockedShortcut(event);
      if (!type) return;
      event.preventDefault();
      event.stopPropagation();
      incident(type);
    };
    const onBlur = () => incident('FOCUS_LOST');
    const onVisibility = () => { if (document.visibilityState === 'hidden') incident('TAB_HIDDEN'); };
    const onFullscreen = () => { if (!document.fullscreenElement) incident('FULLSCREEN_EXIT'); };
    const onPrint = () => incident('PRINT');
    const onUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };

    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', onCut, true);
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('contextmenu', silent, true);
    document.addEventListener('dragstart', silent, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeprint', onPrint);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      root.classList.remove('exam-mode');
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('cut', onCut, true);
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('contextmenu', silent, true);
      document.removeEventListener('dragstart', silent, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeprint', onPrint);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [active]);

  /** Vuelve al quiz tras un incidente; reintenta la pantalla completa con el gesto del usuario. */
  const resume = useCallback(() => {
    setObscured(false);
    void enterFullscreen();
  }, []);

  return { obscured: active && obscured, resume };
}

/** La pantalla completa puede negarse (política del navegador, iframe): el quiz continúa igual. */
export async function enterFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  } catch {
    // Sin pantalla completa el resto de protecciones sigue activo.
  }
}

export async function leaveFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen?.();
  } catch {
    // Nada que deshacer.
  }
}
