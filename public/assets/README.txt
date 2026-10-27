AURA - THERMO STRUCTURAL SIMULATOR - STL ASSET DIRECTORY
======================================================

Place your exported SolidWorks CAD STL file here:
  File name: finned_chamber.stl
  Full path: assets/finned_chamber.stl (or public/assets/finned_chamber.stl)

SPECIFICATIONS & EXPORT TIPS:
- Units: millimeters (mm)
- Bounding Box: ~120-170 mm diameter x 480 mm length
- Mesh Quality: Fine / Deviation tolerance 0.05 mm
- Coordinate alignment: Any orientation (the application automatically aligns the axial vector to X and places the flange on +X).
- If your CAD export has custom scale or needs axis flipping, adjust `src/config.ts` (STL_SCALE, STL_FLIP_AXIS, FLANGE_SIDE).

When this file is present, the simulator automatically detects it, loads it via Three.js STLLoader, displays "CAD STL" in the TELEMETRY-SPEC card, and maps all ANSYS thermal/structural contour fields seamlessly onto the surface!
