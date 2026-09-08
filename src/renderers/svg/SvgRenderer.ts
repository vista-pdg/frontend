import type { RendererSnapshot } from '@/core';
import { ModelBackedRenderer } from '../sceneModel';

/**
 * Adaptador 2D (HU-18): dibuja en SVG. La disposición sale de `core/layout2d`; aquí sólo se pinta.
 *
 * <p>`snapshot()` lee el DOM del SVG cuando la vista está montada: lo que cuenta es lo que hay
 * dibujado, no lo que se pidió dibujar.
 */
export class SvgRenderer extends ModelBackedRenderer {
  readonly id = '2D' as const;
  readonly label = '2D';
  private root: SVGSVGElement | null = null;

  attachRoot(root: SVGSVGElement | null): void {
    this.root = root;
  }

  override snapshot(): RendererSnapshot {
    if (!this.root) return super.snapshot();
    const nodes = [...this.root.querySelectorAll<SVGGElement>('[data-node-id]')];
    const edges = [...this.root.querySelectorAll<SVGGElement>('[data-edge-id]')];
    return {
      nodeIds: nodes.map((n) => n.dataset.nodeId!),
      edgeIds: edges.map((e) => e.dataset.edgeId!),
      highlightedIds: nodes.filter((n) => n.dataset.highlighted === 'true').map((n) => n.dataset.nodeId!),
      labels: Object.fromEntries(nodes.map((n) => [n.dataset.nodeId!, n.dataset.label ?? ''])),
    };
  }
}
