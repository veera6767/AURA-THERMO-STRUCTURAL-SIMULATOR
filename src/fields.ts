/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Spatial Field Evaluators
 * Evaluates physical scalar fields at any 3D coordinate (object space)
 * Identical formula implementation as the GLSL shader
 */

import { SimulationParameters, SurrogateKPIs, SimulationSubTab, StressViewMode } from './types';
import { MATERIALS } from './surrogate';

export interface FieldEvaluation {
  value: number;
  normalized: number; // 0.0 to 1.0
  unit: string;
  label: string;
  isYieldZone?: boolean;
}

export function evaluateFieldAtPoint(
  objX: number,
  objY: number,
  objZ: number,
  activeSubTab: SimulationSubTab,
  params: SimulationParameters,
  kpis: SurrogateKPIs,
  stressMode: StressViewMode = 'FULL_RANGE'
): FieldEvaluation {
  const L = params.length; // e.g. 450 mm
  const halfL = L / 2;
  // u in [0, 1] from fixed end (-halfL) to free end (+halfL)
  const u = Math.max(0, Math.min(1, (objX + halfL) / L));

  const r = Math.sqrt(objY * objY + objZ * objZ);
  const ri = params.innerDiameter / 2; // 50 mm
  const ro = params.outerDiameter / 2; // 60 mm
  const rMax = ro + params.finHeight; // 80 mm

  // Radial normalized position
  const radialNorm = Math.max(0, Math.min(1, (r - ri) / Math.max(1, rMax - ri)));
  const theta = Math.atan2(objZ, objY);

  switch (activeSubTab) {
    case 'TEMPERATURE': {
      // Hottest on bore & fin bases, cooling toward tips and slight axial cooling
      const radialCooling = radialNorm * 0.92;
      const axialCooling = u * 0.08;
      const norm = Math.max(0, Math.min(1, 1.0 - (radialCooling + axialCooling)));
      const value = kpis.tempMin + norm * (kpis.tempMax - kpis.tempMin);
      return {
        value,
        normalized: norm,
        unit: '°C',
        label: 'Temperature',
      };
    }

    case 'HEAT_FLUX': {
      // High along fin edges and roots, maximum near the rim at free end
      const rimPeak = Math.pow(u, 2.5);
      const finProximity = 0.5 + 0.5 * Math.cos(params.finCount * theta);
      const norm = Math.max(
        0,
        Math.min(1, 0.04 + 0.55 * Math.pow(radialNorm, 1.3) + 0.35 * rimPeak + 0.06 * finProximity)
      );
      const value = kpis.heatFluxMin + norm * (kpis.heatFluxMax - kpis.heatFluxMin);
      return {
        value,
        normalized: norm,
        unit: 'W/m²',
        label: 'Total Heat Flux',
      };
    }

    case 'DEFORMATION': {
      // 0 at fixed support (u = 0), growing to maximum at free end (u = 1)
      const norm = Math.pow(u, 1.3);
      const value = norm * kpis.deformationMax;
      return {
        value,
        normalized: norm,
        unit: 'mm',
        label: 'Total Deformation',
      };
    }

    case 'STRESS': {
      // Concentrated at fixed support (u ~ 0) and fin roots, decays quickly into bulk
      const mat = MATERIALS[params.materialKey] || MATERIALS.AL_6061_T6;
      const endConcentration = Math.exp(-u * 9.0);
      const finRootEffect = Math.sin(Math.PI * radialNorm) * 0.35 * Math.exp(-u * 4.0);
      const bulkRatio = kpis.stressAwayConstraint / Math.max(1, kpis.stressMax);

      const norm = Math.max(0, Math.min(1, endConcentration * 0.95 + finRootEffect + bulkRatio));
      const value = kpis.stressMin + norm * (kpis.stressMax - kpis.stressMin);
      const isYieldZone = value > mat.yieldStrength;

      if (stressMode === 'AWAY_FROM_CONSTRAINT') {
        // Exclude first 10% near fixed support
        const awayU = Math.max(0, (u - 0.1) / 0.9);
        const awayNorm = 0.2 + 0.8 * (1.0 - Math.exp(-awayU * 2.0));
        const awayValue = kpis.stressAwayConstraint * awayNorm;
        return {
          value: awayValue,
          normalized: Math.min(1, awayValue / kpis.stressAwayConstraint),
          unit: 'MPa',
          label: 'Bulk Von-Mises Stress',
          isYieldZone: false,
        };
      }

      return {
        value: value / 1e6, // return in MPa for UI readability
        normalized: norm,
        unit: 'MPa',
        label: 'Equivalent (von-Mises) Stress',
        isYieldZone,
      };
    }

    case 'STRAIN': {
      const endConcentration = Math.exp(-u * 9.0);
      const finRootEffect = Math.sin(Math.PI * radialNorm) * 0.35 * Math.exp(-u * 4.0);
      const bulkRatio = 0.012;
      const norm = Math.max(0, Math.min(1, endConcentration * 0.95 + finRootEffect + bulkRatio));
      const value = norm * kpis.strainMax;
      return {
        value,
        normalized: norm,
        unit: 'm/m',
        label: 'Equivalent Elastic Strain',
      };
    }
  }
}

/**
 * Returns exact 3D coordinates for the ANSYS Max and Min callout tags
 */
export function getFieldExtremaPositions(
  activeSubTab: SimulationSubTab,
  params: SimulationParameters
): {
  maxPos: [number, number, number];
  minPos: [number, number, number];
  maxValFormatted: string;
  minValFormatted: string;
} {
  const L = params.length;
  const halfL = L / 2;
  const ri = params.innerDiameter / 2;
  const ro = params.outerDiameter / 2;
  const rMax = ro + params.finHeight;

  switch (activeSubTab) {
    case 'TEMPERATURE':
      return {
        maxPos: [-halfL + 20, 0, ri], // inner wall bore
        minPos: [halfL - 10, rMax, 0], // outer fin tip near free end
        maxValFormatted: '600.0 °C',
        minValFormatted: '588.41 °C',
      };
    case 'HEAT_FLUX':
      return {
        maxPos: [halfL - 5, rMax - 2, 0], // outer fin rim near free end
        minPos: [-halfL + 30, ro + 2, 0], // outer cylinder base
        maxValFormatted: '1.031e5 W/m²',
        minValFormatted: '1202.3 W/m²',
      };
    case 'DEFORMATION':
      return {
        maxPos: [halfL, rMax, 0], // free end tip
        minPos: [-halfL, ri, 0], // fixed end face
        maxValFormatted: '3.32 mm',
        minValFormatted: '0.00 mm',
      };
    case 'STRESS':
      return {
        maxPos: [-halfL, ro, 0], // fixed end fin root junction
        minPos: [halfL * 0.4, ro + params.finHeight * 0.7, 0], // fin middle flank
        maxValFormatted: '3,927 MPa',
        minValFormatted: '0.12 MPa',
      };
    case 'STRAIN':
      return {
        maxPos: [-halfL, ro, 0], // fixed end fin root junction
        minPos: [halfL * 0.4, ro + params.finHeight * 0.7, 0],
        maxValFormatted: '0.0196 m/m',
        minValFormatted: '0.0000 m/m',
      };
  }
}
