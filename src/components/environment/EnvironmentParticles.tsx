"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { EnvironmentState } from "@/lib/environment/presets";
import type { EnvironmentPreferences } from "@/lib/environment/preferences";
import type { EnvironmentQuality } from "@/lib/environment/quality";
import type { WindRuntime } from "@/lib/environment/wind";

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.317 + salt * 17.17) * 43758.5453;
  return value - Math.floor(value);
}

export function EnvironmentParticles({
  state,
  preferences,
  quality,
  wind,
  active,
}: {
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  quality: EnvironmentQuality;
  wind: React.MutableRefObject<WindRuntime>;
  active: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const glowMesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const glowMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetColor = useMemo(() => new THREE.Color(state.particle[0]), [state.particle]);
  const activityMultiplier = state.preset === "fireflies" ? Math.max(.04, state.fireflies) : 1;
  const count = Math.max(0, Math.round(quality.particleCap * preferences.particleAmount / 100 * activityMultiplier));
  const particles = useMemo(() => Array.from({ length: count }, (_, index) => ({
    x: seeded(index, 1) * 12 - 6,
    y: seeded(index, 2) * 9 - 4.5,
    z: seeded(index, 3) * 7 - 4.5,
    speed: .18 + seeded(index, 4) * .52,
    phase: seeded(index, 5) * Math.PI * 2,
    scale: .35 + seeded(index, 6) * .85,
  })), [count]);

  useEffect(() => {
    if (!mesh.current) return;
    mesh.current.count = count;
    particles.forEach((particle, index) => {
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.rotation.set(0, particle.phase, state.preset === "rain" ? -.18 : particle.phase * .2);
      const depthScale = particle.scale * (1 + (particle.z + 4.5) * .035);
      dummy.scale.setScalar(depthScale);
      if (state.preset === "rain") dummy.scale.set(.16, 2.8, .16);
      if (state.preset === "mist") dummy.scale.set(3.8, 1.2, .2);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
      if (glowMesh.current) glowMesh.current.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (glowMesh.current) glowMesh.current.instanceMatrix.needsUpdate = true;
  }, [count, dummy, particles, state.preset]);

  useFrame(({ clock, camera }, delta) => {
    // Update base material colors for non-firefly themes
    if (state.preset !== "fireflies" && material.current) {
      material.current.color.lerp(targetColor, Math.min(1, delta * 2.4));
    }
    if (!mesh.current || !active || count === 0) return;
    const field = wind.current.current;
    const elapsed = clock.elapsedTime;
    particles.forEach((particle, i) => {
      // Non-linear gravity for snow: lighter falls slower
      const fall = state.preset === "fireflies" || state.preset === "mist" ? 0 
                 : state.preset === "snow" ? particle.speed * delta * (0.8 + particle.scale * 0.4) 
                 : particle.speed * delta * (state.preset === "rain" ? 7 : 1.25);
      
      particle.y -= fall;
      particle.x += field.x * delta * particle.speed * (state.preset === "rain" ? 1.8 : .72);
      if (particle.y < -5.2) particle.y = 5.2;
      if (particle.x > 6.8) particle.x = -6.8;
      if (particle.x < -6.8) particle.x = 6.8;
      
      const floatY = state.preset === "fireflies" 
        ? Math.sin(elapsed * particle.speed + particle.phase) * 0.8 + Math.pow(Math.max(0, Math.sin(elapsed * 1.5 * particle.speed + particle.phase)), 3) * 0.6
        : state.preset === "mist" ? Math.sin(elapsed * particle.speed + particle.phase) * .6 
        : state.preset === "snow" ? Math.cos(elapsed * 0.5 * particle.speed + particle.phase) * 0.4
        : 0;
        
      const driftX = state.preset === "fireflies" ? Math.cos(elapsed * 0.4 * particle.speed + particle.phase * 2) * 1.5 
        : state.preset === "snow" ? Math.sin(elapsed * 0.8 * particle.speed + particle.phase) * 1.5
        : 0;

      const driftZ = state.preset === "fireflies" ? Math.sin(elapsed * 0.3 * particle.speed + particle.phase * 3) * 1.5 
        : state.preset === "snow" ? Math.cos(elapsed * 0.7 * particle.speed + particle.phase) * 1.5
        : 0;
      
      dummy.position.set(particle.x + driftX, particle.y + floatY, particle.z + driftZ);
      
      if (state.preset === "fireflies" || state.preset === "snow") {
        dummy.quaternion.copy(camera.quaternion);
        if (state.preset === "snow") {
          dummy.rotateZ(elapsed * particle.speed * 0.5 + particle.phase); // Gentle spin
          dummy.rotateX(Math.sin(elapsed * particle.speed + particle.phase) * 0.4); // Flutter
        }
      } else {
        dummy.rotation.set(0, elapsed * .15 + particle.phase, state.preset === "rain" ? -.18 : Math.sin(elapsed + particle.phase) * .4);
      }
      
      const depthScale = particle.scale * (1 + (particle.z + 4.5) * .035);
      
      // Firefly specific logic
      if (state.preset === "fireflies") {
        // Body stays constant size
        dummy.scale.setScalar(depthScale);
        dummy.updateMatrix();
        mesh.current!.setMatrixAt(i, dummy.matrix);

        if (glowMesh.current) {
          // Sharp, intense pulse for firefly glow only
          const fireflyPulse = 0.5 + Math.pow(Math.max(0, Math.sin(elapsed * 1.5 + particle.phase)), 2) * 2.0;
          dummy.scale.setScalar(depthScale * fireflyPulse);
          dummy.updateMatrix();
          glowMesh.current.setMatrixAt(i, dummy.matrix);
        }
      } else {
        // Other presets (leaves, petals, rain, mist)
        dummy.scale.setScalar(depthScale);
        if (state.preset === "rain") dummy.scale.set(.16, 2.8, .16);
        if (state.preset === "mist") dummy.scale.setScalar(depthScale * 3);
        dummy.updateMatrix();
        mesh.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    mesh.current!.instanceMatrix.needsUpdate = true;
    if (glowMesh.current) glowMesh.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => 
    state.preset === "rain"
      ? <cylinderGeometry args={[.015, .015, 1, 3]} />
    : state.preset === "sakura" || state.preset === "autumn"
      ? <sphereGeometry args={[.085, 5, 4]} />
      : state.preset === "snow"
        ? <planeGeometry args={[0.3, 0.3]} />
        : <sphereGeometry args={[state.preset === "mist" ? .42 : .045, 6, 5]} />
  , [state.preset]);

  const snowTex = useMemo(() => {
    if (state.preset !== "snow") return null;
    const canvas = document.createElement("canvas");
    // High-res for exquisite detail
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 512, 512);

    ctx.translate(256, 256);
    
    // Draw 6-sided crystalline snowflake with extreme detail
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.strokeStyle = "rgba(200, 230, 255, 0.9)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      
      // Main branch
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 200);
      ctx.stroke();

      // Intricate Sub-branches
      for (let j = 1; j <= 4; j++) {
        const y = j * 40;
        const length = 80 - j * 15;
        
        // V-shapes pointing outwards
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(-length, y + length);
        ctx.moveTo(0, y);
        ctx.lineTo(length, y + length);
        ctx.stroke();
        
        // Inner delicate crystals
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y + 10);
        ctx.lineTo(-length * 0.4, y + 10 + length * 0.4);
        ctx.moveTo(0, y + 10);
        ctx.lineTo(length * 0.4, y + 10 + length * 0.4);
        ctx.stroke();
        ctx.lineWidth = 4;
      }

      // Center hexagon core
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(26, 15);
      ctx.stroke();
    }
    
    // Soft halo glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 256);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    grad.addColorStop(0.2, "rgba(200, 230, 255, 0.4)");
    grad.addColorStop(0.5, "rgba(150, 200, 255, 0.1)");
    grad.addColorStop(1, "rgba(100, 150, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 256, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [state.preset]);

  const [fireflyBodyTex, fireflyGlowTex] = useMemo(() => {
    if (state.preset !== "fireflies") return [null, null];
    // Glow Texture
    const canvasGlow = document.createElement("canvas");
    canvasGlow.width = 128; canvasGlow.height = 128;
    const ctxG = canvasGlow.getContext("2d")!;
    ctxG.clearRect(0, 0, 128, 128);

    const grad = ctxG.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");        // Hot core
    grad.addColorStop(0.1, "rgba(255, 255, 160, 0.9)");    // Bright lemon yellow
    grad.addColorStop(0.3, "rgba(180, 255, 40, 0.6)");     // Magical lime green
    grad.addColorStop(0.6, "rgba(80, 200, 20, 0.15)");     // Soft emerald fade
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");              // Fade out
    ctxG.fillStyle = grad;
    ctxG.fillRect(0, 0, 128, 128);

    // Body Texture
    const canvasBody = document.createElement("canvas");
    canvasBody.width = 128; canvasBody.height = 128;
    const ctx = canvasBody.getContext("2d")!;
    ctx.clearRect(0, 0, 128, 128);

    // Draw detailed insect body centered at 64, 64
    // Abdomen segments
    ctx.fillStyle = "#110b05"; 
    ctx.strokeStyle = "#2a1e12"; 
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(64, 70 - i * 4, 6 - i * 0.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    
    // Thorax (chest)
    ctx.fillStyle = "#221308"; 
    ctx.beginPath();
    ctx.ellipse(64, 46, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Thorax highlight
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.ellipse(64, 44, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.ellipse(64, 34, 3.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#220000"; 
    ctx.beginPath();
    ctx.arc(61, 33, 1.5, 0, Math.PI * 2);
    ctx.arc(67, 33, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = "#110b05";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(62.5, 31); ctx.quadraticCurveTo(57.5, 25, 55, 22.5);
    ctx.moveTo(65.5, 31); ctx.quadraticCurveTo(70.5, 25, 73, 22.5);
    ctx.stroke();

    // Legs (6 legs)
    ctx.beginPath();
    ctx.moveTo(59, 42.5); ctx.lineTo(50, 37.5); ctx.lineTo(47.5, 32.5);
    ctx.moveTo(69, 42.5); ctx.lineTo(78, 37.5); ctx.lineTo(80.5, 32.5);
    ctx.moveTo(58, 50); ctx.lineTo(47.5, 52.5); ctx.lineTo(45, 57.5);
    ctx.moveTo(70, 50); ctx.lineTo(80.5, 52.5); ctx.lineTo(83, 57.5);
    ctx.moveTo(59, 57.5); ctx.lineTo(52.5, 65); ctx.lineTo(50, 72.5);
    ctx.moveTo(69, 57.5); ctx.lineTo(75.5, 65); ctx.lineTo(78, 72.5);
    ctx.stroke();

    // 3. Draw detailed wings
    ctx.fillStyle = "rgba(180, 210, 240, 0.4)"; 
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; 
    ctx.lineWidth = 0.5;

    // Left wing
    ctx.beginPath();
    ctx.moveTo(63, 47.5);
    ctx.bezierCurveTo(45, 40, 35, 60, 42.5, 85);
    ctx.bezierCurveTo(47.5, 95, 57.5, 80, 61, 55);
    ctx.fill();
    ctx.stroke(); 
    // Left wing veins
    ctx.beginPath();
    ctx.moveTo(63, 47.5); ctx.quadraticCurveTo(50, 60, 44, 82.5);
    ctx.moveTo(57.5, 55); ctx.lineTo(47.5, 57.5);
    ctx.moveTo(55, 65); ctx.lineTo(42.5, 67.5);
    ctx.moveTo(52.5, 75); ctx.lineTo(42.5, 77.5);
    ctx.stroke();

    // Right wing
    ctx.beginPath();
    ctx.moveTo(65, 47.5);
    ctx.bezierCurveTo(83, 40, 93, 60, 85.5, 85);
    ctx.bezierCurveTo(80.5, 95, 70.5, 80, 67, 55);
    ctx.fill();
    ctx.stroke(); 
    // Right wing veins
    ctx.beginPath();
    ctx.moveTo(65, 47.5); ctx.quadraticCurveTo(78, 60, 84, 82.5);
    ctx.moveTo(70.5, 55); ctx.lineTo(80.5, 57.5);
    ctx.moveTo(73, 65); ctx.lineTo(85.5, 67.5);
    ctx.moveTo(75.5, 75); ctx.lineTo(85.5, 77.5);
    ctx.stroke();

    const texBody = new THREE.CanvasTexture(canvasBody);
    texBody.colorSpace = THREE.SRGBColorSpace;
    const texGlow = new THREE.CanvasTexture(canvasGlow);
    texGlow.colorSpace = THREE.SRGBColorSpace;
    return [texBody, texGlow];
  }, [state.preset]);

  if (state.preset === "fireflies") {
    return (
      <group>
        <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
          <planeGeometry args={[0.25, 0.25]} />
          <meshBasicMaterial 
            ref={material}
            color="#ffffff" 
            transparent 
            map={fireflyBodyTex} 
            opacity={0.8}
            depthWrite={false} 
            blending={THREE.NormalBlending} 
          />
        </instancedMesh>
        <instancedMesh ref={glowMesh} args={[undefined, undefined, count]} frustumCulled={false}>
          <planeGeometry args={[0.35, 0.35]} />
          <meshBasicMaterial 
            ref={glowMaterial}
            color="#ffffff" 
            transparent 
            map={fireflyGlowTex} 
            opacity={1.0}
            depthWrite={false} 
            blending={THREE.AdditiveBlending} 
          />
        </instancedMesh>
      </group>
    );
  }

  if (state.preset === "snow" && !snowTex) return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      {geometry}
      <meshBasicMaterial
        ref={material}
        color={state.preset === "snow" ? "#ffffff" : state.particle[0]}
        transparent
        map={state.preset === "snow" ? snowTex : null}
        opacity={state.preset === "mist" ? preferences.atmosphere / 260 : .8}
        depthWrite={false}
        blending={state.preset === "snow" ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </instancedMesh>
  );
}

export function EnvironmentAtmosphere({ state, preferences, wind, active }: {
  state: EnvironmentState;
  preferences: EnvironmentPreferences;
  wind: React.MutableRefObject<WindRuntime>;
  active: boolean;
}) {
  const planes = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    if (!active) return;
    planes.current.forEach((plane, index) => {
      if (!plane) return;
      plane.position.x = Math.sin(clock.elapsedTime * (.035 + index * .012) + index) * (1.2 + wind.current.current.strength);
      plane.rotation.z = Math.sin(clock.elapsedTime * .04 + index) * .025;
    });
  });
  return (
    <group>
      {[-5.5, -2.7, .2].map((z, index) => (
        <mesh key={z} ref={(node) => { planes.current[index] = node; }} position={[0, index - 1, z]}>
          <planeGeometry args={[16, 7]} />
          <meshBasicMaterial color={state.fogColor} transparent opacity={(preferences.atmosphere / 100) * (.075 + index * .025)} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
