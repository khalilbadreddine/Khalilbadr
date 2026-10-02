/** Row-major 3x3 matrices as plain arrays — enough for rigging dots. */
export type Mat3 = [number, number, number, number, number, number, number, number, number]
export type Vec3 = [number, number, number]

export const identity = (): Mat3 => [1, 0, 0, 0, 1, 0, 0, 0, 1]

export const rotX = (a: number): Mat3 => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [1, 0, 0, 0, c, -s, 0, s, c]
}

export const rotY = (a: number): Mat3 => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c, 0, s, 0, 1, 0, -s, 0, c]
}

export const scale = (s: number): Mat3 => [s, 0, 0, 0, s, 0, 0, 0, s]

export const rotZ = (a: number): Mat3 => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}

export function mul(a: Mat3, b: Mat3): Mat3 {
  const o = new Array(9) as Mat3
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
    }
  }
  return o
}

/** Multiplies matrices left to right: chain(A, B, C) = A·B·C. */
export const chain = (...ms: Mat3[]): Mat3 => ms.reduce(mul)

export const apply = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
]

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

/** Point `v` given in a frame with origin `o` and rotation `m`. */
export const place = (o: Vec3, m: Mat3, v: Vec3): Vec3 => add(o, apply(m, v))

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
