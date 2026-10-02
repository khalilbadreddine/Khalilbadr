import { add, apply, chain, rotX, rotY, type Vec3 } from './math'
import { ellipsoid } from './primitives'
import type { DotRig } from './rig'
import { isLand } from './landMask'

const RAD = Math.PI / 180

/** Unit vector for a latitude/longitude; longitude 0 faces the viewer (+z). */
const onSphere = (lat: number, lon: number): Vec3 => [
  Math.cos(lat * RAD) * Math.sin(lon * RAD),
  Math.sin(lat * RAD),
  Math.cos(lat * RAD) * Math.cos(lon * RAD),
]

const RABAT = [34.02, -6.84] as const
const PARIS = [48.86, 2.35] as const

/**
 * A dotted globe (land bright, ocean faint) with a glowing arc from Rabat to
 * France and a pulse travelling along it. Returns a function that positions
 * it for time `t`.
 */
export function addGlobe(rig: DotRig, dots: number, radius: number) {
  const globe = rig.part()
  const pulse = rig.part()

  // Land: rejection-sample the sphere until enough dots fall on land.
  let land = 0
  const landDots = Math.round(dots * 0.75)
  for (let guard = 0; land < landDots && guard < landDots * 20; guard++) {
    const lat = Math.asin(Math.random() * 2 - 1) / RAD
    const lon = Math.random() * 360 - 180
    if (!isLand(lat, lon)) continue
    const p = onSphere(lat, lon)
    rig.add(globe, p[0] * radius, p[1] * radius, p[2] * radius, 0.6 + Math.random() * 0.3, 0)
    land++
  }
  // A faint shell so the oceans still read as a sphere.
  ellipsoid(Math.round(dots * 0.12), radius, radius, radius, rig.emitter(globe, 0.1, 0, 0.04))

  // Arc from Rabat to Paris, lifted off the surface.
  const a = onSphere(RABAT[0], RABAT[1])
  const b = onSphere(PARIS[0], PARIS[1])
  const arcAt = (s: number): Vec3 => {
    const v: Vec3 = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s]
    const len = Math.hypot(...v)
    const r = radius * (1 + 0.22 * Math.sin(Math.PI * s))
    return [(v[0] / len) * r, (v[1] / len) * r, (v[2] / len) * r]
  }
  for (let i = 0, n = Math.round(dots * 0.05); i < n; i++) {
    const p = arcAt(Math.random())
    rig.add(globe, p[0], p[1], p[2], 0.7, 0.22)
  }
  // City markers.
  for (const c of [a, b]) {
    ellipsoid(Math.round(dots * 0.008), 0.01, 0.01, 0.01, rig.emitter(globe, 1, 0.9, 0, [c[0] * radius, c[1] * radius, c[2] * radius]))
  }
  ellipsoid(Math.round(dots * 0.01), 0.012, 0.012, 0.012, rig.emitter(pulse, 1, 1.8, 0))

  return (t: number, origin: Vec3) => {
    // Swing gently around Morocco/France and tilt so ~30°N faces the viewer.
    const R = chain(rotX(0.55), rotY(-2 * RAD + Math.sin(t * 0.3) * 0.5))
    rig.set(globe, origin, R)
    rig.set(pulse, add(origin, apply(R, arcAt((t * 0.35) % 1))), R)
  }
}
