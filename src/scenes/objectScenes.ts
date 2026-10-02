import { add, apply, chain, clamp, rotX, rotY, rotZ, smoothstep, type Vec3 } from './math'
import { capsule, ellipsoid, leaf, polyline, rectOutline, roundedRect, text, type Emit } from './primitives'
import { addOrbit } from './orbit'
import { DotRig } from './rig'
import type { SceneFactory } from './types'

const circle = (r: number, y: number, segments = 48): Vec3[] =>
  Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
    return [Math.cos(a) * r, y, Math.sin(a) * r]
  })

const BOWL_X = -0.14

/** The Recipe Seeker: a steaming bowl with floating ingredients and a recipe card. */
export const bowlScene: SceneFactory = (count) => {
  const rig = new DotRig(count)
  const bowl = rig.part()
  ellipsoid(rig.share(0.32), 0.42, 0.26, 0.42, rig.emitter(bowl, 0.5, 0, 0.1), (u) => u[1] < 0)
  polyline(rig.share(0.06), circle(0.42, 0, 64), 0.004, rig.emitter(bowl, 0.95, 0.35))
  polyline(rig.share(0.02), circle(0.15, -0.255, 32), 0.004, rig.emitter(bowl, 0.7, 0.1))
  // Food: a mound of mixed tones, with a few bright garnish clusters.
  ellipsoid(rig.share(0.18), 0.39, 0.11, 0.39, rig.emitter(bowl, 0.6, 0, 0.35), (u) => u[1] > 0)
  for (let g = 0; g < 7; g++) {
    const a = g * 2.4
    const r = 0.08 + (g % 3) * 0.09
    ellipsoid(rig.share(0.006), 0.035, 0.012, 0.035, rig.emitter(bowl, 0.95, 0.45, 0.05, [Math.cos(a) * r, 0.085, Math.sin(a) * r]))
  }
  // Chopsticks resting across the rim.
  capsule(rig.share(0.02), [-0.5, 0.02, 0.12], [0.55, 0.32, -0.05], 0.008, rig.emitter(bowl, 0.8, 0.1))
  capsule(rig.share(0.02), [-0.48, 0.0, 0.2], [0.58, 0.27, 0.04], 0.008, rig.emitter(bowl, 0.8, 0.1))

  // Leaves and veggies floating above the bowl, each bobbing on its own.
  const floaters: { part: number; at: Vec3; spin: number; phase: number }[] = []
  const floater = (at: Vec3, build: (e: Emit) => void, tone: number, glow: number) => {
    const part = rig.part()
    build(rig.emitter(part, tone, glow, 0.1))
    floaters.push({ part, at, spin: (Math.random() - 0.5) * 1.2, phase: Math.random() * 6 })
  }
  const leafAt: Vec3[] = [[-0.32, 0.42, 0], [-0.08, 0.6, 0.05], [0.2, 0.52, -0.05], [0.3, 0.32, 0.08], [-0.42, 0.22, 0.05]]
  leafAt.forEach((at, k) =>
    floater(at, (e) => leaf(rig.share(0.012), 0.13, 0.06, (x, y, z) => e(x - 0.065, y, z), (x, y, z) => e(x - 0.065, y, z)), 0.75, k % 2 ? 0.35 : 0.1),
  )
  floater([0.02, 0.36, 0.1], (e) => ellipsoid(rig.share(0.012), 0.045, 0.045, 0.045, e), 0.85, 0.2)
  floater([-0.18, 0.3, 0.12], (e) => polyline(rig.share(0.008), circle(0.03, 0), 0.003, (x, y, z) => e(x, z, y)), 0.9, 0.4)

  // A recipe card floating beside the bowl.
  const card = rig.part()
  const cardDots = rig.emitter(card, 0.85, 0.2, 0.05)
  rectOutline(rig.share(0.03), 0.34, 0.44, 0.003, cardDots)
  roundedRect(rig.share(0.03), 0.34, 0.44, 0.01, rig.emitter(card, 0.15, 0, 0.05, [0, 0, -0.004]))
  text(rig.share(0.02), 'Recipe', 0.05, rig.emitter(card, 1, 0.5, 0, [-0.05, 0.16, 0]))
  for (let l = 0; l < 4; l++) {
    const y = 0.07 - l * 0.065
    ellipsoid(rig.share(0.002), 0.008, 0.008, 0.002, rig.emitter(card, 1, 0.9, 0, [-0.12, y, 0]))
    polyline(rig.share(0.008), [[-0.09, y, 0], [0.12 - (l % 2) * 0.05, y, 0]], 0.003, rig.emitter(card, 0.6, 0.1))
  }

  // Steam: dots whose positions are recomputed every frame.
  const steamStart = rig.count - rig.remaining
  const steam = rig.part()
  const steamCount = rig.share(0.05)
  const phase = new Float32Array(steamCount)
  const col = new Uint8Array(steamCount)
  for (let i = 0; i < steamCount; i++) {
    phase[i] = Math.random()
    col[i] = i % 3
    rig.add(steam, 0, 0, 0, 0.45 + Math.random() * 0.3, 0.15)
  }

  const dust = rig.part()
  rig.fillDust(dust, 0.8, 0.7)

  const update = (t: number) => {
    rig.set(bowl, [BOWL_X, -0.12, 0], chain(rotX(0.42), rotY(t * 0.25)))
    for (const f of floaters) {
      const bob = Math.sin(t * 1.1 + f.phase) * 0.02
      rig.set(f.part, [BOWL_X + f.at[0], f.at[1] - 0.12 + bob, f.at[2]], chain(rotZ(f.phase + Math.sin(t * 0.7 + f.phase) * 0.4), rotY(t * f.spin)))
    }
    rig.set(card, [0.6, 0.12 + Math.sin(t * 0.8) * 0.015, 0], chain(rotY(-0.45 + Math.sin(t * 0.5) * 0.08), rotZ(-0.06)))
    rig.set(dust, [0, 0, 0], rotY(t * 0.05))
    rig.apply()
    const h = rig.data.home
    for (let k = 0; k < steamCount; k++) {
      const i = steamStart + k
      const life = (t * 0.13 + phase[k]) % 1
      const y = life * 0.45
      const c = col[k]
      const spread = 0.01 + life * 0.045
      h[i * 3] = BOWL_X + (c - 1) * 0.12 + Math.sin(y * 4 + t * 1.2 + c * 2) * (0.01 + life * 0.05) + Math.sin(phase[k] * 90) * spread
      h[i * 3 + 1] = 0.02 + y
      h[i * 3 + 2] = Math.cos(phase[k] * 70) * spread
    }
  }
  update(0)
  return { id: 'bowl', aspect: 1.5, parallax: 0.6, data: rig.data, update }
}

/** VNB-IT payments: a card with a glowing chip, wrapped in a secure orbit. */
export const cardScene: SceneFactory = (count) => {
  const rig = new DotRig(count)
  const W = 0.86
  const H = 0.54
  const card = rig.part()
  const face = rig.emitter(card, 0.2, 0, 0.06, [0, 0, 0.006])
  roundedRect(rig.share(0.28), W, H, 0.045, face)
  rectOutline(rig.share(0.06), W - 0.01, H - 0.01, 0.003, rig.emitter(card, 0.85, 0.25, 0.05, [0, 0, 0.008]))
  // Chip and contactless waves.
  roundedRect(rig.share(0.04), 0.11, 0.085, 0.015, rig.emitter(card, 0.95, 0.8, 0.05, [-0.29, 0.06, 0.01]))
  for (let a = 0; a < 3; a++) {
    const r = 0.025 + a * 0.017
    const arc: Vec3[] = Array.from({ length: 12 }, (_, i) => {
      const th = -0.7 + (i / 11) * 1.4
      return [-0.17 + Math.cos(th) * r, 0.06 + Math.sin(th) * r, 0.01]
    })
    polyline(rig.share(0.006), arc, 0.002, rig.emitter(card, 0.8, 0.3))
  }
  text(rig.share(0.09), '4242  4242  4242  4242', 0.055, rig.emitter(card, 0.92, 0.15, 0.05, [0, -0.08, 0.01]))
  text(rig.share(0.035), 'KHALIL BADR EDDINE', 0.032, rig.emitter(card, 0.8, 0.05, 0.05, [-0.2, -0.19, 0.01]), 500)
  text(rig.share(0.04), '3D SECURE', 0.045, rig.emitter(card, 0.95, 0.6, 0.05, [0.24, 0.19, 0.01]))
  // Flowing lines across the card face.
  for (let l = 0; l < 3; l++) {
    const pts: Vec3[] = Array.from({ length: 30 }, (_, i) => {
      const x = -W / 2 + 0.02 + (i / 29) * (W - 0.04)
      return [x, -0.24 + l * 0.03 + Math.sin(x * 6 + l) * 0.05 + (x + W / 2) * 0.35, 0.009]
    })
    polyline(rig.share(0.025), pts, 0.003, rig.emitter(card, 0.5, 0.3))
  }
  roundedRect(rig.share(0.04), W, 0.09, 0.01, rig.emitter(card, 0.12, 0, 0.04, [0, 0.13, -0.006]))

  const orbit = addOrbit(rig, rig.share(0.06), { radius: 0.64, tilt: 1.3, roll: 0.22, speed: 0.6 })

  const dust = rig.part()
  rig.fillDust(dust, 0.8, 0.7)

  const update = (t: number) => {
    rig.set(card, [0, Math.sin(t) * 0.015, 0], chain(rotY(Math.sin(t * 0.5) * 0.5), rotX(-0.18 + Math.sin(t * 0.37) * 0.1), rotZ(0.06)))
    orbit(t)
    rig.set(dust, [0, 0, 0], rotY(t * 0.05))
    rig.apply()
  }
  update(0)
  return { id: 'card', aspect: 1.45, parallax: 0.5, data: rig.data, update }
}

/** Contact: an envelope that opens and lets a letter rise out. */
export const envelopeScene: SceneFactory = (count) => {
  const rig = new DotRig(count)
  const W = 0.9
  const H = 0.56
  const env = rig.part()
  roundedRect(rig.share(0.14), W, H, 0.02, rig.emitter(env, 0.2, 0, 0.05, [0, 0, -0.02]))
  rectOutline(rig.share(0.06), W, H, 0.003, rig.emitter(env, 0.85, 0.25, 0.05))
  // Front pocket: two diagonals meeting in the middle, lightly filled.
  polyline(rig.share(0.05), [[-W / 2, -H / 2, 0.012], [0, 0.0, 0.012], [W / 2, -H / 2, 0.012]], 0.003, rig.emitter(env, 0.75, 0.2))
  for (let i = 0, n = rig.share(0.1); i < n; i++) {
    const x = (Math.random() - 0.5) * W
    const top = -H / 2 + (1 - Math.abs(x) / (W / 2)) * (H / 2)
    rig.add(env, x, -H / 2 + Math.random() * (top + H / 2), 0.01, 0.3 + Math.random() * 0.1)
  }

  // Flap: hinged on the top edge.
  const flap = rig.part()
  for (let i = 0, n = rig.share(0.08); i < n; i++) {
    const x = (Math.random() - 0.5) * W
    const depth = (1 - Math.abs(x) / (W / 2)) * 0.3
    rig.add(flap, x, -Math.random() * depth, 0, 0.34 + Math.random() * 0.1)
  }
  polyline(rig.share(0.03), [[-W / 2, 0, 0], [0, -0.3, 0], [W / 2, 0, 0]], 0.003, rig.emitter(flap, 0.8, 0.2))

  const orbit = addOrbit(rig, rig.share(0.05), { radius: 0.66, tilt: 1.3, roll: -0.25, speed: 0.5 })

  // Letter.
  const letter = rig.part()
  roundedRect(rig.share(0.12), W - 0.12, H - 0.1, 0.015, rig.emitter(letter, 0.62, 0, 0.08))
  text(rig.share(0.09), "LET'S TALK", 0.1, rig.emitter(letter, 1, 0.8, 0, [0, 0.08, 0.004]))
  for (let l = 0; l < 3; l++) {
    polyline(rig.share(0.012), [[-0.28, -0.05 - l * 0.05, 0.004], [0.28 - l * 0.08, -0.05 - l * 0.05, 0.004]], 0.004, rig.emitter(letter, 0.35, 0))
  }

  const dust = rig.part()
  rig.fillDust(dust, 0.8, 0.7)

  const update = (t: number) => {
    const ph = t % 8
    const open = smoothstep(0.4, 1.6, ph) - smoothstep(6.6, 7.6, ph)
    const rise = smoothstep(1.5, 2.8, ph) - smoothstep(5.9, 6.8, ph)
    const tilt = chain(rotY(Math.sin(t * 0.4) * 0.25), rotX(-0.1))
    const origin: Vec3 = [0, -0.08, 0]
    rig.set(env, origin, tilt)
    // The flap folds back about the top edge; the letter slides up out of the pocket.
    rig.set(flap, add(origin, apply(tilt, [0, H / 2, 0.014])), chain(tilt, rotX(clamp(open, 0, 1) * Math.PI * 0.92)))
    rig.set(letter, add(origin, apply(tilt, [0, -0.02 + rise * 0.36, -0.008])), tilt)
    orbit(t, origin)
    rig.set(dust, [0, 0, 0], rotY(t * 0.05))
    rig.apply()
  }
  update(0)
  return { id: 'envelope', aspect: 1.45, parallax: 0.6, data: rig.data, update }
}

