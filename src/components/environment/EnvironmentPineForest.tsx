import * as THREE from "three";
import { useRef, useMemo, useEffect, useState } from "react";
import { createSeededRandom } from "@/lib/environment/deterministic-random";

export function EnvironmentPineForest({ count = 80, scale = 1, seed = 999 }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/pine_tree.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
    });
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Apply instance matrix for InstancedMesh
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec2 vUv;
        void main() {
          vec4 texColor = texture2D(uTexture, vUv);
          float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
          // Remove dark background, keep bright snow
          float alpha = smoothstep(0.02, 0.3, luminance);
          gl_FragColor = vec4(texColor.rgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, [texture]);

  const instanceData = useMemo(() => {
    const prng = createSeededRandom(seed);
    const data = [];
    for (let i = 0; i < count; i++) {
      // Distribute in a wider area, creating a parallax forest
      const angle = (prng.value() - 0.5) * Math.PI * 1.5;
      const radius = 8 + prng.value() * 30; // 8 to 38 units away
      const x = Math.sin(angle) * radius;
      const z = -5 - Math.cos(angle) * radius; 
      const y = -1.5 + prng.value() * 3.0; // height variation
      
      const s = scale * (2 + prng.value() * 4); // size variation
      
      data.push({ x, y, z, scale: s });
    }
    // Sort by Z for proper depth if not using additive blending, 
    // but additive blending is order-independent anyway.
    return data.sort((a, b) => a.z - b.z);
  }, [count, scale, seed]);

  useEffect(() => {
    if (!mesh.current) return;
    
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const { x, y, z, scale: s } = instanceData[i];
      // Billboarding effect is hard with InstancedMesh without custom shaders,
      // but since they are far away, we just face them to the camera (Z axis)
      dummy.position.set(x, y + s/2, z); 
      dummy.scale.set(s, s, 1);
      dummy.rotation.set(0, 0, 0); // Always face front
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [instanceData, count, texture]);

  if (!texture) return null;

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <planeGeometry args={[3, 3]} />
        <primitive object={material} attach="material" />
      </instancedMesh>
    </group>
  );
}
