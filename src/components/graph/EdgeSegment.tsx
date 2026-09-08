import { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Edge3D, Node3D } from '@/types/graph';

const ARROW_HEIGHT = 0.45;
const ARROW_RADIUS = 0.12;
const UP = new THREE.Vector3(0, 1, 0);

interface EdgeSegmentProps {
  edge: Edge3D;
  nodeMap: Map<string, Node3D>;
  nodeRadius?: number;
}

export function EdgeSegment({ edge, nodeMap, nodeRadius = 0.4 }: EdgeSegmentProps) {
  const src = nodeMap.get(edge.from);
  const tgt = nodeMap.get(edge.to);

  const geo = useMemo(() => {
    if (!src || !tgt) return null;

    const s = new THREE.Vector3(src.x, src.y, src.z);
    const t = new THREE.Vector3(tgt.x, tgt.y, tgt.z);
    const fullDir = t.clone().sub(s);
    const len = fullDir.length();
    if (len < 0.001) return null;

    const dirUnit = fullDir.clone().normalize();
    const offset = nodeRadius / len;

    // Points where the line starts and ends (pulled back from node surfaces)
    const fromV = s.clone().lerp(t, offset);
    const tipV = t.clone().lerp(s, offset); // arrowhead tip sits at node surface

    // For directed edges shorten the line to leave room for the cone
    const lineEnd = edge.directed
      ? tipV.clone().sub(dirUnit.clone().multiplyScalar(ARROW_HEIGHT))
      : tipV;

    // Cone center = halfway between lineEnd and tip
    const coneCenter = lineEnd.clone().lerp(tipV, 0.5);

    // Quaternion to rotate cone (default +Y) to point along dirUnit
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dirUnit);

    // Weight label at edge midpoint, slightly raised
    const midV = s.clone().lerp(t, 0.5);
    midV.y += 0.25;

    return {
      from: fromV.toArray() as [number, number, number],
      lineEnd: lineEnd.toArray() as [number, number, number],
      coneCenter: coneCenter.toArray() as [number, number, number],
      quat,
      mid: midV.toArray() as [number, number, number],
    };
  }, [src, tgt, nodeRadius, edge.directed]);

  if (!geo) return null;

  const color = edge.directed ? '#5454e9' : '#4cb979';

  return (
    <group userData={{ edgeId: edge.id }}>
      <Line
        points={[geo.from, geo.lineEnd]}
        color={color}
        lineWidth={edge.directed ? 2 : 1.5}
        transparent
        opacity={0.75}
      />

      {edge.directed && (
        <mesh position={geo.coneCenter} quaternion={geo.quat}>
          <coneGeometry args={[ARROW_RADIUS, ARROW_HEIGHT, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.45}
            roughness={0.3}
            metalness={0.4}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}

      {edge.weight !== null && (
        <Text
          position={geo.mid}
          fontSize={0.28}
          color="#E4EB60"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
          renderOrder={1}
        >
          {edge.weight}
        </Text>
      )}
    </group>
  );
}
