import type { ImageSampler } from '../particles/sampleImage'

/** Per-dot data a scene hands to the particle field. */
export interface SceneData {
  /** Target xyz per dot in scene units (composition height ≈ 1, centred). */
  home: Float32Array
  /** 0..1 brightness per dot. */
  tone: Float32Array
  /** 0..1+ emissive weight per dot (glows and blooms). */
  glow: Float32Array
  /**
   * Two floats per dot. x >= 0: the dot is a monitor pixel at (u, v) and the
   * shader draws the screen content. x = -2: keyboard key that flashes.
   * Otherwise -1.
   */
  uv: Float32Array
}

export interface SceneInput {
  /** Pointer in scene units (same space as `home`). */
  pointer: { x: number; y: number }
  hasPointer: boolean
}

export interface DotScene {
  id: string
  /** Width / height of the composition, used to fit it on screen. */
  aspect: number
  /** How strongly the whole scene turns toward the cursor (0..1). */
  parallax: number
  /** Dot size and brightness multipliers — dense scenes use smaller, dimmer dots. */
  dotSize?: number
  gain?: number
  data: SceneData
  /** Animated scenes rewrite `data.home` each frame. */
  update?: (t: number, input: SceneInput) => void
}

export interface SceneAssets {
  portrait: ImageSampler
  head: ImageSampler
}

export type SceneFactory = (count: number, assets: SceneAssets) => DotScene

export const UV_NONE = -1
export const UV_KEY = -2
