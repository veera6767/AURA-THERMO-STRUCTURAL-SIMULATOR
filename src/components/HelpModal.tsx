/**
 * AURA - THERMO STRUCTURAL SIMULATOR - HelpModal
 * Gesture guide & keyboard shortcuts, black/blue theme
 */

import React from 'react';
import { X, Hand, Keyboard, Info } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        className="hud-panel corner-brackets w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 text-xs font-data text-[#d6ebff] shadow-[0_0_60px_rgba(11,61,145,0.4)] space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#0b3d91]/60">
          <div>
            <div className="text-[8px] text-[#6f8fb5] tracking-widest uppercase">// TELEMETRY & CONTROLS GUIDE</div>
            <h2 className="font-display font-bold text-base text-[#d6ebff] tracking-wider">AURA - THERMO STRUCTURAL SIMULATOR</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-[#6f8fb5] hover:text-[#d6ebff] hover:bg-[#0b3d91]/30 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Gestures */}
        <div className="space-y-2 p-3 rounded-lg bg-black/40 border border-[#0b3d91]">
          <div className="flex items-center gap-2 text-[#4cc2ff] font-bold text-[10px]">
            <Hand size={14} />
            <span>MEDIAPIPE HAND GESTURES (SINGLE HAND)</span>
          </div>
          <p className="text-[9px] text-[#6f8fb5]">Ensure your webcam is enabled and hand is within camera frame.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {[
              ['🖐 OPEN HAND (5 FINGERS)', 'Orbit and elevate the 3D model. Move palm horizontally or vertically.'],
              ['🤏 PINCH (THUMB + INDEX)', 'Zoom in / out proportional to pinch distance.'],
              ['✊ FIST (FOLDED HAND)', 'Freeze and hold camera orientation in place.'],
              ['☝ POINTING + SWIPE', 'Index extended; swipe left / right to switch result sub-tabs.'],
              ['✌ PEACE SIGN (INDEX + MIDDLE)', 'Play / Pause the active physical timeline simulation.'],
            ].map(([gesture, desc]) => (
              <div key={gesture} className="p-2 rounded-lg bg-black/40 border border-[#0b3d91]">
                <span className="text-[#4cc2ff] font-bold block text-[10px]">{gesture}</span>
                <span className="text-[#6f8fb5] text-[9px]">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard & Mouse */}
        <div className="space-y-2 p-3 rounded-lg bg-black/40 border border-[#0b3d91]">
          <div className="flex items-center gap-2 text-[#4cc2ff] font-bold text-[10px]">
            <Keyboard size={14} />
            <span>KEYBOARD & MOUSE CONTROLS</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[9px] text-[#6f8fb5]">
            {[
              [['1', '2', '3'], 'Switch Sections'],
              [['←', '→'], 'Prev / Next Sub-Tab'],
              [['Space'], 'Play / Pause Animation'],
              [['R'], 'Reset Camera View'],
              [['Left Click + Drag'], '3D Orbit'],
              [['Scroll Wheel'], 'Zoom'],
            ].map(([keys, action], i) => (
              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                {(keys as string[]).map((k) => (
                  <kbd key={k} className="px-1.5 py-0.5 rounded text-[8px] bg-[#000] border border-[#0b3d91] text-[#4cc2ff] font-bold">{k}</kbd>
                ))}
                <span>: {action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STL Instructions */}
        <div className="p-3 rounded-lg bg-[#0b3d91]/15 border border-[#2f8bff]/30 text-[9px] space-y-1">
          <div className="text-[#4cc2ff] font-bold flex items-center gap-1.5">
            <Info size={12} />
            <span>HOW TO USE YOUR CUSTOM SOLIDWORKS STL</span>
          </div>
          <p className="text-[#6f8fb5] leading-relaxed">
            Export your SolidWorks chamber as an STL (mm units) named <code className="text-[#4cc2ff]">finned_chamber.stl</code>.
            Drop it into the <code className="text-[#4cc2ff]">assets/</code> directory. The simulator auto-centers, aligns the axis,
            and renders exact ANSYS scalar field contours per-pixel via custom GLSL shaders.
          </p>
        </div>

        <div className="text-center pt-1">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-[#2f8bff] hover:bg-[#4cc2ff] text-black font-bold text-xs shadow-[0_0_15px_rgba(47,139,255,0.5)] transition-all"
          >
            CONFIRM & RETURN TO SIMULATOR
          </button>
        </div>
      </div>
    </div>
  );
};
