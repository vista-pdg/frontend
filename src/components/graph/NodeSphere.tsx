import { Text } from '@react-three/drei';
import type { Node3D } from '@/types/graph';

// Node color by depth (for trees/lattices) or default indigo
const DEPTH_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

function depthColor(depth: number) {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}

interface NodeSphereProps {
  node: Node3D;
  radius?: number;
}

export function NodeSphere({ node, radius = 0.4 }: NodeSphereProps) {
  const color = depthColor(node.depth);

  return (
    // Position is set once from backend coords — no animation that breaks edge alignment
    <group position={[node.x, node.y, node.z]}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      {/* Billboard text always faces camera via @react-three/drei Text default behavior */}
      <Text
        position={[0, radius + 0.35, 0]}
        fontSize={0.32}
        color="#e2e8f0"
        anchorX="center"
        anchorY="bottom"
        maxWidth={3}
        outlineWidth={0.04}
        outlineColor="#020617"
        renderOrder={1}
      >
        {node.label}
      </Text>
    </group>
  );
}
