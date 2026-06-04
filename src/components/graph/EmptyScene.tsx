import { Text } from '@react-three/drei';

export function EmptyScene() {
  return (
    <>
      <ambientLight intensity={0.1} />
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.6}
        color="#5454e9"
        anchorX="center"
        anchorY="middle"
      >
        Sin estructura
      </Text>
      <Text
        position={[0, -0.4, 0]}
        fontSize={0.28}
        color="#a0a0a0"
        anchorX="center"
        anchorY="middle"
      >
        Describe una estructura en el chat
      </Text>
    </>
  );
}
