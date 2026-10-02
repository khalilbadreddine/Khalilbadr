import { Figure, standingPose } from './figure'
import { add, apply, chain, rotX, rotY, rotZ, scale, type Vec3 } from './math'
import { box, capsule, ellipsoid, leaf, polyline, rectOutline } from './primitives'
import { DotRig } from './rig'
import { UV_KEY, type SceneFactory } from './types'

const SCREEN_W = 0.56
const SCREEN_H = 0.34
const BODY_YAW = -0.75
const MONITOR_YAW = 0.7

/**
 * Projects: me at the desk, late at night. The monitor shows code typing
 * itself (drawn in the shader from each screen dot's uv), keys flash under
 * the hands, and the screen throws light on everything near it.
 */
export const desktopScene: SceneFactory = (count, { head }) => {
  const rig = new DotRig(count)

  // --- Figure, seated and typing ------------------------------------------
  const figStart = rig.count - rig.remaining
  const figure = new Figure(rig, head, rig.share(0.28), 0.44, 0.45)
  const figEnd = rig.count - rig.remaining
  const pose = standingPose()
  pose.root = [0.34, -0.2, 0.14]
  pose.yaw = BODY_YAW
  pose.lean = 0.22
  pose.head = { yaw: -0.45, pitch: 0.1, roll: 0 }
  pose.legs = [
    { flex: -1.45, knee: 1.45 },
    { flex: -1.45, knee: 1.45 },
  ]
  const typing = (t: number) => {
    for (let k = 0; k < 2; k++) {
      pose.arms[k] = {
        abduct: 0.22,
        flex: -0.85,
        elbow: -0.85 + Math.sin(t * 15 + k * 2.1) * 0.05 * (Math.sin(t * 0.9 + k) > -0.3 ? 1 : 0),
        elbowSide: -0.25,
      }
    }
  }
  typing(0)
  figure.pose(pose)
  const hands = figure.hands
  const kb: Vec3 = [(hands[0][0] + hands[1][0]) / 2, (hands[0][1] + hands[1][1]) / 2 - 0.035, (hands[0][2] + hands[1][2]) / 2]
  const deskY = kb[1] - 0.012
  const floorY = pose.root[1] - 0.3

  // --- Chair ----------------------------------------------------------------
  const chair = rig.part()
  const chairR = rotY(BODY_YAW)
  const chairDots = rig.emitter(chair, 0.22, 0, 0.05)
  ellipsoid(rig.share(0.02), 0.15, 0.015, 0.14, (x, y, z) => chairDots(...add(pose.root, apply(chairR, [x, y - 0.035, z + 0.03]))))
  box(rig.share(0.025), [0, 0.12, -0.13], [0.26, 0.24, 0.02], (x, y, z) => chairDots(...add(pose.root, apply(chairR, [x, y, z]))))
  capsule(rig.share(0.006), add(pose.root, [0, -0.05, 0]), [pose.root[0], floorY, pose.root[2]], 0.012, chairDots)

  // --- Desk, keyboard, mug ---------------------------------------------------
  const desk = rig.part()
  const deskCentre: Vec3 = [kb[0] - 0.3, deskY - 0.012, kb[2] - 0.08]
  box(rig.share(0.06), deskCentre, [1.05, 0.024, 0.42], rig.emitter(desk, 0.3, 0, 0.06))
  polyline(rig.share(0.012), [[deskCentre[0] - 0.525, deskY, deskCentre[2] + 0.21], [deskCentre[0] + 0.525, deskY, deskCentre[2] + 0.21]], 0.003, rig.emitter(desk, 0.75, 0.25))
  for (const [dx, dz] of [[-0.5, -0.19], [0.5, -0.19], [-0.5, 0.19], [0.5, 0.19]]) {
    capsule(rig.share(0.004), [deskCentre[0] + dx, deskY - 0.02, deskCentre[2] + dz], [deskCentre[0] + dx, floorY, deskCentre[2] + dz], 0.01, rig.emitter(desk, 0.25))
  }
  const kbR = rotY(BODY_YAW + Math.PI)
  const keys = 4 * 13
  const perKey = Math.max(2, Math.floor(rig.share(0.04) / keys))
  for (let k = 0; k < keys; k++) {
    const kx = ((k % 13) - 6) * 0.026
    const kz = (Math.floor(k / 13) - 1.5) * 0.026
    for (let j = 0; j < perKey; j++) {
      const p = add(kb, apply(kbR, [kx + (Math.random() - 0.5) * 0.018, 0, kz + (Math.random() - 0.5) * 0.018]))
      rig.add(desk, p[0], p[1], p[2], 0.45, 0.1, UV_KEY, k / 64)
    }
  }
  const mug: Vec3 = [kb[0] - 0.62, deskY, kb[2] + 0.06]
  capsule(rig.share(0.008), [mug[0], mug[1] + 0.01, mug[2]], [mug[0], mug[1] + 0.07, mug[2]], 0.03, rig.emitter(desk, 0.6, 0.05))

  // --- Monitor ----------------------------------------------------------------
  const monitor = rig.part()
  const addMonitor = (centre: Vec3, yaw: number, share: number) => {
    const R = rotY(yaw)
    const to = (x: number, y: number, z: number): Vec3 => add(centre, apply(R, [x, y, z]))
    const screenDots = rig.share(share)
    const cols = Math.round(Math.sqrt((screenDots * SCREEN_W) / SCREEN_H))
    const rows = Math.floor(screenDots / cols)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols
        const v = (r + 0.5) / rows
        const p = to((u - 0.5) * SCREEN_W, (v - 0.5) * SCREEN_H, 0)
        rig.add(monitor, p[0], p[1], p[2], 0.1, 0, u, v)
      }
    }
    const bezel = rig.emitter(monitor, 0.55, 0.15, 0.05)
    rectOutline(rig.share(0.015), SCREEN_W + 0.03, SCREEN_H + 0.03, 0.004, (x, y, z) => bezel(...to(x, y, z - 0.004)))
    box(rig.share(0.01), [0, 0, -0.02], [SCREEN_W + 0.03, SCREEN_H + 0.03, 0.02], (x, y, z) => bezel(...to(x, y, z)))
    capsule(rig.share(0.005), to(0, -SCREEN_H / 2, -0.03), [centre[0], deskY, centre[2]], 0.015, rig.emitter(monitor, 0.4))
    ellipsoid(rig.share(0.005), 0.09, 0.006, 0.06, rig.emitter(monitor, 0.45, 0, 0.05, [centre[0], deskY + 0.006, centre[2]]))
  }
  const screenCentre: Vec3 = [kb[0] - 0.4, deskY + 0.27, kb[2] - 0.16]
  addMonitor(screenCentre, MONITOR_YAW, 0.16)
  addMonitor(add(screenCentre, apply(rotY(MONITOR_YAW), [-0.6, -0.02, 0.2])), MONITOR_YAW + 0.45, 0.09)

  // --- Plant and hanging lamp ------------------------------------------------
  const decor = rig.part()
  const pot: Vec3 = [kb[0] - 0.8, deskY, kb[2] - 0.12]
  capsule(rig.share(0.008), [pot[0], pot[1] + 0.015, pot[2]], [pot[0], pot[1] + 0.07, pot[2]], 0.035, rig.emitter(decor, 0.45), 0.045)
  for (let l = 0; l < 7; l++) {
    const a = -1.2 + (l / 6) * 2.4
    const R = chain(rotY(l * 0.9), rotZ(Math.PI / 2 + a * 0.55))
    leaf(rig.share(0.006), 0.15 + (l % 3) * 0.03, 0.05, (x, y, z) => {
      const p = add([pot[0], pot[1] + 0.08, pot[2]], apply(R, [x, y, z]))
      rig.add(decor, p[0], p[1], p[2], 0.5 + Math.random() * 0.2, 0.05)
    })
  }
  const lamp: Vec3 = [kb[0] + 0.05, deskY + 0.55, kb[2] - 0.05]
  polyline(rig.share(0.006), [[lamp[0], lamp[1] + 0.45, lamp[2]], lamp], 0.002, rig.emitter(decor, 0.35))
  for (let i = 0, n = rig.share(0.012); i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const h = Math.random()
    const r = 0.012 + h * 0.05
    rig.add(decor, lamp[0] + Math.cos(a) * r, lamp[1] - h * 0.06, lamp[2] + Math.sin(a) * r, 0.6, 0.15)
  }
  ellipsoid(rig.share(0.004), 0.014, 0.014, 0.014, rig.emitter(decor, 1, 2.5, 0, [lamp[0], lamp[1] - 0.055, lamp[2]]))

  // --- Window with a city at night behind the desk ---------------------------
  const city = rig.part()
  const cityStart = rig.count - rig.remaining
  const win = { x0: kb[0] - 1.05, x1: kb[0] + 0.55, y0: deskY - 0.02, y1: deskY + 0.95, z: kb[2] - 0.62 }
  polyline(rig.share(0.02), [[win.x0, win.y0, win.z], [win.x1, win.y0, win.z], [win.x1, win.y1, win.z], [win.x0, win.y1, win.z], [win.x0, win.y0, win.z]], 0.003, rig.emitter(city, 0.4, 0.05))
  for (const fx of [1 / 3, 2 / 3]) {
    const x = win.x0 + (win.x1 - win.x0) * fx
    polyline(rig.share(0.006), [[x, win.y0, win.z], [x, win.y1, win.z]], 0.002, rig.emitter(city, 0.3))
  }
  const towers = rig.share(0.1)
  let used = 0
  for (let x = win.x0 + 0.02; x < win.x1 - 0.08 && used < towers; ) {
    const w = 0.06 + Math.random() * 0.09
    const h = 0.12 + Math.random() * 0.5
    const cols = Math.max(2, Math.round(w / 0.022))
    const rows = Math.max(3, Math.round(h / 0.03))
    const z = win.z - 0.05 - Math.random() * 0.15
    polyline(Math.round(towers * 0.012), [[x, win.y0, z], [x, win.y0 + h, z], [x + w, win.y0 + h, z], [x + w, win.y0, z]], 0.002, rig.emitter(city, 0.22))
    used += Math.round(towers * 0.012)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = Math.random() < 0.28
        rig.add(city, x + ((c + 0.5) / cols) * w, win.y0 + ((r + 0.5) / rows) * h, z, lit ? 0.75 : 0.1, lit ? 0.5 : 0)
        used++
      }
    }
    x += w + 0.01 + Math.random() * 0.03
  }

  // --- Light from the screen ---------------------------------------------------
  rig.apply()
  const { glow } = rig.data
  for (let i = 0; i < rig.count - rig.remaining; i++) {
    if (rig.data.uv[i * 2] >= 0 || i >= cityStart) continue
    const [x, y, z] = rig.homeOf(i)
    const d = Math.hypot(x - screenCentre[0], y - screenCentre[1], z - screenCentre[2])
    const lit = 0.45 * Math.exp(-d * 3.2) * (i >= figStart && i < figEnd ? 1.3 : 1)
    glow[i] = Math.max(glow[i], lit)
  }

  const dust = rig.part()
  rig.fillDust(dust, 1.0, 0.65)

  // Centre the composition and frame it like a slow film shot.
  const centre: Vec3 = [-(kb[0] - 0.25), -(deskY + 0.18), 0]
  const update = (t: number) => {
    typing(t)
    figure.pose(pose)
    rig.set(dust, [0, 0, 0], rotY(t * 0.04))
    // Slow push-in and drift, like a camera on a slider.
    const cam = chain(scale(0.76 + Math.sin(t * 0.17) * 0.02), rotX(0.2 + Math.sin(t * 0.21) * 0.03), rotY(-0.15 + Math.sin(t * 0.13) * 0.12))
    rig.apply(cam, apply(cam, centre))
  }
  update(0)

  return { id: 'desktop', aspect: 1.5, parallax: 0.15, dotSize: 0.7, gain: 0.6, data: rig.data, update }
}
