import type { RendererRegistry, VisualizationEngine } from '../../src/core';

declare global {
  interface Window {
    __vista?: { engine: VisualizationEngine; registry: RendererRegistry; webglAvailable: boolean };
  }
}
