/**
 * AURA - THERMO STRUCTURAL SIMULATOR
 * Companion to VEERA-CADTRACK viewer
 * Thermal and structural analysis for an externally finned rocket motor chamber
 * Calibrated to ANSYS Workbench 2025 R2 baseline with MediaPipe hand tracking:
 * - 3-Gesture Only Engine (Open Hand View, Fist Ignite, Three Fingers Extinguish)
 * - Rocket Combustion Simulation (GLSL bore flame, supersonic shock diamonds, sparks, flicker light)
 * - Direction-controlled fire born at closed plate head-cap, ejecting out of open nozzle
 * - Full CSS Grid Shell, NaN-proof camera self-healing, synchronized preview
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ActiveSection,
  SimulationSubTab,
  StressViewMode,
  ViewLayout,
  SimulationParameters,
  TelemetrySpec,
  GestureState,
  ProbedPoint,
  FireState,
} from './types';
import { BASELINE_PARAMETERS, computeSurrogateKPIs, MATERIALS } from './surrogate';
import { GestureController } from './gestures';
import { ThreeCanvas } from './components/ThreeCanvas';
import { HeaderToolbar } from './components/HeaderToolbar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { BottomDock } from './components/BottomDock';
import { SectionResultsView } from './components/SectionResultsView';
import { ProbeTooltip } from './components/ProbeTooltip';
import { HelpModal } from './components/HelpModal';
import { Sparkles } from 'lucide-react';

export default function App() {
  // Navigation & View States
  const [activeSection, setActiveSection] = useState<ActiveSection>('02_SIMULATION');
  const [activeSubTab, setActiveSubTab] = useState<SimulationSubTab>('TEMPERATURE');
  const [stressMode, setStressMode] = useState<StressViewMode>('FULL_RANGE');
  const [layout, setLayout] = useState<ViewLayout>('1-VIEW');

  // Sidebar visibility states
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightOpen, setIsRightOpen] = useState<boolean>(true);

  // Simulation Parameters
  const [parameters, setParameters] = useState<SimulationParameters>({
    ...BASELINE_PARAMETERS,
    showDimensionCallouts: false,
  });

  // Switch dimension callouts based on active section
  useEffect(() => {
    if (activeSection === '01_MODEL') {
      setParameters((p) => ({ ...p, showDimensionCallouts: true }));
    } else if (activeSection === '02_SIMULATION') {
      setParameters((p) => ({ ...p, showDimensionCallouts: false }));
    }
  }, [activeSection]);

  // Live Surrogate Calculations
  const kpis = useMemo(() => computeSurrogateKPIs(parameters), [parameters]);

  // Telemetry & Hardware State
  const [telemetry, setTelemetry] = useState<TelemetrySpec>({
    modelSource: 'PARAMETRIC',
    fileName: 'PROCEDURAL_PARAMETRIC_ENGINE',
    isStlLoaded: false,
    stlNotFoundNotice: true,
    boundingBox: { length: 480, width: 170, height: 170 },
    vertexCount: 8420,
    triangleCount: 9680,
    fileSizeBytes: 0,
    isManifoldValid: true,
    units: 'mm',
  });

  const [cameraTelemetry, setCameraTelemetry] = useState<{
    az: number | string;
    el: number | string;
    zoom: number | string;
  }>({
    az: 35,
    el: 20,
    zoom: 65,
  });

  // Camera reset trigger
  const [resetCameraSignal, setResetCameraSignal] = useState<number>(1);

  // Gesture Tracker
  const [gestureState, setGestureState] = useState<GestureState>({
    active: false,
    status: 'IDLE',
    gesture: 'NONE',
    fingersExtended: 0,
    fps: 0,
    isCalibrated: false,
    calibrationProgress: 0,
    neutralCenter: null,
    neutralSize: null,
    handOffset: { dx: 0, dy: 0, ds: 1 },
    landmarks: null,
  });
  const [isHandTrackingActive, setIsHandTrackingActive] = useState<boolean>(false);

  // Continuous View Control from Hand Tracking
  const [viewControlDelta, setViewControlDelta] = useState<{
    zoomRatio: number;
    elevationDeg: number;
    azimuthSpeed: number;
    dt: number;
  } | null>(null);

  // Rocket Combustion Fire Simulation State
  const [fireState, setFireState] = useState<FireState>('READY');
  const [fireProgress, setFireProgress] = useState<number>(0);
  const [flipFireDirection, setFlipFireDirection] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tools
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isProbeActive, setIsProbeActive] = useState<boolean>(false);
  const [probedPoint, setProbedPoint] = useState<ProbedPoint | null>(null);

  // Simulation Player
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animationProgress, setAnimationProgress] = useState<number>(1.0);

  // Boot sequence
  const [booting, setBooting] = useState<boolean>(true);
  const [bootProgress, setBootProgress] = useState<number>(0);
  const [bootLog, setBootLog] = useState<string>('INITIALIZING SOLVER MATRIX...');

  // Contour scanline key
  const [scanKey, setScanKey] = useState<number>(0);
  const prevSubTab = useRef<SimulationSubTab>(activeSubTab);

  const gestureControllerRef = useRef<GestureController | null>(null);

  // Fire State Machine Transitions (400ms ignition, 500ms burnout)
  useEffect(() => {
    let animId: number;
    if (fireState === 'IGNITION') {
      const startTime = performance.now();
      const runIgnition = (now: number) => {
        const elapsed = (now - startTime) / 400;
        if (elapsed >= 1.0) {
          setFireProgress(1.0);
          setFireState('BURNING');
        } else {
          setFireProgress(elapsed);
          animId = requestAnimationFrame(runIgnition);
        }
      };
      animId = requestAnimationFrame(runIgnition);
    } else if (fireState === 'BURNOUT') {
      const startTime = performance.now();
      const runBurnout = (now: number) => {
        const elapsed = (now - startTime) / 500;
        if (elapsed >= 1.0) {
          setFireProgress(0);
          setFireState('READY');
        } else {
          setFireProgress(1.0 - elapsed);
          animId = requestAnimationFrame(runBurnout);
        }
      };
      animId = requestAnimationFrame(runBurnout);
    }
    return () => cancelAnimationFrame(animId);
  }, [fireState]);

  // Ignition & Extinguish triggers
  const triggerIgnition = useCallback(() => {
    setFireState((prev) => {
      if (prev === 'READY' || prev === 'BURNOUT') {
        return 'IGNITION';
      }
      return prev;
    });
  }, []);

  const triggerExtinguish = useCallback(() => {
    setFireState((prev) => {
      if (prev === 'BURNING' || prev === 'IGNITION') {
        setToastMessage('FIRE EXTINGUISHED');
        setTimeout(() => setToastMessage(null), 2500);
        return 'BURNOUT';
      }
      return prev;
    });
  }, []);

  const handleToggleFire = useCallback(() => {
    if (fireState === 'BURNING' || fireState === 'IGNITION') {
      triggerExtinguish();
    } else {
      triggerIgnition();
    }
  }, [fireState, triggerExtinguish, triggerIgnition]);

  // 1. Boot Sequence (1.2 s)
  useEffect(() => {
    const steps = [
      { text: 'INITIALIZING SOLVER MATRIX...', delay: 150, progress: 25 },
      { text: 'CALIBRATING ANSYS 2025 R2 SURROGATE...', delay: 450, progress: 60 },
      { text: 'PREPARING SHADER AND VIEWPORT...', delay: 850, progress: 90 },
      { text: 'AURA - THERMO ONLINE', delay: 1100, progress: 100 },
    ];
    steps.forEach((s) => {
      setTimeout(() => {
        setBootLog(s.text);
        setBootProgress(s.progress);
      }, s.delay);
    });
    const timer = setTimeout(() => setBooting(false), 1250);
    return () => clearTimeout(timer);
  }, []);

  // 2. Contour scanline trigger on subtab change
  useEffect(() => {
    if (prevSubTab.current !== activeSubTab) {
      setScanKey((k) => k + 1);
      prevSubTab.current = activeSubTab;
    }
  }, [activeSubTab]);

  // 3. Initialize Gesture Controller
  useEffect(() => {
    const controller = new GestureController((action) => {
      if (action.type === 'VIEW' && action.payload) {
        setViewControlDelta(action.payload);
      } else if (action.type === 'IGNITE') {
        triggerIgnition();
      } else if (action.type === 'EXTINGUISH') {
        triggerExtinguish();
      } else if (action.type === 'FREEZE') {
        setViewControlDelta(null);
      }
    });

    gestureControllerRef.current = controller;

    const interval = setInterval(() => {
      if (controller) {
        setGestureState({ ...controller.state });
      }
    }, 100);

    return () => {
      clearInterval(interval);
      controller.stopCamera();
    };
  }, [triggerIgnition, triggerExtinguish]);

  // Toggle Hand Tracking
  const handleToggleHandTracking = useCallback(async () => {
    const controller = gestureControllerRef.current;
    if (!controller) return;

    if (isHandTrackingActive) {
      controller.stopCamera();
      setIsHandTrackingActive(false);
      setViewControlDelta(null);
    } else {
      const videoEl = document.getElementById('mediapipe-video') as HTMLVideoElement | null;
      const canvasEl = document.getElementById('mediapipe-canvas') as HTMLCanvasElement | null;

      if (!videoEl || !canvasEl) {
        setIsRightOpen(true);
        setTimeout(() => handleToggleHandTracking(), 250);
        return;
      }

      const inited = await controller.initialize(videoEl, canvasEl);
      if (inited) {
        const started = await controller.startCamera();
        setIsHandTrackingActive(started);
      } else {
        setIsHandTrackingActive(false);
      }
    }
  }, [isHandTrackingActive]);

  // Reset Camera View
  const handleResetView = useCallback(() => {
    setResetCameraSignal((s) => s + 1);
  }, []);

  // Reset Layout Defaults
  const handleResetLayout = useCallback(() => {
    setIsLeftCollapsed(false);
    setIsRightOpen(true);
    setLayout('1-VIEW');
    setResetCameraSignal((s) => s + 1);
  }, []);

  // Zoom In / Out
  const handleZoomIn = useCallback(() => {
    setViewControlDelta({ zoomRatio: 0.85, elevationDeg: 20, azimuthSpeed: 0, dt: 0.05 });
    setTimeout(() => setViewControlDelta(null), 100);
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewControlDelta({ zoomRatio: 1.18, elevationDeg: 20, azimuthSpeed: 0, dt: 0.05 });
    setTimeout(() => setViewControlDelta(null), 100);
  }, []);

  // CSV Export
  const handleExportCsv = useCallback(() => {
    const rows = [
      ['Metric', 'Value', 'Unit', 'ANSYS Baseline Reference'],
      ['Inner Bore Temperature (Tb)', parameters.innerWallTemp, '°C', '600.0'],
      ['Outer Wall / Fin Tip Temperature', kpis.tempMin.toFixed(1), '°C', '588.4'],
      ['Radial Temperature Drop (ΔT)', (parameters.innerWallTemp - kpis.tempMin).toFixed(2), '°C', '11.59'],
      ['Peak Heat Flux (q")', kpis.heatFluxMax.toExponential(4), 'W/m²', '1.031e5'],
      ['Peak Total Deformation', kpis.deformationMax.toFixed(3), 'mm', '6.89'],
      ['Peak von Mises Stress (Fixed End)', (kpis.stressMax / 1e6).toFixed(1), 'MPa', '3927'],
      ['Bulk Zone Hoop Stress', (kpis.stressAwayConstraint / 1e6).toFixed(1), 'MPa', '45.1'],
      ['Peak Factor of Safety (FoS)', kpis.factorOfSafety, '', '0.070'],
      ['Bulk Factor of Safety (Hoop)', kpis.factorOfSafetyBulk, '', '6.13'],
      ['Fin Efficiency (ηf)', (kpis.finEfficiency * 100).toFixed(2) + '%', '', '98.8%'],
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'AURA_THERMO_SIMULATION_RESULTS.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [parameters, kpis]);

  // Screenshot
  const handleCaptureScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `AURA_THERMO_VIEWPORT_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const subTabs: { id: SimulationSubTab; label: string }[] = [
    { id: 'TEMPERATURE', label: 'TEMPERATURE' },
    { id: 'HEAT_FLUX', label: 'HEAT FLUX' },
    { id: 'DEFORMATION', label: 'DEFORMATION' },
    { id: 'STRESS', label: 'STRESS' },
    { id: 'STRAIN', label: 'STRAIN' },
  ];

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#000000] select-none text-[#d6ebff] font-data app-shell">
      {/* ── BOOT SCREEN (1.2 s) ── */}
      {booting && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#000000]">
          <div className="w-16 h-16 rounded-xl border border-[#12356b] flex items-center justify-center shadow-[0_0_20px_rgba(47,139,255,0.3)] mb-4 bg-[#05080f]">
            <span className="font-display font-black text-2xl text-[#4cc2ff]">AURA</span>
          </div>
          <div className="font-display font-bold text-base tracking-widest text-[#d6ebff] mb-1">
            AURA - THERMO STRUCTURAL SIMULATOR
          </div>
          <div className="text-[10px] text-[#6f8fb5] tracking-widest flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2f8bff] animate-ping" />
            <span>{bootLog}</span>
          </div>
          <div className="w-56 h-0.5 bg-[#12356b] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2f8bff] rounded-full shadow-[0_0_6px_#4cc2ff] transition-all duration-200"
              style={{ width: `${bootProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION (e.g. "FIRE EXTINGUISHED") ── */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-md bg-[#05080f]/95 border border-emerald-500/80 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 animate-bounce">
          <Sparkles size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── ROW 1: TOP BAR (56px) ── */}
      <HeaderToolbar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        layout={layout}
        onLayoutChange={setLayout}
        isHandTrackingActive={isHandTrackingActive}
        onToggleHandTracking={handleToggleHandTracking}
        isSectionCutActive={parameters.enableSectionCut}
        onToggleSectionCut={() => setParameters((p) => ({ ...p, enableSectionCut: !p.enableSectionCut }))}
        isProbeActive={isProbeActive}
        onToggleProbe={() => {
          setIsProbeActive((p) => !p);
          setProbedPoint(null);
        }}
        isWireframeActive={parameters.wireframeOverlay}
        onToggleWireframe={() => setParameters((p) => ({ ...p, wireframeOverlay: !p.wireframeOverlay }))}
        onResetView={handleResetView}
        onResetLayout={handleResetLayout}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onOpenHelp={() => setIsHelpOpen(true)}
        gestureStatus={gestureState.status}
        fireState={fireState}
        onToggleFire={handleToggleFire}
      />

      {/* ── ROW 2: MIDDLE AREA (Grid: Left Sidebar | Centre Viewport | Right Sidebar) ── */}
      <div
        className="app-middle"
        style={{
          gridTemplateColumns: `${isLeftCollapsed ? '48px' : '320px'} minmax(0, 1fr) ${isRightOpen ? '320px' : '0px'}`,
        }}
      >
        {/* LEFT SIDEBAR: One Accordion (Parameters, Boundary Conditions, Display) */}
        <LeftSidebar
          isCollapsed={isLeftCollapsed}
          onToggleCollapse={() => setIsLeftCollapsed((c) => !c)}
          parameters={parameters}
          onChange={(up) => setParameters((p) => ({ ...p, ...up }))}
          onResetBaseline={() => setParameters(BASELINE_PARAMETERS)}
          onSnapBaseline={() => setParameters(BASELINE_PARAMETERS)}
        />

        {/* CENTRE COLUMN: Sub-tabs segmented control + Viewport / Results + Bottom Dock */}
        <section className="app-centre">
          {/* Sub-tabs Segmented Control */}
          {activeSection !== '03_RESULTS' && (
            <div className="h-10 w-full flex items-center justify-center border-b border-[#12356b] bg-[#05080f]/80 backdrop-blur-sm z-10 flex-shrink-0 px-4">
              <div className="flex gap-1 p-0.5 bg-[#000000] border border-[#12356b] rounded-md">
                {subTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${
                      activeSubTab === tab.id
                        ? 'bg-[#2f8bff] text-black font-bold shadow-[0_0_8px_rgba(47,139,255,0.4)]'
                        : 'text-[#6f8fb5] hover:text-[#d6ebff]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main View Area: 3D Canvas (Section 01 & 02) OR Full Results View (Section 03) */}
          <div className="relative flex-1 min-h-0 w-full overflow-hidden">
            {activeSection === '03_RESULTS' ? (
              <SectionResultsView
                parameters={parameters}
                kpis={kpis}
                onExportCsv={handleExportCsv}
                onCaptureScreenshot={handleCaptureScreenshot}
              />
            ) : (
              <>
                {scanKey > 0 && <div key={scanKey} className="scan-sweep" />}

                {/* 3D WebGL Canvas */}
                <ThreeCanvas
                  parameters={parameters}
                  kpis={kpis}
                  activeSubTab={activeSubTab}
                  stressMode={stressMode}
                  layout={layout}
                  isPlaying={isPlaying}
                  activeSection={activeSection}
                  resetCameraSignal={resetCameraSignal}
                  fireState={fireState}
                  fireProgress={fireProgress}
                  flipFireDirection={flipFireDirection}
                  viewControlDelta={viewControlDelta}
                  onTelemetryUpdate={setTelemetry}
                  onCameraUpdate={(az, el, zoom) => setCameraTelemetry({ az, el, zoom })}
                  onProbePoint={setProbedPoint}
                  isProbeActive={isProbeActive}
                />
              </>
            )}
          </div>

          {/* ── ROW 3: BOTTOM DOCK (84px, inside centre column only) ── */}
          <BottomDock
            activeSubTab={activeSubTab}
            stressMode={stressMode}
            onStressModeChange={setStressMode}
            parameters={parameters}
            kpis={kpis}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onScrubAnimation={setAnimationProgress}
            animationProgress={animationProgress}
          />
        </section>

        {/* RIGHT SIDEBAR: Tabs (INFO, SPEC, GESTURES) */}
        <RightSidebar
          isOpen={isRightOpen}
          onToggleOpen={() => setIsRightOpen((o) => !o)}
          activeSubTab={activeSubTab}
          parameters={parameters}
          kpis={kpis}
          telemetry={telemetry}
          gestureState={gestureState}
          isHandTrackingActive={isHandTrackingActive}
          onToggleHandTracking={handleToggleHandTracking}
          cameraTelemetry={cameraTelemetry}
          gestureController={gestureControllerRef.current}
          fireState={fireState}
          onToggleFire={handleToggleFire}
          flipFireDirection={flipFireDirection}
          onToggleFlipDirection={() => setFlipFireDirection((f) => !f)}
        />
      </div>

      {/* ── PROBE TOOLTIP ── */}
      {probedPoint && (
        <ProbeTooltip point={probedPoint} onClose={() => setProbedPoint(null)} />
      )}

      {/* ── HELP MODAL ── */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </main>
  );
}
