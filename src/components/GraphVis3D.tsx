import { Canvas } from '@react-three/fiber';
import { GraphScene } from './graph/GraphScene';
import { EmptyScene } from './graph/EmptyScene';
import { useGraphStore } from '@/store/graphStore';

export default function GraphVis3D() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const highlightedNodeIds = useGraphStore((s) => s.highlightedNodeIds);
  const highlightType = useGraphStore((s) => s.highlightType);

  return (
    <Canvas
      camera={{ position: [0, 0, 22], fov: 55, near: 0.1, far: 1000 }}
      style={{ position: 'absolute', inset: 0, background: '#020617' }}
      gl={{ antialias: true }}
    >
      {nodes.length === 0 ? (
        <EmptyScene />
      ) : (
        <GraphScene
          nodes={nodes}
          edges={edges}
          highlightedNodeIds={highlightedNodeIds}
          highlightType={highlightType}
        />
      )}
    </Canvas>
  );
}
