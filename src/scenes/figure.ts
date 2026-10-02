import type { ImageSampler } from '../particles/sampleImage'
import { add, apply, chain, rotX, rotY, rotZ, type Vec3 } from './math'
import { capsule, ellipsoid } from './primitives'
import type { DotRig } from './rig'

/**
 * A big-headed dot figure: the head is sampled from the photo, the body is
 * built from capsules (white tee, skin, jeans, shoes). Units: standing, the
 * figure is ≈ 1 tall with the hips at the root.
 */

const TORSO_H = 0.25
const NECK_Y = 0.27
const SHOULDER: Vec3 = [0.16, 0.235, 0]
const UPPER = 0.12
const FORE = 0.11
const THIGH = 0.13
const SHIN = 0.12
const HIP_X = 0.075
/** Where the neck pivot sits in head-image units (image height 1, y up). */
const HEAD_PIVOT_Y = -0.4

const TEE = 0.86
const SKIN = 0.58
const JEANS = 0.42

export interface ArmPose {
  /** Raise sideways (radians, away from the body). */
  abduct: number
  /** Swing forward (negative = forward). */
  flex: number
  /** Elbow bend about x (negative = forearm forward). */
  elbow: number
  /** Elbow bend sideways — used for waving. */
  elbowSide: number
}

export interface LegPose {
  /** Hip bend (negative = thigh forward). */
  flex: number
  /** Knee bend (positive = shin back). */
  knee: number
}

export interface Pose {
  root: Vec3
  yaw: number
  /** Torso lean forward (radians). */
  lean: number
  head: { yaw: number; pitch: number; roll: number }
  arms: [ArmPose, ArmPose]
  legs: [LegPose, LegPose]
}

export const standingPose = (): Pose => ({
  root: [0, 0, 0],
  yaw: 0,
  lean: 0,
  head: { yaw: 0, pitch: 0, roll: 0 },
  arms: [
    { abduct: 0.12, flex: 0, elbow: 0, elbowSide: 0 },
    { abduct: 0.12, flex: 0, elbow: 0, elbowSide: 0 },
  ],
  legs: [
    { flex: 0, knee: 0 },
    { flex: 0, knee: 0 },
  ],
})

export class Figure {
  private readonly torso: number
  private readonly head: number
  private readonly upper: [number, number]
  private readonly fore: [number, number]
  private readonly thigh: [number, number]
  private readonly shin: [number, number]
  /** Hand centres from the last pose, per side (world/scene units). */
  readonly hands: [Vec3, Vec3] = [
    [0, 0, 0],
    [0, 0, 0],
  ]

  constructor(
    private readonly rig: DotRig,
    head: ImageSampler,
    budget: number,
    private readonly headSize = 0.5,
    headShare = 0.6,
  ) {
    // Body part shares below are tuned for a 60% head; scale them to fill
    // whatever the head leaves.
    const bodyScale = (1 - headShare) / 0.4
    const share = (f: number) => Math.max(1, Math.round(budget * f * bodyScale))
    const H = headSize

    this.head = rig.part()
    const face = head(Math.round(budget * headShare))
    for (let i = 0; i < face.count; i++) {
      const p = face.positions
      rig.add(
        this.head,
        p[i * 3] * H,
        (p[i * 3 + 1] - HEAD_PIVOT_Y) * H,
        p[i * 3 + 2] * H,
        face.tone[i],
        // The eyes and brows (strong contours) get a faint inner light.
        face.edge[i] > 0.6 ? 0.25 : 0,
      )
    }
    // Back and sides of the head, so it keeps its volume when it turns.
    ellipsoid(share(0.05), 0.36 * H, 0.42 * H, 0.3 * H, rig.emitter(this.head, 0.14, 0, 0.06, [0, 0.47 * H, 0]), (u) => u[2] < 0.15)

    this.torso = rig.part()
    const tee = rig.emitter(this.torso, TEE)
    for (let i = 0, n = share(0.12); i < n; i++) {
      const t = Math.random()
      const a = Math.random() * Math.PI * 2
      const hw = 0.118 + 0.04 * t
      tee(Math.cos(a) * hw, t * TORSO_H, Math.sin(a) * 0.085)
    }
    // Shoulder line and collar.
    ellipsoid(share(0.02), 0.155, 0.02, 0.08, rig.emitter(this.torso, TEE, 0, 0.05, [0, TORSO_H, 0]))
    capsule(share(0.012), [0, TORSO_H - 0.01, 0], [0, NECK_Y + 0.02, 0], 0.045, rig.emitter(this.torso, SKIN))
    // The little emblem on the tee glows.
    ellipsoid(share(0.004), 0.018, 0.018, 0.004, rig.emitter(this.torso, 0.7, 0.9, 0.1, [-0.06, 0.17, 0.088]))

    const side = (s: number) => {
      const upper = rig.part()
      capsule(share(0.02), [0, 0.005, 0], [0, -UPPER * 0.45, 0], 0.046, rig.emitter(upper, TEE))
      capsule(share(0.015), [0, -UPPER * 0.4, 0], [0, -UPPER, 0], 0.029, rig.emitter(upper, SKIN))

      const fore = rig.part()
      const skin = rig.emitter(fore, SKIN)
      capsule(share(0.02), [0, 0, 0], [0, -FORE, 0], 0.027, skin)
      // Hand: palm, four fingers and a thumb, pointing along -y.
      const hand = rig.emitter(fore, 0.66, 0.05)
      ellipsoid(share(0.008), 0.03, 0.033, 0.014, rig.emitter(fore, 0.66, 0.05, 0.08, [0, -FORE - 0.03, 0]))
      for (let f = 0; f < 4; f++) {
        const x = (f - 1.5) * 0.014
        capsule(share(0.0025), [x, -FORE - 0.05, 0], [x * 1.35, -FORE - 0.09 + Math.abs(f - 1.5) * 0.008, 0], 0.007, hand)
      }
      capsule(share(0.002), [-s * 0.028, -FORE - 0.035, 0], [-s * 0.052, -FORE - 0.06, 0.004], 0.007, hand)
      return { upper, fore }
    }
    const l = side(-1)
    const r = side(1)
    this.upper = [l.upper, r.upper]
    this.fore = [l.fore, r.fore]

    const legs = () => {
      const thigh = rig.part()
      capsule(share(0.025), [0, 0, 0], [0, -THIGH, 0], 0.05, rig.emitter(thigh, JEANS))
      const shin = rig.part()
      capsule(share(0.02), [0, 0, 0], [0, -SHIN, 0], 0.045, rig.emitter(shin, JEANS))
      ellipsoid(share(0.012), 0.045, 0.025, 0.07, rig.emitter(shin, 0.72, 0.05, 0.08, [0, -SHIN - 0.02, 0.025]))
      return { thigh, shin }
    }
    const ll = legs()
    const rl = legs()
    this.thigh = [ll.thigh, rl.thigh]
    this.shin = [ll.shin, rl.shin]
  }

  /** Neck pivot height above the root when standing. */
  static readonly neckHeight = NECK_Y

  /** Height of the whole figure standing (feet to head top). */
  get height() {
    return 0.25 + 0.03 + NECK_Y + (0.5 - HEAD_PIVOT_Y) * this.headSize
  }

  /** Sets every part's transform from a pose. */
  pose(p: Pose) {
    const rig = this.rig
    const rootR = rotY(p.yaw)
    const torsoR = chain(rootR, rotX(p.lean))
    rig.set(this.torso, p.root, torsoR)

    const neck = add(p.root, apply(torsoR, [0, NECK_Y, 0]))
    rig.set(this.head, neck, chain(torsoR, rotZ(p.head.roll), rotY(p.head.yaw), rotX(p.head.pitch)))

    for (let k = 0; k < 2; k++) {
      const s = k === 0 ? -1 : 1
      const a = p.arms[k]
      const shoulder = add(p.root, apply(torsoR, [s * SHOULDER[0], SHOULDER[1], SHOULDER[2]]))
      const upperR = chain(torsoR, rotZ(s * a.abduct), rotX(a.flex))
      rig.set(this.upper[k], shoulder, upperR)
      const elbow = add(shoulder, apply(upperR, [0, -UPPER, 0]))
      const foreR = chain(upperR, rotZ(s * a.elbowSide), rotX(a.elbow))
      rig.set(this.fore[k], elbow, foreR)
      this.hands[k] = add(elbow, apply(foreR, [0, -FORE - 0.04, 0]))

      const g = p.legs[k]
      const hip = add(p.root, apply(rootR, [s * HIP_X, -0.01, 0]))
      const thighR = chain(rootR, rotX(g.flex))
      rig.set(this.thigh[k], hip, thighR)
      const knee = add(hip, apply(thighR, [0, -THIGH, 0]))
      rig.set(this.shin[k], knee, chain(thighR, rotX(g.knee)))
    }
  }
}
