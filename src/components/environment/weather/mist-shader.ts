import * as THREE from "three";

export const mistVertexShader = `
  attribute float aSeed;
  attribute float aOpacity;
  
  varying vec2 vUv;
  varying float vSeed;
  varying float vOpacity;
  
  #include <fog_pars_vertex>
  
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vOpacity = aOpacity;
    vec4 mvPosition = instanceMatrix * vec4(position, 1.0);
    mvPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * mvPosition;
    
    #include <fog_vertex>
  }
`;

// Simplex 3D Noise from Ashima Arts (MIT)
const simplex3D = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }
`;

export const mistFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSpeed;
  uniform float uEdgeDebug;
  uniform float uContrast;

  varying vec2 vUv;
  varying float vSeed;
  varying float vOpacity;

  #include <fog_pars_fragment>

  ${simplex3D}

  void main() {
    // Soft edge fade reaching zero well before edges (strict domain)
    // Left edge (0 to 0.2), Right edge (0.8 to 1.0)
    float edgeX = smoothstep(0.0, 0.05, vUv.x) * (1.0 - smoothstep(0.95, 1.0, vUv.x));
    float edgeY = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.95, 1.0, vUv.y));
    
    // Radial center bias
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    float radial = 1.0 - smoothstep(0.3, 0.8, dist);

    float baseAlpha = edgeX * edgeY * radial;

    // Edge Debug mode: Force red outline around the bounding box
    if (uEdgeDebug > 0.5) {
      if (vUv.x < 0.01 || vUv.x > 0.99 || vUv.y < 0.01 || vUv.y > 0.99) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        return;
      }
    }

    // if (baseAlpha <= 0.001) return;

    // Domain warp & noise evolution
    vec3 pBroad = vec3(vUv.x * 2.0, vUv.y * 2.0, uTime * 0.15 * uSpeed + vSeed * 100.0);
    float nBroad = snoise(pBroad);
    
    vec3 pFine = vec3(vUv.x * 5.0 + nBroad * 0.5, vUv.y * 5.0 + nBroad * 0.5, uTime * 0.25 * uSpeed + vSeed * 200.0);
    float nFine = snoise(pFine);
    
    // Combine noise
    float noise = (nBroad * 0.7 + nFine * 0.3) * 0.5 + 0.5; // map to 0..1
    
    // Apply contrast
    noise = clamp((noise - 0.5) * uContrast + 0.5, 0.0, 1.0);
    
    // Vertical fade: Mist is denser at the bottom, fades near top of its volume
    float vertFade = 1.0 - smoothstep(0.1, 0.9, vUv.y);
    
    float finalAlpha = baseAlpha * noise * vertFade * vOpacity * max(uOpacity, 0.5) * 10.0; // Boosted heavily
    
    gl_FragColor = vec4(uColor, finalAlpha);
    
    #include <fog_fragment>
  }
`;

export class MistShaderMaterial extends THREE.ShaderMaterial {
  constructor(color: THREE.Color) {
    super({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib["fog"],
        {
          uColor: { value: color },
          uTime: { value: 0 },
          uOpacity: { value: 1.0 },
          uSpeed: { value: 1.0 },
          uEdgeDebug: { value: 0.0 },
          uContrast: { value: 1.2 },
        }
      ]),
      vertexShader: mistVertexShader,
      fragmentShader: mistFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false, // DEBUG: force render on top
      blending: THREE.NormalBlending,
      fog: true,
    });
  }
}
