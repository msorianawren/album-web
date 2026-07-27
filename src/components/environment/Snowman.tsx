import * as THREE from "three";
import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export function Snowman({ position, scale = 1 }: { position: [number, number, number], scale?: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    // Using the original JPG which is very high quality
    loader.load('/textures/cute_snowman.jpg', (tex) => {
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
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec2 vUv;
        void main() {
          vec4 texColor = texture2D(uTexture, vUv);
          // Calculate luminance
          float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
          // Very smooth threshold to remove the black background completely while keeping the snowman solid
          float alpha = smoothstep(0.02, 0.2, luminance);
          gl_FragColor = vec4(texColor.rgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false, // Prevent clipping issues
      side: THREE.DoubleSide
    });
  }, [texture]);

  // Bob slightly in the wind and Billboard towards camera
  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.5) * 0.05 * scale;
      // Billboard effect
      mesh.current.lookAt(camera.position);
    }
  });

  return (
    <group position={position} scale={scale}>
      {texture && (
        <mesh ref={mesh} position={[0, 4, 0]}>
          <planeGeometry args={[10, 10]} />
          <primitive object={material} attach="material" />
        </mesh>
      )}
    </group>
  );
}
