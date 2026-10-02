export interface DotShape {
  count: number
  /** xyz per dot, centred on the origin, height ≈ 1. */
  positions: Float32Array
  /** 0 (dark) .. 1 (bright) per dot — drives colour and opacity. */
  tone: Float32Array
  /** 0..1 per dot — how much the dot sits on a contour (glasses, eyes, hair strands). */
  edge: Float32Array
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${url}`))
    img.src = url
  })

/**
 * Importance-samples dots from a grayscale+alpha portrait. Coverage is close
 * to even with a lean toward bright areas and contours (Sobel edges); each
 * dot carries its pixel's tone so the shader can render it like a halftone.
 */
export async function samplePortrait(url: string, count: number): Promise<DotShape> {
  const img = await loadImage(url)
  const w = img.naturalWidth
  const h = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const { data } = ctx.getImageData(0, 0, w, h)

  const lum = new Float32Array(w * h)
  const alpha = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    lum[i] = data[i * 4] / 255
    alpha[i] = data[i * 4 + 3] / 255
  }

  // Sobel edge magnitude on alpha-premultiplied luminance, so the silhouette
  // outline counts as an edge too.
  const edge = new Float32Array(w * h)
  let maxEdge = 0
  const L = (x: number, y: number) => {
    const i = Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))
    return lum[i] * alpha[i]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx =
        -L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1) + L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1)
      const gy =
        -L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1) + L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1)
      const m = Math.hypot(gx, gy)
      edge[y * w + x] = m
      if (m > maxEdge) maxEdge = m
    }
  }

  const weight = new Float32Array(w * h)
  let total = 0
  for (let i = 0; i < w * h; i++) {
    const a = alpha[i]
    if (a < 0.05) continue
    const e = Math.min(1, (edge[i] / maxEdge) * 2.2)
    edge[i] = e
    // Mostly even coverage (halftone-like, the shader dims dark dots) with a
    // bias toward bright skin and contours so features stay crisp.
    weight[i] = a * a * (0.35 + 0.65 * lum[i] ** 1.5 + 0.9 * e)
    total += weight[i]
  }

  // Cumulative distribution for inverse-transform sampling.
  const cdf = new Float32Array(w * h)
  let acc = 0
  for (let i = 0; i < w * h; i++) {
    acc += weight[i] / total
    cdf[i] = acc
  }

  const positions = new Float32Array(count * 3)
  const tone = new Float32Array(count)
  const edgeOut = new Float32Array(count)
  // Head ellipsoid (in image fractions) used to give the face volume.
  const cx = 0.5
  const cy = 0.5
  const rx = 0.42
  const ry = 0.55

  for (let n = 0; n < count; n++) {
    const r = Math.random()
    let lo = 0
    let hi = cdf.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cdf[mid] < r) lo = mid + 1
      else hi = mid
    }
    const px = (lo % w) + Math.random()
    const py = Math.floor(lo / w) + Math.random()
    const u = px / w
    const v = py / h

    const dx = (u - cx) / rx
    const dy = (v - cy) / ry
    const bulge = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy))

    positions[n * 3] = (px - w / 2) / h
    positions[n * 3 + 1] = -(py - h / 2) / h
    positions[n * 3 + 2] = bulge * 0.32 + lum[lo] * 0.03 + (Math.random() - 0.5) * 0.015
    tone[n] = lum[lo]
    edgeOut[n] = edge[lo]
  }

  return { count, positions, tone, edge: edgeOut }
}
