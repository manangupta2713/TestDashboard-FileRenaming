// src/components/WaveScene.jsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function WaveScene() {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const mesh = meshRef.current;
    if (!mesh) return;

    const position = mesh.geometry.attributes.position;
    const original = mesh.userData.originalPositions;

    if (!original) {
      // Store a copy of the original positions only once
      mesh.userData.originalPositions = position.array.slice();
      return;
    }

    for (let i = 0; i < position.count; i++) {
      const ix = i * 3;
      const x = original[ix + 0];
      const y = original[ix + 1];

      // Two layered waves for a premium feel
      const wave1 = Math.sin(x * 1.4 + t * 1.1) * 0.25;
      const wave2 = Math.cos((x + y) * 1.2 - t * 0.8) * 0.18;
      position.array[ix + 2] = original[ix + 2] + wave1 + wave2;
    }

    position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });

  return (
    <group position={[0, -2.2, 0]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2.6, 0, 0]}>
        {/* width, height, widthSegments, heightSegments */}
        <planeGeometry args={[18, 18, 120, 120]} />
        <meshStandardMaterial
          color="#0af9d8"
          wireframe
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* soft fill plane under the wireframe */}
      <mesh rotation={[-Math.PI / 2.4, 0, 0]} position={[0, -0.12, 0]}>
        <planeGeometry args={[20, 20, 2, 2]} />
        <meshStandardMaterial
          color="#050816"
          transparent
          opacity={0.9}
          roughness={1}
        />
      </mesh>
    </group>
  );
}
