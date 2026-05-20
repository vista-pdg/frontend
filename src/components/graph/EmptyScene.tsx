import { Text } from '@react-three/drei';

export function EmptyScene() {
  return (
    <>
      <ambientLight intensity={0.1} />
      <Text
        position={[0, 0.4, 0]}
        fontSize={0.6}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
      >
        Sin grafo
      </Text>
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.3}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
      >
        Escribe un prompt en el chat →
      </Text>
    </>
  );
}
