/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Section 03 // RESULTS View
 * KPI tiles, Analytical vs ANSYS table, Corrected Fin Efficiency,
 * 6 interactive engineering charts, yield gauge, and CSV/PNG export
 */

import React, { useState } from 'react';
import {
  Download,
  Camera,
  AlertTriangle,
  Info,
  TrendingUp,
  BarChart,
  CheckCircle,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { SimulationParameters, SurrogateKPIs } from '../types';
import { MATERIALS } from '../surrogate';

interface SectionResultsViewProps {
  parameters: SimulationParameters;
  kpis: SurrogateKPIs;
  onExportCsv: () => void;
  onCaptureScreenshot: () => void;
}

export const SectionResultsView: React.FC<SectionResultsViewProps> = ({
  parameters,
  kpis,
  onExportCsv,
  onCaptureScreenshot,
}) => {
  const [activeChart, setActiveChart] = useState<number>(0);
  const mat = MATERIALS[parameters.materialKey] || MATERIALS.AL_6061_T6;

  // Chart 1: Temperature through wall thickness
  const wallTempPoints = Array.from({ length: 11 }, (_, i) => {
    const r = 50 + (i / 10) * parameters.wallThickness;
    const dropFraction = Math.log(r / 50) / Math.log((50 + parameters.wallThickness) / 50);
    const temp = parameters.innerWallTemp - kpis.wallTempDrop * dropFraction;
    return { x: r.toFixed(1), y: temp.toFixed(1) };
  });

  // Chart 2: Axial deformation profile
  const deformPoints = Array.from({ length: 11 }, (_, i) => {
    const u = i / 10;
    const x = (u * parameters.length).toFixed(0);
    const d = (Math.pow(u, 1.3) * kpis.deformationMax).toFixed(2);
    return { x, y: d };
  });

  // Chart 3: Heat rejection Q vs h
  const qVsHPoints = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((hVal) => {
    const qVal = (hVal * kpis.finArea * kpis.deltaT) / 1000; // kW
    return { x: `${hVal}`, y: qVal.toFixed(2) };
  });

  // Chart 4: Stress vs Delta T
  const stressVsDtPoints = [200, 300, 400, 500, 575, 650, 750, 850].map((dt) => {
    const ratio = (dt / 575) * 0.9 + 0.1;
    const s = ((3.927e9 * ratio) / 1e6).toFixed(0);
    return { x: `${dt}°C`, y: s };
  });

  // Chart 5: FoS by Material
  const fosByMaterial = Object.entries(MATERIALS).map(([k, m]) => {
    const e_alpha = (m.elasticModulus * m.thermalExpansion) / (69e9 * 23e-6);
    const ratio = 0.9 * e_alpha + 0.1;
    const peakS = 3.927e9 * ratio;
    const fos = m.yieldStrength / peakS;
    return { name: m.name.split(' ')[0], fos: fos.toFixed(2), yield: (m.yieldStrength / 1e6).toFixed(0) };
  });

  // Chart 6: Fin Count Sensitivity (6 to 30)
  const finSensitivity = [6, 10, 15, 20, 25, 30].map((n) => {
    const area = n * 2 * (parameters.length / 1000) * (parameters.finHeight / 1000);
    const fFactor = (parameters.convectionCoeff / 20) * (kpis.deltaT / 575) * (area / 0.27);
    const drop = (11.59 * fFactor).toFixed(1);
    const q = ((parameters.convectionCoeff * area * kpis.deltaT) / 1000).toFixed(2);
    return { x: `${n}`, drop, q };
  });

  return (
    <div className="w-full h-full overflow-y-auto p-4 text-xs font-data text-[#d6ebff] space-y-4">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/25">
        <div>
          <span className="text-[8px] text-[#6f8fb5] tracking-widest block">
            // SECTION 03: SIMULATION TELEMETRY &amp; REPORT VALIDATION
          </span>
          <h2 className="font-display font-bold text-base sm:text-lg text-[#d6ebff] tracking-wide">
            ANALYTICAL VS ANSYS WORKBENCH 2025 R2 BENCHMARK
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b3d91]/30 border border-[#0b3d91] text-[#4cc2ff] hover:bg-[#0b3d91]/60 transition-all font-bold text-xs shadow-[0_0_10px_rgba(11,61,145,0.25)]"
          >
            <Download size={14} />
            <span>EXPORT RESULTS CSV</span>
          </button>
          <button
            onClick={onCaptureScreenshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2f8bff] text-black hover:bg-[#4cc2ff] transition-all font-bold text-xs shadow-[0_0_15px_rgba(47,139,255,0.5)]"
          >
            <Camera size={14} />
            <span>SCREENSHOT PNG</span>
          </button>
        </div>
      </div>

      {/* KPI Tiles Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Heat Flux */}
        <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] text-slate-400 block tracking-wider">MAX HEAT FLUX</span>
          <div className="text-base sm:text-lg font-bold text-slate-100 font-display">
            {kpis.heatFluxMax.toExponential(3)}{' '}
            <span className="text-[10px] font-mono text-cyan-400 font-normal">W/m²</span>
          </div>
          <div className="text-[9px] text-cyan-400/80">
            ANSYS Baseline: 1.031e5 W/m² ({((kpis.heatFluxMax / 1.0305e5 - 1) * 100).toFixed(1)}% Δ)
          </div>
        </div>

        {/* KPI 2: Max Deformation */}
        <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20 space-y-1">
          <span className="text-[10px] text-slate-400 block tracking-wider">TOTAL DEFORMATION</span>
          <div className="text-base sm:text-lg font-bold text-slate-100 font-display">
            {kpis.deformationMax.toFixed(2)}{' '}
            <span className="text-[10px] font-mono text-cyan-400 font-normal">mm</span>
          </div>
          <div className="text-[9px] text-cyan-400/80">
            ANSYS Baseline: 3.32 mm ({((kpis.deformationMax / 3.3202 - 1) * 100).toFixed(1)}% Δ)
          </div>
        </div>

        {/* KPI 3: Peak Stress */}
        <div className="p-3 rounded-lg bg-black/40 border border-red-500/30 space-y-1">
          <span className="text-[10px] text-slate-400 block tracking-wider">PEAK VON-MISES</span>
          <div className="text-base sm:text-lg font-bold text-red-400 font-display">
            {(kpis.stressMax / 1e6).toFixed(0)}{' '}
            <span className="text-[10px] font-mono text-slate-300 font-normal">MPa</span>
          </div>
          <div className="text-[9px] text-red-400/90 font-bold animate-pulse">
            PEAK FoS: {kpis.factorOfSafety.toFixed(3)} (YIELD EXCEEDED)
          </div>
        </div>

        {/* KPI 4: Fin Efficiency (Corrected) */}
        <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] text-slate-400 block tracking-wider">CORRECTED FIN EFFICIENCY</span>
          <div className="text-base sm:text-lg font-bold text-emerald-400 font-display">
            {(kpis.finEfficiency * 100).toFixed(1)}%
          </div>
          <div className="text-[9px] text-emerald-300/80">
            η_o: {(kpis.surfaceEfficiency * 100).toFixed(1)}% | Incropera Recalc
          </div>
        </div>
      </div>

      {/* Analytical vs ANSYS Benchmark Table */}
      <div className="p-3.5 rounded-lg bg-black/50 border border-cyan-500/25 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
          <span>TABLE: ANALYTICAL THEORETICAL VS ANSYS WORKBENCH 2025 R2</span>
          <span className="text-[10px] text-slate-400 font-normal">STEADY-STATE BASELINE</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-mono">
            <thead>
              <tr className="border-b border-cyan-500/30 text-slate-400 text-[10px]">
                <th className="py-1.5 px-2">PHYSICAL PARAMETER</th>
                <th className="py-1.5 px-2">ANALYTICAL THEORY</th>
                <th className="py-1.5 px-2">ANSYS FEA RESULT</th>
                <th className="py-1.5 px-2">VARIANCE / MECHANISM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10 text-slate-200">
              <tr>
                <td className="py-1.5 px-2 font-semibold">Total Heat Flux (Peak)</td>
                <td className="py-1.5 px-2 text-cyan-300">1.94 × 10⁵ W/m²</td>
                <td className="py-1.5 px-2 text-emerald-300">1.03 × 10⁵ W/m²</td>
                <td className="py-1.5 px-2 text-slate-400 text-[10px]">
                  Analytical assumes uniform 1D fin conduction; 3D FEA accounts for fin-base 2D heat spreading resistance.
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-semibold">Thermal Expansion (Free End)</td>
                <td className="py-1.5 px-2 text-cyan-300">5.95 mm</td>
                <td className="py-1.5 px-2 text-emerald-300">3.32 mm</td>
                <td className="py-1.5 px-2 text-slate-400 text-[10px]">
                  Unconstrained 1D expansion ΔL=αLΔT (5.95mm) is restrained in FEA by fixed support Poisson constraint & fin cooling gradient.
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-semibold">Bulk Hoop Stress (Pr/t)</td>
                <td className="py-1.5 px-2 text-cyan-300">10.0 MPa (Pressure only)</td>
                <td className="py-1.5 px-2 text-emerald-300">35–45 MPa (Away from end)</td>
                <td className="py-1.5 px-2 text-slate-400 text-[10px]">
                  Matches thin-wall cylinder theory (2 MPa × 50mm / 10mm = 10 MPa) plus ~25-35 MPa bulk thermal expansion stress.
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-semibold">Single Fin Efficiency (ηf)</td>
                <td className="py-1.5 px-2 text-cyan-300">98.8% (Corrected Incropera)</td>
                <td className="py-1.5 px-2 text-emerald-300">~98.5%</td>
                <td className="py-1.5 px-2 text-slate-400 text-[10px]">
                  High thermal conductivity Al 6061 (k=167 W/mK) produces nearly isothermal fins (mLc = 0.192 &lt;&lt; 1).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Corrected Fin Efficiency Deep-Dive Box */}
      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/40 text-[11px] space-y-1.5">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <Info size={14} />
          <span>FIN EFFICIENCY VERIFICATION & CORRECTION</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[10px]">
          <strong>Notice:</strong> An earlier report draft erroneously listed 24.8% fin efficiency. Recalculated live with the standard straight-fin formula (Incropera et al.):
          <br />
          <code className="text-cyan-300">
            m = √(2h / (k · tf)) = √(2×20 / (167 × 0.003)) = 8.94 m⁻¹
          </code>
          <br />
          <code className="text-cyan-300">
            Lc = hf + tf / 2 = 0.02 + 0.0015 = 0.0215 m &nbsp;⟹&nbsp; m · Lc = 0.192
          </code>
          <br />
          <code className="text-emerald-300 font-bold">
            ηf = tanh(m · Lc) / (m · Lc) = tanh(0.192) / 0.192 ≈ 98.8%
          </code>
          . Overall surface efficiency <code className="text-emerald-300">ηo = 1 − (Afin/Atotal)(1 − ηf) ≈ 99.2%</code>.
        </p>
      </div>

      {/* Interactive Charts Selector & Canvas */}
      <div className="p-3.5 rounded-lg bg-black/50 border border-cyan-500/25 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
            <BarChart size={14} />
            <span>INTERACTIVE PARAMETRIC CHARTS</span>
          </span>

          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            {[
              'Wall Temp Profile',
              'Axial Deformation',
              'Q vs h Convection',
              'Stress vs ΔT',
              'FoS by Alloy',
              'Fin Count Sensitivity',
            ].map((name, idx) => (
              <button
                key={idx}
                onClick={() => setActiveChart(idx)}
                className={`px-2 py-1 rounded transition-colors ${
                  activeChart === idx
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                    : 'bg-black/40 text-slate-400 hover:text-cyan-300 border border-cyan-500/20'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Chart Display */}
        <div className="h-60 w-full bg-black/60 rounded-lg border border-cyan-500/20 p-3 relative flex flex-col justify-between">
          {/* Chart 0: Wall Temp */}
          {activeChart === 0 && (
            <svg className="w-full h-full" viewBox="0 0 500 200">
              <line x1="50" y1="20" x2="50" y2="170" stroke="#0891b2" strokeWidth="1" />
              <line x1="50" y1="170" x2="480" y2="170" stroke="#0891b2" strokeWidth="1" />
              <text x="50" y="15" fill="#38bdf8" fontSize="10">Temp (°C)</text>
              <text x="440" y="190" fill="#38bdf8" fontSize="10">Radius (mm)</text>

              {/* Data curve */}
              <polyline
                fill="none"
                stroke="#ff7a1a"
                strokeWidth="2.5"
                points={wallTempPoints
                  .map((p, i) => `${50 + (i / 10) * 410},${170 - ((parseFloat(p.y) - kpis.tempMin) / Math.max(1, kpis.tempMax - kpis.tempMin)) * 140}`)
                  .join(' ')}
              />

              {wallTempPoints.map((p, i) => {
                const cx = 50 + (i / 10) * 410;
                const cy = 170 - ((parseFloat(p.y) - kpis.tempMin) / Math.max(1, kpis.tempMax - kpis.tempMin)) * 140;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="3" fill="#22d3ee" />
                    {i % 2 === 0 && (
                      <text x={cx} y={cy - 6} fill="#e2e8f0" fontSize="8" textAnchor="middle">
                        {p.y}°C
                      </text>
                    )}
                    <text x={cx} y="185" fill="#94a3b8" fontSize="8" textAnchor="middle">
                      {p.x}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Chart 1: Axial Deformation */}
          {activeChart === 1 && (
            <svg className="w-full h-full" viewBox="0 0 500 200">
              <line x1="50" y1="20" x2="50" y2="170" stroke="#0891b2" strokeWidth="1" />
              <line x1="50" y1="170" x2="480" y2="170" stroke="#0891b2" strokeWidth="1" />
              <text x="50" y="15" fill="#38bdf8" fontSize="10">Deformation (mm)</text>
              <text x="440" y="190" fill="#38bdf8" fontSize="10">Length x (mm)</text>

              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.5"
                points={deformPoints
                  .map((p, i) => `${50 + (i / 10) * 410},${170 - (parseFloat(p.y) / Math.max(0.1, kpis.deformationMax)) * 140}`)
                  .join(' ')}
              />

              {deformPoints.map((p, i) => {
                const cx = 50 + (i / 10) * 410;
                const cy = 170 - (parseFloat(p.y) / Math.max(0.1, kpis.deformationMax)) * 140;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="3" fill="#38bdf8" />
                    {i % 2 === 0 && (
                      <text x={cx} y={cy - 6} fill="#e2e8f0" fontSize="8" textAnchor="middle">
                        {p.y}mm
                      </text>
                    )}
                    <text x={cx} y="185" fill="#94a3b8" fontSize="8" textAnchor="middle">
                      {p.x}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Chart 2: Q vs h */}
          {activeChart === 2 && (
            <svg className="w-full h-full" viewBox="0 0 500 200">
              <line x1="50" y1="20" x2="50" y2="170" stroke="#0891b2" strokeWidth="1" />
              <line x1="50" y1="170" x2="480" y2="170" stroke="#0891b2" strokeWidth="1" />
              <text x="50" y="15" fill="#38bdf8" fontSize="10">Heat Dissipation Q (kW)</text>
              <text x="430" y="190" fill="#38bdf8" fontSize="10">h (W/m²K)</text>

              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.5"
                points={qVsHPoints
                  .map((p, i) => `${50 + (i / 9) * 410},${170 - (parseFloat(p.y) / 16) * 140}`)
                  .join(' ')}
              />

              {qVsHPoints.map((p, i) => {
                const cx = 50 + (i / 9) * 410;
                const cy = 170 - (parseFloat(p.y) / 16) * 140;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="3" fill="#fbbf24" />
                    <text x={cx} y={cy - 6} fill="#e2e8f0" fontSize="8" textAnchor="middle">
                      {p.y}kW
                    </text>
                    <text x={cx} y="185" fill="#94a3b8" fontSize="8" textAnchor="middle">
                      {p.x}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Chart 3: Stress vs ΔT */}
          {activeChart === 3 && (
            <svg className="w-full h-full" viewBox="0 0 500 200">
              <line x1="50" y1="20" x2="50" y2="170" stroke="#0891b2" strokeWidth="1" />
              <line x1="50" y1="170" x2="480" y2="170" stroke="#0891b2" strokeWidth="1" />
              <text x="50" y="15" fill="#38bdf8" fontSize="10">Peak Von-Mises (MPa)</text>
              <text x="440" y="190" fill="#38bdf8" fontSize="10">ΔT (°C)</text>

              {/* Yield limit line */}
              <line x1="50" y1="140" x2="480" y2="140" stroke="#ef4444" strokeDasharray="4 4" strokeWidth="1.5" />
              <text x="400" y="135" fill="#ef4444" fontSize="8">Al 6061 Yield: 276 MPa</text>

              <polyline
                fill="none"
                stroke="#c084fc"
                strokeWidth="2.5"
                points={stressVsDtPoints
                  .map((p, i) => `${50 + (i / 7) * 410},${170 - (parseFloat(p.y) / 5000) * 140}`)
                  .join(' ')}
              />

              {stressVsDtPoints.map((p, i) => {
                const cx = 50 + (i / 7) * 410;
                const cy = 170 - (parseFloat(p.y) / 5000) * 140;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="3" fill="#c084fc" />
                    <text x={cx} y={cy - 6} fill="#e2e8f0" fontSize="8" textAnchor="middle">
                      {p.y}
                    </text>
                    <text x={cx} y="185" fill="#94a3b8" fontSize="8" textAnchor="middle">
                      {p.x}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Chart 4: FoS by Material */}
          {activeChart === 4 && (
            <svg className="w-full h-full" viewBox="0 0 500 200">
              <line x1="50" y1="20" x2="50" y2="170" stroke="#0891b2" strokeWidth="1" />
              <line x1="50" y1="170" x2="480" y2="170" stroke="#0891b2" strokeWidth="1" />
              <text x="50" y="15" fill="#38bdf8" fontSize="10">Factor of Safety (FoS = σy / σmax)</text>

              {/* FoS = 1.0 threshold */}
              <line x1="50" y1="110" x2="480" y2="110" stroke="#22c55e" strokeDasharray="4 4" strokeWidth="1.5" />
              <text x="410" y="105" fill="#22c55e" fontSize="8">Safe FoS ≥ 1.0</text>

              {fosByMaterial.map((m, i) => {
                const barW = 55;
                const bx = 80 + i * 95;
                const barH = Math.min(140, parseFloat(m.fos) * 60);
                const by = 170 - barH;
                const isSafe = parseFloat(m.fos) >= 1.0;
                return (
                  <g key={i}>
                    <rect
                      x={bx}
                      y={by}
                      width={barW}
                      height={barH}
                      fill={isSafe ? '#10b981' : '#ef4444'}
                      rx="3"
                    />
                    <text x={bx + barW / 2} y={by - 5} fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
                      {m.fos}x
                    </text>
                    <text x={bx + barW / 2} y="185" fill="#94a3b8" fontSize="9" textAnchor="middle">
                      {m.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Chart 5: Fin Count Sensitivity */}
          {activeChart === 5 && (
            <svg className="w-full h-full" viewBox="0 0 500 200">
              <line x1="50" y1="20" x2="50" y2="170" stroke="#0891b2" strokeWidth="1" />
              <line x1="50" y1="170" x2="480" y2="170" stroke="#0891b2" strokeWidth="1" />
              <text x="50" y="15" fill="#38bdf8" fontSize="10">Heat Q (kW) & Wall Drop (°C)</text>
              <text x="430" y="190" fill="#38bdf8" fontSize="10">Fin Count (N)</text>

              {finSensitivity.map((p, i) => {
                const cx = 80 + i * 75;
                const qY = 170 - (parseFloat(p.q) / 7) * 140;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={qY} r="4" fill="#06b6d4" />
                    <text x={cx} y={qY - 6} fill="#38bdf8" fontSize="8" textAnchor="middle">
                      {p.q} kW
                    </text>
                    <text x={cx} y="185" fill="#94a3b8" fontSize="8" textAnchor="middle">
                      N={p.x}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Engineering Synthesis: Conclusions & Future Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
        {/* Conclusions */}
        <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20 space-y-1.5">
          <div className="text-cyan-400 font-bold tracking-wider flex items-center gap-1.5">
            <CheckCircle size={13} />
            <span>INVESTIGATION CONCLUSIONS</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            1. Heat transfer in the 15-finned rocket chamber operates at high fin efficiency (98.8%), with wall temperature dropping only 11.59 °C at steady-state.
            <br />
            2. Structural stress is strongly dominated by thermal expansion constraints (~90% thermal vs 10% pressure), yielding localized concentrations (3.93 GPa) at the fixed end face and sharp fin root corners.
            <br />
            3. Al 6061-T6 operates at 0.94 of its melting point, indicating that thermal barrier coatings (TBC) or high-temperature alloys (Inconel 718 / Ti-6Al-4V) are mandatory for sustained firing.
          </p>
        </div>

        {/* Future Scope */}
        <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20 space-y-1.5">
          <div className="text-cyan-400 font-bold tracking-wider flex items-center gap-1.5">
            <TrendingUp size={13} />
            <span>FUTURE RESEARCH & INDUSTRIAL SCOPE</span>
          </div>
          <ul className="text-slate-300 space-y-0.5 list-disc list-inside">
            <li>Transient thermal start-up shock analysis (ignition sequence)</li>
            <li>Coupled 3D CFD reactive combustion gas modeling</li>
            <li>Regeneratively cooled micro-channel cooling jackets</li>
            <li>Additive manufacturing (LPBF) topology-optimized branched fins</li>
            <li>Bilinear kinematic hardening and creep plasticity validation</li>
            <li>Hot-fire static thrust test rig strain gauge correlation</li>
          </ul>
        </div>
      </div>

      {/* Authoritative Aerospace References */}
      <div className="p-2.5 rounded bg-black/30 border border-cyan-500/15 text-[9px] text-slate-400 space-y-0.5">
        <span className="text-cyan-400/80 font-bold block">ACADEMIC & TECHNICAL REFERENCES:</span>
        <p>
          [1] Sutton, G. P., & Biblarz, O. <em>Rocket Propulsion Elements</em>, 9th ed.
          [2] Incropera, F. P., et al. <em>Fundamentals of Heat and Mass Transfer</em>, 8th ed.
          [3] Beer, F. P., et al. <em>Mechanics of Materials</em>, 8th ed.
          [4] ANSYS Workbench 2025 R2 <em>Thermal & Structural Verification Manual</em>.
          [5] Shigley, J. E. <em>Mechanical Engineering Design</em>.
          [6] Callister, W. D. <em>Materials Science and Engineering</em>.
        </p>
      </div>
    </div>
  );
};
