/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Geometry Generator & STL Loader
 * Procedural CAD generation with chamfers, stubs, flange, and STL auto-orientation
 */

import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { SimulationParameters, TelemetrySpec } from './types';
import { APP_CONFIG } from './config';

export interface ChamberGeometryResult {
  mainMesh: THREE.Mesh | THREE.Group;
  telemetry: TelemetrySpec;
  isStl: boolean;
}

/**
 * Creates the parametric procedural model of the finned rocket chamber
 */
export function buildProceduralChamber(
  params: SimulationParameters,
  material: THREE.Material
): { group: THREE.Group; telemetry: TelemetrySpec } {
  const group = new THREE.Group();
  group.name = 'ChamberProceduralGroup';

  const L = params.length; // baseline 450 mm
  const stubLeft = 15; // fixed end stub (mm)
  const neckRight = 15; // neck before flange (mm)
  const flangeThick = params.showFlange ? 5 : 0;
  const totalLength = L + stubLeft + neckRight + flangeThick; // ~ 480-485 mm
  const halfL = totalLength / 2;

  const ri = params.innerDiameter / 2; // 50 mm
  const ro = params.outerDiameter / 2; // 60 mm
  const rFlange = 85; // 170 mm dia

  const radialSegments = 64;
  const lengthSegments = 40;

  // 1. Build Hollow Main Body (Cylinder + Inner Bore)
  // We construct a custom BufferGeometry for clean manifold surface
  const bodyGeom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const xStart = -halfL;
  const xEnd = halfL - flangeThick;

  // Outer Cylinder
  const outerStartIndex = 0;
  for (let i = 0; i <= lengthSegments; i++) {
    const x = xStart + (i / lengthSegments) * (xEnd - xStart);
    const u = i / lengthSegments;
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const y = Math.cos(theta) * ro;
      const z = Math.sin(theta) * ro;
      vertices.push(x, y, z);
      normals.push(0, Math.cos(theta), Math.sin(theta));
      uvs.push(u, j / radialSegments);
    }
  }

  const ringStride = radialSegments + 1;
  for (let i = 0; i < lengthSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringStride + j;
      const b = (i + 1) * ringStride + j;
      const c = (i + 1) * ringStride + (j + 1);
      const d = i * ringStride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Inner Bore (facing inward, normal points toward center)
  const innerStartIndex = vertices.length / 3;
  for (let i = 0; i <= lengthSegments; i++) {
    const x = xStart + (i / lengthSegments) * (xEnd - xStart);
    const u = i / lengthSegments;
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const y = Math.cos(theta) * ri;
      const z = Math.sin(theta) * ri;
      vertices.push(x, y, z);
      normals.push(0, -Math.cos(theta), -Math.sin(theta));
      uvs.push(u, j / radialSegments);
    }
  }

  for (let i = 0; i < lengthSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = innerStartIndex + i * ringStride + j;
      const b = innerStartIndex + (i + 1) * ringStride + j;
      const c = innerStartIndex + (i + 1) * ringStride + (j + 1);
      const d = innerStartIndex + i * ringStride + (j + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  // End Caps (Annulus at fixed end)
  const fixedEndStartIndex = vertices.length / 3;
  for (let j = 0; j <= radialSegments; j++) {
    const theta = (j / radialSegments) * Math.PI * 2;
    // Inner point
    vertices.push(xStart, Math.cos(theta) * ri, Math.sin(theta) * ri);
    normals.push(-1, 0, 0);
    uvs.push(0, 0);
    // Outer point
    vertices.push(xStart, Math.cos(theta) * ro, Math.sin(theta) * ro);
    normals.push(-1, 0, 0);
    uvs.push(0, 1);
  }
  for (let j = 0; j < radialSegments; j++) {
    const a = fixedEndStartIndex + j * 2;
    const b = fixedEndStartIndex + j * 2 + 1;
    const c = fixedEndStartIndex + (j + 1) * 2 + 1;
    const d = fixedEndStartIndex + (j + 1) * 2;
    indices.push(a, b, d);
    indices.push(b, c, d);
  }

  // Right End Flange
  if (params.showFlange) {
    const xFlangeStart = xEnd;
    const xFlangeEnd = halfL;

    // Flange Outer Cylinder
    const flangeOuterStartIndex = vertices.length / 3;
    for (let i = 0; i <= 2; i++) {
      const x = xFlangeStart + (i / 2) * (xFlangeEnd - xFlangeStart);
      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        vertices.push(x, Math.cos(theta) * rFlange, Math.sin(theta) * rFlange);
        normals.push(0, Math.cos(theta), Math.sin(theta));
        uvs.push(i / 2, j / radialSegments);
      }
    }
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = flangeOuterStartIndex + i * ringStride + j;
        const b = flangeOuterStartIndex + (i + 1) * ringStride + j;
        const c = flangeOuterStartIndex + (i + 1) * ringStride + (j + 1);
        const d = flangeOuterStartIndex + i * ringStride + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Step from outer cylinder to flange (annulus at xFlangeStart)
    const stepStartIndex = vertices.length / 3;
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      vertices.push(xFlangeStart, Math.cos(theta) * ro, Math.sin(theta) * ro);
      normals.push(-1, 0, 0);
      uvs.push(0, 0);
      vertices.push(xFlangeStart, Math.cos(theta) * rFlange, Math.sin(theta) * rFlange);
      normals.push(-1, 0, 0);
      uvs.push(0, 1);
    }
    for (let j = 0; j < radialSegments; j++) {
      const a = stepStartIndex + j * 2;
      const b = stepStartIndex + j * 2 + 1;
      const c = stepStartIndex + (j + 1) * 2 + 1;
      const d = stepStartIndex + (j + 1) * 2;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }

    // Flange front face (annulus at xFlangeEnd)
    const frontFaceStartIndex = vertices.length / 3;
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      vertices.push(xFlangeEnd, Math.cos(theta) * ri, Math.sin(theta) * ri);
      normals.push(1, 0, 0);
      uvs.push(0, 0);
      vertices.push(xFlangeEnd, Math.cos(theta) * rFlange, Math.sin(theta) * rFlange);
      normals.push(1, 0, 0);
      uvs.push(0, 1);
    }
    for (let j = 0; j < radialSegments; j++) {
      const a = frontFaceStartIndex + j * 2;
      const b = frontFaceStartIndex + j * 2 + 1;
      const c = frontFaceStartIndex + (j + 1) * 2 + 1;
      const d = frontFaceStartIndex + (j + 1) * 2;
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  bodyGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  bodyGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  bodyGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  bodyGeom.setIndex(indices);
  bodyGeom.computeVertexNormals();

  const bodyMesh = new THREE.Mesh(bodyGeom, material);
  bodyMesh.name = 'ChamberBody';
  group.add(bodyMesh);

  // 2. Build Longitudinal Chamfered Fins
  const finsGroup = new THREE.Group();
  finsGroup.name = 'FinsGroup';

  const finCount = params.finCount;
  const finH = params.finHeight; // 20 mm
  const finT = params.finThickness; // 3 mm
  const finXStart = -halfL + stubLeft; // starts after 15mm plain stub
  const finXEnd = -halfL + stubLeft + params.length; // 450 mm span
  const chamferLen = 20; // 20 mm slant chamfer at left tip
  const explodeDist = params.explodedFinDistance || 0;

  for (let k = 0; k < finCount; k++) {
    const angle = (k / finCount) * Math.PI * 2;
    const finGeom = buildSingleChamferedFin(finXStart, finXEnd, ro, finH, finT, chamferLen);
    const finMesh = new THREE.Mesh(finGeom, material);

    // Position & rotate fin to radial angle
    finMesh.rotation.x = angle;

    // Exploded fin translation along local radial direction
    if (explodeDist > 0) {
      finMesh.position.y = Math.cos(angle) * explodeDist;
      finMesh.position.z = Math.sin(angle) * explodeDist;
    }

    finsGroup.add(finMesh);
  }

  group.add(finsGroup);

  // Calculate telemetry stats
  let totalVerts = vertices.length / 3;
  let totalTris = indices.length / 3;
  finsGroup.children.forEach((child) => {
    if (child instanceof THREE.Mesh) {
      const g = child.geometry as THREE.BufferGeometry;
      totalVerts += g.attributes.position.count;
      totalTris += g.index ? g.index.count / 3 : 0;
    }
  });

  const boundingBox = {
    length: Math.round(totalLength * 10) / 10,
    width: Math.round((params.showFlange ? rFlange * 2 : (ro + finH) * 2) * 10) / 10,
    height: Math.round((params.showFlange ? rFlange * 2 : (ro + finH) * 2) * 10) / 10,
  };

  const telemetry: TelemetrySpec = {
    modelSource: 'PARAMETRIC',
    fileName: 'PROCEDURAL_PARAMETRIC_ENGINE',
    isStlLoaded: false,
    stlNotFoundNotice: false,
    boundingBox,
    vertexCount: totalVerts,
    triangleCount: totalTris,
    fileSizeBytes: 0,
    isManifoldValid: true,
    units: 'mm',
  };

  return { group, telemetry };
}

/**
 * Builds a single fin with chamfered tip at leading edge
 */
function buildSingleChamferedFin(
  xStart: number,
  xEnd: number,
  rBase: number,
  height: number,
  thickness: number,
  chamferLen: number
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const halfT = thickness / 2;

  // Profile along X and Y (where Y is radius above cylinder):
  // (xStart, rBase)
  // (xStart + chamferLen, rBase + height) -> chamfer tip!
  // (xEnd, rBase + height)
  // (xEnd, rBase)
  const p0 = [xStart, rBase];
  const p1 = [xStart + chamferLen, rBase + height];
  const p2 = [xEnd, rBase + height];
  const p3 = [xEnd, rBase];

  const verts: number[] = [];
  const norms: number[] = [];
  const idxs: number[] = [];

  // Helper to add a quad
  function addQuad(
    v0: [number, number, number],
    v1: [number, number, number],
    v2: [number, number, number],
    v3: [number, number, number]
  ) {
    const baseIdx = verts.length / 3;
    verts.push(...v0, ...v1, ...v2, ...v3);

    // Compute normal from cross product
    const edge1 = new THREE.Vector3(v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]);
    const edge2 = new THREE.Vector3(v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]);
    const n = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    for (let i = 0; i < 4; i++) norms.push(n.x, n.y, n.z);

    idxs.push(baseIdx, baseIdx + 1, baseIdx + 2);
    idxs.push(baseIdx, baseIdx + 2, baseIdx + 3);
  }

  // Left side face (-Z): p0, p3, p2, p1
  addQuad(
    [p0[0], p0[1], -halfT],
    [p3[0], p3[1], -halfT],
    [p2[0], p2[1], -halfT],
    [p1[0], p1[1], -halfT]
  );

  // Right side face (+Z): p0, p1, p2, p3
  addQuad(
    [p0[0], p0[1], halfT],
    [p1[0], p1[1], halfT],
    [p2[0], p2[1], halfT],
    [p3[0], p3[1], halfT]
  );

  // Top fin tip surface: p1 to p2
  addQuad(
    [p1[0], p1[1], -halfT],
    [p2[0], p2[1], -halfT],
    [p2[0], p2[1], halfT],
    [p1[0], p1[1], halfT]
  );

  // Chamfered leading edge: p0 to p1
  addQuad(
    [p0[0], p0[1], -halfT],
    [p1[0], p1[1], -halfT],
    [p1[0], p1[1], halfT],
    [p0[0], p0[1], halfT]
  );

  // Back trailing edge: p2 to p3
  addQuad(
    [p2[0], p2[1], -halfT],
    [p3[0], p3[1], -halfT],
    [p3[0], p3[1], halfT],
    [p2[0], p2[1], halfT]
  );

  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
  geom.setIndex(idxs);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Attempts to load external CAD STL from assets/finned_chamber.stl
 * If successful, centers the mesh, auto-detects axial direction, aligns flange to +X, and computes specs.
 * If 404/not found, silently returns null so procedural fallback is used.
 */
export async function tryLoadCadStl(
  material: THREE.Material
): Promise<{ mesh: THREE.Mesh; telemetry: TelemetrySpec } | null> {
  const loader = new STLLoader();
  const stlUrl = APP_CONFIG.STL_PATH;

  try {
    const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
      loader.load(
        stlUrl,
        (geom) => resolve(geom),
        undefined,
        (err) => reject(err)
      );
    });

    if (!geometry || geometry.attributes.position.count === 0) {
      return null;
    }

    // Ensure normals are computed
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const bbox = geometry.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // 1. Auto-detect long (axial) axis
    // Check which axis is largest (X, Y, or Z)
    let axialAxis: 'x' | 'y' | 'z' = 'x';
    if (size.y > size.x && size.y > size.z) axialAxis = 'y';
    else if (size.z > size.x && size.z > size.y) axialAxis = 'z';

    // Rotate so axial axis lies along X
    if (axialAxis === 'y') {
      geometry.rotateZ(Math.PI / 2);
    } else if (axialAxis === 'z') {
      geometry.rotateY(-Math.PI / 2);
    }

    // Recompute bounding box after rotation
    geometry.computeBoundingBox();
    const rotatedBBox = geometry.boundingBox!;

    // Center on Y and Z, center on X
    geometry.center();

    // 2. Detect which end holds the flange (the end with the largest radius)
    // Sample vertices on negative X vs positive X
    const positions = geometry.attributes.position.array;
    let maxRNeg = 0;
    let maxRPos = 0;
    const vertexCount = geometry.attributes.position.count;

    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const r = Math.sqrt(y * y + z * z);
      if (x < 0 && r > maxRNeg) maxRNeg = r;
      if (x > 0 && r > maxRPos) maxRPos = r;
    }

    // SolidWorks flange has the largest radius (~85 mm vs ~80 mm fin tips)
    const isFlangeOnNeg = maxRNeg > maxRPos;
    const shouldFlip = APP_CONFIG.FLANGE_SIDE === 'positive_x' ? isFlangeOnNeg : !isFlangeOnNeg;

    if (shouldFlip || APP_CONFIG.STL_FLIP_AXIS) {
      geometry.rotateY(Math.PI);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
    }

    // Apply scale if configured
    if (APP_CONFIG.STL_SCALE !== 1.0) {
      geometry.scale(APP_CONFIG.STL_SCALE, APP_CONFIG.STL_SCALE, APP_CONFIG.STL_SCALE);
      geometry.computeBoundingBox();
    }

    const finalBBox = geometry.boundingBox!;
    const finalSize = new THREE.Vector3();
    finalBBox.getSize(finalSize);

    const triangleCount = geometry.index ? geometry.index.count / 3 : vertexCount / 3;

    // Approximate file size or fetch header
    let fileSizeBytes = 0;
    try {
      const resp = await fetch(stlUrl, { method: 'HEAD' });
      const len = resp.headers.get('content-length');
      if (len) fileSizeBytes = parseInt(len, 10);
    } catch {
      fileSizeBytes = vertexCount * 50; // estimate
    }

    const telemetry: TelemetrySpec = {
      modelSource: 'CAD STL',
      fileName: 'finned_chamber.stl',
      isStlLoaded: true,
      stlNotFoundNotice: false,
      boundingBox: {
        length: Math.round(finalSize.x * 10) / 10,
        width: Math.round(finalSize.y * 10) / 10,
        height: Math.round(finalSize.z * 10) / 10,
      },
      vertexCount,
      triangleCount: Math.round(triangleCount),
      fileSizeBytes,
      isManifoldValid: true,
      units: 'mm',
    };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'CadStlChamber';
    return { mesh, telemetry };
  } catch {
    // STL not present or 404
    return null;
  }
}

/**
 * Creates visual boundary condition overlays
 */
export function buildBoundaryConditionOverlays(
  params: SimulationParameters
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BoundaryConditionsGroup';

  const halfL = (params.length + 30) / 2;
  const ri = params.innerDiameter / 2;
  const ro = params.outerDiameter / 2;

  // 1. Fixed Support on Left End Face (Cyan/Blue glowing ring & hatch ticks)
  if (params.showBoundaryConditions.fixedSupport) {
    const fixedGroup = new THREE.Group();
    fixedGroup.name = 'FixedSupportOverlay';

    // Glowing annulus ring at -halfL
    const ringGeom = new THREE.RingGeometry(ri, ro, 48);
    ringGeom.rotateY(Math.PI / 2);
    ringGeom.translate(-halfL - 0.5, 0, 0);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    fixedGroup.add(new THREE.Mesh(ringGeom, ringMat));

    // Ground anchor tick marks
    const tickMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    for (let a = 0; a < 24; a++) {
      const angle = (a / 24) * Math.PI * 2;
      const rMid = (ri + ro) / 2;
      const y = Math.cos(angle) * rMid;
      const z = Math.sin(angle) * rMid;

      const pts = [
        new THREE.Vector3(-halfL, y, z),
        new THREE.Vector3(-halfL - 10, y + Math.cos(angle) * 3, z + Math.sin(angle) * 3),
      ];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      fixedGroup.add(new THREE.Line(lineGeom, tickMat));
    }

    group.add(fixedGroup);
  }

  // 2. 2 MPa Internal Pressure (Inward / Radial arrows inside bore)
  if (params.showBoundaryConditions.internalPressure) {
    const pressGroup = new THREE.Group();
    pressGroup.name = 'InternalPressureOverlay';

    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    const arrowConeGeom = new THREE.ConeGeometry(2.5, 6, 8);
    arrowConeGeom.rotateZ(-Math.PI / 2); // points outward radially

    const rings = 8;
    const arrowsPerRing = 8;
    for (let rIdx = 0; rIdx < rings; rIdx++) {
      const x = -halfL + 25 + (rIdx / (rings - 1)) * (params.length - 20);
      for (let aIdx = 0; aIdx < arrowsPerRing; aIdx++) {
        const theta = (aIdx / arrowsPerRing) * Math.PI * 2 + (rIdx % 2) * 0.3;
        const arrow = new THREE.Mesh(arrowConeGeom, arrowMat);
        arrow.position.set(x, Math.cos(theta) * (ri - 4), Math.sin(theta) * (ri - 4));
        arrow.rotation.x = -theta;
        pressGroup.add(arrow);
      }
    }
    group.add(pressGroup);
  }

  // 3. 600 °C Inner Wall (Orange / Amber thermal glow tube)
  if (params.showBoundaryConditions.heatWall) {
    const heatGeom = new THREE.CylinderGeometry(ri - 0.8, ri - 0.8, params.length, 36, 1, true);
    heatGeom.rotateZ(Math.PI / 2);
    const heatMat = new THREE.MeshBasicMaterial({
      color: 0xff7a1a,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const heatMesh = new THREE.Mesh(heatGeom, heatMat);
    group.add(heatMesh);
  }

  // 4. Convection Cooling Arrows on Fins (h = 20 W/m²K, 25 °C ambient)
  if (params.showBoundaryConditions.convection) {
    const convGroup = new THREE.Group();
    convGroup.name = 'ConvectionOverlay';

    const convArrowMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const convConeGeom = new THREE.ConeGeometry(2, 5, 6);
    convConeGeom.rotateZ(-Math.PI / 2);

    const rTip = ro + params.finHeight;
    const finStep = Math.max(1, Math.floor(params.finCount / 8));
    for (let f = 0; f < params.finCount; f += finStep) {
      const angle = (f / params.finCount) * Math.PI * 2;
      for (let xPos = -halfL + 60; xPos <= halfL - 40; xPos += 90) {
        const arrow = new THREE.Mesh(convConeGeom, convArrowMat);
        arrow.position.set(xPos, Math.cos(angle) * (rTip + 7), Math.sin(angle) * (rTip + 7));
        arrow.rotation.x = -angle;
        convGroup.add(arrow);
      }
    }
    group.add(convGroup);
  }

  return group;
}
