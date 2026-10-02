import { rotY } from './math'
import { addOrbit } from './orbit'
import { DotRig } from './rig'
import type { SceneFactory } from './types'

/** Hero: head and shoulders from the photo. */
export const portraitScene: SceneFactory = (count, { portrait }) => {
  const rig = new DotRig(count)
  const body = rig.part()
  const shape = portrait(rig.share(0.93))
  for (let i = 0; i < shape.count; i++) {
    const p = shape.positions
    rig.add(body, p[i * 3], p[i * 3 + 1], p[i * 3 + 2], shape.tone[i], shape.edge[i] > 0.6 ? 0.2 : 0)
  }
  const orbit = addOrbit(rig, rig.share(0.03), { radius: 0.56, tilt: 1.32, roll: -0.35, speed: 0.35 })
  const dust = rig.part()
  rig.fillDust(dust, 0.8, 0.75)
  orbit(0, [0, 0.05, -0.1])
  rig.apply()

  return {
    id: 'portrait',
    aspect: 0.8,
    parallax: 1,
    data: rig.data,
    update(t) {
      rig.set(dust, [0, 0, 0], rotY(t * 0.05))
      orbit(t, [0, 0.05, -0.1])
      rig.apply()
    },
  }
}
