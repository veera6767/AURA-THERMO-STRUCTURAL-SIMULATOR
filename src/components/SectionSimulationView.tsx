/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Section 02 // SIMULATION View
 * Bottom-centre: horizontal ANSYS colour legend + play/scrub controls
 * Right flank: collapsible stress/info card
 */

import React, { useState } from 'react';
import {
  Play, Pause, RotateCcw, AlertTriangle, Flame, HelpCircle,
  ShieldAlert, ChevronDown, ChevronUp, CheckCircle,
} from 'lucide-react';
import {
  SimulationSubTab, StressViewMode, SimulationParameters, SurrogateKPIs,
} from '../types';
import { MATERIALS, solveMaxInnerWallTempForFoS1 } from '../surrogate';

interface SectionSimulationViewProps {
  activeSubTab: SimulationSubTab;
  stressMode: StressViewMode;
  onStressModeChange: (mode: StressViewMode) => void;
  parameters: SimulationParameters;
  kpis: SurrogateKPIs;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onScrubAnimation: (progress: number) => void;
  animationProgress: number;
  onChange: (updated: Partial<SimulationParameters>) => void;
}

/* 9-band ANSYS legend values */
function getLegendValues(activeSubTab: SimulationSubTab, kpis: SurrogateKPIs, stressMode: StressViewMode, mat: any) {
  switch (activeSubTab) {
    case 'TEMPERATURE': {
      const step = (kpis.tempMax - kpis.tempMin) / 8;
      return { values: Array.from({ length: 9 }, (_, i) => (kpis.tempMin + i * step).toFixed(1) + ' °C'), unit: '°C', label: 'TEMPERATURE' };
    }
    case 'HEAT_FLUX': {
      const step = (kpis.heatFluxMax - kpis.heatFluxMin) / 8;
      return { values: Array.from({ length: 9 }, (_, i) => (kpis.heatFluxMin + i * step).toExponential(2)), unit: 'W/m²', label: 'HEAT FLUX' };
    }
    case 'DEFORMATION': {
      const step = kpis.deformationMax / 8;
      return { values: Array.from({ length: 9 }, (_, i) => (i * step).toFixed(2) + ' mm'), unit: 'mm', label: 'TOTAL DEFORMATION' };
    }
    case 'STRESS': {
      if (stressMode === 'CLIPPED_AT_YIELD') {
        const maxS = mat.yieldStrength / 1e6;
        const step = maxS / 8;
        return { values: Array.from({ length: 9 }, (_, i) => (i * step).toFixed(0) + ' MPa'), unit: 'MPa', label: 'STRESS (CLIPPED AT σy)' };
      } else if (stressMode === 'AWAY_FROM_CONSTRAINT') {
        const maxS = kpis.stressAwayConstraint / 1e6;
        const step = maxS / 8;
        return { values: Array.from({ length: 9 }, (_, i) => (i * step).toFixed(1) + ' MPa'), unit: 'MPa', label: 'STRESS (BULK ZONE)' };
      }
      const minS = kpis.stressMin / 1e6;
      const maxS = kpis.stressMax / 1e6;
      const step = (maxS - minS) / 8;
      return { values: Array.from({ length: 9 }, (_, i) => (minS + i * step).toFixed(0) + ' MPa'), unit: 'MPa', label: 'VON-MISES STRESS' };
    }
    case 'STRAIN': {
      const step = kpis.strainMax / 8;
      return { values: Array.from({ length: 9 }, (_, i) => (i * step).toFixed(4)), unit: 'm/m', label: 'ELASTIC STRAIN' };
    }
  }
}

/* 9-band ANSYS rainbow gradient */
const ANSYS_GRADIENT = 'linear-gradient(to right, #0000ff 0%, #00ffff 25%, #00ff00 50%, #ffff00 75%, #ff0000 100%)';

export const SectionSimulationView: React.FC<SectionSimulationViewProps> = ({
  activeSubTab, stressMode, onStressModeChange, parameters, kpis,
  isPlaying, onTogglePlay, onScrubAnimation, animationProgress, onChange,
}) => {
  const [isAdvisorExpanded, setIsAdvisorExpanded] = useState(true);
  const [isRightCardCollapsed, setIsRightCardCollapsed] = useState(false);
  const mat = MATERIALS[parameters.materialKey] || MATERIALS.AL_6061_T6;
  const legend = getLegendValues(activeSubTab, kpis, stressMode, mat);
  const maxSafeInnerTemp = solveMaxInnerWallTempForFoS1(parameters);
  const reqYieldStrengthFor1_5 = (kpis.stressMax * 1.5) / 1e6;

  if (!legend) return null;

  return (
    <>
      {/* ── BOTTOM CENTRE: Colour Legend + Play Controls ── */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
        {/* Legend strip */}
        <div
          className="pointer-events-auto flex flex-col gap-1 px-4 py-2.5 rounded-xl"
          style={{ background: 'rgba(5,8,15,0.82)', backdropFilter: 'blur(14px)', border: '1px solid #0b3d91', boxShadow: '0 0 20px rgba(11,61,145,0.25)' }}
        >
          {/* Title + toggle */}
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-[#6f8fb5] font-data tracking-widest uppercase">// ANSYS COLORMAP</span>
              <span className="text-[9px] text-[#4cc2ff] font-bold font-data">{legend.label}</span>
            </div>
            <button
              onClick={() => onChange({ smoothColormap: !parameters.smoothColormap })}
              className="text-[8px] text-[#4cc2ff] px-1.5 py-0.5 bg-[#0b3d91]/30 rounded border border-[#0b3d91] hover:bg-[#0b3d91]/60 transition-colors"
            >
              {parameters.smoothColormap ? 'SMOOTH' : '9-BAND'}
            </button>
          </div>

          {/* Horizontal colour bar */}
          <div className="w-[420px] max-w-[calc(100vw-160px)] h-4 rounded-sm border border-black/50" style={{ background: ANSYS_GRADIENT }} />

          {/* Min / Max ticks */}
          <div className="flex justify-between text-[9px] w-[420px] max-w-[calc(100vw-160px)]">
            <span className="text-blue-400 font-bold font-data">MIN: {legend.values[0]}</span>
            <span className="text-[#6f8fb5] font-data">{legend.values[4]}</span>
            <span className="text-red-400 font-bold font-data">MAX: {legend.values[8]}</span>
          </div>

          {/* Yield exceeded warning */}
          {kpis.yieldExceeded && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-950/40 border border-red-500/40 text-[9px] text-red-300">
              <AlertTriangle size={10} className="text-red-400" />
              <span>YIELD EXCEEDED — peak {(kpis.stressMax / 1e9).toFixed(2)} GPa &gt; σy {(mat.yieldStrength / 1e6).toFixed(0)} MPa</span>
            </div>
          )}
        </div>

        {/* Playback row */}
        <div
          className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(5,8,15,0.82)', backdropFilter: 'blur(14px)', border: '1px solid #0b3d91' }}
        >
          <button
            onClick={onTogglePlay}
            className={`p-1.5 rounded-lg border transition-all ${
              isPlaying
                ? 'bg-[#2f8bff] text-black border-[#4cc2ff] shadow-[0_0_10px_rgba(47,139,255,0.6)]'
                : 'bg-[#0b3d91]/30 text-[#4cc2ff] border-[#0b3d91] hover:border-[#2f8bff]'
            }`}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>

          <span className="text-[9px] text-[#6f8fb5] font-data">TIMELINE</span>
          <input
            type="range" min={0} max={1} step={0.01}
            value={animationProgress}
            onChange={(e) => onScrubAnimation(parseFloat(e.target.value))}
            className="slider-blue w-32 sm:w-40"
          />
          <span className="text-[9px] text-[#4cc2ff] font-data font-bold w-8">
            {Math.round(animationProgress * 100)}%
          </span>

          <span className="px-1.5 py-0.5 rounded bg-[#0b3d91]/20 text-[8px] text-[#6f8fb5] border border-[#0b3d91]/40 font-data hidden sm:inline">
            {activeSubTab === 'TEMPERATURE' ? 'HEAT-UP' : activeSubTab === 'HEAT_FLUX' ? 'FLUX VECTORS' : activeSubTab === 'DEFORMATION' ? `${parameters.deformationExaggeration}x MORPH` : 'STRESS PULSE'}
          </span>
        </div>
      </div>

      {/* ── RIGHT FLANK: STRESS CARD or INFO CARD ── */}
      <div className="fixed top-[80px] right-3 z-20 w-[300px] max-w-[calc(100vw-3.5rem)] max-h-[calc(100vh-100px)] overflow-y-auto hud-panel corner-brackets text-xs font-data text-[#d6ebff]">
        {/* Card Header */}
        <div
          className="flex items-center justify-between px-3 py-2.5 border-b border-[#0b3d91]/60 cursor-pointer"
          onClick={() => setIsRightCardCollapsed(!isRightCardCollapsed)}
        >
          <div>
            <div className="text-[8px] text-[#6f8fb5] tracking-widest uppercase">// ANALYSIS PANEL</div>
            <div className="text-[10px] font-bold text-[#4cc2ff] tracking-wider">
              {activeSubTab === 'STRESS' ? 'STRESS EXPLORER & ADVISOR' : `RESULT SPEC // ${activeSubTab}`}
            </div>
          </div>
          <button className="p-1 rounded text-[#6f8fb5] hover:text-[#d6ebff] transition-colors">
            {isRightCardCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>

        {!isRightCardCollapsed && (
          <div className="px-3 py-2.5 space-y-3">

            {/* ── STRESS SECTION ── */}
            {activeSubTab === 'STRESS' && (
              <>
                {/* Stress Mode Selector */}
                <div className="space-y-1.5">
                  <div className="text-[8px] text-[#6f8fb5] tracking-widest uppercase">// STRESS EXPLORATION MODES</div>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    {([
                      { key: 'FULL_RANGE', label: 'FULL RANGE', color: 'blue' },
                      { key: 'CLIPPED_AT_YIELD', label: 'CLIPPED AT σy', color: 'fuchsia' },
                      { key: 'YIELD_ZONE_MAP', label: `YIELD MAP ${kpis.yieldZonePercent.toFixed(1)}%`, color: 'red' },
                      { key: 'AWAY_FROM_CONSTRAINT', label: 'BULK ZONE', color: 'blue' },
                    ] as const).map(({ key, label, color }) => (
                      <button
                        key={key}
                        onClick={() => onStressModeChange(key)}
                        className={`p-1.5 rounded-lg border text-left transition-all font-bold ${
                          stressMode === key
                            ? color === 'fuchsia'
                              ? 'bg-fuchsia-600/80 text-white border-fuchsia-400'
                              : color === 'red'
                              ? 'bg-red-600/80 text-white border-red-400'
                              : 'bg-[#2f8bff] text-black border-[#4cc2ff]'
                            : 'bg-black/30 text-[#6f8fb5] border-[#0b3d91] hover:text-[#d6ebff]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Peak stress warning */}
                <div className="p-2.5 rounded-lg bg-red-950/25 border border-red-500/30 text-[9px] space-y-1">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold">
                    <AlertTriangle size={11} />
                    <span>PEAK-STRESS CONTEXT (3.93 GPa)</span>
                  </div>
                  <p className="text-[#6f8fb5] leading-relaxed">
                    Hot spot at rigid fixed support and sharp fin-root corners — a stress singularity artifact. Read as hot-spot indicator; confirm with mesh-convergence study.
                  </p>
                </div>

                {/* Homologous Temp */}
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Flame size={11} /> HOMOLOGOUS TEMP (Th)
                    </span>
                    <span className="text-amber-300 font-bold text-sm font-display">{kpis.homologousT.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden border border-amber-500/25">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, kpis.homologousT * 100)}%`, background: 'linear-gradient(to right, #10b981, #f59e0b, #ef4444)' }}
                    />
                  </div>
                  <p className="text-[8px] text-[#6f8fb5] leading-tight">
                    {(parameters.innerWallTemp + 273.15).toFixed(0)} K / {(mat.meltingPoint + 273.15).toFixed(0)} K = {kpis.homologousT.toFixed(2)}. Above 0.5 Tm strength degrades severely.
                  </p>
                </div>

                {/* Design Advisor */}
                <div className="p-2.5 rounded-lg bg-black/30 border border-[#0b3d91] space-y-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsAdvisorExpanded(!isAdvisorExpanded)}
                  >
                    <div className="flex items-center gap-1.5 text-[#4cc2ff] font-bold text-[9px]">
                      <ShieldAlert size={11} /> DESIGN-FIX ADVISOR
                    </div>
                    {isAdvisorExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </div>

                  {isAdvisorExpanded && (
                    <div className="space-y-2 border-t border-[#0b3d91]/40 pt-2 text-[9px]">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="p-1.5 rounded-lg bg-black/40 border border-[#0b3d91]">
                          <div className="text-[8px] text-[#6f8fb5] mb-0.5">PEAK FoS</div>
                          <div className={`text-sm font-bold font-display ${kpis.factorOfSafety >= 1 ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                            {kpis.factorOfSafety.toFixed(3)}
                          </div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-black/40 border border-[#0b3d91]">
                          <div className="text-[8px] text-[#6f8fb5] mb-0.5">BULK FoS (HOOP)</div>
                          <div className="text-sm font-bold font-display text-[#4cc2ff]">{kpis.factorOfSafetyBulk.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="space-y-0.5 text-[#6f8fb5]">
                        <div>Req yield (FoS 1.5): <span className="text-[#4cc2ff] font-bold">{reqYieldStrengthFor1_5.toFixed(0)} MPa</span></div>
                        <div>Max Ts (FoS 1.0): <span className="text-[#4cc2ff] font-bold">{maxSafeInnerTemp} °C</span></div>
                      </div>
                      <div className="pt-1 border-t border-[#0b3d91]/40">
                        <div className="text-[8px] text-[#2f8bff] font-bold mb-1 uppercase">Recommended Actions:</div>
                        <ul className="space-y-0.5 text-[#6f8fb5] list-disc list-inside">
                          <li>Add root fillets R ≥ 2.5 mm at fin roots</li>
                          <li>Replace rigid mount with sliding thermal mount</li>
                          <li>Consider Ti-6Al-4V or Inconel 718</li>
                          <li>Apply TBC or reduce wall temperature</li>
                          <li>Use bilinear kinematic hardening FEA model</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── OTHER SUB-TAB INFO ── */}
            {activeSubTab !== 'STRESS' && (
              <div className="text-[9px] text-[#6f8fb5] space-y-2">
                {activeSubTab === 'TEMPERATURE' && (
                  <>
                    <p><span className="text-[#4cc2ff] font-bold">What it shows:</span> Steady-state radial and axial temperature distribution throughout the 10 mm wall and 15 longitudinal fins.</p>
                    <p><span className="text-[#4cc2ff] font-bold">Governing Equation:</span> <code className="text-amber-300">Q = h·A·(Ts−T∞)</code> and <code className="text-amber-300">q = −k·∇T</code></p>
                    <p><span className="text-[#4cc2ff] font-bold">Key Observation:</span> High k (167 W/mK) gives only ~{kpis.wallTempDrop.toFixed(1)} °C wall drop bore→outer.</p>
                  </>
                )}
                {activeSubTab === 'HEAT_FLUX' && (
                  <>
                    <p><span className="text-[#4cc2ff] font-bold">What it shows:</span> Directional heat energy flow per unit area leaving the chamber exterior.</p>
                    <p><span className="text-[#4cc2ff] font-bold">Governing Equation:</span> <code className="text-amber-300">q″ = −k(∂T/∂n)</code></p>
                    <p><span className="text-[#4cc2ff] font-bold">Key Observation:</span> Peak {(kpis.heatFluxMax / 1e5).toFixed(2)}×10⁵ W/m² at outer fin tip near free end.</p>
                  </>
                )}
                {activeSubTab === 'DEFORMATION' && (
                  <>
                    <p><span className="text-[#4cc2ff] font-bold">What it shows:</span> Combined thermal expansion and pressure-induced mechanical strain.</p>
                    <p><span className="text-[#4cc2ff] font-bold">Governing Equation:</span> <code className="text-amber-300">ΔL = α·L·ΔT + (Pr/t)·(L/E)</code></p>
                    <p><span className="text-[#4cc2ff] font-bold">Key Observation:</span> Rigid constraint anchors left face; free end grows {kpis.deformationMax.toFixed(2)} mm.</p>
                  </>
                )}
                {activeSubTab === 'STRAIN' && (
                  <>
                    <p><span className="text-[#4cc2ff] font-bold">What it shows:</span> Equivalent elastic strain from thermal stress field.</p>
                    <p><span className="text-[#4cc2ff] font-bold">Governing Equation:</span> <code className="text-amber-300">ε_eq = σ_vm / E</code></p>
                    <p><span className="text-[#4cc2ff] font-bold">Key Observation:</span> Peak {kpis.strainMax.toFixed(4)} m/m at fixed support; bulk ≈0.0003 m/m.</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
