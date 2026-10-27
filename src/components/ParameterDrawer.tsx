/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Parameters Drawer (320px slide-in)
 * Futuristic black & blue glass panel with custom sliders
 */

import React from 'react';
import { X, RotateCcw, AlertTriangle, Info } from 'lucide-react';
import { SimulationParameters } from '../types';
import { MATERIALS, BASELINE_PARAMETERS } from '../surrogate';

interface ParameterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parameters: SimulationParameters;
  onChange: (updated: Partial<SimulationParameters>) => void;
  onResetBaseline: () => void;
}

const SliderRow: React.FC<{
  label: string;
  value: number | string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  currentVal: number;
  baseline?: string;
  isWarning?: boolean;
  onChange: (v: number) => void;
}> = ({ label, value, unit = '', min, max, step, currentVal, baseline, isWarning, onChange }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-[11px]">
      <span className="text-[#d6ebff]">{label}</span>
      <span className={`font-bold font-data ${isWarning ? 'text-amber-400' : 'text-[#4cc2ff]'}`}>
        {value} {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={currentVal}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="slider-blue w-full"
    />
    {baseline && (
      <div className="flex justify-between text-[9px] text-[#6f8fb5]">
        <span>{min} {unit}</span>
        <span className="text-[#2f8bff]/70">{baseline}</span>
        <span>{max} {unit}</span>
      </div>
    )}
  </div>
);

export const ParameterDrawer: React.FC<ParameterDrawerProps> = ({
  isOpen,
  onClose,
  parameters,
  onChange,
  onResetBaseline,
}) => {
  return (
    <div
      className={`fixed top-[56px] left-[48px] bottom-0 z-40 w-[320px] flex flex-col text-[#d6ebff] transition-transform duration-250 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(18px)', borderRight: '1px solid #0b3d91', boxShadow: '4px 0 32px rgba(11,61,145,0.25)' }}
    >
      {/* Drawer Header */}
      <div className="px-4 py-3 border-b border-[#0b3d91] flex items-center justify-between shrink-0">
        <div>
          <div className="text-[9px] text-[#6f8fb5] font-data tracking-widest uppercase">// PARAMETERS</div>
          <div className="font-display font-bold text-sm tracking-wider text-[#d6ebff]">SIMULATION INPUTS</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResetBaseline}
            title="Reset to ANSYS Baseline"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0b3d91]/30 border border-[#0b3d91] text-[10px] font-data text-[#4cc2ff] hover:bg-[#0b3d91]/60 transition-colors"
          >
            <RotateCcw size={10} />
            <span>RESET</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#6f8fb5] hover:text-[#d6ebff] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Surrogate Banner */}
      <div className="px-4 py-2 bg-[#0b3d91]/15 border-b border-[#0b3d91]/50 text-[9px] font-data text-[#4cc2ff]/90 flex items-start gap-1.5 shrink-0">
        <Info size={12} className="text-[#4cc2ff] shrink-0 mt-0.5" />
        <span>INTERACTIVE SURROGATE · CALIBRATED TO ANSYS 2025 R2 BASELINE</span>
      </div>

      {/* Snap to Baseline */}
      <div className="px-4 py-2 border-b border-[#0b3d91]/40 flex items-center justify-between text-xs font-data shrink-0">
        <span className="text-[#d6ebff]">SNAP TO ANSYS BASELINE</span>
        <button
          onClick={() => {
            const next = !parameters.snapToBaseline;
            if (next) onResetBaseline();
            else onChange({ snapToBaseline: false });
          }}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
            parameters.snapToBaseline
              ? 'bg-[#2f8bff] text-black border-[#4cc2ff] shadow-[0_0_8px_rgba(47,139,255,0.5)]'
              : 'bg-black/40 text-[#6f8fb5] border-[#0b3d91]'
          }`}
        >
          {parameters.snapToBaseline ? 'LOCKED' : 'FREE EXPLORE'}
        </button>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 font-data text-xs">

        {/* 01. Thermal & Pressure */}
        <section className="space-y-3">
          <div className="text-[9px] text-[#2f8bff] font-bold tracking-widest uppercase border-b border-[#0b3d91]/50 pb-1">
            // 01. THERMAL &amp; PRESSURE BOUNDARY
          </div>

          <SliderRow
            label="Inner Wall Temp (Ts)"
            value={parameters.innerWallTemp} unit="°C"
            min={300} max={900} step={5}
            currentVal={parameters.innerWallTemp}
            baseline="600 °C (Baseline)"
            isWarning={parameters.innerWallTemp > 750}
            onChange={(v) => onChange({ innerWallTemp: v, snapToBaseline: false })}
          />
          <SliderRow
            label="Ambient Temp (T∞)"
            value={parameters.ambientTemp} unit="°C"
            min={0} max={50} step={1}
            currentVal={parameters.ambientTemp}
            baseline="25 °C (Baseline)"
            onChange={(v) => onChange({ ambientTemp: v, snapToBaseline: false })}
          />
          <SliderRow
            label="Convection Coeff (h)"
            value={parameters.convectionCoeff} unit="W/m²K"
            min={5} max={100} step={1}
            currentVal={parameters.convectionCoeff}
            baseline="20 W/m²K (Baseline)"
            onChange={(v) => onChange({ convectionCoeff: v, snapToBaseline: false })}
          />
          <SliderRow
            label="Internal Pressure (P)"
            value={parameters.internalPressure} unit="MPa"
            min={0} max={10} step={0.2}
            currentVal={parameters.internalPressure}
            baseline="2 MPa (Baseline)"
            isWarning={parameters.internalPressure > 7}
            onChange={(v) => onChange({ internalPressure: v, snapToBaseline: false })}
          />
        </section>

        {/* 02. Geometry */}
        <section className="space-y-3">
          <div className="text-[9px] text-[#2f8bff] font-bold tracking-widest uppercase border-b border-[#0b3d91]/50 pb-1">
            // 02. CHAMBER &amp; FIN GEOMETRY
          </div>

          <SliderRow label="Fin Count (N)" value={parameters.finCount}
            min={6} max={30} step={1} currentVal={parameters.finCount}
            baseline="15 (Baseline)"
            onChange={(v) => onChange({ finCount: Math.round(v), snapToBaseline: false })}
          />
          <SliderRow label="Fin Height (hf)" value={parameters.finHeight} unit="mm"
            min={5} max={40} step={1} currentVal={parameters.finHeight}
            baseline="20 mm (Baseline)"
            onChange={(v) => onChange({ finHeight: v, snapToBaseline: false })}
          />
          <SliderRow label="Fin Thickness (tf)" value={parameters.finThickness} unit="mm"
            min={1} max={8} step={0.5} currentVal={parameters.finThickness}
            baseline="3 mm (Baseline)"
            onChange={(v) => onChange({ finThickness: v, snapToBaseline: false })}
          />
          <SliderRow label="Chamber Length (L)" value={parameters.length} unit="mm"
            min={200} max={600} step={10} currentVal={parameters.length}
            baseline="450 mm (Baseline)"
            onChange={(v) => onChange({ length: v, snapToBaseline: false })}
          />
          <SliderRow label="Wall Thickness (t)" value={parameters.wallThickness} unit="mm"
            min={5} max={20} step={1} currentVal={parameters.wallThickness}
            baseline="10 mm (Baseline)"
            onChange={(v) => onChange({ wallThickness: v, snapToBaseline: false })}
          />
        </section>

        {/* 03. Material */}
        <section className="space-y-2">
          <div className="text-[9px] text-[#2f8bff] font-bold tracking-widest uppercase border-b border-[#0b3d91]/50 pb-1">
            // 03. CHAMBER ALLOY SELECTION
          </div>
          <select
            value={parameters.materialKey}
            onChange={(e) => onChange({ materialKey: e.target.value as any, snapToBaseline: false })}
            className="w-full px-3 py-2 rounded-lg bg-[#000]/50 border border-[#0b3d91] text-[#d6ebff] text-xs font-data focus:border-[#2f8bff] outline-none appearance-none transition-colors"
          >
            {Object.entries(MATERIALS).map(([key, mat]) => (
              <option key={key} value={key} style={{ background: '#05080f' }}>{mat.name}</option>
            ))}
          </select>
          <p className="text-[9px] text-[#6f8fb5]">{MATERIALS[parameters.materialKey]?.notes}</p>
        </section>

        {/* 04. Visualization */}
        <section className="space-y-3">
          <div className="text-[9px] text-[#2f8bff] font-bold tracking-widest uppercase border-b border-[#0b3d91]/50 pb-1">
            // 04. VIEWPORT &amp; COLORMAP MODES
          </div>

          <SliderRow
            label="Deformation Exaggeration"
            value={`${parameters.deformationExaggeration}x`}
            min={1} max={300} step={5}
            currentVal={parameters.deformationExaggeration}
            onChange={(v) => onChange({ deformationExaggeration: v })}
          />

          {/* Colormap Bands */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#d6ebff]">Colormap Palette</span>
            <div className="flex p-0.5 rounded-lg bg-black/50 border border-[#0b3d91] text-[9px]">
              {['9-BAND ANSYS', 'SMOOTH'].map((label, i) => {
                const isBanded = i === 0;
                const isActive = isBanded ? !parameters.smoothColormap : parameters.smoothColormap;
                return (
                  <button
                    key={label}
                    onClick={() => onChange({ smoothColormap: !isBanded })}
                    className={`px-2 py-1 rounded transition-colors ${
                      isActive
                        ? 'bg-[#2f8bff] text-black font-bold shadow-[0_0_6px_rgba(47,139,255,0.5)]'
                        : 'text-[#6f8fb5]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <SliderRow
            label="Exploded-Fin View"
            value={`+${parameters.explodedFinDistance} mm`}
            min={0} max={40} step={1}
            currentVal={parameters.explodedFinDistance}
            onChange={(v) => onChange({ explodedFinDistance: v })}
          />

          {/* Section Cut Depth (only when enabled) */}
          {parameters.enableSectionCut && (
            <SliderRow
              label="Section Cut Depth"
              value={`${Math.round(parameters.crossSectionCut * 100)}%`}
              min={-1} max={1} step={0.02}
              currentVal={parameters.crossSectionCut}
              isWarning={true}
              onChange={(v) => onChange({ crossSectionCut: v })}
            />
          )}

          {/* Animation Speed */}
          <SliderRow
            label="Animation Speed"
            value={`${parameters.animationSpeed}x`}
            min={0.5} max={3} step={0.5}
            currentVal={parameters.animationSpeed}
            onChange={(v) => onChange({ animationSpeed: v })}
          />
        </section>
      </div>
    </div>
  );
};
