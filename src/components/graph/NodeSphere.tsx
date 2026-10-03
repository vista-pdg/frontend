import { useRef, useLayoutEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Node3D, HighlightType } from '@/types/graph';
import { nodeFill } from '@/core';

/** Misma paleta que el 2D (core/palette): resaltado > estado del recorrido > profundidad. */
function nodeColor(node: Node3D, highlighted: boolean, highlightType: HighlightType | null): string {
  return nodeFill(node.depth, node.properties?.state, highlighted, highlightType);
}

interface NodeSphereProps {
  node: Node3D;
  radius?: number;
  highlighted?: boolean;
  highlightType?: HighlightType | null;
}

export function NodeSphere({ node, radius = 0.4, highlighted = false, highlightType = null }: NodeSphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  // Commit animation targets before the next Three.js frame, without mutating refs in render.
  const targetPos = useRef(new THREE.Vector3(node.x, node.y, node.z));
  const highlightedRef = useRef(highlighted);
  useLayoutEffect(() => {
    targetPos.current.set(node.x, node.y, node.z);
    highlightedRef.current = highlighted;
  }, [node.x, node.y, node.z, highlighted]);
  const [initialPosition] = useState(() => new THREE.Vector3(node.x, node.y, node.z));

  // Runs before the first Three.js frame: place node at correct position and start invisible
  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.copy(initialPosition);
    g.scale.setScalar(0);
  }, [initialPosition]);

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
    // No position prop — managed imperatively by useFrame so lerp works correctly.
    // userData identifica el nodo dibujado: ThreeRenderer.snapshot() lo lee de la escena (HU-18).
    <group ref={groupRef} userData={{ nodeId: node.id, label: node.label, highlighted }}>
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
