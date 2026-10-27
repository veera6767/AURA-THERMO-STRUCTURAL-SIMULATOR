/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Surrogate FEA Model
 * Calibrated strictly to ANSYS Workbench 2025 R2 Baseline Run
 */

import { MaterialProperties, SimulationParameters, SurrogateKPIs } from './types';

export const MATERIALS: Record<string, MaterialProperties> = {
  AL_6061_T6: {
    name: 'Aluminum 6061-T6 (Baseline)',
    density: 2700,
    elasticModulus: 69e9,
    poissonsRatio: 0.33,
    thermalConductivity: 167,
    specificHeat: 896,
    thermalExpansion: 23e-6,
    yieldStrength: 276e6,
    uts: 310e6,
    meltingPoint: 660,
    notes: 'ANSYS Workbench 2025 R2 baseline material',
  },
  TI_6AL_4V: {
    name: 'Titanium Ti-6Al-4V (Grade 5)',
    density: 4430,
    elasticModulus: 113.8e9,
    poissonsRatio: 0.342,
    thermalConductivity: 6.7,
    specificHeat: 526,
    thermalExpansion: 8.6e-6,
    yieldStrength: 880e6,
    uts: 950e6,
    meltingPoint: 1660,
    notes: 'High strength, high melting temp, low thermal conductivity',
  },
  INCONEL_718: {
    name: 'Inconel 718 (Nickel Superalloy)',
    density: 8190,
    elasticModulus: 200e9,
    poissonsRatio: 0.294,
    thermalConductivity: 11.4,
    specificHeat: 435,
    thermalExpansion: 13e-6,
    yieldStrength: 1100e6,
    uts: 1375e6,
    meltingPoint: 1336,
    notes: 'Superb hot-gas strength, aerospace standard for extreme rocket chambers',
  },
  STEEL_4130: {
    name: 'Alloy Steel 4130 (Normalized)',
    density: 7850,
    elasticModulus: 205e9,
    poissonsRatio: 0.29,
    thermalConductivity: 42.7,
    specificHeat: 477,
    thermalExpansion: 12.3e-6,
    yieldStrength: 435e6,
    uts: 670e6,
    meltingPoint: 1432,
    notes: 'Robust aerospace structural steel, moderate conductivity',
  },
};

export const BASELINE_PARAMETERS: SimulationParameters = {
  innerWallTemp: 600,
  ambientTemp: 25,
  convectionCoeff: 20,
  internalPressure: 2,
  finCount: 15,
  finHeight: 20,
  finThickness: 3,
  length: 450,
  wallThickness: 10,
  outerDiameter: 120,
  innerDiameter: 100,
  materialKey: 'AL_6061_T6',
  deformationExaggeration: 50,
  colormapRangeMode: 'AUTO',
  smoothColormap: true,
  showFlange: true,
  explodedFinDistance: 0,
  crossSectionCut: 0,
  enableSectionCut: false,
  showBoundaryConditions: {
    fixedSupport: true,
    internalPressure: true,
    heatWall: true,
    convection: true,
  },
  showDimensionCallouts: true,
  wireframeOverlay: false,
  animationSpeed: 1.0,
  snapToBaseline: true,
};

export function computeSurrogateKPIs(params: SimulationParameters): SurrogateKPIs {
  const mat = MATERIALS[params.materialKey] || MATERIALS.AL_6061_T6;

  // Temperature difference
  const deltaT = params.innerWallTemp - params.ambientTemp; // baseline 575 °C
  const deltaT_norm = deltaT / 575;

  // Fin surface area (m²)
  // A_fin = N * 2 * L * h_f
  const L_m = params.length / 1000;
  const hf_m = params.finHeight / 1000;
  const tf_m = params.finThickness / 1000;
  const finArea = params.finCount * 2 * L_m * hf_m; // baseline 15 * 2 * 0.45 * 0.02 = 0.27 m²
  const finArea_norm = finArea / 0.27;

  // Heat rejection Q (W)
  const heatRejectionQ = params.convectionCoeff * finArea * deltaT; // baseline 20 * 0.27 * 575 = 3105 W = 3.11 kW

  // Non-dimensional scaling factor F
  // F = (h / 20) * (deltaT / 575) * (A_fin / 0.27)
  const h_norm = params.convectionCoeff / 20;
  const F = h_norm * deltaT_norm * finArea_norm;

  // Wall temperature drop (°C)
  // Wall drop = 11.59 °C * F * (t / 10) * (167 / k)
  const t_wall_norm = params.wallThickness / 10;
  const k_norm = 167 / mat.thermalConductivity;
  const wallTempDrop = 11.59 * F * t_wall_norm * k_norm;

  const tempMax = params.innerWallTemp;
  const tempMin = Math.max(params.ambientTemp, params.innerWallTemp - wallTempDrop);

  // Total heat flux (W/m²)
  const heatFluxMax = 1.0305e5 * F;
  const heatFluxMin = 1202.3 * F;
  const heatFluxAvg = 3.99e4 * F;

  // Total deformation (mm)
  // Max = 3.3202 mm * [0.9 * (alpha / 23e-6) * (deltaT / 575) * (L / 450) + 0.1 * (P / 2) * (10 / t) * (69e9 / E)]
  const alpha_norm = mat.thermalExpansion / 23e-6;
  const L_norm = params.length / 450;
  const P_norm = params.internalPressure / 2;
  const E_norm = 69e9 / mat.elasticModulus;
  const t_inv_norm = 10 / params.wallThickness;

  const thermalDeformWeight = 0.9 * alpha_norm * deltaT_norm * L_norm;
  const pressureDeformWeight = 0.1 * P_norm * t_inv_norm * E_norm;
  const deformationMax = 3.3202 * (thermalDeformWeight + pressureDeformWeight);
  const deformationMin = 0.0;

  // Von-Mises stress (Pa)
  // Max = 3.927e9 Pa * [0.9 * (E*alpha)/(69e9*23e-6) * (deltaT / 575) + 0.1 * (P / 2) * (10 / t)]
  const e_alpha_norm = (mat.elasticModulus * mat.thermalExpansion) / (69e9 * 23e-6);
  const thermalStressWeight = 0.9 * e_alpha_norm * deltaT_norm;
  const pressureStressWeight = 0.1 * P_norm * t_inv_norm;
  const stressRatio = thermalStressWeight + pressureStressWeight;

  const stressMax = 3.927e9 * stressRatio;
  const stressMin = 1.2e5 * stressRatio;

  // Away from constraint (bulk) stress: hoop stress + mild thermal gradient ~ 35-45 MPa at baseline
  // sigma_hoop = P * r / t = 2 MPa * 50 mm / 10 mm = 10 MPa
  const ri_m = (params.outerDiameter / 2 - params.wallThickness) / 1000;
  const hoopStressPa = (params.internalPressure * 1e6 * ri_m) / (params.wallThickness / 1000);
  const bulkThermalStressPa = 25e6 * deltaT_norm * e_alpha_norm;
  const stressAwayConstraint = hoopStressPa + bulkThermalStressPa;

  // Elastic strain (m/m)
  // Max = 0.019635 * (stress ratio) * (69e9 / E)
  const strainMax = 0.019635 * stressRatio * E_norm;
  const strainMin = 0.0;

  // Homologous temperature: T_wall(K) / T_melt(K)
  const T_wall_K = params.innerWallTemp + 273.15;
  const T_melt_K = mat.meltingPoint + 273.15;
  const homologousT = T_wall_K / T_melt_K;

  // Factor of Safety: FoS = yield / max stress
  const factorOfSafety = mat.yieldStrength / Math.max(stressMax, 1);
  const factorOfSafetyBulk = mat.yieldStrength / Math.max(stressAwayConstraint, 1);
  const yieldExceeded = factorOfSafety < 1.0;

  // Corrected Fin Efficiency (Incropera straight fin standard formula)
  // m = sqrt(2h / (k * t_f))
  // L_c = h_f + t_f / 2
  // eta_f = tanh(m * L_c) / (m * L_c)
  const m = Math.sqrt((2 * params.convectionCoeff) / (mat.thermalConductivity * tf_m));
  const Lc = hf_m + tf_m / 2;
  const mLc = m * Lc;
  const finEfficiency = mLc > 0.0001 ? Math.tanh(mLc) / mLc : 1.0;

  // Total surface area including outer bore cylinder exposed between fins
  const ro_m = params.outerDiameter / 2000;
  const unfinnedBoreCirc = 2 * Math.PI * ro_m - params.finCount * tf_m;
  const unfinnedBoreArea = Math.max(0, unfinnedBoreCirc * L_m);
  const totalOuterArea = unfinnedBoreArea + finArea;
  const surfaceEfficiency = 1 - (finArea / Math.max(totalOuterArea, 0.01)) * (1 - finEfficiency);

  // Fin effectiveness: Q_with_fins / Q_without_fins (on same base area)
  const baseAreaUnderFins = params.finCount * tf_m * L_m;
  const qBaseNoFins = params.convectionCoeff * baseAreaUnderFins * deltaT;
  const finEffectiveness = qBaseNoFins > 0 ? (heatRejectionQ * (finArea / (totalOuterArea || 1))) / qBaseNoFins : 1.0;

  // Estimate surface percentage exceeding yield strength (from analytic stress distribution)
  // Hot spots are concentrated in the first ~10% of length and around the fin root fillets (~8-12% of area)
  const yieldRatio = stressMax / mat.yieldStrength;
  let yieldZonePercent = 0;
  if (yieldRatio > 1.0) {
    // Realistic exponential hot-spot area decay
    yieldZonePercent = Math.min(45, Math.max(3.2, 8.5 * Math.log(yieldRatio) + 1.5));
  }

  return {
    deltaT,
    finArea,
    heatRejectionQ,
    scalingFactorF: F,
    wallTempDrop,
    tempMax,
    tempMin,
    heatFluxMax,
    heatFluxMin,
    heatFluxAvg,
    deformationMax,
    deformationMin,
    stressMax,
    stressMin,
    stressAwayConstraint,
    strainMax,
    strainMin,
    homologousT,
    factorOfSafety,
    factorOfSafetyBulk,
    yieldExceeded,
    finEfficiency,
    surfaceEfficiency,
    finEffectiveness,
    yieldZonePercent,
  };
}

export function solveMaxInnerWallTempForFoS1(params: SimulationParameters): number {
  const mat = MATERIALS[params.materialKey] || MATERIALS.AL_6061_T6;
  const targetStress = mat.yieldStrength; // FoS = 1.0
  const t_inv_norm = 10 / params.wallThickness;
  const P_norm = params.internalPressure / 2;
  const pressureTerm = 0.1 * P_norm * t_inv_norm;

  const targetRatio = targetStress / 3.927e9;
  const remainingThermalRatio = targetRatio - pressureTerm;
  if (remainingThermalRatio <= 0) return params.ambientTemp;

  const e_alpha_norm = (mat.elasticModulus * mat.thermalExpansion) / (69e9 * 23e-6);
  const deltaT_norm = remainingThermalRatio / (0.9 * e_alpha_norm);
  const deltaT = deltaT_norm * 575;
  return Math.max(params.ambientTemp, Math.min(1200, Math.round(params.ambientTemp + deltaT)));
}
