const fullTurn = Math.PI * 2;
export const fieldSize = { width: 520, height: 500 };

export interface PointerPosition {
  x: number;
  y: number;
}

// A fixed seed gives every resize and reduced-motion view the same composition.
function createRandom() {
  let seed = 7301;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function createParticleField(context: CanvasRenderingContext2D) {
  const random = createRandom();
  const wave = Array.from({ length: 19 * 61 }, (_, index) => ({
    u: (index % 61) / 60,
    v: Math.floor(index / 61) / 18,
  }));
  const trails = Array.from({ length: 6 * 112 }, (_, index) => ({
    angle: ((index % 112) / 112) * fullTurn,
    lane: Math.floor(index / 112) - 2.5,
    size: 0.6 + random() * 0.35,
  }));
  const cloud = Array.from({ length: 230 }, (_, index) => {
    const radius = index < 150 ? 4 + random() ** 1.7 * 66 : 85 + random() * 105;
    const latitude = random() * 2 - 1;
    return {
      radius,
      latitude,
      ring: Math.sqrt(1 - latitude * latitude),
      angle: random() * fullTurn,
      size: 0.5 + random() * 0.6,
      alpha: 0.16 + random() * 0.4,
      color: index % 3 === 0 ? '#76d9ed' : '#78e6c3',
    };
  });
  const halo = context.createRadialGradient(260, 250, 0, 260, 250, 130);
  halo.addColorStop(0, '#78e6c30e');
  halo.addColorStop(0.5, '#76d9ed06');
  halo.addColorStop(1, '#78e6c300');
  const glow = context.createRadialGradient(260, 250, 0, 260, 250, 44);
  glow.addColorStop(0, '#d8fff3bd');
  glow.addColorStop(0.05, '#a0f2d770');
  glow.addColorStop(0.2, '#78e6c321');
  glow.addColorStop(0.6, '#76d9ed09');
  glow.addColorStop(1, '#76d9ed00');

  return (phase: number, pulse: number, pointer: PointerPosition) => {
    // Bounded 3D rotation around a fixed center. The camera stays well outside
    // the field, so perspective never approaches a singularity or stretches it.
    const yaw = Math.sin(phase * 0.25) * 0.13 + pointer.x * 0.24;
    const pitch = -0.16 + Math.sin(phase * 0.2) * 0.08 - pointer.y * 0.18;
    const roll = -0.36 + Math.sin(phase * 0.18) * 0.045;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);

    const dot = (x: number, y: number, z: number, radius: number, alpha: number) => {
      const rotatedX = x * cy + z * sy;
      const rotatedZ = z * cy - x * sy;
      const rotatedY = y * cp - rotatedZ * sp;
      const depth = y * sp + rotatedZ * cp;
      const perspective = 720 / (720 - depth);
      const px = 260 + (rotatedX * cr - rotatedY * sr) * perspective;
      const py = 250 + (rotatedX * sr + rotatedY * cr) * perspective;
      context.globalAlpha = Math.min(1, alpha * (0.8 + (depth + 140) / 560));
      context.beginPath();
      context.arc(px, py, radius * perspective, 0, fullTurn);
      context.fill();
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
      dot(x, y, z, 0.65, envelope * 0.33);
    }

    // Closed, gently warped trails have no spawning seam or endpoint teleport.
    for (const { angle, lane, size } of trails) {
      const theta = angle + phase * 0.16 + lane * 0.045;
      const radius = 137 + lane * 8 + Math.sin(theta) * 22;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius * 0.63 + Math.sin(theta * 2) * 18 + lane * 3;
      const z = Math.sin(theta + lane * 0.16) * 67 + lane * 7;
      const alpha = 0.25 + (0.5 + Math.cos(theta - 0.7) * 0.5) * 0.42;
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

    context.globalAlpha = 0.88 + Math.sin(pulse) * 0.08;
    context.fillStyle = glow;
    context.fillRect(216, 206, 88, 88);
    context.fillStyle = '#d8fff3';
    dot(0, 0, 0, 1.65, 0.9);
    context.globalAlpha = 1;
  };
}
