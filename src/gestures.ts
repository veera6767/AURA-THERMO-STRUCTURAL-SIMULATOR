/**
 * AURA - THERMO STRUCTURAL SIMULATOR - MediaPipe Hand Landmarker & Gesture Engine
 * 3-Gesture Only Interface:
 * 1. OPEN HAND (4-5 fingers) = VIEW CONTROL (Depth Zoom, Absolute Elevation, Rate Azimuth)
 * 2. FIST (0-1 fingers) = IGNITE (held ~0.4s, camera frozen)
 * 3. THREE FINGERS (index+middle+ring) = EXTINGUISH (held ~0.3s)
 * 
 * Features:
 * - Neutral Calibration (1s hold on first open hand or on CALIBRATE button)
 * - 6-frame stability buffer & hysteresis
 * - Transition guard: freezes view as soon as fingers fold
 * - 100% NaN-proof mathematics
 */

import { GestureState, GestureType, GestureStatus } from './types';

export type GestureActionCallback = (action: {
  type: 'VIEW' | 'IGNITE' | 'EXTINGUISH' | 'FREEZE';
  payload?: any;
}) => void;

interface Landmark {
  x: number;
  y: number;
  z: number;
}

export class GestureController {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private handLandmarker: any = null;
  private isRunning: boolean = false;
  private animFrameId: number = 0;
  private lastVideoTime: number = -1;
  private lastTimestamp: number = 0;
  private callback: GestureActionCallback | null = null;

  // Frame counter to ignore first 5 frames
  private frameCountAfterStart: number = 0;

  // No-hand timeout tracker
  private lastHandSeenTime: number = 0;

  // Calibration state
  private isCalibrated: boolean = false;
  private calibrationStartTime: number | null = null;
  private neutralCx: number = 0.5;
  private neutralCy: number = 0.5;
  private neutralSize: number = 0.22;

  // Gesture hold timers
  private fistHoldStartTime: number | null = null;
  private fistCooldownUntil: number = 0;

  private threeFingersHoldStartTime: number | null = null;
  private threeFingersCooldownUntil: number = 0;

  // 6-frame stability buffer
  private candidateHistory: GestureType[] = [];
  private currentStableGesture: GestureType = 'NONE';

  // Smoothing filters (Exponential Moving Average)
  private smoothedSize: number = 0.22;
  private smoothedElevation: number = 20;

  // FPS calculation
  private fpsCounter: number = 0;
  private lastFpsTimestamp: number = performance.now();
  private currentFps: number = 0;

  // Last frame time for dt
  private lastProcessTime: number = performance.now();

  public state: GestureState = {
    active: false,
    status: 'IDLE',
    gesture: 'NONE',
    fingersExtended: 0,
    fps: 0,
    isCalibrated: false,
    calibrationProgress: 0,
    neutralCenter: null,
    neutralSize: null,
    handOffset: { dx: 0, dy: 0, ds: 1 },
    landmarks: null,
  };

  constructor(callback?: GestureActionCallback) {
    if (callback) this.callback = callback;
  }

  public setCallback(callback: GestureActionCallback) {
    this.callback = callback;
  }

  public recalibrate() {
    this.isCalibrated = false;
    this.calibrationStartTime = null;
    this.state.isCalibrated = false;
    this.state.calibrationProgress = 0;
    this.state.neutralCenter = null;
    this.state.neutralSize = null;
  }

  public async initialize(
    videoEl: HTMLVideoElement,
    canvasEl: HTMLCanvasElement
  ): Promise<boolean> {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.state.status = 'IDLE';

    try {
      // @ts-ignore
      const importDynamic = new Function('modulePath', 'return import(modulePath)');
      const visionModule = await importDynamic(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
      );
      const { FilesetResolver, HandLandmarker } = visionModule;

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      // Attempt GPU delegate first, fallback to CPU
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      } catch (gpuErr) {
        console.warn('MediaPipe GPU delegate init failed, falling back to CPU:', gpuErr);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      }

      return true;
    } catch (err) {
      console.warn('MediaPipe HandLandmarker init error:', err);
      return false;
    }
  }

  public async startCamera(): Promise<boolean> {
    if (!this.videoElement) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user',
        },
      });

      this.videoElement.srcObject = stream;
      await new Promise((resolve) => {
        if (!this.videoElement) return resolve(false);
        this.videoElement.onloadedmetadata = () => {
          this.videoElement?.play();
          resolve(true);
        };
      });

      this.isRunning = true;
      this.state.active = true;
      this.state.status = 'IDLE';
      this.frameCountAfterStart = 0;
      this.lastHandSeenTime = performance.now();
      this.lastProcessTime = performance.now();
      this.candidateHistory = [];
      this.currentStableGesture = 'NONE';
      this.recalibrate();

      this.loop();
      return true;
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      this.state.active = false;
      this.state.status = 'IDLE';
      return false;
    }
  }

  public stopCamera() {
    this.isRunning = false;
    this.state.active = false;
    this.state.status = 'IDLE';
    this.state.gesture = 'NONE';
    this.state.landmarks = null;
    this.state.fingersExtended = 0;
    this.currentStableGesture = 'NONE';

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }

    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      this.videoElement.srcObject = null;
    }

    if (this.canvasElement) {
      const ctx = this.canvasElement.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      }
    }
  }

  private loop = () => {
    if (!this.isRunning) return;

    this.processFrame();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private processFrame() {
    if (!this.videoElement || !this.canvasElement || !this.handLandmarker) return;

    if (this.videoElement.readyState < 2 || this.videoElement.videoWidth <= 0) {
      return;
    }

    const vw = this.videoElement.videoWidth;
    const vh = this.videoElement.videoHeight;
    if (this.canvasElement.width !== vw || this.canvasElement.height !== vh) {
      this.canvasElement.width = vw;
      this.canvasElement.height = vh;
    }

    const now = performance.now();
    this.fpsCounter++;
    if (now - this.lastFpsTimestamp >= 1000) {
      this.currentFps = Math.round((this.fpsCounter * 1000) / (now - this.lastFpsTimestamp));
      this.fpsCounter = 0;
      this.lastFpsTimestamp = now;
      this.state.fps = this.currentFps;
    }

    const dt = Math.max(0.001, Math.min(0.1, (now - this.lastProcessTime) / 1000));
    this.lastProcessTime = now;

    if (this.videoElement.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.videoElement.currentTime;
      const timestamp = Math.max(now, this.lastTimestamp + 1);
      this.lastTimestamp = timestamp;

      try {
        const results = this.handLandmarker.detectForVideo(this.videoElement, timestamp);
        this.renderAndProcess(results, now, dt);
      } catch (err) {
        console.warn('Landmark detection error:', err);
      }
    }
  }

  private renderAndProcess(results: any, now: number, dt: number) {
    if (!this.canvasElement) return;
    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;

    const width = this.canvasElement.width;
    const height = this.canvasElement.height;
    ctx.clearRect(0, 0, width, height);

    const hasLandmarks = results.landmarks && results.landmarks.length > 0;

    if (!hasLandmarks) {
      if (now - this.lastHandSeenTime > 300) {
        this.state.status = 'IDLE';
        this.state.gesture = 'NONE';
        this.state.fingersExtended = 0;
        this.state.landmarks = null;
        this.currentStableGesture = 'NONE';
        this.fistHoldStartTime = null;
        this.threeFingersHoldStartTime = null;
        this.candidateHistory = [];
        this.callback?.({ type: 'FREEZE' });
      }
      return;
    }

    this.lastHandSeenTime = now;
    this.frameCountAfterStart++;

    const rawLm: Landmark[] = results.landmarks[0];
    this.state.landmarks = rawLm;

    // Process gestures and compute view controls
    this.evaluateGestures(rawLm, now, dt);

    // Draw UI overlay on top of video feed
    this.drawOverlay(ctx, rawLm, width, height);
  }

  private evaluateGestures(lm: Landmark[], now: number, dt: number) {
    // 3D Distance Helper
    const dist3D = (a: number, b: number) =>
      Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y, (lm[a].z || 0) - (lm[b].z || 0));

    // Threshold hand scale: dist(0, 9)
    const thresholdScale = dist3D(0, 9);
    if (!Number.isFinite(thresholdScale) || thresholdScale < 0.02) return;

    // Hand size s (for depth tracking): average of dist(0, 9) and dist(5, 17)
    const currentSize = (dist3D(0, 9) + dist3D(5, 17)) / 2;
    if (!Number.isFinite(currentSize) || currentSize < 0.02) return;

    // Finger extensions (rotation-independent)
    const wrist = 0;
    const indexExt = dist3D(8, wrist) > dist3D(6, wrist) * 1.15;
    const middleExt = dist3D(12, wrist) > dist3D(10, wrist) * 1.15;
    const ringExt = dist3D(16, wrist) > dist3D(14, wrist) * 1.15;
    const pinkyExt = dist3D(20, wrist) > dist3D(18, wrist) * 1.15;
    // Thumb: dist(4, 17) > dist(3, 17) * 1.1
    const thumbExt = dist3D(4, 17) > dist3D(3, 17) * 1.1;

    const fingersCount =
      (thumbExt ? 1 : 0) +
      (indexExt ? 1 : 0) +
      (middleExt ? 1 : 0) +
      (ringExt ? 1 : 0) +
      (pinkyExt ? 1 : 0);

    this.state.fingersExtended = fingersCount;

    // Palm center in normalized image coordinates
    // With x flipped once so real right is model's right
    const rawPalmX = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
    const rawPalmY = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
    const cx = 1.0 - rawPalmX;
    const cy = rawPalmY;

    // Check if fingertips closer to palm than MCPs (for FIST verification)
    const palmDist = (idx: number) =>
      Math.hypot(lm[idx].x - rawPalmX, lm[idx].y - rawPalmY, (lm[idx].z || 0));

    const tipsCloserThanMcps =
      palmDist(8) <= palmDist(5) * 1.05 &&
      palmDist(12) <= palmDist(9) * 1.05 &&
      palmDist(16) <= palmDist(13) * 1.05 &&
      palmDist(20) <= palmDist(17) * 1.05;

    // ── GESTURE CLASSIFICATION ──
    let candidate: GestureType = 'NONE';

    // A. OPEN HAND = at least 4 of 5 fingers extended including pinky
    if (fingersCount >= 4 && pinkyExt) {
      candidate = 'OPEN_HAND';
    }
    // B. FIST = 0 or 1 finger extended and all fingertips closer to palm than MCPs
    else if (fingersCount <= 1 && tipsCloserThanMcps) {
      candidate = 'FIST';
    }
    // C. THREE FINGERS = index, middle, ring extended, and pinky and thumb folded
    else if (indexExt && middleExt && ringExt && !pinkyExt && !thumbExt) {
      candidate = 'THREE_FINGERS';
    }

    // ── 6-FRAME STABILITY BUFFER ──
    this.candidateHistory.push(candidate);
    if (this.candidateHistory.length > 6) {
      this.candidateHistory.shift();
    }

    // Accept only after 6 consecutive stable frames; release after 4 frames of change
    if (this.candidateHistory.length >= 6 && this.candidateHistory.every((c) => c === candidate)) {
      this.currentStableGesture = candidate;
    } else if (
      this.candidateHistory.slice(-4).every((c) => c !== this.currentStableGesture) &&
      this.candidateHistory.length >= 4
    ) {
      this.currentStableGesture = 'NONE';
    }

    const gesture = this.currentStableGesture;
    this.state.gesture = gesture;

    // Ignore first 5 frames after startup
    if (this.frameCountAfterStart < 5) return;

    // ── TRANSITION GUARD ──
    // As soon as 2 or more fingers fold from an open hand, freeze immediately
    if (fingersCount < 4 || !pinkyExt) {
      if (gesture === 'OPEN_HAND') {
        this.callback?.({ type: 'FREEZE' });
      }
    }

    // ── CALIBRATION STATE MACHINE ──
    if (!this.isCalibrated) {
      if (gesture === 'OPEN_HAND') {
        this.state.status = 'CALIBRATING';
        if (!this.calibrationStartTime) {
          this.calibrationStartTime = now;
        }

        const elapsed = now - this.calibrationStartTime;
        const progress = Math.min(1.0, elapsed / 1000);
        this.state.calibrationProgress = progress;

        if (elapsed >= 1000) {
          this.isCalibrated = true;
          this.neutralCx = cx;
          this.neutralCy = cy;
          this.neutralSize = currentSize;
          this.smoothedSize = currentSize;
          this.state.isCalibrated = true;
          this.state.calibrationProgress = 1.0;
          this.state.neutralCenter = { x: cx, y: cy };
          this.state.neutralSize = currentSize;
        }
      } else {
        this.calibrationStartTime = null;
        this.state.calibrationProgress = 0;
        this.state.status = 'IDLE';
      }
      return;
    }

    // Hand offset relative to neutral calibration
    const dx = cx - this.neutralCx;
    const dy = cy - this.neutralCy;
    const sizeRatio = this.neutralSize > 0.01 ? currentSize / this.neutralSize : 1.0;

    this.state.handOffset = {
      dx: Math.max(-1, Math.min(1, dx / 0.3)),
      dy: Math.max(-1, Math.min(1, dy / 0.3)),
      ds: sizeRatio,
    };

    // ── GESTURE 1: OPEN HAND = VIEW CONTROL ──
    if (gesture === 'OPEN_HAND') {
      this.state.status = 'VIEW';
      this.fistHoldStartTime = null;
      this.threeFingersHoldStartTime = null;

      // 1. Hand size EMA smoothing (alpha 0.25)
      this.smoothedSize = this.smoothedSize * 0.75 + currentSize * 0.25;

      // 2. ZOOM: radius = fitRadius * clamp((s0 / s)^1.3, 0.35, 2.5)
      // Dead-zone: 6% around s0
      let zoomRatio = 1.0;
      const sizeDeviation = Math.abs(this.smoothedSize - this.neutralSize) / this.neutralSize;
      if (sizeDeviation > 0.06 && this.smoothedSize > 0.01) {
        const rawRatio = this.neutralSize / this.smoothedSize;
        zoomRatio = Math.max(0.35, Math.min(2.5, Math.pow(rawRatio, 1.3)));
      }

      // 3. ELEVATION (absolute): clamp(-(cy - cy0) / 0.30 * 70°, -70, +70)
      // Dead-zone: 0.04. Hand UP (cy < cy0) = view from top
      let targetElevation = 20; // default isometric
      const absDy = Math.abs(dy);
      if (absDy > 0.04) {
        const normDy = Math.max(-1, Math.min(1, -dy / 0.30));
        targetElevation = normDy * 70;
      }
      // EMA smoothing 0.3
      this.smoothedElevation = this.smoothedElevation * 0.7 + targetElevation * 0.3;

      // 4. AZIMUTH (rate control): dx = cx - cx0 with dead-zone 0.07
      // azimuthSpeed = clamp(dx / 0.30, -1, 1) * 120°/s
      let azimuthSpeed = 0;
      const absDx = Math.abs(dx);
      if (absDx > 0.07) {
        const normDx = Math.max(-1, Math.min(1, dx / 0.30));
        azimuthSpeed = normDx * 120; // positive turns model to the right
      }

      if (
        Number.isFinite(zoomRatio) &&
        Number.isFinite(this.smoothedElevation) &&
        Number.isFinite(azimuthSpeed)
      ) {
        this.callback?.({
          type: 'VIEW',
          payload: {
            zoomRatio,
            elevationDeg: this.smoothedElevation,
            azimuthSpeed,
            dt,
          },
        });
      }
      return;
    }

    // ── GESTURE 2: FIST = IGNITE ──
    if (gesture === 'FIST') {
      this.callback?.({ type: 'FREEZE' });
      this.threeFingersHoldStartTime = null;

      if (now < this.fistCooldownUntil) {
        this.state.status = 'IGNITING';
        return;
      }

      if (!this.fistHoldStartTime) {
        this.fistHoldStartTime = now;
      }

      const holdDuration = now - this.fistHoldStartTime;
      this.state.status = 'IGNITING';

      // Held for ~0.4s (400 ms) fires rocket
      if (holdDuration >= 400) {
        this.callback?.({ type: 'IGNITE' });
        this.fistCooldownUntil = now + 1000; // 1s cooldown
        this.fistHoldStartTime = null;
      }
      return;
    }

    // ── GESTURE 3: THREE FINGERS = EXTINGUISH ──
    if (gesture === 'THREE_FINGERS') {
      this.callback?.({ type: 'FREEZE' });
      this.fistHoldStartTime = null;

      if (now < this.threeFingersCooldownUntil) {
        this.state.status = 'EXTINGUISHING';
        return;
      }

      if (!this.threeFingersHoldStartTime) {
        this.threeFingersHoldStartTime = now;
      }

      const holdDuration = now - this.threeFingersHoldStartTime;
      this.state.status = 'EXTINGUISHING';

      // Held for ~0.3s (300 ms) extinguishes rocket
      if (holdDuration >= 300) {
        this.callback?.({ type: 'EXTINGUISH' });
        this.threeFingersCooldownUntil = now + 1000; // 1s cooldown
        this.threeFingersHoldStartTime = null;
      }
      return;
    }

    // Default neutral state
    this.fistHoldStartTime = null;
    this.threeFingersHoldStartTime = null;
    this.state.status = 'IDLE';
    this.callback?.({ type: 'FREEZE' });
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    lm: Landmark[],
    w: number,
    h: number
  ) {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // index
      [0, 9], [9, 10], [10, 11], [11, 12], // middle
      [0, 13], [13, 14], [14, 15], [15, 16], // ring
      [0, 17], [17, 18], [18, 19], [19, 20], // pinky
      [5, 9], [9, 13], [13, 17], // palm base
    ];

    ctx.save();

    // 1. Draw Skeleton Lines
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#00d2ff';
    ctx.shadowBlur = 3;

    for (const [start, end] of connections) {
      ctx.beginPath();
      ctx.moveTo(lm[start].x * w, lm[start].y * h);
      ctx.lineTo(lm[end].x * w, lm[end].y * h);
      ctx.stroke();
    }

    // 2. Draw Landmark Points
    for (let i = 0; i < lm.length; i++) {
      const pt = lm[i];
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, i === 4 || i === 8 ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fillStyle = i === 4 || i === 8 ? '#ff7a1a' : '#ffffff';
      ctx.fill();
    }

    // 3. Draw Neutral Zone & Hand Cursor
    // Un-mirror coordinate for video canvas overlay
    if (this.isCalibrated) {
      const rawNeutralX = (1.0 - this.neutralCx) * w;
      const rawNeutralY = this.neutralCy * h;

      // Faint neutral zone circle
      ctx.beginPath();
      ctx.arc(rawNeutralX, rawNeutralY, 0.07 * w, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(47, 139, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current palm cursor
      const rawPalmX = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5 * w;
      const rawPalmY = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5 * h;
      ctx.beginPath();
      ctx.arc(rawPalmX, rawPalmY, 4, 0, Math.PI * 2);
      ctx.fillStyle = this.state.status === 'VIEW' ? '#4cc2ff' : '#f59e0b';
      ctx.fill();
    }

    // 4. Calibration Visual Arc
    if (!this.isCalibrated && this.state.status === 'CALIBRATING') {
      const cx = w * 0.5;
      const cy = h * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2 * this.state.calibrationProgress);
      ctx.strokeStyle = '#4cc2ff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#4cc2ff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOLD STEADY...', cx, cy + 42);
    }

    ctx.restore();
  }
}
