import { Canvas } from '@react-three/fiber';
import { GraphScene } from '@/components/graph/GraphScene';
import { EmptyScene } from '@/components/graph/EmptyScene';
import { useModel } from '../useModel';
import type { ThreeRenderer } from './ThreeRenderer';

interface ThreeViewProps {
  renderer: ThreeRenderer;
  autoRotate: boolean;
  cameraResetKey: number;
}

/** Vista React del adaptador 3D. Sólo lee el modelo del adaptador; la cámara es preferencia de UI. */
export function ThreeView({ renderer, autoRotate, cameraResetKey }: ThreeViewProps) {
  const { structure, highlightedIds, highlightType } = useModel(renderer.model);

  return (
    <div data-cy="canvas-3d" data-mode="3D" className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 22], fov: 55, near: 0.1, far: 1000 }}
        style={{ position: 'absolute', inset: 0, background: '#020617' }}
        gl={{ antialias: true }}
        onCreated={({ scene }) => renderer.attachScene(scene)}
      >
        {structure.nodes.length === 0 ? (
          <EmptyScene />
        ) : (
          <GraphScene
            nodes={structure.nodes}
            edges={structure.edges}
            highlightedNodeIds={highlightedIds}
            highlightType={highlightType}
            autoRotate={autoRotate}
            cameraResetKey={cameraResetKey}
          />
        )}
      </Canvas>
    </div>
  );
}
