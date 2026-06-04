import { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Node3D, HighlightType } from '@/types/graph';

const DEPTH_COLORS = ['#5454e9', '#865FF0', '#4cb979', '#E9683B', '#E4EB60'];

const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  initial: '#5454e9',
  insert: '#E9683B',
  unbalanced: '#d32f2f',
  rotated: '#E4EB60',
  balanced: '#4cb979',
};

function nodeColor(node: Node3D, highlighted: boolean, highlightType: HighlightType | null): string {
  if (highlighted && highlightType) return HIGHLIGHT_COLORS[highlightType];
  return DEPTH_COLORS[node.depth % DEPTH_COLORS.length];
}

interface NodeSphereProps {
  node: Node3D;
  radius?: number;
  highlighted?: boolean;
  highlightType?: HighlightType | null;
}

export function NodeSphere({ node, radius = 0.4, highlighted = false, highlightType = null }: NodeSphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  // Updated synchronously on each render — safe with refs, avoids one-frame delay
  const targetPos = useRef(new THREE.Vector3(node.x, node.y, node.z));
  const highlightedRef = useRef(highlighted);
  targetPos.current.set(node.x, node.y, node.z);
  highlightedRef.current = highlighted;

  // Runs before the first Three.js frame: place node at correct position and start invisible
  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(node.x, node.y, node.z);
    g.scale.setScalar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    // Smooth position chase
    g.position.lerp(targetPos.current, 0.10);

    // Smooth scale: 0→1 on appear, 1→1.25 on highlight
    const ts = highlightedRef.current ? 1.25 : 1.0;
    const cs = g.scale.x;
    if (Math.abs(cs - ts) > 0.001) {
      g.scale.setScalar(cs + (ts - cs) * 0.12);
    }
  });

  const color = nodeColor(node, highlighted, highlightType);
  const emissiveIntensity = highlighted ? 0.7 : 0.35;

  return (
    // No position prop — managed imperatively by useFrame so lerp works correctly
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
      {highlighted && (
        <mesh>
          <sphereGeometry args={[radius * 1.4, 16, 16]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.18}
            roughness={1}
            metalness={0}
          />
        </mesh>
      )}
      <Text
        position={[0, radius + 0.35, 0]}
        fontSize={0.32}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        maxWidth={3}
        outlineWidth={0.04}
        outlineColor="#000000"
        renderOrder={1}
      >
        {node.label}
      </Text>
    </group>
  );
}
