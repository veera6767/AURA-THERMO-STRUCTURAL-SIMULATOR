/**
 * AURA - THERMO STRUCTURAL SIMULATOR - GLSL ShaderMaterial
 * Evaluates scalar physical fields per-pixel in object-space (x, r, theta)
 * Works identically on both procedural geometry and imported SolidWorks STL!
 */

import * as THREE from 'three';

// Generate authentic ANSYS 9-band colormap DataTexture
export function createAnsysColormapTexture(banded: boolean = true): THREE.DataTexture {
  const width = banded ? 9 : 256;
  const data = new Uint8Array(width * 4);

  // 9 classic ANSYS bands: Blue -> Cyan -> Green -> Yellow -> Orange -> Red
  const stops = [
    [0, 0, 255],     // Band 1: Pure Blue
    [0, 120, 255],   // Band 2: Blue-Cyan
    [0, 230, 255],   // Band 3: Vivid Cyan
    [0, 255, 130],   // Band 4: Green-Cyan
    [0, 255, 0],     // Band 5: Pure Green
    [150, 255, 0],   // Band 6: Yellow-Green
    [255, 240, 0],   // Band 7: Bright Yellow
    [255, 120, 0],   // Band 8: Hot Orange
    [235, 15, 15],   // Band 9: Maximum Red
  ];

  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    let r = 0, g = 0, b = 0;

    if (banded) {
      const idx = Math.min(8, Math.floor(t * 9));
      r = stops[idx][0];
      g = stops[idx][1];
      b = stops[idx][2];
    } else {
      // Smooth linear interpolation across 9 key colors
      const scaledT = t * 8;
      const idx = Math.min(7, Math.floor(scaledT));
      const frac = scaledT - idx;
      const c1 = stops[idx];
      const c2 = stops[idx + 1];
      r = Math.round(c1[0] + frac * (c2[0] - c1[0]));
      g = Math.round(c1[1] + frac * (c2[1] - c1[1]));
      b = Math.round(c1[2] + frac * (c2[2] - c1[2]));
    }

    const offset = i * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
  texture.minFilter = banded ? THREE.NearestFilter : THREE.LinearFilter;
  texture.magFilter = banded ? THREE.NearestFilter : THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const contourVertexShader = /* glsl */ `
  varying vec3 vObjectPos;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  uniform float uLength;
  uniform float uDeformExaggeration;
  uniform float uDeformProgress;
  uniform int uActiveField; // 2 is DEFORMATION

  void main() {
    vObjectPos = position;
    vec3 transformed = position;

    // Optional vertex deformation preview when in deformation subtab or animation
    if (uActiveField == 2 && uDeformProgress > 0.0) {
      float halfL = uLength * 0.5;
      float u = clamp((position.x + halfL) / uLength, 0.0, 1.0);
      float deformDisp = pow(u, 1.3) * (uDeformExaggeration * 0.02) * uDeformProgress;
      
      // Radial + axial expansion
      vec2 rDir = length(position.yz) > 0.001 ? normalize(position.yz) : vec2(0.0, 1.0);
      transformed.yz += rDir * deformDisp * 0.6;
      transformed.x += deformDisp * 0.4;
    }

    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPos = worldPosition.xyz;
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const contourFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vObjectPos;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  uniform sampler2D uColormap;
  uniform float uLength;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  uniform float uFinHeight;
  uniform float uFinCount;
  
  uniform int uActiveField; // 0: Temp, 1: Heat Flux, 2: Deform, 3: Stress, 4: Strain
  uniform int uStressMode;  // 0: Full, 1: Clipped, 2: Binary Yield Map, 3: Away
  uniform float uYieldThresholdNorm;
  uniform float uTime;
  uniform float uAnimProgress;
  uniform bool uBandedColormap;
  uniform bool uWireframeOverlay;
  
  // Section clipping
  uniform bool uEnableClip;
  uniform vec4 uClipPlane; // ax + by + cz + d = 0 in world or object space

  void main() {
    // Section cut discard
    if (uEnableClip) {
      float dist = dot(vObjectPos, uClipPlane.xyz) + uClipPlane.w;
      if (dist < 0.0) discard;
    }

    float halfL = uLength * 0.5;
    float u = clamp((vObjectPos.x + halfL) / uLength, 0.0, 1.0);
    float r = length(vObjectPos.yz);
    float rMax = uOuterRadius + uFinHeight;
    float radialNorm = clamp((r - uInnerRadius) / max(1.0, rMax - uInnerRadius), 0.0, 1.0);
    float theta = atan(vObjectPos.z, vObjectPos.y);

    float scalarNorm = 0.0;
    bool isYieldZone = false;

    // Evaluate scalar field per pixel
    if (uActiveField == 0) {
      // TEMPERATURE: 600 °C at bore -> 588.41 °C at fin tips
      float radialCooling = radialNorm * 0.92;
      float axialCooling = u * 0.08;
      scalarNorm = clamp(1.0 - (radialCooling + axialCooling), 0.0, 1.0);
      
      // Heat-up animation sweep
      if (uAnimProgress < 1.0) {
        float sweepFront = uAnimProgress * 1.2;
        float heatWave = clamp((sweepFront - (1.0 - scalarNorm)) / 0.2, 0.0, 1.0);
        scalarNorm = scalarNorm * heatWave;
      }
    } 
    else if (uActiveField == 1) {
      // TOTAL HEAT FLUX: low (blue) on bulk wall, high along fin edges and roots, single maximum near free-end rim
      // No concentric rings on flange face!
      float finAngle = cos(uFinCount * theta);
      float finEdge = pow(abs(finAngle), 4.0); // sharp along fin ridges
      float finHeightNorm = clamp((r - uOuterRadius) / max(1.0, uFinHeight), 0.0, 1.0);
      
      // Bulk wall (r <= uOuterRadius): low flux (~0.04 to 0.14)
      float wallFlux = 0.05 + 0.10 * clamp((r - uInnerRadius) / max(1.0, uOuterRadius - uInnerRadius), 0.0, 1.0);
      
      // Fin flux: increases along fin height and near roots
      float finFlux = 0.18 + 0.45 * finHeightNorm + 0.28 * finEdge;
      
      // Blend based on whether we are in the fin zone (r > uOuterRadius)
      float inFinZone = smoothstep(uOuterRadius - 0.5, uOuterRadius + 1.5, r);
      float baseFlux = mix(wallFlux, finFlux, inFinZone);
      
      // Axial progression towards free end (u = 1.0)
      float axialEnhancement = pow(u, 2.2) * 0.32;
      
      // Single maximum near free-end outer rim
      float freeEndRim = smoothstep(0.85, 1.0, u) * smoothstep(uOuterRadius * 0.9, rMax, r) * 0.40;
      
      // Flange face (u < 0.08) receives low flux, completely eliminating concentric hot rings
      float flangeDamp = smoothstep(0.01, 0.08, u);
      baseFlux = mix(0.06, baseFlux, flangeDamp);
      
      scalarNorm = clamp(baseFlux + axialEnhancement + freeEndRim, 0.02, 1.0);
    } 
    else if (uActiveField == 2) {
      // TOTAL DEFORMATION: 0 at fixed support (u = 0) -> max at free end (u = 1)
      scalarNorm = pow(u, 1.3);
    } 
    else if (uActiveField == 3) {
      // EQUIVALENT (VON-MISES) STRESS: peak 3.927 GPa at fixed support and fin roots
      float endConcentration = exp(-u * 9.0);
      float finRootEffect = sin(3.14159 * radialNorm) * 0.35 * exp(-u * 4.0);
      float bulk = 0.0115;
      scalarNorm = clamp(endConcentration * 0.95 + finRootEffect + bulk, 0.0, 1.0);

      // Check if exceeds yield threshold
      if (scalarNorm > uYieldThresholdNorm) {
        isYieldZone = true;
      }

      if (uStressMode == 3) {
        // AWAY FROM CONSTRAINT: recomputed for u > 0.10
        float awayU = max(0.0, (u - 0.10) / 0.90);
        scalarNorm = clamp(0.20 + 0.80 * (1.0 - exp(-awayU * 2.0)), 0.0, 1.0);
        isYieldZone = false;
      }
    } 
    else if (uActiveField == 4) {
      // EQUIVALENT ELASTIC STRAIN
      float endConcentration = exp(-u * 9.0);
      float finRootEffect = sin(3.14159 * radialNorm) * 0.35 * exp(-u * 4.0);
      scalarNorm = clamp(endConcentration * 0.95 + finRootEffect + 0.012, 0.0, 1.0);
    }

    vec3 col = vec3(0.0);

    // Apply color mapping
    if (uActiveField == 3 && uStressMode == 2) {
      // YIELD ZONE BINARY MAP: Below yield = cool tech blue, Above = hot vivid red
      if (isYieldZone) {
        col = vec3(0.95, 0.15, 0.15); // Hot red
      } else {
        col = vec3(0.12, 0.45, 0.85); // Cool blue
      }
    } 
    else if (uActiveField == 3 && uStressMode == 1 && isYieldZone) {
      // CLIPPED AT YIELD: Pulsing magenta/white yield zone warning
      float pulse = 0.5 + 0.5 * sin(uTime * 6.0);
      vec3 yieldMagenta = vec3(0.98, 0.20, 0.70);
      vec3 yieldWhite = vec3(1.0, 1.0, 1.0);
      col = mix(yieldMagenta, yieldWhite, pulse * 0.4);
    } 
    else {
      // Standard ANSYS Colormap lookup
      float lookupU = clamp(scalarNorm, 0.005, 0.995);
      col = texture2D(uColormap, vec2(lookupU, 0.5)).rgb;
    }

    // Engineering Phong Lighting + Fresnel Rim Glow
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    vec3 lightDir1 = normalize(vec3(0.6, 1.0, 0.8));
    vec3 lightDir2 = normalize(vec3(-0.8, -0.4, -0.6));

    float diff1 = max(dot(N, lightDir1), 0.0);
    float diff2 = max(dot(N, lightDir2), 0.0) * 0.35;
    float ambient = 0.38;
    
    // Subtle specular shine
    vec3 H1 = normalize(lightDir1 + V);
    float spec = pow(max(dot(N, H1), 0.0), 24.0) * 0.25;

    // Fresnel rim glow
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.35;
    vec3 rimColor = vec3(0.2, 0.75, 1.0);

    vec3 litColor = col * (ambient + diff1 * 0.65 + diff2) + vec3(spec) + rimColor * fresnel;

    // Scanline sweep micro-effect
    float scanline = sin((vWorldPos.y + vWorldPos.x * 0.5 + uTime * 60.0) * 0.25);
    litColor += vec3(0.03, 0.08, 0.12) * max(0.0, scanline);

    gl_FragColor = vec4(litColor, 1.0);
  }
`;
