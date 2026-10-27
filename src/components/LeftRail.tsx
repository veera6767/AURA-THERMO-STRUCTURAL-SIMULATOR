/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Left 48px Icon Rail
 * Slim 48px rail opening the 320px PARAMETERS drawer
 * Features quick-jump icons, drawer toggle, and reset baseline
 */

import React from 'react';
import { Sliders, Box, Flame, Cpu, Layers, RotateCcw } from 'lucide-react';

interface LeftRailProps {
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onSelectCategory?: (category: string) => void;
  onResetBaseline: () => void;
}

export const LeftRail: React.FC<LeftRailProps> = ({
  isDrawerOpen,
  onToggleDrawer,
  onSelectCategory,
  onResetBaseline,
}) => {
  return (
    <aside className="fixed top-[56px] left-0 bottom-0 w-[48px] z-30 flex flex-col items-center justify-between py-3 bg-[#05080f]/70 backdrop-blur-md border-r border-[#0b3d91] select-none">
      {/* Top action: Toggle Drawer */}
      <div className="flex flex-col items-center gap-3 w-full">
        <button
          onClick={onToggleDrawer}
          title={isDrawerOpen ? 'Close Parameters Drawer' : 'Open Parameters Drawer'}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
            isDrawerOpen
              ? 'bg-[#2f8bff] text-black shadow-[0_0_12px_rgba(47,139,255,0.7)]'
              : 'text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#0b3d91]/30'
          }`}
        >
          <Sliders size={18} />
        </button>

        <div className="w-5 h-[1px] bg-[#0b3d91]/60" />

        {/* Quick jump icon buttons */}
        <button
          onClick={() => {
            if (!isDrawerOpen) onToggleDrawer();
            onSelectCategory?.('GEOMETRY');
          }}
          title="Chamber & Fin Geometry"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#0b3d91]/30 transition-colors"
        >
          <Box size={17} />
        </button>

        <button
          onClick={() => {
            if (!isDrawerOpen) onToggleDrawer();
            onSelectCategory?.('THERMAL');
          }}
          title="Thermal & Pressure Boundary"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#0b3d91]/30 transition-colors"
        >
          <Flame size={17} />
        </button>

        <button
          onClick={() => {
            if (!isDrawerOpen) onToggleDrawer();
            onSelectCategory?.('MATERIAL');
          }}
          title="Alloy Selection & Elasticity"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#0b3d91]/30 transition-colors"
        >
          <Cpu size={17} />
        </button>

        <button
          onClick={() => {
            if (!isDrawerOpen) onToggleDrawer();
            onSelectCategory?.('VIEWPORT');
          }}
          title="Viewport & Shaders"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#0b3d91]/30 transition-colors"
        >
          <Layers size={17} />
        </button>
      </div>

      {/* Bottom action: Reset Baseline */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onResetBaseline}
          title="Reset to ANSYS 2025 R2 Baseline Parameters"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#0b3d91]/30 transition-colors"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </aside>
  );
};
