import { apply, identity, mul, type Mat3, type Vec3 } from './math'
import type { Emit } from './primitives'
import { UV_NONE, type SceneData } from './types'

/**
 * Collects dots into rigid parts. Each part has a transform (origin +
 * rotation) that animated scenes update every frame; `apply()` then writes
 * every dot's home position from its part-local coordinates.
 */
export class DotRig {
  readonly data: SceneData
  private readonly partOf: Uint16Array
  private readonly local: Float32Array
  private readonly origins: Vec3[] = []
  private readonly mats: Mat3[] = []
  private n = 0

  constructor(readonly count: number) {
    this.data = {
      home: new Float32Array(count * 3),
      tone: new Float32Array(count),
      glow: new Float32Array(count),
      uv: new Float32Array(count * 2).fill(UV_NONE),
    }
    this.partOf = new Uint16Array(count)
    this.local = new Float32Array(count * 3)
  }

  get remaining() {
    return this.count - this.n
  }

  /** Dots for a share of the whole budget (at least 1). */
  share(fraction: number) {
    return Math.max(1, Math.round(this.count * fraction))
  }

  part(): number {
    this.origins.push([0, 0, 0])
    this.mats.push(identity())
    return this.origins.length - 1
  }

  add(part: number, x: number, y: number, z: number, tone: number, glow = 0, u = UV_NONE, v = UV_NONE): number {
    if (this.n >= this.count) return -1
    const i = this.n++
    this.partOf[i] = part
    this.local[i * 3] = x
    this.local[i * 3 + 1] = y
    this.local[i * 3 + 2] = z
    this.data.tone[i] = tone
    this.data.glow[i] = glow
    this.data.uv[i * 2] = u
    this.data.uv[i * 2 + 1] = v
    return i
  }

  /** An emitter that adds dots to `part` with a tone (± jitter) and glow. */
  emitter(part: number, tone: number, glow = 0, jitter = 0.08, offset: Vec3 = [0, 0, 0]): Emit {
    return (x, y, z) =>
      this.add(part, x + offset[0], y + offset[1], z + offset[2], Math.min(1, Math.max(0, tone + (Math.random() - 0.5) * 2 * jitter)), glow)
  }

  /** Fills the unused budget with faint dust in a wide shell around the scene. */
  fillDust(part: number, width: number, height: number) {
    while (this.remaining > 0) {
      const a = Math.random() * Math.PI * 2
      const r = 0.55 + Math.random() * 0.6
      this.add(
        part,
        Math.cos(a) * r * width,
        Math.sin(a) * r * height,
        (Math.random() - 0.5) * 0.8,
        0.08 + Math.random() * 0.2,
      )
    }
  }

  set(part: number, origin: Vec3, mat: Mat3) {
    this.origins[part] = origin
    this.mats[part] = mat
  }

  /** Writes home positions; an optional camera transform is applied last. */
  apply(cam?: Mat3, camOrigin: Vec3 = [0, 0, 0]) {
    const { home } = this.data
    const local = this.local
    // Pre-compose the camera into each part so the loop stays a single affine.
    const o = this.origins.map((p) => (cam ? apply(cam, p).map((v, k) => v + camOrigin[k]) : p))
    const m = this.mats.map((pm) => (cam ? mul(cam, pm) : pm))
    for (let i = 0; i < this.n; i++) {
      const p = this.partOf[i]
      const M = m[p]
      const O = o[p]
      const x = local[i * 3]
      const y = local[i * 3 + 1]
      const z = local[i * 3 + 2]
      home[i * 3] = O[0] + M[0] * x + M[1] * y + M[2] * z
      home[i * 3 + 1] = O[1] + M[3] * x + M[4] * y + M[5] * z
      home[i * 3 + 2] = O[2] + M[6] * x + M[7] * y + M[8] * z
    }
  }

  /** Current home position of dot `i` (after the last `apply`). */
  homeOf(i: number): Vec3 {
    const h = this.data.home
    return [h[i * 3], h[i * 3 + 1], h[i * 3 + 2]]
  }
}
