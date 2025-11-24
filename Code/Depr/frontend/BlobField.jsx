// src/components/BlobField.jsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function FloatingBlob({ color, position, scale = 1, speed = 0.4, offset = 0 }) {
  const mesh = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    if (!mesh.current) return;
    mesh.current.position.y =
      position[1] + Math.sin(t * 1.5) * 0.6 + Math.cos(t * 0.8) * 0.3;
    mesh.current.position.x = position[0] + Math.sin(t * 0.6) * 0.4;
    mesh.current.position.z = position[2] + Math.cos(t * 0.5) * 0.5;
    const s = scale + Math.sin(t * 0.9) * 0.15;
    mesh.current.scale.set(s, s * 1.1, s);
  });

  return (
    <mesh ref={mesh} position={position} castShadow receiveShadow>
      <icosahedronGeometry args={[1.3, 2]} />
      <meshStandardMaterial
        color={new THREE.Color(color)}
        emissive={new THREE.Color(color).multiplyScalar(0.55)}
        roughness={0.25}
        metalness={0.65}
      />
    </mesh>
  );
}

export default function BlobField() {
  return (
    <group>
      <FloatingBlob
        color="#00F5D4"
        position={[-3.5, 1.2, -4]}
        scale={2.1}
        speed={0.4}
        offset={0.3}
      />
      <FloatingBlob
        color="#FF4ECD"
        position={[3.5, 0.4, -5]}
        scale={1.9}
        speed={0.35}
        offset={1.1}
      />
      <FloatingBlob
        color="#FFD166"
        position={[0.0, -1.0, -6]}
        scale={1.6}
        speed={0.28}
        offset={2.3}
      />
    </group>
  );
}
