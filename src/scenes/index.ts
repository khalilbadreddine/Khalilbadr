import { chibiScene } from './chibiScene'
import { desktopScene } from './desktopScene'
import { bowlScene, cardScene, envelopeScene } from './objectScenes'
import { portraitScene } from './portraitScene'
import type { DotScene, SceneAssets, SceneFactory } from './types'

export const SCENES = {
  portrait: portraitScene,
  chibi: chibiScene,
  bowl: bowlScene,
  card: cardScene,
  desktop: desktopScene,
  envelope: envelopeScene,
} satisfies Record<string, SceneFactory>

export type SceneId = keyof typeof SCENES

export const buildScenes = (ids: SceneId[], count: number, assets: SceneAssets): DotScene[] =>
  ids.map((id) => SCENES[id](count, assets))
