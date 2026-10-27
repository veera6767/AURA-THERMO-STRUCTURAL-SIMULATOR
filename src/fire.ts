/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Rocket Fire & Exhaust Plume System
 * Realistic rocket motor combustion simulation:
 * - GLSL procedural noise flame inside bore with core/mid/edge colors
 * - Flame color coupled to Inner Wall Temp (Ts)
 * - Flame & plume length coupled to Internal Pressure (P)
 * - Supersonic exhaust plume with periodic shock-diamond Mach discs
 * - Dynamic sparks particle stream
 * - Translucent head-cap disc with igniter glow at closed plate end
 * - Direction switchable (default: born at +X flange plate, ejects out of -X open end)
 */

import * as THREE from 'three';
import { FireState, SimulationParameters, SurrogateKPIs } from './types';

export interface RocketFireSystem {
  group: THREE.Group;
  update: (
    delta: number,
    time: number,
    fireState: FireState,
    fireProgress: number,
    params: SimulationParameters,
    kpis: SurrogateKPIs,
    flipDirection: boolean
  ) => void;
  dispose: () => void;
}

// ── INTERNAL BORE FLAME SHADER ───────────────────────────────────────────
const boreFlameVertexShader = /* glsl */ `
  varying vec3 vObjectPos;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  uniform float uLength;
  uniform float uFlameProgress;
  uniform float uPressure;
  uniform float uTime;
  uniform bool uFlip;

  void main() {
    vUv = uv;
    vObjectPos = position;
    vec3 pos = position;

    // Subtle turbulent radial flutter based on pressure
    float flutter = sin(pos.x * 0.15 + uTime * 35.0) * cos(pos.y * 0.2 + uTime * 25.0) * (uPressure * 0.35);
    pos.yz += normalize(pos.yz) * flutter * 0.08;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const boreFlameFragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vObjectPos;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  uniform float uLength;
  uniform float uFlameProgress; // 0 to 1
  uniform float uWallTemp;       // Ts in °C
  uniform float uPressure;       // P in MPa
  uniform float uTime;
  uniform bool uFlip;

  // Simple procedural hash noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    float halfL = uLength * 0.5;
    // Normalized axial position: 0 at birth plate, 1 at open nozzle
    float u = uFlip ? clamp((vObjectPos.x + halfL) / uLength, 0.0, 1.0)
                    : clamp((halfL - vObjectPos.x) / uLength, 0.0, 1.0);

    // Discard beyond flame front during ignition or burnout
    if (u > uFlameProgress) discard;

    float r = length(vObjectPos.yz);
    float normR = clamp(r / 48.0, 0.0, 1.0); // 48mm bore radius

    // Flowing turbulence
    vec2 flowUv = vec2(u * 8.0 - uTime * 28.0, vUv.y * 6.0);
    float n1 = noise(flowUv);
    float n2 = noise(flowUv * 2.3 + vec2(uTime * 15.0, 0.0));
    float turb = n1 * 0.6 + n2 * 0.4;

    // Color gradient: white-yellow core (low r), orange mid, fiery red edge
    vec3 coreColor = vec3(1.0, 0.98, 0.85); // White-yellow
    vec3 midColor  = vec3(1.0, 0.45, 0.05); // Hot orange
    vec3 edgeColor = vec3(0.9, 0.10, 0.02); // Fiery red

    // Temperature coupling: hotter wall shifts flame toward brighter incandescent white/cyan
    float tempShift = clamp((uWallTemp - 500.0) / 400.0, 0.0, 1.0);
    coreColor = mix(coreColor, vec3(0.85, 0.95, 1.0), tempShift * 0.4);
    midColor = mix(midColor, vec3(1.0, 0.65, 0.15), tempShift * 0.5);

    // Radial gradient blending
    vec3 flameCol = mix(coreColor, midColor, smoothstep(0.1, 0.6, normR + turb * 0.25));
    flameCol = mix(flameCol, edgeColor, smoothstep(0.55, 0.95, normR + turb * 0.3));

    // Intensity boost by pressure
    float intensity = (1.2 + (uPressure / 5.0) * 0.8) * (0.85 + 0.3 * turb);

    // Alpha falloff at edges and flame head
    float alpha = smoothstep(1.0, 0.3, normR) * smoothstep(uFlameProgress, uFlameProgress - 0.15, u) * 0.85;

    gl_FragColor = vec4(flameCol * intensity, alpha);
  }
`;

// ── SUPERSONIC EXHAUST PLUME SHADER (Mach Shock Diamonds) ────────────────
const plumeVertexShader = /* glsl */ `
  varying vec3 vObjectPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vObjectPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const plumeFragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vObjectPos;
  varying vec2 vUv;
  uniform float uPlumeProgress;
  uniform float uPressure;
  uniform float uWallTemp;
  uniform float uTime;

  void main() {
    float x = vUv.x; // 0 at nozzle exit, 1 at plume tip
    if (x > uPlumeProgress) discard;

    float r = abs(vUv.y - 0.5) * 2.0; // 0 at center, 1 at plume outer edge

    // Periodic shock diamond bands (Mach diamonds)
    // Diamond spacing tightens with pressure
    float diamondFreq = 16.0 + (uPressure / 5.0) * 8.0;
    float shockWave = sin(x * diamondFreq - uTime * 40.0);
    float diamondCore = pow(max(0.0, shockWave), 3.0) * smoothstep(0.65, 0.0, r);

    // Color gradient
    vec3 coreColor = vec3(1.0, 0.95, 0.80);
    vec3 shockColor = vec3(0.5, 0.85, 1.0); // Bright ionized cyan shock disc
    vec3 outerColor = vec3(1.0, 0.35, 0.05);

    vec3 col = mix(coreColor, outerColor, r);
    col = mix(col, shockColor, diamondCore * 0.8);

    // Pressure increases brightness and length
    float alpha = (1.0 - x) * smoothstep(1.0, 0.1, r) * uPlumeProgress * 0.75;
    alpha += diamondCore * 0.4;

    gl_FragColor = vec4(col * (1.2 + uPressure * 0.2), alpha);
  }
`;

export function createRocketFireSystem(): RocketFireSystem {
  const group = new THREE.Group();
  group.name = 'RocketFireGroup';
  group.visible = false;

  // 1. Bore Flame Mesh (Cylinder)
  const boreGeom = new THREE.CylinderGeometry(48, 48, 460, 32, 40, true);
  boreGeom.rotateZ(Math.PI / 2); // Align with X-axis

  const boreMat = new THREE.ShaderMaterial({
    vertexShader: boreFlameVertexShader,
    fragmentShader: boreFlameFragmentShader,
    uniforms: {
      uLength: { value: 460 },
      uFlameProgress: { value: 0 },
      uWallTemp: { value: 600 },
      uPressure: { value: 1.5 },
      uTime: { value: 0 },
      uFlip: { value: false },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const boreMesh = new THREE.Mesh(boreGeom, boreMat);
  group.add(boreMesh);

  // 2. Translucent Circular Head-Cap Disc at Closed Plate End
  const capGeom = new THREE.CircleGeometry(60, 32);
  capGeom.rotateY(Math.PI / 2);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x12356b,
    metalness: 0.85,
    roughness: 0.2,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const capMesh = new THREE.Mesh(capGeom, capMat);
  capMesh.position.set(230, 0, 0); // default at +X flange end
  group.add(capMesh);

  // Igniter glow sphere at center of closed head cap
  const igniterGeom = new THREE.SphereGeometry(3, 16, 16);
  const igniterMat = new THREE.MeshBasicMaterial({
    color: 0xffaa22,
    transparent: true,
    opacity: 0.9,
  });
  const igniterMesh = new THREE.Mesh(igniterGeom, igniterMat);
  igniterMesh.position.set(230, 0, 0);
  group.add(igniterMesh);

  // 3. Supersonic Exhaust Plume Cone Mesh
  // Cone extending ~320mm out from open nozzle
  const plumeGeom = new THREE.CylinderGeometry(18, 70, 320, 24, 20, true);
  plumeGeom.rotateZ(Math.PI / 2);
  const plumeMat = new THREE.ShaderMaterial({
    vertexShader: plumeVertexShader,
    fragmentShader: plumeFragmentShader,
    uniforms: {
      uPlumeProgress: { value: 0 },
      uPressure: { value: 1.5 },
      uWallTemp: { value: 600 },
      uTime: { value: 0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const plumeMesh = new THREE.Mesh(plumeGeom, plumeMat);
  // Default: nozzle exit at -X (-230), plume extends from -230 to -550
  plumeMesh.position.set(-390, 0, 0);
  group.add(plumeMesh);

  // 4. Sparks Particle System (100 high-speed ejected sparks)
  const sparkCount = 100;
  const sparkGeom = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkVel = new Float32Array(sparkCount * 3);
  const sparkColors = new Float32Array(sparkCount * 3);

  for (let i = 0; i < sparkCount; i++) {
    sparkPos[i * 3] = -230;
    sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 20;

    // High velocity in -X direction
    sparkVel[i * 3] = -(400 + Math.random() * 500);
    sparkVel[i * 3 + 1] = (Math.random() - 0.5) * 60;
    sparkVel[i * 3 + 2] = (Math.random() - 0.5) * 60;

    sparkColors[i * 3] = 1.0;
    sparkColors[i * 3 + 1] = 0.5 + Math.random() * 0.4;
    sparkColors[i * 3 + 2] = 0.1;
  }
  sparkGeom.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeom.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

  const sparkMat = new THREE.PointsMaterial({
    size: 3.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const sparks = new THREE.Points(sparkGeom, sparkMat);
  group.add(sparks);

  // 5. Flickering Orange Point Light inside combustion chamber
  const flameLight = new THREE.PointLight(0xff6600, 0, 800);
  flameLight.position.set(0, 0, 0);
  group.add(flameLight);

  return {
    group,
    update: (delta, time, fireState, fireProgress, params, kpis, flipDirection) => {
      if (fireState === 'READY') {
        group.visible = false;
        flameLight.intensity = 0;
        return;
      }

      group.visible = true;

      const halfL = params.length / 2;
      const plateX = flipDirection ? -halfL : halfL;
      const openX = flipDirection ? halfL : -halfL;

      // Position head cap at closed end
      capMesh.position.set(plateX, 0, 0);
      igniterMesh.position.set(plateX, 0, 0);

      // Position plume at open end
      const plumeDir = flipDirection ? 1 : -1;
      plumeMesh.position.set(openX + plumeDir * 160, 0, 0);
      plumeMesh.rotation.z = flipDirection ? -Math.PI / 2 : Math.PI / 2;

      // Update uniforms
      boreMat.uniforms.uTime.value = time;
      boreMat.uniforms.uFlameProgress.value = fireProgress;
      boreMat.uniforms.uWallTemp.value = params.innerWallTemp;
      boreMat.uniforms.uPressure.value = params.internalPressure;
      boreMat.uniforms.uLength.value = params.length;
      boreMat.uniforms.uFlip.value = flipDirection;

      plumeMat.uniforms.uTime.value = time;
      plumeMat.uniforms.uPlumeProgress.value = fireState === 'BURNING' ? 1.0 : Math.max(0, (fireProgress - 0.4) / 0.6);
      plumeMat.uniforms.uPressure.value = params.internalPressure;
      plumeMat.uniforms.uWallTemp.value = params.innerWallTemp;

      // Dynamic light flicker
      const flicker = 0.85 + 0.3 * Math.sin(time * 45.0) + 0.15 * Math.sin(time * 95.0);
      const intensityScale = fireState === 'BURNING' ? 2.8 : (fireProgress * 2.5);
      flameLight.intensity = intensityScale * flicker * (params.internalPressure / 2.0);
      flameLight.position.set((plateX + openX) * 0.5, 0, 0);

      // Animate sparks
      const posArray = sparkGeom.attributes.position.array as Float32Array;
      const sparkCountCurrent = sparkPos.length / 3;

      for (let i = 0; i < sparkCountCurrent; i++) {
        const idx = i * 3;
        posArray[idx] += sparkVel[idx] * plumeDir * delta;
        posArray[idx + 1] += sparkVel[idx + 1] * delta;
        posArray[idx + 2] += sparkVel[idx + 2] * delta;

        // Reset spark when it travels past plume length
        const distTraveled = Math.abs(posArray[idx] - openX);
        if (distTraveled > 400 + Math.random() * 200) {
          posArray[idx] = openX;
          posArray[idx + 1] = (Math.random() - 0.5) * 25;
          posArray[idx + 2] = (Math.random() - 0.5) * 25;
        }
      }
      sparkGeom.attributes.position.needsUpdate = true;
    },
    dispose: () => {
      boreGeom.dispose();
      boreMat.dispose();
      capGeom.dispose();
      capMat.dispose();
      igniterGeom.dispose();
      igniterMat.dispose();
      plumeGeom.dispose();
      plumeMat.dispose();
      sparkGeom.dispose();
      sparkMat.dispose();
    },
  };
}
