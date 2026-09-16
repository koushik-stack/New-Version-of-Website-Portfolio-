const fullTurn = Math.PI * 2;
export const fieldSize = { width: 520, height: 500 };

export interface PointerPosition {
  x: number;
  y: number;
}

export interface FieldRotation {
  yaw: number;
  pitch: number;
}

export interface ParticleRipple extends PointerPosition {
  age: number;
}

export const rippleDuration = 1.4;

interface FieldFrame {
  phase: number;
  pulse: number;
  delta: number;
  rotation: FieldRotation;
  pointer: PointerPosition | null;
  ripples: readonly ParticleRipple[];
}

// A fixed seed gives every resize and reduced-motion view the same composition.
function createRandom() {
  let seed = 7301;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function createParticleField(context: CanvasRenderingContext2D, compact: boolean) {
  const random = createRandom();
  // Pick the budget once, so resizing never respawns particles or loses their offsets.
  const rows = compact ? 13 : 17;
  const columns = compact ? 43 : 57;
  const lanes = compact ? 5 : 6;
  const trailLength = compact ? 80 : 104;
  const wave = Array.from({ length: rows * columns }, (_, index) => ({
    u: (index % columns) / (columns - 1),
    v: Math.floor(index / columns) / (rows - 1),
  }));
  const trails = Array.from({ length: lanes * trailLength }, (_, index) => ({
    angle: ((index % trailLength) / trailLength) * fullTurn,
    lane: (Math.floor(index / trailLength) / (lanes - 1) - 0.5) * 5,
    size: 0.65 + random() * 0.36,
  }));
  const cloudCount = compact ? 150 : 210;
  const cloud = Array.from({ length: cloudCount }, (_, index) => {
    const radius = index < cloudCount * 0.66 ? 4 + random() ** 1.7 * 66 : 85 + random() * 95;
    const latitude = random() * 2 - 1;
    return {
      radius,
      latitude,
      ring: Math.sqrt(1 - latitude * latitude),
      angle: random() * fullTurn,
      size: 0.55 + random() * 0.6,
      alpha: 0.2 + random() * 0.43,
      color: index % 3 === 0 ? '#76d9ed' : '#78e6c3',
    };
  });
  const count = wave.length + trails.length + cloud.length;
  const offsetX = new Float32Array(count);
  const offsetY = new Float32Array(count);
  const emphasis = new Float32Array(count);
  const halo = context.createRadialGradient(260, 250, 0, 260, 250, 142);
  halo.addColorStop(0, '#78e6c316');
  halo.addColorStop(0.5, '#76d9ed08');
  halo.addColorStop(1, '#78e6c300');
  const glow = context.createRadialGradient(260, 250, 0, 260, 250, 51);
  glow.addColorStop(0, '#d8fff3e0');
  glow.addColorStop(0.05, '#a0f2d798');
  glow.addColorStop(0.2, '#78e6c330');
  glow.addColorStop(0.6, '#76d9ed0d');
  glow.addColorStop(1, '#76d9ed00');

  return ({ phase, pulse, delta, rotation, pointer, ripples }: FieldFrame) => {
    // Bounded 3D rotation around a fixed center. The camera stays well outside
    // the field, so perspective never approaches a singularity or stretches it.
    const { yaw, pitch } = rotation;
    const roll = -0.36;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const response = 1 - Math.exp(-delta * 18);
    let index = 0;

    const dot = (x: number, y: number, z: number, radius: number, alpha: number) => {
      const rotatedX = x * cy + z * sy;
      const rotatedZ = z * cy - x * sy;
      const rotatedY = y * cp - rotatedZ * sp;
      const depth = y * sp + rotatedZ * cp;
      const perspective = (820 / (820 - depth)) * 1.09;
      const px = 260 + (rotatedX * cr - rotatedY * sr) * perspective;
      const py = 250 + (rotatedX * sr + rotatedY * cr) * perspective;
      let pushX = 0;
      let pushY = 0;
      let light = 0;
      if (pointer) {
        const dx = px - pointer.x;
        const dy = py - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 58) {
          const proximity = 1 - distance / 58;
          const influence = proximity * proximity * (3 - 2 * proximity);
          // The direction is stable even when the cursor lands exactly on a dot.
          const nx = distance > 0.01 ? dx / distance : Math.cos(index * 2.39996);
          const ny = distance > 0.01 ? dy / distance : Math.sin(index * 2.39996);
          pushX = nx * influence * 18;
          pushY = ny * influence * 18;
          light = influence * 0.24;
        }
      }
      for (const ripple of ripples) {
        const dx = px - ripple.x;
        const dy = py - ripple.y;
        const distance = Math.hypot(dx, dy);
        const band = (distance - ripple.age * 190) / 23;
        if (Math.abs(band) > 3) continue;
        const fade = (1 - ripple.age / rippleDuration) ** 2;
        const strength = Math.exp(-band * band) * (1 - Math.exp(-ripple.age * 24)) * fade;
        const inverseDistance = 1 / Math.max(distance, 1);
        pushX += dx * inverseDistance * strength * 7;
        pushY += dy * inverseDistance * strength * 7;
        light += strength * 0.3;
      }
      const magnitude = Math.hypot(pushX, pushY);
      const limit = magnitude > 20 ? 20 / magnitude : 1;
      offsetX[index] += (pushX * limit - offsetX[index]) * response;
      offsetY[index] += (pushY * limit - offsetY[index]) * response;
      emphasis[index] += (Math.min(light, 0.35) - emphasis[index]) * response;
      context.globalAlpha = Math.min(
        1,
        alpha * (0.8 + (depth + 140) / 560) + emphasis[index] * Math.min(1, alpha * 3),
      );
      context.beginPath();
      context.arc(px + offsetX[index], py + offsetY[index], radius * perspective, 0, fullTurn);
      context.fill();
      index++;
    };

    context.globalAlpha = 1;
    context.fillStyle = halo;
    context.fillRect(0, 0, fieldSize.width, fieldSize.height);

    // A dotted sheet with soft edges; the wave travels through it continuously.
    context.fillStyle = '#76d9ed';
    for (const { u, v } of wave) {
      const envelope = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
      const x = (u - 0.5) * 370;
      const z = (v - 0.5) * 190;
      const y =
        64 +
        Math.sin(u * fullTurn * 1.2 + v * 2.5 - phase * 0.55) * 19 -
        Math.cos((u - 0.5) * Math.PI) * 27 +
        Math.cos(v * Math.PI) * 16;
      dot(x, y, z, 0.67, envelope * 0.41);
    }

    // Closed, gently warped trails have no spawning seam or endpoint teleport.
    for (const { angle, lane, size } of trails) {
      const theta = angle + phase * 0.16 + lane * 0.045;
      const radius = 137 + lane * 8 + Math.sin(theta) * 22;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius * 0.63 + Math.sin(theta * 2) * 18 + lane * 3;
      const z = Math.sin(theta + lane * 0.16) * 67 + lane * 7;
      const alpha = 0.29 + (0.5 + Math.cos(theta - 0.7) * 0.5) * 0.47;
      context.fillStyle = lane < 0 ? '#76d9ed' : '#78e6c3';
      dot(x, y, z, size, alpha);
    }

    for (const particle of cloud) {
      const angle = particle.angle + phase * 0.08;
      const radius = particle.radius + Math.sin(phase * 0.3 + particle.angle) * 2;
      context.fillStyle = particle.color;
      dot(
        Math.cos(angle) * particle.ring * radius,
        Math.sin(angle) * particle.ring * radius * 0.82,
        particle.latitude * radius * 0.7,
        particle.size,
        particle.alpha,
      );
    }

    context.globalAlpha = 0.94 + Math.sin(pulse) * 0.045;
    context.fillStyle = glow;
    context.fillRect(209, 199, 102, 102);
    // The small light source anchors the formation while its surrounding dots move.
    context.fillStyle = '#d8fff3';
    context.beginPath();
    context.arc(260, 250, 1.8, 0, fullTurn);
    context.fill();
    context.globalAlpha = 1;
  };
}
