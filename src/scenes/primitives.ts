import type { Vec3 } from './math'

/** Receives one sampled point. */
export type Emit = (x: number, y: number, z: number) => void

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Uniform random unit vector. */
function unit(): Vec3 {
  const z = rand(-1, 1)
  const a = rand(0, Math.PI * 2)
  const r = Math.sqrt(1 - z * z)
  return [r * Math.cos(a), r * Math.sin(a), z]
}

/** Surface of an ellipsoid; `keep` can reject points (e.g. one hemisphere). */
export function ellipsoid(n: number, rx: number, ry: number, rz: number, emit: Emit, keep?: (u: Vec3) => boolean) {
  let made = 0
  let guard = n * 50
  while (made < n && guard-- > 0) {
    const u = unit()
    if (keep && !keep(u)) continue
    emit(u[0] * rx, u[1] * ry, u[2] * rz)
    made++
  }
}

/** Capsule surface around the segment from `a` to `b`. */
export function capsule(n: number, a: Vec3, b: Vec3, radius: number, emit: Emit, radiusEnd = radius) {
  for (let i = 0; i < n; i++) {
    const t = Math.random()
    const u = unit()
    const r = radius + (radiusEnd - radius) * t
    emit(a[0] + (b[0] - a[0]) * t + u[0] * r, a[1] + (b[1] - a[1]) * t + u[1] * r, a[2] + (b[2] - a[2]) * t + u[2] * r)
  }
}

/** Points on the six faces of an axis-aligned box centred at `c`. */
export function box(n: number, c: Vec3, size: Vec3, emit: Emit) {
  const [sx, sy, sz] = size
  const faces = [sy * sz, sy * sz, sx * sz, sx * sz, sx * sy, sx * sy]
  const total = faces.reduce((s, f) => s + f, 0)
  for (let i = 0; i < n; i++) {
    let r = Math.random() * total
    let f = 0
    while (r > faces[f] && f < 5) r -= faces[f++]
    const p: Vec3 = [rand(-0.5, 0.5) * sx, rand(-0.5, 0.5) * sy, rand(-0.5, 0.5) * sz]
    const axis = f >> 1
    p[axis] = (f & 1 ? 0.5 : -0.5) * size[axis]
    emit(c[0] + p[0], c[1] + p[1], c[2] + p[2])
  }
}

/** Filled rounded rectangle in the XY plane, centred at the origin. */
export function roundedRect(n: number, w: number, h: number, r: number, emit: Emit) {
  let made = 0
  while (made < n) {
    const x = rand(-w / 2, w / 2)
    const y = rand(-h / 2, h / 2)
    const dx = Math.max(Math.abs(x) - (w / 2 - r), 0)
    const dy = Math.max(Math.abs(y) - (h / 2 - r), 0)
    if (dx * dx + dy * dy > r * r) continue
    emit(x, y, 0)
    made++
  }
}

/** Points along a polyline (evenly by length) with a little jitter. */
export function polyline(n: number, pts: Vec3[], jitter: number, emit: Emit) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]))
  const total = lens.reduce((s, l) => s + l, 0)
  for (let i = 0; i < n; i++) {
    let d = Math.random() * total
    let s = 0
    while (d > lens[s] && s < lens.length - 1) d -= lens[s++]
    const t = d / lens[s]
    const a = pts[s]
    const b = pts[s + 1]
    emit(
      a[0] + (b[0] - a[0]) * t + rand(-jitter, jitter),
      a[1] + (b[1] - a[1]) * t + rand(-jitter, jitter),
      a[2] + (b[2] - a[2]) * t + rand(-jitter, jitter),
    )
  }
}

/** Outline of a rectangle in the XY plane. */
export function rectOutline(n: number, w: number, h: number, jitter: number, emit: Emit) {
  const x = w / 2
  const y = h / 2
  polyline(n, [[-x, -y, 0], [x, -y, 0], [x, y, 0], [-x, y, 0], [-x, -y, 0]], jitter, emit)
}

/**
 * Samples the filled pixels of `text` drawn on a canvas. Points are centred
 * and scaled so the text is `height` tall, in the XY plane.
 */
export function text(n: number, str: string, height: number, emit: Emit, weight = 700) {
  const px = 64
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const font = `${weight} ${px}px "Space Grotesk", system-ui, sans-serif`
  ctx.font = font
  const w = Math.ceil(ctx.measureText(str).width) + 8
  canvas.width = w
  canvas.height = px + 16
  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(str, 4, canvas.height / 2)
  const { data } = ctx.getImageData(0, 0, w, canvas.height)
  const filled: number[] = []
  for (let i = 0; i < w * canvas.height; i++) if (data[i * 4 + 3] > 128) filled.push(i)
  if (!filled.length) return
  const scale = height / px
  for (let k = 0; k < n; k++) {
    const i = filled[(Math.random() * filled.length) | 0]
    const x = (i % w) + Math.random()
    const y = Math.floor(i / w) + Math.random()
    emit((x - w / 2) * scale, -(y - canvas.height / 2) * scale, 0)
  }
}

/** A leaf in the XY plane pointing along +x, with a bright midrib. */
export function leaf(n: number, length: number, width: number, emit: Emit, rib?: Emit) {
  for (let i = 0; i < n; i++) {
    const t = Math.random()
    const hw = (width / 2) * Math.sin(Math.PI * t)
    if (rib && i % 5 === 0) rib(t * length, 0, 0)
    else emit(t * length, (Math.random() * 2 - 1) * hw, 0)
  }
}
