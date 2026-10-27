/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Left Sidebar Accordion
 * 320px width, collapsible to 48px icon rail.
 * 3 accordion sections: Parameters, Boundary Conditions, Display.
 * State persisted to localStorage (wrapped in try/catch).
 */

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Anchor,
  Eye,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Zap,
  Info,
  Maximize2,
} from 'lucide-react';
import { SimulationParameters, SurrogateKPIs } from '../types';
import { MATERIALS, BASELINE_PARAMETERS } from '../surrogate';

interface LeftSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  parameters: SimulationParameters;
  onChange: (updated: Partial<SimulationParameters>) => void;
  onResetBaseline: () => void;
  onSnapBaseline?: () => void;
}

interface AccordionOpenState {
  params: boolean;
  boundary: boolean;
  display: boolean;
}

const STORAGE_KEY = 'aba_left_sidebar_accordion_v1';

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  parameters,
  onChange,
  onResetBaseline,
  onSnapBaseline,
}) => {
  // Accordion open/close state with localStorage persistence
  const [sectionsOpen, setSectionsOpen] = useState<AccordionOpenState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return { params: true, boundary: true, display: false };
  });

  const toggleSection = (key: keyof AccordionOpenState) => {
    setSectionsOpen((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  // If collapsed to 48px icon rail:
  if (isCollapsed) {
    return (
      <aside className="w-[48px] h-full flex flex-col items-center bg-[#05080f] border-r border-[#12356b] select-none z-20 flex-shrink-0 transition-all duration-200">
        <button
          onClick={onToggleCollapse}
          className="w-full h-11 flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#080c17] border-b border-[#12356b] transition-colors"
          title="Expand Sidebar (320px)"
        >
          <ChevronRight size={16} />
        </button>

        <div className="flex-1 flex flex-col items-center gap-2 py-3">
          <button
            onClick={() => {
              onToggleCollapse();
              setSectionsOpen((p) => ({ ...p, params: true }));
            }}
            className="w-9 h-9 rounded-md flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#2f8bff]/10 transition-colors"
            title="Parameters"
          >
            <Sliders size={18} />
          </button>
          <button
            onClick={() => {
              onToggleCollapse();
              setSectionsOpen((p) => ({ ...p, boundary: true }));
            }}
            className="w-9 h-9 rounded-md flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#2f8bff]/10 transition-colors"
            title="Boundary Conditions"
          >
            <Anchor size={18} />
          </button>
          <button
            onClick={() => {
              onToggleCollapse();
              setSectionsOpen((p) => ({ ...p, display: true }));
            }}
            className="w-9 h-9 rounded-md flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#2f8bff]/10 transition-colors"
            title="Display & View Controls"
          >
            <Eye size={18} />
          </button>
        </div>

        <div className="p-2 border-t border-[#12356b] w-full flex flex-col items-center">
          <button
            onClick={onResetBaseline}
            className="w-9 h-9 rounded-md flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#2f8bff]/10 transition-colors"
            title="Reset to ANSYS Baseline"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </aside>
    );
  }

  // Expanded 320px Sidebar
  return (
    <aside className="w-[320px] h-full flex flex-col bg-[#05080f] border-r border-[#12356b] select-none z-20 flex-shrink-0 min-h-0">
      {/* Header with Title & Collapse Button */}
      <div className="h-11 px-3.5 flex items-center justify-between border-b border-[#12356b] bg-[#05080f] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2f8bff]" />
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#d6ebff] font-data">
            CONTROLS &amp; SPEC
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#080c17] transition-colors"
          title="Collapse to Rail"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Accordion Scroll Container */}
      <div className="flex-1 overflow-y-auto min-h-0 text-xs font-data">
        {/* ── SECTION 1: PARAMETERS ── */}
        <div className="border-b border-[#12356b]">
          <button
            onClick={() => toggleSection('params')}
            className="w-full h-10 px-3.5 flex items-center justify-between bg-[#05080f] hover:bg-[#080c17] text-[#d6ebff] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-[#2f8bff]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">
                1. PARAMETERS
              </span>
            </div>
            {sectionsOpen.params ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {sectionsOpen.params && (
            <div className="p-3.5 bg-[#080c17] space-y-3.5">
              {/* Material Dropdown */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#6f8fb5]">
                  <span>CHAMBER MATERIAL</span>
                  <span className="text-[#4cc2ff]">
                    σy = {(MATERIALS[parameters.materialKey]?.yieldStrength / 1e6).toFixed(0)} MPa
                  </span>
                </div>
                <select
                  value={parameters.materialKey}
                  onChange={(e) => onChange({ materialKey: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-md bg-[#000000] border border-[#12356b] text-[#d6ebff] text-xs focus:border-[#2f8bff] outline-none cursor-pointer"
                >
                  {Object.entries(MATERIALS).map(([key, mat]) => (
                    <option key={key} value={key} className="bg-[#05080f] text-[#d6ebff]">
                      {mat.name} ({mat.notes ? mat.notes.split(',')[0] : key})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sliders */}
              <div className="space-y-3 pt-1">
                {/* Length */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Chamber Length (L)</span>
                    <span className="text-[#d6ebff] font-mono">{parameters.length} mm</span>
                  </div>
                  <input
                    type="range"
                    min={300}
                    max={600}
                    step={10}
                    value={parameters.length}
                    onChange={(e) => onChange({ length: Number(e.target.value) })}
                    className="sl"
                  />
                </div>

                {/* Inner Diameter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Inner Diameter (ID)</span>
                    <span className="text-[#d6ebff] font-mono">{parameters.innerDiameter} mm</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={150}
                    step={5}
                    value={parameters.innerDiameter}
                    onChange={(e) => onChange({ innerDiameter: Number(e.target.value) })}
                    className="sl"
                  />
                </div>

                {/* Wall Thickness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Wall Thickness (t)</span>
                    <span className="text-[#d6ebff] font-mono">{parameters.wallThickness} mm</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={25}
                    step={1}
                    value={parameters.wallThickness}
                    onChange={(e) => onChange({ wallThickness: Number(e.target.value) })}
                    className="sl"
                  />
                </div>

                {/* Fin Count */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Fin Count (N)</span>
                    <span className="text-[#d6ebff] font-mono">{parameters.finCount} fins</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={30}
                    step={1}
                    value={parameters.finCount}
                    onChange={(e) => onChange({ finCount: Number(e.target.value) })}
                    className="sl"
                  />
                </div>

                {/* Fin Height */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Fin Height (Hf)</span>
                    <span className="text-[#d6ebff] font-mono">{parameters.finHeight} mm</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={40}
                    step={1}
                    value={parameters.finHeight}
                    onChange={(e) => onChange({ finHeight: Number(e.target.value) })}
                    className="sl"
                  />
                </div>

                {/* Fin Thickness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Fin Thickness (tf)</span>
                    <span className="text-[#d6ebff] font-mono">{parameters.finThickness} mm</span>
                  </div>
                  <input
                    type="range"
                    min={1.5}
                    max={6.0}
                    step={0.5}
                    value={parameters.finThickness}
                    onChange={(e) => onChange({ finThickness: Number(e.target.value) })}
                    className="sl"
                  />
                </div>

                {/* Inner Wall Temp */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Inner Wall Temp (Tb)</span>
                    <span className="text-[#4cc2ff] font-mono">{parameters.innerWallTemp} °C</span>
                  </div>
                  <input
                    type="range"
                    min={300}
                    max={900}
                    step={25}
                    value={parameters.innerWallTemp}
                    onChange={(e) => onChange({ innerWallTemp: Number(e.target.value) })}
                    className="sl"
                  />
                </div>

                {/* Convection Coeff */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Convection Coeff (h)</span>
                    <span className="text-[#d6ebff] font-mono">{parameters.convectionCoeff} W/m²K</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    step={5}
                    value={parameters.convectionCoeff}
                    onChange={(e) => onChange({ convectionCoeff: Number(e.target.value) })}
                    className="sl"
                  />
                </div>

                {/* Ambient Temp */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Ambient Temp (T∞)</span>
                    <span className="text-[#d6ebff] font-mono">{parameters.ambientTemp} °C</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={1}
                    value={parameters.ambientTemp}
                    onChange={(e) => onChange({ ambientTemp: Number(e.target.value) })}
                    className="sl"
                  />
                </div>

                {/* Internal Pressure */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Internal Pressure (P)</span>
                    <span className="text-[#d6ebff] font-mono">{parameters.internalPressure} MPa</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    value={parameters.internalPressure}
                    onChange={(e) => onChange({ internalPressure: Number(e.target.value) })}
                    className="sl"
                  />
                </div>
              </div>

              {/* Reset / Snap Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={onResetBaseline}
                  className="flex-1 py-1.5 px-2 rounded-md bg-[#000000] border border-[#12356b] hover:border-[#2f8bff] text-[#d6ebff] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={12} className="text-[#2f8bff]" />
                  <span>RESET BASELINE</span>
                </button>
                <button
                  onClick={onSnapBaseline || onResetBaseline}
                  className="flex-1 py-1.5 px-2 rounded-md bg-[#2f8bff]/15 border border-[#2f8bff]/50 hover:bg-[#2f8bff]/25 text-[#4cc2ff] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Zap size={12} />
                  <span>SNAP BASELINE</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: BOUNDARY CONDITIONS ── */}
        <div className="border-b border-[#12356b]">
          <button
            onClick={() => toggleSection('boundary')}
            className="w-full h-10 px-3.5 flex items-center justify-between bg-[#05080f] hover:bg-[#080c17] text-[#d6ebff] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Anchor size={14} className="text-[#2f8bff]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">
                2. BOUNDARY CONDITIONS
              </span>
            </div>
            {sectionsOpen.boundary ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {sectionsOpen.boundary && (
            <div className="p-3.5 bg-[#080c17] space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer hover:bg-black/20 p-1 rounded">
                <span className="text-[11px] text-[#6f8fb5]">Fixed Support (x = -L/2)</span>
                <input
                  type="checkbox"
                  checked={parameters.showBoundaryConditions?.fixedSupport ?? true}
                  onChange={(e) =>
                    onChange({
                      showBoundaryConditions: {
                        ...parameters.showBoundaryConditions,
                        fixedSupport: e.target.checked,
                      },
                    })
                  }
                  className="cb"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:bg-black/20 p-1 rounded">
                <span className="text-[11px] text-[#6f8fb5]">Internal Pressure Arrows (1.5 MPa)</span>
                <input
                  type="checkbox"
                  checked={parameters.showBoundaryConditions?.internalPressure ?? true}
                  onChange={(e) =>
                    onChange({
                      showBoundaryConditions: {
                        ...parameters.showBoundaryConditions,
                        internalPressure: e.target.checked,
                      },
                    })
                  }
                  className="cb"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:bg-black/20 p-1 rounded">
                <span className="text-[11px] text-[#6f8fb5]">Bore Heat Glow (600 °C)</span>
                <input
                  type="checkbox"
                  checked={parameters.showBoundaryConditions?.heatWall ?? true}
                  onChange={(e) =>
                    onChange({
                      showBoundaryConditions: {
                        ...parameters.showBoundaryConditions,
                        heatWall: e.target.checked,
                      },
                    })
                  }
                  className="cb"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:bg-black/20 p-1 rounded">
                <span className="text-[11px] text-[#6f8fb5]">Convection Arrows (20 W/m²K)</span>
                <input
                  type="checkbox"
                  checked={parameters.showBoundaryConditions?.convection ?? true}
                  onChange={(e) =>
                    onChange({
                      showBoundaryConditions: {
                        ...parameters.showBoundaryConditions,
                        convection: e.target.checked,
                      },
                    })
                  }
                  className="cb"
                />
              </label>
            </div>
          )}
        </div>

        {/* ── SECTION 3: DISPLAY ── */}
        <div className="border-b border-[#12356b]">
          <button
            onClick={() => toggleSection('display')}
            className="w-full h-10 px-3.5 flex items-center justify-between bg-[#05080f] hover:bg-[#080c17] text-[#d6ebff] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-[#2f8bff]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">
                3. DISPLAY CONTROLS
              </span>
            </div>
            {sectionsOpen.display ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {sectionsOpen.display && (
            <div className="p-3.5 bg-[#080c17] space-y-3">
              {/* Contour style: Smooth vs Banded */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#6f8fb5]">Colormap Style</span>
                <div className="flex gap-1.5 p-1 bg-black rounded-md border border-[#12356b]">
                  <button
                    onClick={() => onChange({ smoothColormap: false })}
                    className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors ${
                      !parameters.smoothColormap
                        ? 'bg-[#2f8bff] text-black'
                        : 'text-[#6f8fb5] hover:text-[#d6ebff]'
                    }`}
                  >
                    9-BAND ANSYS
                  </button>
                  <button
                    onClick={() => onChange({ smoothColormap: true })}
                    className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors ${
                      parameters.smoothColormap
                        ? 'bg-[#2f8bff] text-black'
                        : 'text-[#6f8fb5] hover:text-[#d6ebff]'
                    }`}
                  >
                    SMOOTH
                  </button>
                </div>
              </div>

              {/* Wireframe Toggle */}
              <label className="flex items-center justify-between cursor-pointer hover:bg-black/20 p-1 rounded">
                <span className="text-[11px] text-[#6f8fb5]">Wireframe Mesh Overlay</span>
                <input
                  type="checkbox"
                  checked={parameters.wireframeOverlay}
                  onChange={(e) => onChange({ wireframeOverlay: e.target.checked })}
                  className="cb"
                />
              </label>

              {/* Deformation Exaggeration */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#6f8fb5]">Deform Exaggeration</span>
                  <span className="text-[#d6ebff] font-mono">{parameters.deformationExaggeration}×</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={parameters.deformationExaggeration}
                  onChange={(e) => onChange({ deformationExaggeration: Number(e.target.value) })}
                  className="sl"
                />
              </div>

              {/* Section Cut */}
              <label className="flex items-center justify-between cursor-pointer hover:bg-black/20 p-1 rounded">
                <span className="text-[11px] text-[#6f8fb5]">Section Cut (Y-Z Plane)</span>
                <input
                  type="checkbox"
                  checked={parameters.enableSectionCut}
                  onChange={(e) => onChange({ enableSectionCut: e.target.checked })}
                  className="cb"
                />
              </label>

              {parameters.enableSectionCut && (
                <div className="space-y-1 pl-2 border-l border-[#12356b]">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#6f8fb5]">Cut Plane Offset</span>
                    <span className="text-[#d6ebff] font-mono">
                      {(parameters.crossSectionCut * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={parameters.crossSectionCut}
                    onChange={(e) => onChange({ crossSectionCut: Number(e.target.value) })}
                    className="sl"
                  />
                </div>
              )}

              {/* Dimension Callouts */}
              <label className="flex items-center justify-between cursor-pointer hover:bg-black/20 p-1 rounded">
                <span className="text-[11px] text-[#6f8fb5]">3D Dimension Callouts</span>
                <input
                  type="checkbox"
                  checked={parameters.showDimensionCallouts}
                  onChange={(e) => onChange({ showDimensionCallouts: e.target.checked })}
                  className="cb"
                />
              </label>

              {/* Mounting Flange */}
              <label className="flex items-center justify-between cursor-pointer hover:bg-black/20 p-1 rounded">
                <span className="text-[11px] text-[#6f8fb5]">Mounting Flange (170 mm)</span>
                <input
                  type="checkbox"
                  checked={parameters.showFlange}
                  onChange={(e) => onChange({ showFlange: e.target.checked })}
                  className="cb"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
