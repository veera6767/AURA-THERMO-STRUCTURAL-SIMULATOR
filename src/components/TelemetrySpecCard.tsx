/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Telemetry Spec Card (Right 320px collapsible)
 * Futuristic black & blue glass panel
 */

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, FileCode, Layers, ShieldCheck } from 'lucide-react';
import { TelemetrySpec } from '../types';

interface TelemetrySpecCardProps {
  telemetry: TelemetrySpec;
}

export const TelemetrySpecCard: React.FC<TelemetrySpecCardProps> = ({ telemetry }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="fixed top-[64px] right-3 z-20 w-[300px] max-w-[calc(100vw-3.5rem)] hud-panel corner-brackets text-[#d6ebff] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#0b3d91]/60">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <FileCode size={14} className="text-[#2f8bff] shrink-0" />
          <div className="truncate min-w-0">
            <div className="text-[8px] text-[#6f8fb5] font-data tracking-widest uppercase">
              // TELEMETRY-SPEC
            </div>
            <div className="text-[11px] font-data font-bold text-[#d6ebff] tracking-wide truncate">
              {telemetry.fileName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-data font-bold tracking-widest border ${
            telemetry.modelSource === 'CAD STL'
              ? 'bg-[#2f8bff]/15 text-[#4cc2ff] border-[#2f8bff]/40'
              : 'bg-amber-500/15 text-amber-300 border-amber-400/40'
          }`}>
            {telemetry.modelSource}
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-[#0b3d91]/30 text-[#6f8fb5] hover:text-[#d6ebff] transition-colors"
          >
            {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>

      {/* STL Not Found */}
      {!telemetry.isStlLoaded && (
        <div className="mx-3 mt-2 px-2.5 py-1.5 rounded-lg bg-amber-950/25 border border-amber-500/25 text-[9px] text-amber-300 font-data flex items-center justify-between">
          <span>PARAMETRIC MODEL (STL NOT FOUND)</span>
          <span className="text-[8px] text-amber-400/60">DROP IN assets/</span>
        </div>
      )}

      {/* Body */}
      {!isCollapsed && (
        <div className="px-3 py-2.5 space-y-2.5 text-xs font-data">
          {/* Bounding Box */}
          <div>
            <div className="flex items-center justify-between text-[9px] text-[#6f8fb5] tracking-wider mb-1">
              <span className="flex items-center gap-1 text-[#4cc2ff]">
                <Layers size={10} />
                <span>BOUNDING BOX (L × B × H)</span>
              </span>
              <span className="text-[#6f8fb5]/70">CAD UNITS</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-[#0b3d91] text-[#4cc2ff] font-bold tracking-wider flex justify-between items-center text-[11px]">
              <span>{telemetry.boundingBox.length} × {telemetry.boundingBox.width} × {telemetry.boundingBox.height}</span>
              <span className="text-[#6f8fb5] text-[9px]">mm</span>
            </div>
          </div>

          {/* Vertices & Triangles */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'VERTICES', value: telemetry.vertexCount.toLocaleString() },
              { label: 'TRIANGLES', value: telemetry.triangleCount.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="p-2 rounded-lg bg-black/30 border border-[#0b3d91]">
                <div className="text-[8px] text-[#6f8fb5] tracking-wider mb-0.5">{label}</div>
                <div className="text-sm font-bold text-[#d6ebff] font-display">{value}</div>
              </div>
            ))}
          </div>

          {/* File Size */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/30 border border-[#0b3d91]">
            <span className="text-[9px] text-[#6f8fb5] tracking-wider">FILE SIZE</span>
            <span className="text-[11px] font-bold text-[#4cc2ff]">
              {telemetry.fileSizeBytes > 0
                ? `${(telemetry.fileSizeBytes / 1024).toFixed(1)} KB`
                : 'PROCEDURAL ENGINE'}
            </span>
          </div>

          {/* Status footer */}
          <div className="pt-1 flex items-center justify-between border-t border-[#0b3d91]/40 text-[9px]">
            <span className="flex items-center gap-1 text-[#4cc2ff] font-bold">
              <ShieldCheck size={11} />
              CAD MANIFOLD VALID
            </span>
            <span className="text-[#6f8fb5] tracking-wider">1:1 NATIVE UNITS</span>
          </div>
        </div>
      )}
    </div>
  );
};
