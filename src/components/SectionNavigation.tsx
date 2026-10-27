/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Section Navigation Sub-tabs
 * Sub-tabs for 02 SIMULATION only (rendered inside header or below it)
 */

import React from 'react';
import { ActiveSection, SimulationSubTab } from '../types';
import { Flame, Zap, MoveRight, ShieldAlert, Waves } from 'lucide-react';

interface SectionNavigationProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  activeSubTab: SimulationSubTab;
  onSubTabChange: (subTab: SimulationSubTab) => void;
}

const SUB_TABS: { key: SimulationSubTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { key: 'TEMPERATURE', label: 'TEMPERATURE (°C)', shortLabel: 'TEMP', icon: <Flame size={11} className="text-amber-400" /> },
  { key: 'HEAT_FLUX', label: 'TOTAL HEAT FLUX (W/m²)', shortLabel: 'FLUX', icon: <Zap size={11} className="text-yellow-400" /> },
  { key: 'DEFORMATION', label: 'TOTAL DEFORMATION (mm)', shortLabel: 'DEFORM', icon: <MoveRight size={11} className="text-[#4cc2ff]" /> },
  { key: 'STRESS', label: 'EQUIVALENT STRESS', shortLabel: 'STRESS', icon: <ShieldAlert size={11} className="text-red-400" /> },
  { key: 'STRAIN', label: 'EQUIVALENT STRAIN', shortLabel: 'STRAIN', icon: <Waves size={11} className="text-purple-400" /> },
];

export const SectionNavigation: React.FC<SectionNavigationProps> = ({
  activeSection,
  onSectionChange,
  activeSubTab,
  onSubTabChange,
}) => {
  if (activeSection !== '02_SIMULATION') return null;

  return (
    <div className="fixed top-[56px] left-1/2 -translate-x-1/2 z-25 pointer-events-none">
      <div
        className="flex items-center gap-0.5 px-1 py-1 pointer-events-auto rounded-b-xl"
        style={{ background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(12px)', border: '1px solid #0b3d91', borderTop: 'none' }}
      >
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSubTabChange(tab.key)}
              title={tab.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-data font-bold tracking-wider transition-all duration-200 ${
                isActive
                  ? 'bg-[#0b3d91]/60 text-[#4cc2ff] border border-[#2f8bff]/50 shadow-[0_0_10px_rgba(47,139,255,0.25)]'
                  : 'text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#0b3d91]/20'
              }`}
            >
              {tab.icon}
              <span className="hidden xl:inline">{tab.label}</span>
              <span className="xl:hidden">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
