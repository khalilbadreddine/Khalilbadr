import { chain, rotX, rotY, rotZ, type Vec3 } from './math'
import { ellipsoid } from './primitives'
import type { DotRig } from './rig'

interface OrbitOptions {
  radius: number
  /** Tilt of the ring plane toward the viewer (radians). */
  tilt?: number
  roll?: number
  /** Satellite speed (radians per second). */
  speed?: number
}

/**
 * A dotted orbit ring with a glowing satellite travelling along it.
 * Returns a function that positions it for time `t`.
 */
export function addOrbit(rig: DotRig, dots: number, { radius, tilt = 1.2, roll = 0.2, speed = 0.6 }: OrbitOptions) {
  const ring = rig.part()
  const sat = rig.part()
  // Evenly spaced beads read as a dotted line.
  const beads = Math.max(24, Math.floor(dots / 4))
  for (let i = 0; i < dots; i++) {
    const a = (Math.floor(Math.random() * beads) / beads) * Math.PI * 2
    const j = 0.006
    rig.add(ring, Math.cos(a) * radius + (Math.random() - 0.5) * j, (Math.random() - 0.5) * j, Math.sin(a) * radius, 0.55, 0.12)
  }
  const glow = rig.emitter(sat, 1, 2.2, 0)
  ellipsoid(Math.max(12, Math.floor(dots / 6)), 0.016, 0.016, 0.016, (x, y, z) => glow(x + radius, y, z))

  return (t: number, origin: Vec3 = [0, 0, 0]) => {
    const R = chain(rotZ(roll), rotX(tilt))
    rig.set(ring, origin, R)
    rig.set(sat, origin, chain(R, rotY(-t * speed)))
  }
}
