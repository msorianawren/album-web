import * as THREE from "three";
import type { LeafGeometryType } from "./botanical-profiles";

// Cache shared geometries — only one instance per type ever created
const cache = new Map<LeafGeometryType, THREE.BufferGeometry>();

function makeWillowGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.2, 0.5, 0, 1);
  shape.quadraticCurveTo(-0.2, 0.5, 0, 0);
  const geom = new THREE.ShapeGeometry(shape, 4);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}

function makeMapleGeometry(): THREE.BufferGeometry {
  // Classic Canadian maple leaf: 5 main lobes with deep cuts
  const shape = new THREE.Shape();

  // Define key points of a maple leaf (normalized, stem at bottom)
  // Traced from a canonical maple silhouette
  const pts: [number, number][] = [
    [0, -0.5],      // stem tip
    [0.05, -0.35],
    [0.25, -0.3],   // lower-right shoulder
    [0.15, -0.15],
    [0.42, -0.1],   // right small lobe tip
    [0.28, 0.05],
    [0.5, 0.18],    // right mid-lobe tip
    [0.32, 0.3],
    [0.48, 0.52],   // right upper-lobe tip
    [0.22, 0.42],
    [0.12, 0.65],   // right apex lobe tip
    [0, 0.5],       // top center
    [-0.12, 0.65],  // left apex lobe tip
    [-0.22, 0.42],
    [-0.48, 0.52],  // left upper-lobe tip
    [-0.32, 0.3],
    [-0.5, 0.18],   // left mid-lobe tip
    [-0.28, 0.05],
    [-0.42, -0.1],  // left small lobe tip
    [-0.15, -0.15],
    [-0.25, -0.3],  // lower-left shoulder
    [-0.05, -0.35],
    [0, -0.5],      // back to stem
  ];

  shape.moveTo(pts[0][0], pts[0][1]);
  // Use quadratic curves through midpoints for natural leaf edge
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    shape.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  shape.closePath();

  const geom = new THREE.ShapeGeometry(shape, 8);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}

function makeGinkgoGeometry(): THREE.BufferGeometry {
  // Fan-shaped with subtle central notch
  const shape = new THREE.Shape();
  const points: [number, number][] = [];

  // Lower stem point
  points.push([0, -0.1]);

  // Fan arc from bottom-left to bottom-right (180° sweep)
  const fanPoints = 48;
  for (let i = 0; i <= fanPoints; i++) {
    const t = Math.PI + (i / fanPoints) * Math.PI; // π to 2π (bottom half of circle)
    const r = 0.5;
    // Slight wave for natural edge
    const wave = 1 + 0.04 * Math.sin(i * 3.14);
    points.push([Math.cos(t) * r * wave, Math.sin(t) * r * wave + 0.3]);
  }

  // Close back to stem
  points.push([0, -0.1]);

  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  // Central notch (subtle V cut at top)
  const notch = new THREE.Path();
  notch.moveTo(-0.04, 0.5);
  notch.lineTo(0, 0.38);
  notch.lineTo(0.04, 0.5);
  shape.holes.push(notch);

  const geom = new THREE.ShapeGeometry(shape, 5);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}

function makeBroadleafGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.quadraticCurveTo(0.4, 0, 0, 0.5);
  shape.quadraticCurveTo(-0.4, 0, 0, -0.5);
  const geom = new THREE.ShapeGeometry(shape, 4);
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}

export function getLeafGeometry(type: LeafGeometryType): THREE.BufferGeometry {
  if (cache.has(type)) return cache.get(type)!;

  let geom: THREE.BufferGeometry;
  switch (type) {
    case "willow":    geom = makeWillowGeometry(); break;
    case "maple":     geom = makeMapleGeometry(); break;
    case "ginkgo":    geom = makeGinkgoGeometry(); break;
    case "broadleaf": geom = makeBroadleafGeometry(); break;
  }

  cache.set(type, geom);
  return geom;
}

export function disposeLeafGeometryCache(): void {
  for (const geom of cache.values()) geom.dispose();
  cache.clear();
}
