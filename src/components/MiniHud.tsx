/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Mini HUD (AZ/EL/ZOOM Pill)
 * Tiny pill anchored left-middle, never overlaps model centre
 */

import React from 'react';
import { Compass, RotateCw, ZoomIn, Hand } from 'lucide-react';

interface MiniHudProps {
  azimuth: number;
  elevation: number;
  zoom: number;
  isHandActive: boolean;
}

export const MiniHud: React.FC<MiniHudProps> = ({ azimuth, elevation, zoom, isHandActive }) => {
  return (
    <div className="fixed left-[60px] top-1/2 -translate-y-1/2 z-20 pointer-events-none">
      <div
        className="hud-panel corner-brackets px-2.5 py-2 space-y-1.5 w-[88px]"
        style={{ boxShadow: '0 0 14px rgba(11,61,145,0.3)' }}
      >
        <div className="text-[8px] text-[#6f8fb5] font-data tracking-widest uppercase pb-1 border-b border-[#0b3d91]/50">
          // CAM
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[9px] text-[#6f8fb5]">
            <Compass size={9} className="text-[#2f8bff]" />
            <span>AZ</span>
          </span>
          <span className="text-[#4cc2ff] font-bold text-[10px] font-data">{azimuth}°</span>
        </div>

        <div className="flex items-center justify-between border-t border-[#0b3d91]/30 pt-1">
          <span className="flex items-center gap-1 text-[9px] text-[#6f8fb5]">
            <RotateCw size={9} className="text-[#2f8bff]" />
            <span>EL</span>
          </span>
          <span className="text-[#4cc2ff] font-bold text-[10px] font-data">{elevation}°</span>
        </div>

        <div className="flex items-center justify-between border-t border-[#0b3d91]/30 pt-1">
          <span className="flex items-center gap-1 text-[9px] text-[#6f8fb5]">
            <ZoomIn size={9} className="text-[#2f8bff]" />
            <span>ZOOM</span>
          </span>
          <span className="text-[#4cc2ff] font-bold text-[10px] font-data">{zoom}%</span>
        </div>

        <div className="flex items-center justify-between border-t border-[#0b3d91]/30 pt-1">
          <span className="flex items-center gap-1 text-[9px] text-[#6f8fb5]">
            <Hand size={9} className={isHandActive ? 'text-[#2f8bff]' : 'text-[#6f8fb5]/50'} />
            <span>1H</span>
          </span>
          <span className={`text-[9px] font-bold font-data ${isHandActive ? 'text-[#4cc2ff]' : 'text-[#6f8fb5]/50'}`}>
            {isHandActive ? 'TRACK' : 'OFF'}
          </span>
        </div>
      </div>
    </div>
  );
};
