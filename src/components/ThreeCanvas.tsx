/**
 * AURA - THERMO STRUCTURAL SIMULATOR - 3D WebGL Canvas
 * - Real-time rocket combustion engine (GLSL bore flame, supersonic shock diamonds, sparks, flicker light)
 * - Direction-controlled fire born at closed plate head-cap, ejecting out of open nozzle
 * - Cutaway / X-ray wall opacity (~0.35) during burn
 * - Continuous hand-tracking view control: depth zoom, absolute elevation, rate azimuth
 * - NaN-proof camera self-healing, safe readouts
 * - Permanent chip: "ILLUSTRATIVE VISUAL, ANALYSIS IS STEADY-STATE"
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  SimulationParameters,
  SurrogateKPIs,
  SimulationSubTab,
  StressViewMode,
  ViewLayout,
  TelemetrySpec,
  ProbedPoint,
  ActiveSection,
  FireState,
} from '../types';
import {
  createAnsysColormapTexture,
  contourVertexShader,
  contourFragmentShader,
} from '../shader';
import {
  buildProceduralChamber,
  tryLoadCadStl,
  buildBoundaryConditionOverlays,
} from '../geometry';
import { evaluateFieldAtPoint, getFieldExtremaPositions } from '../fields';
import { createRocketFireSystem, RocketFireSystem } from '../fire';

interface ThreeCanvasProps {
  parameters: SimulationParameters;
  kpis: SurrogateKPIs;
  activeSubTab: SimulationSubTab;
  stressMode: StressViewMode;
  layout: ViewLayout;
  isPlaying: boolean;
  activeSection?: ActiveSection;
  resetCameraSignal?: number;
  fireState?: FireState;
  fireProgress?: number;
  flipFireDirection?: boolean;
  viewControlDelta?: {
    zoomRatio: number;
    elevationDeg: number;
    azimuthSpeed: number;
    dt: number;
  } | null;
  onTelemetryUpdate: (telemetry: TelemetrySpec) => void;
  onCameraUpdate: (az: number | string, el: number | string, zoom: number | string) => void;
  onProbePoint: (point: ProbedPoint | null) => void;
  isProbeActive: boolean;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  parameters,
  kpis,
  activeSubTab,
  stressMode,
  layout,
  isPlaying,
  activeSection = '02_SIMULATION',
  resetCameraSignal = 0,
  fireState = 'READY',
  fireProgress = 0,
  flipFireDirection = false,
  viewControlDelta,
  onTelemetryUpdate,
  onCameraUpdate,
  onProbePoint,
  isProbeActive,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const modelGroupRef = useRef<THREE.Group | null>(null);
  const bcGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const shaderMaterialsRef = useRef<THREE.ShaderMaterial[]>([]);
  const stlMeshRef = useRef<THREE.Mesh | null>(null);
  const stlTelemetryRef = useRef<TelemetrySpec | null>(null);

  // Rocket fire subsystem ref
  const fireSystemRef = useRef<RocketFireSystem | null>(null);

  const animFrameRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animProgressRef = useRef<number>(1.0);

  // Reference fit distance for zoom % calculation
  const fitDistanceRef = useRef<number>(650);

  // Last known valid camera state for self-healing
  const lastValidCamPos = useRef<THREE.Vector3>(new THREE.Vector3(-500, 220, 360));
  const lastValidTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Orbiting state to hide tags during motion
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);

  // Floating Max/Min tag 2D screen positions
  const [extremaTags, setExtremaTags] = useState<{
    max: { text: string; x: number; y: number; visible: boolean };
    min: { text: string; x: number; y: number; visible: boolean };
  } | null>(null);

  // Dimension callouts 2D screen tags
  const [dimensionTags, setDimensionTags] = useState<
    Array<{ label: string; x: number; y: number; visible: boolean }>
  >([]);

  // Auto-fit camera to model bounding sphere with NaN guards
  const fitCameraToModel = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || !modelGroupRef.current || !containerRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const modelGroup = modelGroupRef.current;
    const container = containerRef.current;

    const w = Math.max(10, container.clientWidth || 800);
    const h = Math.max(10, container.clientHeight || 600);
    const aspect = w / h;

    const box = new THREE.Box3().setFromObject(modelGroup);
    if (box.isEmpty()) return;

    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    if (!Number.isFinite(sphere.center.x) || !Number.isFinite(sphere.radius) || sphere.radius <= 0) {
      return;
    }

    controls.target.copy(sphere.center);
    lastValidTarget.current.copy(sphere.center);

    // Default view: Isometric from fixed (left, negative X) end
    const azRad = THREE.MathUtils.degToRad(35);
    const elRad = THREE.MathUtils.degToRad(20);

    const chamberLength = Math.max(300, box.max.x - box.min.x);
    const fovRad = THREE.MathUtils.degToRad(camera.fov);

    const targetVisibleWidth = chamberLength / 0.65;
    const targetVisibleHeight = targetVisibleWidth / aspect;
    const distForHeight = (targetVisibleHeight * 0.5) / Math.tan(fovRad * 0.5);
    const distForSphere = (sphere.radius * 1.25) / Math.tan(fovRad * 0.5);
    const distance = Math.max(distForHeight, distForSphere, 200);

    fitDistanceRef.current = distance;

    const dir = new THREE.Vector3(
      -Math.cos(elRad) * Math.cos(azRad),
      Math.sin(elRad),
      Math.cos(elRad) * Math.sin(azRad)
    ).normalize();

    camera.position.copy(sphere.center).addScaledVector(dir, distance);
    camera.near = Math.max(1, distance * 0.05);
    camera.far = distance * 8;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    lastValidCamPos.current.copy(camera.position);
    controls.update();
  }, []);

  // 1. Initial Scene Setup
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = Math.max(10, container.clientWidth || 800);
    const height = Math.max(10, container.clientHeight || 600);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.localClippingEnabled = true;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Studio environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 1, 3500);
    camera.position.set(-500, 220, 360);
    cameraRef.current = camera;

    // Orbit Controls with strict distance bounds
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 120;
    controls.maxDistance = 1800;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    controls.addEventListener('start', () => setIsOrbiting(true));
    controls.addEventListener('end', () => setIsOrbiting(false));

    // Refined Lighting
    const keyLight = new THREE.DirectionalLight(0xdceeff, 2.2);
    keyLight.position.set(-300, 350, 300);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x2f8bff, 2.4);
    rimLight.position.set(340, -120, -280);
    scene.add(rimLight);

    const rimLight2 = new THREE.DirectionalLight(0x4cc2ff, 1.2);
    rimLight2.position.set(-280, -140, 240);
    scene.add(rimLight2);

    const fillLight = new THREE.DirectionalLight(0x0f2445, 0.65);
    fillLight.position.set(200, 140, 160);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x2f8bff, 0x000000, 0.3);
    scene.add(hemiLight);

    // Flow particles
    const particleCount = 160;
    const particleGeom = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const pVelocity = new Float32Array(particleCount * 3);

    const ri = 50;
    const ro = 60;
    for (let i = 0; i < particleCount; i++) {
      const u = Math.random() * 400 - 200;
      const angle = Math.random() * Math.PI * 2;
      const r = ri + Math.random() * (ro + 18 - ri);
      pPositions[i * 3] = u;
      pPositions[i * 3 + 1] = Math.cos(angle) * r;
      pPositions[i * 3 + 2] = Math.sin(angle) * r;

      const norm = (r - ri) / 28;
      pColors[i * 3] = 0.9 - norm * 0.7;
      pColors[i * 3 + 1] = 0.4 + norm * 0.5;
      pColors[i * 3 + 2] = norm;

      pVelocity[i * 3] = (Math.random() - 0.5) * 4;
      pVelocity[i * 3 + 1] = Math.cos(angle) * (10 + Math.random() * 15);
      pVelocity[i * 3 + 2] = Math.sin(angle) * (10 + Math.random() * 15);
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    particleGeom.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeom, pMat);
    particles.visible = false;
    scene.add(particles);
    particlesRef.current = particles;

    // Root model group
    const modelGroup = new THREE.Group();
    modelGroup.name = 'ChamberRootGroup';
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Rocket Fire Subsystem
    const fireSystem = createRocketFireSystem();
    scene.add(fireSystem.group);
    fireSystemRef.current = fireSystem;

    // Check for STL file
    const probeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    tryLoadCadStl(probeMat).then((res) => {
      if (res) {
        stlMeshRef.current = res.mesh;
        stlTelemetryRef.current = res.telemetry;
        onTelemetryUpdate(res.telemetry);
      }
    });

    // ResizeObserver guard: ignore sizes where width < 2 or height < 2
    const resizeObs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (
          w >= 2 &&
          h >= 2 &&
          Number.isFinite(w) &&
          Number.isFinite(h) &&
          camera &&
          renderer
        ) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        }
      }
    });
    resizeObs.observe(container);

    // Animation Loop with NaN-proof self-healing
    const animate = (time: number) => {
      animFrameRef.current = requestAnimationFrame(animate);

      const delta = clockRef.current.getDelta();
      controls.update();

      // Self-heal: ensure camera position and quaternion are finite
      const camPos = camera.position;
      const camQuat = camera.quaternion;
      const isPosFinite =
        Number.isFinite(camPos.x) && Number.isFinite(camPos.y) && Number.isFinite(camPos.z);
      const isQuatFinite =
        Number.isFinite(camQuat.x) &&
        Number.isFinite(camQuat.y) &&
        Number.isFinite(camQuat.z) &&
        Number.isFinite(camQuat.w);

      if (!isPosFinite || !isQuatFinite) {
        console.warn('[ThreeCanvas] Non-finite camera state! Restoring valid camera.');
        camera.position.copy(lastValidCamPos.current);
        controls.target.copy(lastValidTarget.current);
        controls.update();
      } else {
        lastValidCamPos.current.copy(camPos);
        lastValidTarget.current.copy(controls.target);
      }

      // Compute safe camera telemetry readouts (never NaN)
      const target = controls.target;
      const offset = new THREE.Vector3().subVectors(camera.position, target);
      const currentDist = offset.length();

      let azVal: number | string = '--';
      let elVal: number | string = '--';
      let zoomVal: number | string = '--';

      if (Number.isFinite(currentDist) && currentDist > 0.01) {
        const azDeg = Math.round(Math.atan2(offset.x, offset.z) * (180 / Math.PI));
        const elDeg = Math.round(
          Math.atan2(offset.y, Math.hypot(offset.x, offset.z)) * (180 / Math.PI)
        );
        azVal = Number.isFinite(azDeg) ? azDeg : '--';
        elVal = Number.isFinite(elDeg) ? elDeg : '--';

        if (Number.isFinite(fitDistanceRef.current) && fitDistanceRef.current > 0) {
          const zPct = Math.round(Math.max(1, Math.min(300, (fitDistanceRef.current / currentDist) * 100)));
          zoomVal = Number.isFinite(zPct) ? zPct : '--';
        }
      }

      onCameraUpdate(azVal, elVal, zoomVal);

      // Update shader uniforms
      const elapsed = time * 0.001;
      shaderMaterialsRef.current.forEach((mat) => {
        if (mat.uniforms.uTime) mat.uniforms.uTime.value = elapsed;
        if (mat.uniforms.uDeformProgress) {
          mat.uniforms.uDeformProgress.value = 0.5 + 0.5 * Math.sin(elapsed * 2.0);
        }
      });

      // Update Rocket Fire Subsystem
      if (fireSystemRef.current) {
        fireSystemRef.current.update(
          delta,
          elapsed,
          fireState,
          fireProgress,
          parameters,
          kpis,
          flipFireDirection
        );
      }

      // Chamber vibration & wall x-ray opacity during fire
      const isFiring = fireState === 'BURNING' || fireState === 'IGNITION';
      shaderMaterialsRef.current.forEach((mat) => {
        const targetOpacity = isFiring ? 0.35 : 1.0;
        if (mat.opacity !== targetOpacity) {
          mat.transparent = isFiring;
          mat.opacity = targetOpacity;
          mat.needsUpdate = true;
        }
      });

      if (modelGroupRef.current) {
        if (fireState === 'BURNING') {
          const vib = (parameters.internalPressure / 5.0) * 0.35;
          modelGroupRef.current.position.set(
            (Math.random() - 0.5) * vib,
            (Math.random() - 0.5) * vib,
            (Math.random() - 0.5) * vib
          );
        } else {
          modelGroupRef.current.position.set(0, 0, 0);
        }
      }

      // Animate Heat Flux Particles
      if (particlesRef.current && particlesRef.current.visible) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          const idx = i * 3;
          positions[idx + 1] += pVelocity[idx + 1] * delta;
          positions[idx + 2] += pVelocity[idx + 2] * delta;

          const rNow = Math.hypot(positions[idx + 1], positions[idx + 2]);
          if (rNow > ro + 24) {
            const angle = Math.random() * Math.PI * 2;
            positions[idx + 1] = Math.cos(angle) * ri;
            positions[idx + 2] = Math.sin(angle) * ri;
          }
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Render based on Layout
      renderViewports(renderer, scene, camera, layout);

      // Update 2D Screen Extrema & Callout Tags
      updateScreenTags(camera, renderer);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObs.disconnect();
      fireSystemRef.current?.dispose();
      renderer.dispose();
    };
  }, []);

  // 2. Build Chamber Mesh when Parameters Change & initial fit
  const hasFittedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!sceneRef.current || !modelGroupRef.current) return;
    const modelGroup = modelGroupRef.current;

    while (modelGroup.children.length > 0) {
      modelGroup.remove(modelGroup.children[0]);
    }
    shaderMaterialsRef.current = [];

    const colormapTex = createAnsysColormapTexture(parameters.smoothColormap ? false : true);

    const matProp = kpis.stressMax;
    const yieldStrength = 276e6;
    const yieldNorm = yieldStrength / Math.max(1, matProp);

    const isFiring = fireState === 'BURNING' || fireState === 'IGNITION';

    const shaderMat = new THREE.ShaderMaterial({
      vertexShader: contourVertexShader,
      fragmentShader: contourFragmentShader,
      uniforms: {
        uColormap: { value: colormapTex },
        uLength: { value: parameters.length },
        uInnerRadius: { value: parameters.innerDiameter / 2 },
        uOuterRadius: { value: parameters.outerDiameter / 2 },
        uFinHeight: { value: parameters.finHeight },
        uFinCount: { value: parameters.finCount },
        uActiveField: {
          value:
            activeSubTab === 'TEMPERATURE'
              ? 0
              : activeSubTab === 'HEAT_FLUX'
              ? 1
              : activeSubTab === 'DEFORMATION'
              ? 2
              : activeSubTab === 'STRESS'
              ? 3
              : 4,
        },
        uStressMode: {
          value:
            stressMode === 'FULL_RANGE'
              ? 0
              : stressMode === 'CLIPPED_AT_YIELD'
              ? 1
              : stressMode === 'YIELD_ZONE_MAP'
              ? 2
              : 3,
        },
        uYieldThresholdNorm: { value: yieldNorm },
        uTime: { value: 0 },
        uAnimProgress: { value: animProgressRef.current },
        uDeformExaggeration: { value: parameters.deformationExaggeration },
        uDeformProgress: { value: 0.0 },
        uBandedColormap: { value: !parameters.smoothColormap },
        uWireframeOverlay: { value: parameters.wireframeOverlay },
        uEnableClip: { value: parameters.enableSectionCut },
        uClipPlane: {
          value: new THREE.Vector4(
            0,
            1,
            0,
            parameters.crossSectionCut * (parameters.outerDiameter / 2 + parameters.finHeight)
          ),
        },
      },
      side: THREE.DoubleSide,
      wireframe: parameters.wireframeOverlay,
      transparent: isFiring,
      opacity: isFiring ? 0.35 : 1.0,
      clipping: true,
    });

    shaderMaterialsRef.current.push(shaderMat);

    const isBaseline =
      parameters.finCount === 15 &&
      parameters.finHeight === 20 &&
      parameters.finThickness === 3 &&
      parameters.length === 450 &&
      parameters.wallThickness === 10;

    if (stlMeshRef.current && isBaseline && stlTelemetryRef.current) {
      stlMeshRef.current.material = shaderMat;
      modelGroup.add(stlMeshRef.current);
      onTelemetryUpdate(stlTelemetryRef.current);
    } else {
      const { group: procGroup, telemetry } = buildProceduralChamber(parameters, shaderMat);
      modelGroup.add(procGroup);
      onTelemetryUpdate(telemetry);
    }

    if (bcGroupRef.current) {
      sceneRef.current.remove(bcGroupRef.current);
    }
    const bcGroup = buildBoundaryConditionOverlays(parameters);
    sceneRef.current.add(bcGroup);
    bcGroupRef.current = bcGroup;

    if (particlesRef.current) {
      particlesRef.current.visible = activeSubTab === 'HEAT_FLUX';
    }

    if (!hasFittedRef.current) {
      hasFittedRef.current = true;
      requestAnimationFrame(() => fitCameraToModel());
    }
  }, [
    parameters,
    activeSubTab,
    stressMode,
    parameters.wireframeOverlay,
    parameters.enableSectionCut,
    parameters.crossSectionCut,
    parameters.explodedFinDistance,
    parameters.showFlange,
    fitCameraToModel,
  ]);

  // Trigger camera refit when resetCameraSignal changes
  useEffect(() => {
    if (resetCameraSignal > 0) {
      fitCameraToModel();
    }
  }, [resetCameraSignal, fitCameraToModel]);

  // Continuous View Control from Hand Tracking (Open Hand)
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current || !viewControlDelta) return;
    const { zoomRatio, elevationDeg, azimuthSpeed, dt } = viewControlDelta;

    if (
      !Number.isFinite(zoomRatio) ||
      !Number.isFinite(elevationDeg) ||
      !Number.isFinite(azimuthSpeed) ||
      !Number.isFinite(dt)
    ) {
      return;
    }

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const target = controls.target;

    const offset = new THREE.Vector3().subVectors(camera.position, target);
    let radius = offset.length();

    // 1. Zoom control: radius = fitDistance * zoomRatio
    if (fitDistanceRef.current > 0 && zoomRatio > 0.05) {
      radius = Math.max(120, Math.min(1800, fitDistanceRef.current * zoomRatio));
    }

    // 2. Azimuth rate control (azimuth -= azimuthSpeed * dt)
    // Moving hand to right (positive speed) rotates model to right
    let azRad = Math.atan2(offset.x, offset.z);
    azRad -= THREE.MathUtils.degToRad(azimuthSpeed) * dt;

    // 3. Elevation absolute control: clamp -70° to +70°
    const elRad = THREE.MathUtils.degToRad(Math.max(-70, Math.min(70, elevationDeg)));

    // Recompute camera position
    const newX = target.x + radius * Math.cos(elRad) * Math.sin(azRad);
    const newY = target.y + radius * Math.sin(elRad);
    const newZ = target.z + radius * Math.cos(elRad) * Math.cos(azRad);

    if (Number.isFinite(newX) && Number.isFinite(newY) && Number.isFinite(newZ)) {
      camera.position.set(newX, newY, newZ);
      camera.lookAt(target);
      controls.update();
      lastValidCamPos.current.copy(camera.position);
    }
  }, [viewControlDelta]);

  // 4. Update 2D Screen Extrema & Dimension Callouts
  const updateScreenTags = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 2 || height < 2) return;

    const toScreen = (pos: [number, number, number]) => {
      const vec = new THREE.Vector3(...pos);
      vec.project(camera);
      return {
        x: (vec.x * 0.5 + 0.5) * width,
        y: (-(vec.y * 0.5) + 0.5) * height,
        visible: vec.z < 1.0 && Number.isFinite(vec.x) && Number.isFinite(vec.y),
      };
    };

    // Extrema tags
    const extrema = getFieldExtremaPositions(activeSubTab, parameters);
    const maxScreen = toScreen(extrema.maxPos);
    const minScreen = toScreen(extrema.minPos);

    setExtremaTags({
      max: { text: extrema.maxValFormatted, ...maxScreen },
      min: { text: extrema.minValFormatted, ...minScreen },
    });

    // Dimension callouts
    if (parameters.showDimensionCallouts) {
      const halfL = parameters.length / 2;
      const ro = parameters.outerDiameter / 2;
      const rTip = ro + parameters.finHeight;

      const dTags = [
        {
          label: `L: ${parameters.length} mm`,
          ...toScreen([0, -rTip - 12, 0]),
        },
        {
          label: `OD: ${parameters.outerDiameter} mm`,
          ...toScreen([-halfL - 8, ro + 10, 0]),
        },
        {
          label: `${parameters.finCount} FINS (H: ${parameters.finHeight}mm)`,
          ...toScreen([halfL * 0.4, rTip + 6, 0]),
        },
      ];
      if (parameters.showFlange) {
        dTags.push({
          label: `FLANGE Ø: 170 mm`,
          ...toScreen([halfL + 12, 85 + 8, 0]),
        });
      }
      setDimensionTags(dTags);
    } else {
      setDimensionTags([]);
    }
  };

  // 5. Render Viewports function
  const renderViewports = (
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    viewLayout: ViewLayout
  ) => {
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    if (w < 2 || h < 2) return;

    renderer.setScissorTest(true);

    if (viewLayout === '1-VIEW') {
      renderer.setViewport(0, 0, w, h);
      renderer.setScissor(0, 0, w, h);
      renderer.render(scene, camera);
    } else if (viewLayout === '2-VIEW') {
      const halfW = Math.floor(w / 2);

      renderer.setViewport(0, 0, halfW, h);
      renderer.setScissor(0, 0, halfW, h);
      camera.aspect = halfW / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);

      renderer.setViewport(halfW, 0, halfW, h);
      renderer.setScissor(halfW, 0, halfW, h);
      shaderMaterialsRef.current.forEach((mat) => {
        mat.uniforms.uActiveField.value = activeSubTab === 'TEMPERATURE' ? 3 : 0;
      });
      renderer.render(scene, camera);

      shaderMaterialsRef.current.forEach((mat) => {
        mat.uniforms.uActiveField.value =
          activeSubTab === 'TEMPERATURE'
            ? 0
            : activeSubTab === 'HEAT_FLUX'
            ? 1
            : activeSubTab === 'DEFORMATION'
            ? 2
            : activeSubTab === 'STRESS'
            ? 3
            : 4;
      });
    } else if (viewLayout === '4-VIEW') {
      const halfW = Math.floor(w / 2);
      const halfH = Math.floor(h / 2);
      camera.aspect = halfW / halfH;
      camera.updateProjectionMatrix();

      renderer.setViewport(0, halfH, halfW, halfH);
      renderer.setScissor(0, halfH, halfW, halfH);
      shaderMaterialsRef.current.forEach((mat) => (mat.uniforms.uActiveField.value = 0));
      renderer.render(scene, camera);

      renderer.setViewport(halfW, halfH, halfW, halfH);
      renderer.setScissor(halfW, halfH, halfW, halfH);
      shaderMaterialsRef.current.forEach((mat) => (mat.uniforms.uActiveField.value = 1));
      renderer.render(scene, camera);

      renderer.setViewport(0, 0, halfW, halfH);
      renderer.setScissor(0, 0, halfW, halfH);
      shaderMaterialsRef.current.forEach((mat) => (mat.uniforms.uActiveField.value = 2));
      renderer.render(scene, camera);

      renderer.setViewport(halfW, 0, halfW, halfH);
      renderer.setScissor(halfW, 0, halfW, halfH);
      shaderMaterialsRef.current.forEach((mat) => (mat.uniforms.uActiveField.value = 3));
      renderer.render(scene, camera);

      shaderMaterialsRef.current.forEach((mat) => {
        mat.uniforms.uActiveField.value =
          activeSubTab === 'TEMPERATURE'
            ? 0
            : activeSubTab === 'HEAT_FLUX'
            ? 1
            : activeSubTab === 'DEFORMATION'
            ? 2
            : activeSubTab === 'STRESS'
            ? 3
            : 4;
      });
    }

    renderer.setScissorTest(false);
  };

  // 6. Click-to-Probe Handler
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isProbeActive || !cameraRef.current || !modelGroupRef.current || !containerRef.current)
      return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(modelGroupRef.current.children, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const point = hit.point;

      const localPos = modelGroupRef.current.worldToLocal(point.clone());
      const r = Math.hypot(localPos.y, localPos.z);

      const fieldEval = evaluateFieldAtPoint(
        localPos.x,
        localPos.y,
        localPos.z,
        activeSubTab,
        parameters,
        kpis,
        stressMode
      );

      onProbePoint({
        x: Math.round(localPos.x * 10) / 10,
        y: Math.round(localPos.y * 10) / 10,
        z: Math.round(localPos.z * 10) / 10,
        radius: Math.round(r * 10) / 10,
        fieldValue: Math.round(fieldEval.value * 100) / 100,
        fieldName: fieldEval.label,
        unit: fieldEval.unit,
        screenPos: { x: event.clientX, y: event.clientY },
      });
    } else {
      onProbePoint(null);
    }
  };

  const isFiring = fireState === 'BURNING' || fireState === 'IGNITION';
  const heatQ = (parameters.convectionCoeff * kpis.finArea * (parameters.innerWallTemp - parameters.ambientTemp)) / 1000;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className={`relative w-full h-full select-none ${
        isProbeActive ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Permanent Chip */}
      <div className="absolute top-2.5 left-3 pointer-events-none px-2 py-0.5 rounded bg-black/80 border border-[#12356b] text-[9px] font-mono text-[#6f8fb5] tracking-wider uppercase z-10 shadow-md">
        ILLUSTRATIVE VISUAL, ANALYSIS IS STEADY-STATE
      </div>

      {/* Live Combustion HUD (During Fire) */}
      {isFiring && (
        <div className="absolute top-2.5 right-3 pointer-events-none flex items-center gap-2 p-1.5 rounded-lg bg-[#05080f]/90 border border-amber-500/50 text-[10px] font-mono text-amber-200 z-10 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>COMBUSTION ACTIVE</span>
          <span className="text-white/40">|</span>
          <span>P: <strong>{parameters.internalPressure.toFixed(1)} MPa</strong></span>
          <span className="text-white/40">|</span>
          <span>Ts: <strong>{parameters.innerWallTemp} °C</strong></span>
          <span className="text-white/40">|</span>
          <span>Q: <strong>{heatQ.toFixed(1)} kW</strong></span>
        </div>
      )}

      {/* Extrema Tags (Max/Min) */}
      {!isOrbiting && extremaTags && extremaTags.max.visible && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full transition-opacity duration-150"
          style={{ left: extremaTags.max.x, top: extremaTags.max.y }}
        >
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#05080f]/95 border border-red-500/80 text-[10px] text-red-200 font-semibold shadow-[0_0_8px_rgba(239,68,68,0.35)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            <span>MAX: {extremaTags.max.text}</span>
          </div>
          <div className="w-[1px] h-3 bg-red-500/70 mx-auto"></div>
        </div>
      )}

      {!isOrbiting && extremaTags && extremaTags.min.visible && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full transition-opacity duration-150"
          style={{ left: extremaTags.min.x, top: extremaTags.min.y }}
        >
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#05080f]/95 border border-[#12356b] text-[10px] text-[#4cc2ff] font-semibold shadow-[0_0_8px_rgba(18,53,107,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2f8bff]"></span>
            <span>MIN: {extremaTags.min.text}</span>
          </div>
          <div className="w-[1px] h-3 bg-[#2f8bff]/70 mx-auto"></div>
        </div>
      )}

      {/* 3D Dimension Callouts Overlay */}
      {parameters.showDimensionCallouts &&
        dimensionTags.map(
          (tag, idx) =>
            tag.visible && (
              <div
                key={idx}
                className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#05080f]/90 border border-[#12356b] text-[10px] text-[#4cc2ff] font-data tracking-wider"
                style={{ left: tag.x, top: tag.y }}
              >
                {tag.label}
              </div>
            )
        )}
    </div>
  );
};
