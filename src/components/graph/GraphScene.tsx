import { useMemo, useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NodeSphere } from './NodeSphere';
import { EdgeSegment } from './EdgeSegment';
import type { Node3D, Edge3D, HighlightType } from '@/types/graph';
import { useGraphStore } from '@/store/graphStore';

function computeBounds(nodes: Node3D[]) {
  if (nodes.length === 0) return { center: new THREE.Vector3(), radius: 10 };

  const box = new THREE.Box3();
  nodes.forEach((n) => box.expandByPoint(new THREE.Vector3(n.x, n.y, n.z)));

  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = Math.max(size.length() / 2, 5);
  return { center, radius };
}

function CameraRig({ nodes }: { nodes: Node3D[] }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const prevNodeKey = useRef('');
  const autoRotate = useGraphStore((s) => s.autoRotate);
  const cameraResetKey = useGraphStore((s) => s.cameraResetKey);

  const nodeKey = nodes.map((n) => n.id).join(',');

  function centerCamera() {
    if (nodes.length === 0) return;
    const { center, radius } = computeBounds(nodes);
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 55;
    const dist = (radius / Math.tan((fov * Math.PI) / 360)) * 1.4;

    camera.position.set(center.x, center.y, center.z + dist);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }

  // Re-center when node set changes — delayed so camera waits for node animations to settle
  useEffect(() => {
    if (nodeKey === prevNodeKey.current || nodes.length === 0) return;
    prevNodeKey.current = nodeKey;
    const timer = setTimeout(centerCamera, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey]);

  // Re-center on manual camera reset
  useEffect(() => {
    if (cameraResetKey === 0) return;
    centerCamera();
  }, [cameraResetKey]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate && nodes.length > 0}
      autoRotateSpeed={0.5}
      minDistance={2}
      maxDistance={200}
    />
  );
}

const NODE_RADIUS = 0.4;

interface GraphSceneProps {
  nodes: Node3D[];
  edges: Edge3D[];
  highlightedNodeIds?: string[];
  highlightType?: HighlightType | null;
}

export function GraphScene({ nodes, edges, highlightedNodeIds = [], highlightType = null }: GraphSceneProps) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, Node3D>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const highlightSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} color="#c7d2fe" />
      <pointLight position={[-15, -10, -15]} intensity={1} color="#38bdf8" />

      {edges.map((edge) => (
        <EdgeSegment key={edge.id} edge={edge} nodeMap={nodeMap} nodeRadius={NODE_RADIUS} />
      ))}

      {nodes.map((node) => (
        <NodeSphere
          key={node.id}
          node={node}
          radius={NODE_RADIUS}
          highlighted={highlightSet.has(node.id)}
          highlightType={highlightType}
        />
      ))}

      <CameraRig nodes={nodes} />
    </>
  );
}
