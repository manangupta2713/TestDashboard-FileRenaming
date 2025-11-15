// src/components/Particles.jsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const NUM_PARTICLES = 600;

export default function Particles() {
  const pointsRef = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(NUM_PARTICLES * 3);
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const radius = 8 + Math.random() * 7; // ring around center
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -1.5 + Math.random() * 4; // slight vertical variance

      arr[i * 3 + 0] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, []);

  const colors = useMemo(() => {
    const arr = new Float32Array(NUM_PARTICLES * 3);
    const teal = new THREE.Color("#00F5D4");
    const pink = new THREE.Color("#FF4ECD");
    const yellow = new THREE.Color("#FFD166");

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const r = Math.random();
      const color =
        r < 0.6 ? teal : r < 0.9 ? pink : yellow; // mostly teal, some pink, rare yellow

      arr[i * 3 + 0] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const points = pointsRef.current;
    if (!points) return;

    points.rotation.y = t * 0.03;
    points.rotation.x = Math.sin(t * 0.15) * 0.06;
  });

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  return (
    <points ref={pointsRef} geometry={geom}>
      <pointsMaterial
        vertexColors
        size={0.09}
        sizeAttenuation
        depthWrite={false}
        transparent
        opacity={0.9}
      />
    </points>
  );
}
