import { Figure, standingPose } from './figure'
import { clamp, rotY } from './math'
import { addOrbit } from './orbit'
import { DotRig } from './rig'
import type { SceneFactory, SceneInput } from './types'

/**
 * About me: a big-headed figure that waves. The head pivots at the neck so
 * the top of the head leans toward the cursor.
 */
export const chibiScene: SceneFactory = (count, { head }) => {
  const rig = new DotRig(count)
  const figure = new Figure(rig, head, rig.share(0.85), 0.52, 0.5)
  const orbit = addOrbit(rig, rig.share(0.03), { radius: 0.5, tilt: 1.25, roll: 0.3, speed: 0.5 })
  const dust = rig.part()
  rig.fillDust(dust, 0.75, 0.7)

  const pose = standingPose()
  const rootY = -figure.height / 2 + 0.29
  const neckY = rootY + Figure.neckHeight
  const look = { yaw: 0, pitch: 0, roll: 0 }
  let lastT = 0

  const update = (t: number, input: SceneInput) => {
    const dt = clamp(t - lastT, 0, 0.1)
    lastT = t
    const bounce = Math.sin(t * 2.4) * 0.008

    let target = { yaw: Math.sin(t * 0.5) * 0.2, pitch: 0, roll: Math.sin(t * 0.7) * 0.1 }
    if (input.hasPointer) {
      const dx = input.pointer.x
      const dy = input.pointer.y - neckY
      target = {
        // Tilt so the top of the head points at the cursor…
        roll: clamp(-Math.atan2(dx, Math.max(dy, 0.15)) * 0.6, -0.45, 0.45),
        // …and turn/nod a little toward it.
        yaw: clamp(dx * 0.9, -0.55, 0.55),
        pitch: clamp(-(dy - 0.2) * 0.5, -0.3, 0.3),
      }
    }
    const k = 1 - Math.exp(-dt * 5)
    look.yaw += (target.yaw - look.yaw) * k
    look.pitch += (target.pitch - look.pitch) * k
    look.roll += (target.roll - look.roll) * k

    pose.root = [0, rootY + bounce, 0]
    pose.yaw = look.yaw * 0.25
    pose.lean = Math.sin(t * 1.2) * 0.03
    pose.head = look
    // Viewer-right arm waves; the other hangs and sways.
    pose.arms[1] = { abduct: 2.25 + Math.sin(t * 2.4) * 0.05, flex: -0.15, elbow: 0, elbowSide: 0.55 + Math.sin(t * 7) * 0.45 }
    pose.arms[0] = { abduct: 0.16 + Math.sin(t * 2.4 + 1) * 0.04, flex: Math.sin(t * 1.3) * 0.06, elbow: -0.12, elbowSide: 0 }

    figure.pose(pose)
    rig.set(dust, [0, 0, 0], rotY(t * 0.05))
    orbit(t, [0, 0.05, 0])
    rig.apply()
  }
  update(0, { pointer: { x: 0, y: 0 }, hasPointer: false })

  return { id: 'chibi', aspect: 0.8, parallax: 0.25, dotSize: 0.75, gain: 0.6, data: rig.data, update }
}
