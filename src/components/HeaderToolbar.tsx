/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Top Bar (56px)
 * - Brand left + Gesture Status Pill (IDLE, CALIBRATING, VIEW, IGNITING, EXTINGUISHING)
 * - Tabs 01 MODEL / 02 SIMULATION / 03 RESULTS centred
 * - Icon toolbar right with FIRE/STOP rocket button (hotkey F), Reset View (R), Reset Layout, etc.
 */

import React, { useEffect } from 'react';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Scissors,
  Crosshair,
  Sliders,
  HelpCircle,
  Share2,
  Box,
  Hand,
  Layers,
  Activity,
  BarChart3,
  LayoutGrid,
  Flame,
} from 'lucide-react';
import { ViewLayout, ActiveSection, GestureStatus, FireState } from '../types';

interface HeaderToolbarProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  layout: ViewLayout;
  onLayoutChange: (layout: ViewLayout) => void;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
  isSectionCutActive: boolean;
  onToggleSectionCut: () => void;
  isProbeActive: boolean;
  onToggleProbe: () => void;
  isWireframeActive: boolean;
  onToggleWireframe: () => void;
  onResetView: () => void;
  onResetLayout: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenHelp: () => void;
  gestureStatus?: GestureStatus;
  fireState?: FireState;
  onToggleFire?: () => void;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  activeSection,
  onSectionChange,
  layout,
  onLayoutChange,
  isHandTrackingActive,
  onToggleHandTracking,
  isSectionCutActive,
  onToggleSectionCut,
  isProbeActive,
  onToggleProbe,
  isWireframeActive,
  onToggleWireframe,
  onResetView,
  onResetLayout,
  onZoomIn,
  onZoomOut,
  onOpenHelp,
  gestureStatus = 'IDLE',
  fireState = 'READY',
  onToggleFire,
}) => {
  // Hotkeys: F for fire/stop, R for reset view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onToggleFire?.();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onResetView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleFire, onResetView]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    const notification = document.createElement('div');
    notification.innerText = 'MISSION TELEMETRY LINK COPIED';
    notification.className =
      'fixed top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-1.5 bg-[#05080f] border border-[#2f8bff] text-[#d6ebff] text-xs font-mono rounded shadow-[0_0_15px_rgba(47,139,255,0.4)]';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  };

  const isFiring = fireState === 'BURNING' || fireState === 'IGNITION';

  // Status badge styling
  const getStatusBadge = () => {
    if (!isHandTrackingActive) {
      return (
        <span className="px-2 py-0.5 rounded bg-[#12356b]/30 border border-[#12356b] text-[9px] font-mono text-[#6f8fb5]">
          CAM: OFF
        </span>
      );
    }

    switch (gestureStatus) {
      case 'CALIBRATING':
        return (
          <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/50 text-[9px] font-mono font-bold text-cyan-300 animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            CALIBRATING
          </span>
        );
      case 'VIEW':
        return (
          <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/50 text-[9px] font-mono font-bold text-[#4cc2ff] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2f8bff]" />
            VIEW CONTROL
          </span>
        );
      case 'IGNITING':
        return (
          <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/60 text-[9px] font-mono font-bold text-amber-300 animate-bounce flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            IGNITING
          </span>
        );
      case 'EXTINGUISHING':
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-[9px] font-mono font-bold text-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            EXTINGUISHING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-[#12356b]/40 border border-[#12356b] text-[9px] font-mono text-[#6f8fb5]">
            STANDBY
          </span>
        );
    }
  };

  return (
    <header className="h-[56px] w-full flex items-center justify-between px-4 bg-[#05080f] border-b border-[#12356b] select-none z-30 flex-shrink-0 text-xs font-data">
      {/* 1. Left: Brand + Status Pill */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#000000] border border-[#12356b] text-[#4cc2ff]">
          <Box size={16} />
        </div>

        <div className="flex items-center gap-2">
          <div className="leading-tight">
            <span className="font-display font-bold text-sm tracking-wider text-[#d6ebff] uppercase">
              AURA - THERMO
            </span>
            <span className="hidden xl:inline text-[10px] text-[#6f8fb5] tracking-widest ml-1.5 uppercase font-normal">
              // STRUCTURAL SIMULATOR
            </span>
          </div>

          {getStatusBadge()}
        </div>
      </div>

      {/* 2. Centre: Tabs (01 MODEL / 02 SIMULATION / 03 RESULTS) */}
      <nav className="flex items-center gap-1 sm:gap-2 h-full">
        <button
          onClick={() => onSectionChange('01_MODEL')}
          className={`relative h-full flex items-center gap-1.5 px-3 sm:px-4 text-xs font-bold tracking-wider transition-colors ${
            activeSection === '01_MODEL'
              ? 'text-[#4cc2ff] border-b-2 border-[#2f8bff]'
              : 'text-[#6f8fb5] hover:text-[#d6ebff]'
          }`}
        >
          <Box size={13} className={activeSection === '01_MODEL' ? 'text-[#4cc2ff]' : ''} />
          <span>01 MODEL</span>
        </button>

        <button
          onClick={() => onSectionChange('02_SIMULATION')}
          className={`relative h-full flex items-center gap-1.5 px-3 sm:px-4 text-xs font-bold tracking-wider transition-colors ${
            activeSection === '02_SIMULATION'
              ? 'text-[#4cc2ff] border-b-2 border-[#2f8bff]'
              : 'text-[#6f8fb5] hover:text-[#d6ebff]'
          }`}
        >
          <Activity size={13} className={activeSection === '02_SIMULATION' ? 'text-[#4cc2ff]' : ''} />
          <span>02 SIMULATION</span>
        </button>

        <button
          onClick={() => onSectionChange('03_RESULTS')}
          className={`relative h-full flex items-center gap-1.5 px-3 sm:px-4 text-xs font-bold tracking-wider transition-colors ${
            activeSection === '03_RESULTS'
              ? 'text-[#4cc2ff] border-b-2 border-[#2f8bff]'
              : 'text-[#6f8fb5] hover:text-[#d6ebff]'
          }`}
        >
          <BarChart3 size={13} className={activeSection === '03_RESULTS' ? 'text-[#4cc2ff]' : ''} />
          <span>03 RESULTS</span>
        </button>
      </nav>

      {/* 3. Right: Icon Toolbar with Tooltips & Fire Button */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* FIRE ROCKET / STOP BUTTON */}
        <button
          onClick={onToggleFire}
          title={isFiring ? 'Stop Combustion (F)' : 'Ignite Rocket Combustion (F)'}
          className={`px-2.5 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
            isFiring
              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse'
              : 'bg-amber-950/40 border border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
          }`}
        >
          <Flame size={14} className={isFiring ? 'text-black' : 'text-amber-400'} />
          <span>{isFiring ? 'STOP (F)' : 'FIRE (F)'}</span>
        </button>

        <div className="hidden lg:block w-[1px] h-4 bg-[#12356b] mx-0.5" />

        {/* Multi-view layout segmented button */}
        <div className="hidden lg:flex items-center p-0.5 rounded bg-[#000000] border border-[#12356b] text-[10px] font-mono">
          {(['1-VIEW', '2-VIEW', '4-VIEW'] as ViewLayout[]).map((v) => (
            <button
              key={v}
              onClick={() => onLayoutChange(v)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                layout === v
                  ? 'bg-[#2f8bff] text-black font-semibold'
                  : 'text-[#6f8fb5] hover:text-[#d6ebff]'
              }`}
              title={`Switch to ${v} Layout`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="hidden lg:block w-[1px] h-4 bg-[#12356b] mx-0.5" />

        {/* Section Cut Toggle */}
        <button
          onClick={onToggleSectionCut}
          title="Toggle Section Cut"
          className={`p-1.5 rounded border transition-colors ${
            isSectionCutActive
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
              : 'border-transparent text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17]'
          }`}
        >
          <Scissors size={15} />
        </button>

        {/* Wireframe Toggle */}
        <button
          onClick={onToggleWireframe}
          title="Toggle Wireframe Mesh Overlay"
          className={`p-1.5 rounded border transition-colors ${
            isWireframeActive
              ? 'bg-[#2f8bff]/20 text-[#4cc2ff] border-[#2f8bff]/60'
              : 'border-transparent text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17]'
          }`}
        >
          <Layers size={15} />
        </button>

        {/* Probe Tool Toggle */}
        <button
          onClick={onToggleProbe}
          title="Click to Probe Model Value"
          className={`p-1.5 rounded border transition-colors ${
            isProbeActive
              ? 'bg-[#2f8bff] text-black font-bold'
              : 'border-transparent text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17]'
          }`}
        >
          <Crosshair size={15} />
        </button>

        {/* Hand Tracking Toggle */}
        <button
          onClick={onToggleHandTracking}
          title={isHandTrackingActive ? 'Disable Hand Tracking' : 'Enable Hand Tracking'}
          className={`p-1.5 rounded border transition-colors ${
            isHandTrackingActive
              ? 'bg-[#2f8bff]/25 text-[#4cc2ff] border-[#2f8bff]/60'
              : 'border-transparent text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17]'
          }`}
        >
          <Hand size={15} className={isHandTrackingActive ? 'animate-pulse' : ''} />
        </button>

        <div className="w-[1px] h-4 bg-[#12356b] mx-0.5" />

        {/* Reset Camera View */}
        <button
          onClick={onResetView}
          title="Reset Camera Framing (Isometric Fixed-End, R)"
          className="p-1.5 rounded text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17] transition-colors"
        >
          <RotateCcw size={15} />
        </button>

        {/* Reset Layout */}
        <button
          onClick={onResetLayout}
          title="Reset Layout Defaults"
          className="px-2 py-1 rounded border border-[#12356b] text-[#6f8fb5] hover:text-[#4cc2ff] hover:border-[#2f8bff] text-[10px] font-semibold transition-colors flex items-center gap-1"
        >
          <LayoutGrid size={12} />
          <span className="hidden sm:inline">RESET LAYOUT</span>
        </button>

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          title="Zoom In (+)"
          className="p-1.5 rounded text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17] transition-colors hidden sm:block"
        >
          <ZoomIn size={15} />
        </button>

        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          title="Zoom Out (-)"
          className="p-1.5 rounded text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17] transition-colors hidden sm:block"
        >
          <ZoomOut size={15} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          title="Fullscreen"
          className="p-1.5 rounded text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17] transition-colors hidden md:block"
        >
          <Maximize size={15} />
        </button>

        {/* Share Link */}
        <button
          onClick={handleShare}
          title="Share Simulation State"
          className="p-1.5 rounded text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17] transition-colors hidden md:block"
        >
          <Share2 size={15} />
        </button>

        {/* Help */}
        <button
          onClick={onOpenHelp}
          title="Help & Gestures Guide"
          className="p-1.5 rounded text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#080c17] transition-colors"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  );
};
