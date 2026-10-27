/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Gesture Telemetry Card (Bottom-right, collapsible)
 * 240×135 webcam view, FPS chip, gesture label, fingers n/5
 */

import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Maximize2, Minimize2, Hand, Info } from 'lucide-react';
import { GestureState } from '../types';
import { GestureController } from '../gestures';

interface GestureTelemetryCardProps {
  gestureState: GestureState;
  isActive: boolean;
  onToggleActive: () => void;
  gestureController: GestureController | null;
  onOpenHelp: () => void;
}

export const GestureTelemetryCard: React.FC<GestureTelemetryCardProps> = ({
  gestureState,
  isActive,
  onToggleActive,
  gestureController,
  onOpenHelp,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [initFailed, setInitFailed] = useState(false);

  useEffect(() => {
    if (!gestureController || !videoRef.current || !canvasRef.current) return;
    if (isActive) {
      gestureController
        .initialize(videoRef.current, canvasRef.current)
        .then((ok) => {
          if (ok) {
            gestureController.startCamera().then((camOk) => {
              if (!camOk) setInitFailed(true);
            });
          } else setInitFailed(true);
        })
        .catch(() => setInitFailed(true));
    } else {
      gestureController.stopCamera();
    }
  }, [isActive, gestureController]);

  const getGestureLabel = () => {
    switch (gestureState.gesture) {
      case 'OPEN_HAND': return 'OPEN HAND (ORBIT/ZOOM)';
      case 'FIST': return 'FIST (IGNITE)';
      case 'THREE_FINGERS': return 'THREE FINGERS (EXTINGUISH)';
      default: return 'SEARCHING / READY';
    }
  };

  return (
    <div
      className={`fixed bottom-[76px] right-3 z-20 hud-panel corner-brackets transition-all duration-200 ${
        isExpanded ? 'w-[280px]' : 'w-[240px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#0b3d91]/60">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#4cc2ff] animate-pulse' : 'bg-[#6f8fb5]/40'}`} />
          <span className="text-[9px] font-data font-bold tracking-wider text-[#d6ebff] uppercase">
            Gesture Telemetry
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-data font-bold border ${
            gestureState.fps > 0
              ? 'bg-[#0b3d91]/30 text-[#4cc2ff] border-[#2f8bff]/30'
              : 'bg-black/40 text-[#6f8fb5] border-[#0b3d91]/30'
          }`}>
            {gestureState.fps > 0 ? `${gestureState.fps} FPS` : 'OFFLINE'}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={onOpenHelp} title="Gestures Guide"
            className="p-1 rounded text-[#6f8fb5] hover:text-[#4cc2ff] hover:bg-[#0b3d91]/20 transition-colors">
            <Info size={12} />
          </button>
          <button onClick={onToggleActive} title={isActive ? 'Disable Camera' : 'Enable Camera'}
            className={`p-1 rounded transition-colors ${
              isActive
                ? 'text-[#4cc2ff] bg-[#0b3d91]/30 border border-[#2f8bff]/30'
                : 'text-[#6f8fb5] hover:text-[#d6ebff]'
            }`}>
            {isActive ? <Camera size={12} /> : <CameraOff size={12} />}
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? 'Collapse' : 'Expand'}
            className="p-1 rounded text-[#6f8fb5] hover:text-[#d6ebff] transition-colors">
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Video Feed: exactly 240×135 (16:9) */}
      <div className="p-2 space-y-2 font-data">
        <div className="relative rounded-lg overflow-hidden bg-black border border-[#0b3d91]"
          style={{ width: '100%', aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            playsInline muted
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-35 contrast-125"
          />
          <canvas
            ref={canvasRef}
            width={320} height={240}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
          />

          {/* Subtle crosshair overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-6 h-6 border border-[#2f8bff]/20" />
          </div>

          {!isActive && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-3">
              <Hand size={20} className="mx-auto text-[#2f8bff]/50 mb-1.5" />
              <div className="text-[9px] text-[#d6ebff] font-bold tracking-wider">GESTURE TRACKER STANDBY</div>
              <button
                onClick={onToggleActive}
                className="mt-1.5 px-3 py-1 rounded-lg bg-[#0b3d91]/30 hover:bg-[#0b3d91]/60 border border-[#2f8bff]/40 text-[9px] text-[#4cc2ff] font-bold transition-all"
              >
                ENABLE CAMERA
              </button>
            </div>
          )}
          {isActive && initFailed && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-3">
              <div className="text-[9px] font-bold text-amber-300">CAMERA STANDBY</div>
              <div className="text-[8px] text-[#6f8fb5] mt-0.5">Mouse orbit active</div>
            </div>
          )}
        </div>

        {/* Classification Readout */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-[#6f8fb5] tracking-wider">DETECTED:</span>
            <span className="px-1.5 py-0.5 rounded bg-[#0b3d91]/30 border border-[#0b3d91] text-[8px] font-bold text-[#4cc2ff] tracking-wide max-w-[130px] truncate">
              {getGestureLabel()}
            </span>
          </div>
          <div className="flex items-center justify-between text-[9px] pt-1 border-t border-[#0b3d91]/30">
            <span className="text-[#6f8fb5] tracking-wider">FINGERS:</span>
            <span className="text-[#d6ebff] font-bold">{gestureState.fingersExtended} / 5</span>
          </div>
        </div>
      </div>
    </div>
  );
};
