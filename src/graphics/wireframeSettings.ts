// Geometry uses the SVG's 520 × 500 coordinates. Rotations are degrees;
// perspective is radians, and pointerResponse is milliseconds.
export const wireframeSettings = {
  tilt: -23,
  rotation: 3,
  perspective: 0.075,
  wave: 7,
  pointerRotation: 3,
  pointerOffset: 4,
  pointerResponse: 650,
  markerDrift: 2.5,
  desktop: { columns: 22, rows: 24, samples: 28 },
  mobile: { columns: 14, rows: 16, samples: 20 },
};
