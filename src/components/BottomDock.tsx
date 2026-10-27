/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Bottom Dock (84px)
 * Located inside the centre column only.
 * Left: ANSYS Colour Legend (MIN / MID / MAX + units, Yield badge ONLY on Stress).
 * Right: Play/Scrub simulation timeline.
 */

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import {
  SimulationSubTab,
  StressViewMode,
  SimulationParameters,
  SurrogateKPIs,
} from '../types';
import { MATERIALS } from '../surrogate';

interface BottomDockProps {
  activeSubTab: SimulationSubTab;
  stressMode: StressViewMode;
  onStressModeChange: (mode: StressViewMode) => void;
  parameters: SimulationParameters;
  kpis: SurrogateKPIs;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onScrubAnimation: (progress: number) => void;
  animationProgress: number;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  activeSubTab,
  stressMode,
  onStressModeChange,
  parameters,
  kpis,
  isPlaying,
  onTogglePlay,
  onScrubAnimation,
  animationProgress,
}) => {
  const mat = MATERIALS[parameters.materialKey] || MATERIALS.AL_6061_T6;

  // Compute legend values based on activeSubTab
  const getLegendData = () => {
    switch (activeSubTab) {
      case 'TEMPERATURE': {
        return {
          min: `${kpis.tempMin.toFixed(1)} °C`,
          mid: `${((kpis.tempMin + kpis.tempMax) / 2).toFixed(1)} °C`,
          max: `${kpis.tempMax.toFixed(1)} °C`,
          label: 'TEMPERATURE',
          unit: '°C',
        };
      }
      case 'HEAT_FLUX': {
        return {
          min: `${kpis.heatFluxMin.toExponential(2)}`,
          mid: `${((kpis.heatFluxMin + kpis.heatFluxMax) / 2).toExponential(2)}`,
          max: `${kpis.heatFluxMax.toExponential(2)}`,
          label: 'TOTAL HEAT FLUX',
          unit: 'W/m²',
        };
      }
      case 'DEFORMATION': {
        return {
          min: '0.00 mm',
          mid: `${(kpis.deformationMax / 2).toFixed(2)} mm`,
          max: `${kpis.deformationMax.toFixed(2)} mm`,
          label: 'TOTAL DEFORMATION',
          unit: 'mm',
        };
      }
      case 'STRESS': {
        if (stressMode === 'CLIPPED_AT_YIELD') {
          const maxS = mat.yieldStrength / 1e6;
          return {
            min: '0 MPa',
            mid: `${(maxS / 2).toFixed(0)} MPa`,
            max: `${maxS.toFixed(0)} MPa`,
            label: 'STRESS (CLIPPED AT σy)',
            unit: 'MPa',
          };
        } else if (stressMode === 'AWAY_FROM_CONSTRAINT') {
          const maxS = kpis.stressAwayConstraint / 1e6;
          return {
            min: '0.0 MPa',
            mid: `${(maxS / 2).toFixed(1)} MPa`,
            max: `${maxS.toFixed(1)} MPa`,
            label: 'STRESS (BULK ZONE)',
            unit: 'MPa',
          };
        }
        return {
          min: `${(kpis.stressMin / 1e6).toFixed(0)} MPa`,
          mid: `${(((kpis.stressMin + kpis.stressMax) / 2) / 1e6).toFixed(0)} MPa`,
          max: `${(kpis.stressMax / 1e6).toFixed(0)} MPa`,
          label: 'VON-MISES STRESS',
          unit: 'MPa',
        };
      }
      case 'STRAIN': {
        return {
          min: `${kpis.strainMin.toExponential(2)}`,
          mid: `${((kpis.strainMin + kpis.strainMax) / 2).toExponential(2)}`,
          max: `${kpis.strainMax.toExponential(2)}`,
          label: 'EQUIVALENT STRAIN',
          unit: 'mm/mm',
        };
      }
    }
  };

  const legend = getLegendData();

  // 9 Classic ANSYS Colormap Stops
  const ansysStops = [
    '#0000ff',
    '#0078ff',
    '#00e6ff',
    '#00ff82',
    '#00ff00',
    '#96ff00',
    '#fff000',
    '#ff7800',
    '#eb0f0f',
  ];

  return (
    <div className="h-[84px] w-full bg-[#05080f] border-t border-[#12356b] px-4 flex items-center justify-between gap-4 select-none z-20 flex-shrink-0 text-xs font-data">
      {/* ── LEFT: ANSYS COLOUR LEGEND ── */}
      <div className="flex flex-col gap-1.5 min-w-[340px] max-w-[500px]">
        {/* Label & Unit & Optional Yield Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#d6ebff] tracking-wider uppercase">
              {legend.label}
            </span>
            <span className="text-[10px] text-[#6f8fb5]">[{legend.unit}]</span>
          </div>

          {/* YIELD EXCEEDED BADGE: ONLY ON STRESS VIEW */}
          {activeSubTab === 'STRESS' && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/60 border border-red-500/50 text-red-300 text-[10px] font-bold shadow-[0_0_8px_rgba(239,68,68,0.25)]">
              <AlertTriangle size={11} className="text-red-400" />
              <span>YIELD EXCEEDED (FoS: {kpis.factorOfSafety})</span>
            </div>
          )}
        </div>

        {/* 9-band or Smooth Colormap Bar */}
        <div className="h-4 w-full rounded border border-[#12356b] overflow-hidden flex">
          {parameters.smoothColormap ? (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(to right, ${ansysStops.join(', ')})`,
              }}
            />
          ) : (
            ansysStops.map((stop, i) => (
              <div
                key={i}
                className="flex-1 h-full"
                style={{ backgroundColor: stop }}
              />
            ))
          )}
        </div>

        {/* Min / Mid / Max Readouts */}
        <div className="flex justify-between text-[11px] text-[#6f8fb5] font-mono">
          <span>MIN: <strong className="text-[#4cc2ff]">{legend.min}</strong></span>
          <span>MID: <strong className="text-[#d6ebff]">{legend.mid}</strong></span>
          <span>MAX: <strong className="text-[#ff7800]">{legend.max}</strong></span>
        </div>
      </div>

      {/* ── MIDDLE OPTIONAL: STRESS VIEW MODE SELECTOR (ONLY FOR STRESS) ── */}
      {activeSubTab === 'STRESS' && (
        <div className="hidden lg:flex flex-col gap-1">
          <span className="text-[9px] text-[#6f8fb5] uppercase tracking-wider">STRESS DISPLAY MODE</span>
          <div className="flex gap-1 p-0.5 bg-black rounded border border-[#12356b]">
            <button
              onClick={() => onStressModeChange('FULL_RANGE')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                stressMode === 'FULL_RANGE'
                  ? 'bg-[#2f8bff] text-black'
                  : 'text-[#6f8fb5] hover:text-[#d6ebff]'
              }`}
            >
              FULL
            </button>
            <button
              onClick={() => onStressModeChange('CLIPPED_AT_YIELD')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                stressMode === 'CLIPPED_AT_YIELD'
                  ? 'bg-[#2f8bff] text-black'
                  : 'text-[#6f8fb5] hover:text-[#d6ebff]'
              }`}
            >
              CLIP σy
            </button>
            <button
              onClick={() => onStressModeChange('YIELD_ZONE_MAP')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                stressMode === 'YIELD_ZONE_MAP'
                  ? 'bg-[#2f8bff] text-black'
                  : 'text-[#6f8fb5] hover:text-[#d6ebff]'
              }`}
            >
              BINARY YIELD
            </button>
            <button
              onClick={() => onStressModeChange('AWAY_FROM_CONSTRAINT')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                stressMode === 'AWAY_FROM_CONSTRAINT'
                  ? 'bg-[#2f8bff] text-black'
                  : 'text-[#6f8fb5] hover:text-[#d6ebff]'
              }`}
            >
              BULK ZONE
            </button>
          </div>
        </div>
      )}

      {/* ── RIGHT: PLAY / SCRUB SIMULATION TIMELINE ── */}
      <div className="flex items-center gap-3 min-w-[280px]">
        {/* Play / Pause Button */}
        <button
          onClick={onTogglePlay}
          className="w-9 h-9 rounded-md bg-[#2f8bff] text-black hover:bg-[#4cc2ff] flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(47,139,255,0.4)]"
          title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        {/* Scrub Slider Container */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-[#6f8fb5]">
            <span>TRANSIENT STAGES</span>
            <span className="font-mono text-[#4cc2ff]">
              {(animationProgress * 100).toFixed(0)}% // {(animationProgress * 5.0).toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={animationProgress}
            onChange={(e) => onScrubAnimation(parseFloat(e.target.value))}
            className="sl"
          />
        </div>

        {/* Reset Scrub */}
        <button
          onClick={() => onScrubAnimation(1.0)}
          className="p-2 rounded-md bg-black border border-[#12356b] hover:border-[#2f8bff] text-[#6f8fb5] hover:text-[#4cc2ff] transition-colors"
          title="Reset to Steady State"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};
