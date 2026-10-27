/**
 * AURA - THERMO STRUCTURAL SIMULATOR - Configuration
 * Companion to VEERA-CADTRACK viewer
 * Overridable settings for STL CAD imports and baseline parameters
 */

export interface SimulationConfig {
  STL_PATH: string;
  STL_SCALE: number;
  STL_FLIP_AXIS: boolean;
  FLANGE_SIDE: 'positive_x' | 'negative_x';
  AUTO_CENTER: boolean;
  UNITS: 'mm';
  ACTIVE_THEME: 'BLUE' | 'CYAN' | 'AMBER' | 'VIOLET';
}

export const APP_CONFIG: SimulationConfig = {
  // Relative path so it works seamlessly on GitHub Pages and local builds
  STL_PATH: 'assets/finned_chamber.stl',
  STL_SCALE: 1.0,
  STL_FLIP_AXIS: false,
  FLANGE_SIDE: 'positive_x',
  AUTO_CENTER: true,
  UNITS: 'mm',
  ACTIVE_THEME: 'BLUE',
};

export const THEME_PALETTES = {
  BLUE: {
    name: 'ELECTRIC BLUE',
    primary: '#38bdf8',
    secondary: '#2563eb',
    accent: '#60a5fa',
    glow: 'rgba(56, 189, 248, 0.4)',
    border: 'rgba(56, 189, 248, 0.35)',
    cardBg: 'rgba(4, 12, 28, 0.88)',
  },
  CYAN: {
    name: 'NEON CYAN',
    primary: '#22d3ee',
    secondary: '#0891b2',
    accent: '#06b6d4',
    glow: 'rgba(34, 211, 238, 0.4)',
    border: 'rgba(34, 211, 238, 0.35)',
    cardBg: 'rgba(4, 16, 24, 0.88)',
  },
  AMBER: {
    name: 'THERMAL AMBER',
    primary: '#fbbf24',
    secondary: '#d97706',
    accent: '#f59e0b',
    glow: 'rgba(251, 191, 36, 0.4)',
    border: 'rgba(251, 191, 36, 0.35)',
    cardBg: 'rgba(24, 14, 4, 0.88)',
  },
  VIOLET: {
    name: 'QUANTUM VIOLET',
    primary: '#c084fc',
    secondary: '#7c3aed',
    accent: '#a855f7',
    glow: 'rgba(192, 132, 252, 0.4)',
    border: 'rgba(192, 132, 252, 0.35)',
    cardBg: 'rgba(16, 6, 28, 0.88)',
  },
};
