/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Data Types
 */

export type ActiveSection = '01_MODEL' | '02_SIMULATION' | '03_RESULTS';

export type SimulationSubTab =
  | 'TEMPERATURE'
  | 'HEAT_FLUX'
  | 'DEFORMATION'
  | 'STRESS'
  | 'STRAIN';

export type StressViewMode =
  | 'FULL_RANGE'
  | 'CLIPPED_AT_YIELD'
  | 'YIELD_ZONE_MAP'
  | 'AWAY_FROM_CONSTRAINT';

export type ViewLayout = '1-VIEW' | '2-VIEW' | '4-VIEW';

export interface SimulationParameters {
  // Thermal & Environment
  innerWallTemp: number; // Ts: 300 to 900 °C (default 600)
  ambientTemp: number; // Tinf: 0 to 50 °C (default 25)
  convectionCoeff: number; // h: 5 to 100 W/m²K (default 20)
  internalPressure: number; // P: 0 to 10 MPa (default 2)

  // Geometry (mm)
  finCount: number; // N: 6 to 30 (default 15)
  finHeight: number; // h_f: 5 to 40 mm (default 20)
  finThickness: number; // t_f: 1 to 8 mm (default 3)
  length: number; // L: 200 to 600 mm (default 450)
  wallThickness: number; // t: 5 to 20 mm (default 10)
  outerDiameter: number; // OD: fixed 120 mm baseline (or computed from ID + 2*t)
  innerDiameter: number; // ID: 100 mm baseline

  // Material selection
  materialKey: 'AL_6061_T6' | 'TI_6AL_4V' | 'INCONEL_718' | 'STEEL_4130';

  // Visualization settings
  deformationExaggeration: number; // 1x to 300x (default 50x)
  colormapRangeMode: 'AUTO' | 'FIXED_ANSYS';
  smoothColormap: boolean;
  showFlange: boolean; // toggle flange (CAD only)
  explodedFinDistance: number; // 0 to 40 mm
  crossSectionCut: number; // -1 to 1 (clipping position)
  enableSectionCut: boolean;
  showBoundaryConditions: {
    fixedSupport: boolean;
    internalPressure: boolean;
    heatWall: boolean;
    convection: boolean;
  };
  showDimensionCallouts: boolean;
  wireframeOverlay: boolean;
  animationSpeed: number; // 0.5x to 3x
  snapToBaseline: boolean;
}

export interface MaterialProperties {
  name: string;
  density: number; // kg/m³
  elasticModulus: number; // Pa (e.g. 69e9)
  poissonsRatio: number; // ν
  thermalConductivity: number; // W/m·K
  specificHeat: number; // J/kg·K
  thermalExpansion: number; // /°C (e.g. 23e-6)
  yieldStrength: number; // Pa (e.g. 276e6)
  uts: number; // Pa (e.g. 310e6)
  meltingPoint: number; // °C (e.g. 660)
  notes: string;
}

export interface SurrogateKPIs {
  deltaT: number;
  finArea: number; // m²
  heatRejectionQ: number; // W
  scalingFactorF: number;
  wallTempDrop: number; // °C
  tempMax: number;
  tempMin: number;
  heatFluxMax: number; // W/m²
  heatFluxMin: number;
  heatFluxAvg: number;
  deformationMax: number; // mm
  deformationMin: number;
  stressMax: number; // Pa
  stressMin: number;
  stressAwayConstraint: number; // Pa
  strainMax: number; // m/m
  strainMin: number;
  homologousT: number; // T_wall_K / T_melt_K
  factorOfSafety: number; // yield / stressMax
  factorOfSafetyBulk: number; // yield / stressAwayConstraint
  yieldExceeded: boolean;
  finEfficiency: number; // η_f (0 to 1)
  surfaceEfficiency: number; // η_o (0 to 1)
  finEffectiveness: number;
  yieldZonePercent: number; // % of surface > yield
}

export interface TelemetrySpec {
  modelSource: 'CAD STL' | 'PARAMETRIC';
  fileName: string;
  isStlLoaded: boolean;
  stlNotFoundNotice: boolean;
  boundingBox: { length: number; width: number; height: number }; // mm
  vertexCount: number;
  triangleCount: number;
  fileSizeBytes: number;
  isManifoldValid: boolean;
  units: string;
}

export type GestureType = 'NONE' | 'OPEN_HAND' | 'FIST' | 'THREE_FINGERS';

export type GestureStatus = 'IDLE' | 'CALIBRATING' | 'VIEW' | 'IGNITING' | 'EXTINGUISHING';

export type FireState = 'READY' | 'IGNITION' | 'BURNING' | 'BURNOUT';

export interface GestureState {
  active: boolean;
  status: GestureStatus;
  gesture: GestureType;
  fingersExtended: number;
  fps: number;
  isCalibrated: boolean;
  calibrationProgress: number; // 0.0 to 1.0
  neutralCenter: { x: number; y: number } | null;
  neutralSize: number | null;
  handOffset: {
    dx: number; // -1 to 1 (azimuth offset)
    dy: number; // -1 to 1 (elevation offset)
    ds: number; // ratio s / s0 (zoom offset)
  };
  landmarks: Array<{ x: number; y: number; z: number }> | null;
}

export interface ProbedPoint {
  x: number;
  y: number;
  z: number;
  radius: number;
  fieldValue: number;
  fieldName: string;
  unit: string;
  screenPos: { x: number; y: number };
}
