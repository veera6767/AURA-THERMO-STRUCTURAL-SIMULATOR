/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Probe Tooltip
 * Click-to-probe floating callout, black/blue theme
 */

import React from 'react';
import { X, Target } from 'lucide-react';
import { ProbedPoint } from '../types';

interface ProbeTooltipProps {
  point: ProbedPoint;
  onClose: () => void;
}

export const ProbeTooltip: React.FC<ProbeTooltipProps> = ({ point, onClose }) => {
  return (
    <div
      className="fixed z-40 transform -translate-x-1/2 -translate-y-full pointer-events-auto"
      style={{ left: point.screenPos.x, top: point.screenPos.y - 12 }}
    >
      <div
        className="hud-panel corner-brackets p-2.5 w-60 text-xs font-data text-[#d6ebff]"
        style={{ boxShadow: '0 0 24px rgba(47,139,255,0.35)' }}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-[#0b3d91]/60">
          <div className="flex items-center gap-1.5 text-[#4cc2ff] font-bold text-[9px]">
            <Target size={11} />
            <span>LOCAL PROBE INSPECTOR</span>
          </div>
          <button onClick={onClose} className="p-0.5 rounded text-[#6f8fb5] hover:text-[#d6ebff] transition-colors">
            <X size={12} />
          </button>
        </div>

        <div className="my-1.5 p-1.5 rounded-lg bg-black/50 border border-[#0b3d91] flex items-center justify-between">
          <span className="text-[9px] text-[#6f8fb5]">{point.fieldName}:</span>
          <span className="text-sm font-bold text-[#4cc2ff] font-display">
            {point.fieldValue.toLocaleString()} {point.unit}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[9px] text-[#6f8fb5] pt-1 border-t border-[#0b3d91]/40">
          <div>X (Axial): <span className="text-[#d6ebff] font-bold">{point.x} mm</span></div>
          <div>Radius (r): <span className="text-[#d6ebff] font-bold">{point.radius} mm</span></div>
          <div>Y: <span className="text-[#d6ebff] font-bold">{point.y} mm</span></div>
          <div>Z: <span className="text-[#d6ebff] font-bold">{point.z} mm</span></div>
        </div>
      </div>
      <div className="w-[2px] h-3 bg-[#2f8bff] mx-auto shadow-[0_0_6px_#4cc2ff]" />
    </div>
  );
};
