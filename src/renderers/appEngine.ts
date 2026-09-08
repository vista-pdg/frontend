import {
  RendererRegistry,
  VisualizationEngine,
  detectWebGL,
  loadPreferredMode,
  savePreferredMode,
  type VisualizationMode,
} from '@/core';
import { setVisualizationModeSource } from '@/lib/http';
import { SvgRenderer } from './svg/SvgRenderer';
import { ThreeRenderer } from './three/ThreeRenderer';

/**
 * Composición de la aplicación (HU-18): aquí —y sólo aquí— el núcleo conoce a los adaptadores.
 *
 * <p>Se registran los dos adaptadores, se detecta WebGL una vez, se arranca en el modo que el
 * estudiante dejó guardado (CA-5) y se persiste cada cambio. El motor decide el modo antes de que
 * se monte ninguna vista: sin WebGL nunca llega a montarse el `<Canvas>` de three (CA-6).
 */
export const threeRenderer = new ThreeRenderer();
export const svgRenderer = new SvgRenderer();

export const rendererRegistry = new RendererRegistry().register(threeRenderer).register(svgRenderer);

export const webglAvailable = detectWebGL();

/** Lo que el estudiante eligió, antes de que la falta de WebGL lo fuerce a 2D. */
export const preferredMode: VisualizationMode | null = loadPreferredMode();

export const engine = new VisualizationEngine({
  registry: rendererRegistry,
  initialMode: preferredMode ?? '3D',
  webglAvailable,
});

/** La preferencia sólo se guarda cuando el estudiante elige; el fallback sin WebGL no la pisa. */
export function chooseMode(mode: VisualizationMode): boolean {
  const ok = engine.setMode(mode);
  if (ok) savePreferredMode(mode);
  return ok;
}

setVisualizationModeSource(() => engine.getState().mode);

declare global {
  interface Window {
    /** Acceso de diagnóstico y de las pruebas E2E al motor y a los adaptadores. */
    __vista?: { engine: VisualizationEngine; registry: RendererRegistry; webglAvailable: boolean };
  }
}

if (typeof window !== 'undefined') {
  window.__vista = { engine, registry: rendererRegistry, webglAvailable };
}
