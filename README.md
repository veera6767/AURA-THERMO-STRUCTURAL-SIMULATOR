# AURA - THERMO STRUCTURAL SIMULATOR
### Thermal & Structural Telemetry Viewer for Externally Finned Solid Propellant Rocket Motor Chambers
**Companion to VEERA-CADTRACK // ANSYS Workbench 2025 R2 FEA Benchmarked**

---

## Overview
**AURA - THERMO STRUCTURAL SIMULATOR** is a high-fidelity, futuristic mission-control web simulation platform designed to visualize and investigate the coupled steady-state thermal and static structural behavior of an externally finned rocket motor chamber. It provides real-time surrogate FEA analysis calibrated against ANSYS Workbench 2025 R2, custom per-pixel GLSL contour shader rendering, multi-view synchronized layouts (1-VIEW, 2-VIEW, 4-VIEW), and single-hand MediaPipe AI gesture telemetry.

---

## File Tree
```
├── assets/
│   ├── README.txt                     # STL placement instructions
│   └── finned_chamber.stl             # [User CAD STL slot, optional]
├── public/
│   └── assets/
│       └── README.txt                 # Public assets mirror
├── src/
│   ├── components/
│   │   ├── GestureTelemetryCard.tsx   # Live MediaPipe webcam & skeletal landmark HUD
│   │   ├── HeaderToolbar.tsx          # Top mission-control toolbar matching VEERA-CADTRACK
│   │   ├── HelpModal.tsx              # Gesture cheat-sheet & keyboard controls guide
│   │   ├── MiniHud.tsx                # Azimuth, elevation, zoom, & tracking mini HUD
│   │   ├── ParameterDrawer.tsx        # Slide-out drawer with real-time parametric sliders
│   │   ├── ProbeTooltip.tsx           # 3D click-to-probe scalar value popup
│   │   ├── SectionModelView.tsx       # Section 01: Geometry, stubs, flange, boundary conditions
│   │   ├── SectionNavigation.tsx      # Top-center section and sub-tab selector
│   │   ├── SectionResultsView.tsx     # Section 03: Analytical vs ANSYS, fin efficiency, charts
│   │   ├── SectionSimulationView.tsx  # Section 02: 9-band legend, timeline, peak stress advisor
│   │   └── ThreeCanvas.tsx            # Multi-view WebGL viewport with custom GLSL shaders
│   ├── config.ts                      # Overridable settings (STL path, orientation, theme)
│   ├── fields.ts                      # Analytic scalar field evaluators (temperature, flux, stress)
│   ├── geometry.ts                    # Procedural CAD generator & auto-orienting STL loader
│   ├── gestures.ts                    # MediaPipe Tasks Vision HandLandmarker engine
│   ├── shader.ts                      # GLSL vertex & fragment shaders with ANSYS 9-band colormap
│   ├── surrogate.ts                   # FEA surrogate model calibrated to ANSYS 2025 R2
│   ├── types.ts                       # TypeScript interfaces and telemetry types
│   ├── App.tsx                        # Main mission control hub & state orchestration
│   ├── index.css                      # HUD styling, cyan glows, and cyber blueprint grid
│   └── main.tsx                       # React application mount
├── index.html                         # Entry point with Orbitron/JetBrains fonts & title
├── metadata.json                      # AI Studio metadata & camera frame permissions
├── package.json                       # Dependencies (Three.js, Lucide, Tailwind CSS)
├── tsconfig.json                      # TypeScript configuration
├── vite.config.ts                     # Vite build configuration
└── README.md                          # Comprehensive documentation & deployment guide
```

---

## HOW TO ADD MY STL (SolidWorks CAD Import)

You can view your exact SolidWorks CAD export directly inside the simulator without touching code:

1. **Export from SolidWorks:**
   - In SolidWorks, open your finned rocket motor chamber model.
   - Click **File > Save As...** and select **STL (*.stl)**.
   - Click **Options...** in the Save dialog:
     - Output as: **Binary**
     - Unit: **Millimeters (mm)**
     - Resolution: **Fine** (Deviation tolerance ~0.05 mm, Angle tolerance ~10°)
   - Save the file as: `finned_chamber.stl`.

2. **Drop into Assets:**
   - Copy `finned_chamber.stl` into the `public/assets/` folder (or `assets/`):
     ```bash
     cp /path/to/finned_chamber.stl public/assets/finned_chamber.stl
     ```

3. **Deploy to GitHub Pages:**
   - Add, commit, and push your STL file:
     ```bash
     git add public/assets/finned_chamber.stl
     git commit -m "Add SolidWorks finned_chamber.stl CAD model"
     git push origin main
     ```
   - Wait for the GitHub Pages deployment action to complete.
   - Hard-refresh your browser tab (**Ctrl + Shift + R** or **Cmd + Shift + R** on Mac) to bypass cached assets.
   - The top-right TELEMETRY-SPEC card will immediately switch from `PARAMETRIC` to **`CAD STL`**, and the mesh's exact vertex count, triangle count, and file size will be displayed!

4. **Adjusting Orientation in `src/config.ts` (if needed):**
   - The simulator automatically detects the long axial axis and rotates it to the X-axis, and puts the larger-radius flange on the `+X` side.
   - If your model appears rotated, mirrored, or scaled differently, adjust the settings in `src/config.ts`:
     ```typescript
     export const APP_CONFIG = {
       STL_PATH: 'assets/finned_chamber.stl',
       STL_SCALE: 1.0,               // Change to 0.001 if exported in meters instead of mm
       STL_FLIP_AXIS: false,         // Set to true if the flange is on the wrong side
       FLANGE_SIDE: 'positive_x',    // 'positive_x' or 'negative_x'
       AUTO_CENTER: true,
       UNITS: 'mm',
       ACTIVE_THEME: 'BLUE',
     };
     ```

---

## Local Development & Running

### Requirements
- Node.js (v18 or later)
- npm or pnpm

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev

# 3. Open in browser
# Navigate to http://localhost:3000
```

### Production Build
```bash
npm run build
```
The output will be generated in `dist/`, ready to deploy to GitHub Pages, Cloud Run, Vercel, or Netlify.

---

## MediaPipe Hand Gestures (Single Hand)
- **OPEN HAND (5 fingers):** Orbit and elevate the 3D rocket chamber.
- **PINCH (thumb + index):** Zoom into features proportional to pinch distance.
- **FIST:** Freeze and hold camera view.
- **POINTING (index only) + SWIPE:** Switch result sub-tabs (Temperature, Flux, Deformation, Stress, Strain).
- **PEACE SIGN:** Play/pause physical simulation timeline.
- *Fallback:* Full mouse drag, wheel zoom, and keyboard shortcuts (`1`, `2`, `3`, `Space`, `R`, arrow keys) remain active at all times.

---

## ANSYS Workbench 2025 R2 Baseline Reference
- **Inner Wall Temp (Ts):** 600 °C (Inner bore radius $r_i = 50$ mm)
- **Ambient Temp ($T_\infty$):** 25 °C, $h = 20$ W/m²K convection
- **Internal Pressure:** 2.0 MPa
- **Al 6061-T6:** $E = 69$ GPa, $\nu = 0.33$, $k = 167$ W/mK, $\alpha = 23 \times 10^{-6}$ /°C, $\sigma_y = 276$ MPa
- **Peak Heat Flux:** $1.031 \times 10^5$ W/m²
- **Max Deformation:** 3.32 mm (thermal expansion dominant)
- **Peak Stress Hot Spot:** 3.93 GPa at fixed support & fin-root corners (evaluated via Design-Fix Advisor and Yield Zone mapping modes).
- **Fin Efficiency ($\eta_f$):** 98.8% (corrected straight-fin Incropera standard).
