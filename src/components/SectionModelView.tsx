/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Section 01 // MODEL View
 * Geometry, boundary conditions, material table — bottom-left panel
 */

import React from 'react';
import { Layers, Shield, Flame, Wind, Calculator, Table, Cpu } from 'lucide-react';
import { SimulationParameters } from '../types';
import { MATERIALS } from '../surrogate';

interface SectionModelViewProps {
  parameters: SimulationParameters;
  onChange: (updated: Partial<SimulationParameters>) => void;
}

const Toggle: React.FC<{
  label: string; sublabel?: string; checked: boolean;
  color?: string; dotColor?: string;
  onChange: (v: boolean) => void;
}> = ({ label, sublabel, checked, color = 'text-[#d6ebff]', dotColor = 'bg-[#2f8bff]', onChange }) => (
  <label className="flex items-center justify-between cursor-pointer py-0.5">
    <span className={`flex items-center gap-2 text-[11px] ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
      {sublabel && <span className="text-[9px] text-[#6f8fb5]">{sublabel}</span>}
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-[#2f8bff] w-3.5 h-3.5 cursor-pointer"
    />
  </label>
);

export const SectionModelView: React.FC<SectionModelViewProps> = ({ parameters, onChange }) => {
  const mat = MATERIALS[parameters.materialKey] || MATERIALS.AL_6061_T6;
  const ri = parameters.innerDiameter / 2;
  const ro = parameters.outerDiameter / 2;
  const L_m = parameters.length / 1000;
  const internalVol = Math.PI * Math.pow(ri / 1000, 2) * L_m;
  const internalArea = 2 * Math.PI * (ri / 1000) * L_m;
  const finArea = parameters.finCount * 2 * (parameters.finHeight / 1000) * L_m;

  return (
    <div className="fixed bottom-4 left-[60px] z-20 w-[320px] max-w-[calc(100vw-4rem)] max-h-[calc(100vh-90px)] overflow-y-auto hud-panel corner-brackets p-3.5 space-y-3 text-xs font-data text-[#d6ebff]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#0b3d91]/60">
        <div>
          <div className="text-[8px] text-[#6f8fb5] tracking-widest uppercase">// SECTION 01</div>
          <div className="font-display font-bold text-sm text-[#d6ebff] tracking-wider">GEOMETRY & BOUNDARIES</div>
        </div>
        <span className="px-1.5 py-0.5 rounded-lg bg-[#0b3d91]/25 border border-[#0b3d91] text-[8px] text-[#4cc2ff] font-bold">
          ANSYS 2025 R2
        </span>
      </div>

      {/* CAD Features */}
      <div className="space-y-1.5 p-2.5 rounded-lg bg-black/30 border border-[#0b3d91]">
        <div className="flex items-center gap-1.5 text-[9px] text-[#2f8bff] font-bold tracking-widest uppercase">
          <Layers size={11} /> CAD & MODEL FEATURES
        </div>
        <Toggle label="SHOW FLANGE" sublabel="(CAD ONLY, NOT IN FEA)"
          checked={parameters.showFlange} dotColor="bg-amber-400"
          color="text-[#d6ebff]"
          onChange={(v) => onChange({ showFlange: v })} />
        <Toggle label="DIMENSION CALLOUTS (3D)"
          checked={parameters.showDimensionCallouts}
          onChange={(v) => onChange({ showDimensionCallouts: v })} />
      </div>

      {/* Boundary Conditions */}
      <div className="space-y-1.5 p-2.5 rounded-lg bg-black/30 border border-[#0b3d91]">
        <div className="flex items-center gap-1.5 text-[9px] text-[#2f8bff] font-bold tracking-widest uppercase">
          <Shield size={11} /> BOUNDARY CONDITION OVERLAYS
        </div>
        <Toggle label="Fixed Support (Left Face)"
          checked={parameters.showBoundaryConditions.fixedSupport}
          dotColor="bg-[#4cc2ff]" color="text-[#4cc2ff]"
          onChange={(v) => onChange({ showBoundaryConditions: { ...parameters.showBoundaryConditions, fixedSupport: v } })} />
        <Toggle label="2 MPa Internal Pressure"
          checked={parameters.showBoundaryConditions.internalPressure}
          dotColor="bg-red-400" color="text-red-300"
          onChange={(v) => onChange({ showBoundaryConditions: { ...parameters.showBoundaryConditions, internalPressure: v } })} />
        <Toggle label="600 °C Inner Bore Glow"
          checked={parameters.showBoundaryConditions.heatWall}
          dotColor="bg-amber-400" color="text-amber-300"
          onChange={(v) => onChange({ showBoundaryConditions: { ...parameters.showBoundaryConditions, heatWall: v } })} />
        <Toggle label="Convection (h=20, T∞=25°C)"
          checked={parameters.showBoundaryConditions.convection}
          dotColor="bg-[#2f8bff]" color="text-[#d6ebff]"
          onChange={(v) => onChange({ showBoundaryConditions: { ...parameters.showBoundaryConditions, convection: v } })} />
      </div>

      {/* Geometric Characteristics */}
      <div className="space-y-1.5 p-2.5 rounded-lg bg-black/30 border border-[#0b3d91] text-[10px]">
        <div className="flex items-center gap-1.5 text-[9px] text-[#2f8bff] font-bold tracking-widest uppercase">
          <Calculator size={11} /> GEOMETRIC CHARACTERISTICS
        </div>
        <div className="grid grid-cols-2 gap-1 pt-1 text-[#6f8fb5]">
          {[
            ['Inner Radius (ri)', `${ri} mm`],
            ['Outer Radius (ro)', `${ro} mm`],
            ['Internal Vol', internalVol.toExponential(2) + ' m³'],
            ['Internal Area', internalArea.toFixed(4) + ' m²'],
            ['Total Fin Area', finArea.toFixed(3) + ' m²'],
          ].map(([k, v]) => (
            <div key={k} className={k === 'Total Fin Area' ? 'col-span-2' : ''}>
              {k}: <span className="text-[#4cc2ff] font-bold">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Material Table */}
      <div className="space-y-1.5 p-2.5 rounded-lg bg-black/30 border border-[#0b3d91] text-[10px]">
        <div className="flex items-center gap-1.5 text-[9px] text-[#2f8bff] font-bold tracking-widest uppercase">
          <Table size={11} /> MATERIAL: {mat.name}
        </div>
        <div className="grid grid-cols-2 gap-1 pt-1 text-[#6f8fb5]">
          {[
            ['Density', `${mat.density} kg/m³`],
            ['Elastic Mod (E)', `${(mat.elasticModulus / 1e9).toFixed(1)} GPa`],
            ["Poisson's ν", String(mat.poissonsRatio)],
            ['Conductivity (k)', `${mat.thermalConductivity} W/mK`],
            ['Specific Heat (Cp)', `${mat.specificHeat} J/kgK`],
            ['Exp Coeff (α)', `${(mat.thermalExpansion * 1e6).toFixed(1)} µm/m°C`],
            ['Yield Strength', `${(mat.yieldStrength / 1e6).toFixed(0)} MPa`],
            ['UTS', `${(mat.uts / 1e6).toFixed(0)} MPa`],
            ['Melting Point', `${mat.meltingPoint} °C`],
          ].map(([k, v]) => (
            <div key={k}>{k}: <span className="text-[#d6ebff] font-bold">{v}</span></div>
          ))}
        </div>
      </div>

      {/* Meshing Info */}
      <div className="p-2 rounded-lg bg-black/20 border border-[#0b3d91]/40 text-[9px] text-[#6f8fb5] space-y-0.5">
        <div className="flex items-center gap-1.5 text-[#2f8bff] font-bold tracking-widest uppercase">
          <Cpu size={10} /> ANSYS MESHING PROTOCOL
        </div>
        <div>Element: Tetrahedral | Relevance Center: Fine</div>
        <div>Smoothing: High | Transition: Fast | Solver: Sparse Direct</div>
      </div>
    </div>
  );
};
