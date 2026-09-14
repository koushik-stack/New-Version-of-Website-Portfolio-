import { wireframeSettings as settings } from './wireframeSettings';

export interface Point {
  x: number;
  y: number;
}

export interface WireframeLine {
  direction: 'row' | 'column';
  position: number;
  opacity: number;
}

export const fullTurn = Math.PI * 2;
const radians = Math.PI / 180;
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const bezier = (a: number, b: number, c: number, d: number, t: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;

// A Coons patch joins four curved boundaries. Both grid directions and every
// travelling node sample this one surface, so the intersections stay connected.
export function surfacePoint(
  u: number,
  v: number,
  phase = 0,
  pointer: Point = { x: 0, y: 0 },
): Point {
  const top = { x: bezier(96, 180, 300, 404, u), y: bezier(120, 40, 200, 120, u) };
  const bottom = { x: bezier(96, 120, 360, 404, u), y: bezier(380, 440, 480, 380, u) };
  const left = { x: bezier(96, 55, 70, 96, v), y: bezier(120, 160, 390, 380, v) };
  const right = { x: bezier(404, 435, 460, 404, v), y: bezier(120, 270, 280, 380, v) };
  let x = mix(left.x, right.x, u) + mix(top.x, bottom.x, v) - mix(96, 404, u) - 260;
  let y = mix(left.y, right.y, u) + mix(top.y, bottom.y, v) - mix(120, 380, v) - 250;
  const envelope = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
  y += Math.sin(u * fullTurn + v * Math.PI + phase) * envelope * settings.wave;
  const depth = envelope * 32;
  const yaw =
    Math.sin(phase) * settings.perspective + pointer.x * settings.pointerRotation * radians;
  const pitch =
    Math.cos(phase) * settings.perspective * 0.6 + pointer.y * settings.pointerRotation * radians;
  x = x * Math.cos(yaw) + depth * Math.sin(yaw);
  y = y * Math.cos(pitch) - depth * Math.sin(pitch);
  const angle = (settings.tilt + Math.sin(phase) * settings.rotation) * radians;
  return {
    x: 260 + x * Math.cos(angle) - y * Math.sin(angle) + pointer.x * settings.pointerOffset,
    y: 250 + x * Math.sin(angle) + y * Math.cos(angle) + pointer.y * settings.pointerOffset,
  };
}

export function createWireframeLines(density: { columns: number; rows: number }): WireframeLine[] {
  return (['column', 'row'] as const).flatMap((direction) => {
    const count = direction === 'column' ? density.columns : density.rows;
    return Array.from({ length: count + 1 }, (_, index) => ({
      direction,
      position: index / count,
      opacity: 0.24 + Math.sin((index / count) * Math.PI) * (direction === 'column' ? 0.38 : 0.25),
    }));
  });
}

export function linePath(line: WireframeLine, samples: number, phase = 0, pointer?: Point): string {
  const points = Array.from({ length: samples + 1 }, (_, index) => {
    const along = index / samples;
    const point = surfacePoint(
      line.direction === 'row' ? along : line.position,
      line.direction === 'row' ? line.position : along,
      phase,
      pointer,
    );
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  });
  return points.join('');
}

export const travellingNodes = [
  { direction: 'row', position: 0.25, offset: 0.14 },
  { direction: 'column', position: 0.5, offset: 0.52 },
  { direction: 'row', position: 0.75, offset: 0.78 },
] as const;

export function nodePoint(
  node: (typeof travellingNodes)[number],
  phase = 0,
  pointer?: Point,
): Point {
  // Back-and-forth travel avoids an endpoint teleport at the end of each cycle.
  const along = 0.5 - Math.cos(phase + node.offset * fullTurn) * 0.45;
  return surfacePoint(
    node.direction === 'row' ? along : node.position,
    node.direction === 'row' ? node.position : along,
    phase,
    pointer,
  );
}
