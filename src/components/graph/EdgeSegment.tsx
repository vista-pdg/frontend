import { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Edge3D, Node3D } from '@/types/graph';

interface EdgeSegmentProps {
  edge: Edge3D;
  nodeMap: Map<string, Node3D>;
  nodeRadius?: number;
}

export function EdgeSegment({ edge, nodeMap, nodeRadius = 0.4 }: EdgeSegmentProps) {
  const src = nodeMap.get(edge.from);
  const tgt = nodeMap.get(edge.to);

  const { from, to, mid } = useMemo(() => {
    if (!src || !tgt) return { from: null, to: null, mid: null };

    const s = new THREE.Vector3(src.x, src.y, src.z);
    const t = new THREE.Vector3(tgt.x, tgt.y, tgt.z);
    const dir = t.clone().sub(s);
    const len = dir.length();

    // Offset endpoints so lines start/end at sphere surface, not center
    const offset = len > 0 ? nodeRadius / len : 0;
    const fromV = s.clone().lerp(t, offset);
    const toV = t.clone().lerp(s, offset);
    const midV = s.clone().lerp(t, 0.5);
    midV.y += 0.25;

    return {
      from: fromV.toArray() as [number, number, number],
      to: toV.toArray() as [number, number, number],
      mid: midV.toArray() as [number, number, number],
    };
  }, [src, tgt, nodeRadius]);

  if (!from || !to || !mid) return null;

  return (
    <>
      <Line
        points={[from, to]}
        color={edge.directed ? '#818cf8' : '#64748b'}
        lineWidth={edge.directed ? 2 : 1.5}
        transparent
        opacity={0.7}
      />
      {edge.weight !== null && (
        <Text
          position={mid}
          fontSize={0.28}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#020617"
          renderOrder={1}
        >
          {edge.weight}
        </Text>
      )}
    </>
  );
}
