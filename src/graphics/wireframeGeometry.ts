import { wireframeSettings as settings } from './wireframeSettings';

export interface Point {
  x: number;
  y: number;
}

interface SurfaceSample extends Point {
  envelope: number;
  waveSin: number;
  waveCos: number;
}

export interface WireframeLine {
  opacity: number;
  points: SurfaceSample[];
}

export const fullTurn = Math.PI * 2;
const radians = Math.PI / 180;
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const bezier = (a: number, b: number, c: number, d: number, t: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;

// Cache the curved surface and wave coordinates when density changes. The frame
// loop only projects these samples; it does not rebuild the patch for every point.
function sampleSurface(u: number, v: number): SurfaceSample {
  const top = { x: bezier(96, 180, 300, 404, u), y: bezier(120, 40, 200, 120, u) };
  const bottom = { x: bezier(96, 120, 360, 404, u), y: bezier(380, 440, 480, 380, u) };
  const left = { x: bezier(96, 55, 70, 96, v), y: bezier(120, 160, 390, 380, v) };
  const right = { x: bezier(404, 435, 460, 404, v), y: bezier(120, 270, 280, 380, v) };
  const wavePhase = u * fullTurn + v * Math.PI;
  return {
    x: mix(left.x, right.x, u) + mix(top.x, bottom.x, v) - mix(96, 404, u) - 260,
    y: mix(left.y, right.y, u) + mix(top.y, bottom.y, v) - mix(120, 380, v) - 250,
    envelope: Math.sin(u * Math.PI) * Math.sin(v * Math.PI),
    waveSin: Math.sin(wavePhase),
    waveCos: Math.cos(wavePhase),
  };
}

export function createSurfaceFrame(phase = 0, pointer: Point = { x: 0, y: 0 }) {
  const phaseSin = Math.sin(phase);
  const phaseCos = Math.cos(phase);
  const yaw = phaseSin * settings.perspective + pointer.x * settings.pointerRotation * radians;
  const pitch =
    phaseCos * settings.perspective * 0.6 + pointer.y * settings.pointerRotation * radians;
  const angle = (settings.tilt + phaseSin * settings.rotation + pointer.x * 2) * radians;
  return {
    phaseSin,
    phaseCos,
    yawSin: Math.sin(yaw),
    yawCos: Math.cos(yaw),
    pitchSin: Math.sin(pitch),
    pitchCos: Math.cos(pitch),
    angleSin: Math.sin(angle),
    angleCos: Math.cos(angle),
    offsetX: 260 + pointer.x * settings.pointerOffset,
    offsetY: 250 + pointer.y * settings.pointerOffset,
  };
}

function projectSurface(
  sample: SurfaceSample,
  frame: ReturnType<typeof createSurfaceFrame>,
): Point {
  const wave =
    (sample.waveSin * frame.phaseCos + sample.waveCos * frame.phaseSin) *
    sample.envelope *
    settings.wave;
  const depth = sample.envelope * 32;
  const x = sample.x * frame.yawCos + depth * frame.yawSin;
  const y = (sample.y + wave) * frame.pitchCos - depth * frame.pitchSin;
  return {
    x: frame.offsetX + x * frame.angleCos - y * frame.angleSin,
    y: frame.offsetY + x * frame.angleSin + y * frame.angleCos,
  };
}

export function createWireframeLines(density: {
  columns: number;
  rows: number;
  samples: number;
}): WireframeLine[] {
  return (['column', 'row'] as const).flatMap((direction) => {
    const count = direction === 'column' ? density.columns : density.rows;
    return Array.from({ length: count + 1 }, (_, index) => ({
      opacity: 0.24 + Math.sin((index / count) * Math.PI) * (direction === 'column' ? 0.38 : 0.25),
      points: Array.from({ length: density.samples + 1 }, (_, sample) =>
        sampleSurface(
          direction === 'row' ? sample / density.samples : index / count,
          direction === 'row' ? index / count : sample / density.samples,
        ),
      ),
    }));
  });
}

export function linePath(line: WireframeLine, frame = createSurfaceFrame()): string {
  let path = '';
  for (let index = 0; index < line.points.length; index++) {
    const point = projectSurface(line.points[index], frame);
    path += `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }
  return path;
}

export const travellingNodes = [
  { direction: 'row', position: 0.25, offset: 0.14 },
  { direction: 'column', position: 0.5, offset: 0.52 },
  { direction: 'row', position: 0.75, offset: 0.78 },
] as const;

export function nodePoint(
  node: (typeof travellingNodes)[number],
  phase = 0,
  frame = createSurfaceFrame(phase),
): Point {
  // Back-and-forth travel avoids an endpoint teleport at the end of each cycle.
  const along = 0.5 - Math.cos(phase + node.offset * fullTurn) * 0.45;
  return projectSurface(
    sampleSurface(
      node.direction === 'row' ? along : node.position,
      node.direction === 'row' ? node.position : along,
    ),
    frame,
  );
}
