import type * as THREE from 'three';
import type { RendererSnapshot } from '@/core';
import { ModelBackedRenderer } from '../sceneModel';

/**
 * Adaptador 3D (HU-18): el renderizador de three.js que ya existía, ahora detrás del contrato.
 *
 * <p>La vista (`ThreeView`) monta el `<Canvas>` y se suscribe al modelo de este adaptador. La
 * escena registrada permite que `snapshot()` cuente lo que realmente hay dibujado —grupos con
 * `userData.nodeId` / `userData.edgeId`— en vez de fiarse del modelo: es lo que hace verificable
 * que cinco conmutaciones no dejan huérfanos (CA-3).
 */
export class ThreeRenderer extends ModelBackedRenderer {
  readonly id = '3D' as const;
  readonly label = '3D';
  private scene: THREE.Scene | null = null;

  attachScene(scene: THREE.Scene | null): void {
    this.scene = scene;
  }

  override snapshot(): RendererSnapshot {
    if (!this.scene) return super.snapshot();
    const nodeIds: string[] = [];
    const edgeIds: string[] = [];
    const labels: Record<string, string> = {};
    const highlightedIds: string[] = [];
    this.scene.traverse((obj) => {
      const { nodeId, edgeId, label, highlighted } = obj.userData as {
        nodeId?: string;
        edgeId?: string;
        label?: string;
        highlighted?: boolean;
      };
      if (nodeId) {
        nodeIds.push(nodeId);
        labels[nodeId] = label ?? '';
        if (highlighted) highlightedIds.push(nodeId);
      }
      if (edgeId) edgeIds.push(edgeId);
    });
    return { nodeIds, edgeIds, highlightedIds, labels };
  }
}
