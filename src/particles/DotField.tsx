import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { isScrolling, motion } from '../state/motion'
import type { DotShape } from './samplePortrait'
import { fragmentShader, vertexShader } from './shaders'

interface Props {
  /** The shape the dots settle into when scrolling stops. */
  shape: DotShape
}

const TAU = Math.PI * 2

/** Where the shape sits and how big it is, in world units at z = 0. */
function layoutFor(viewW: number, viewH: number) {
  if (viewW / viewH > 1) {
    const height = Math.min(viewH * 0.82, viewW * 0.5)
    return { x: viewW * 0.2, y: -viewH * 0.02, height }
  }
  const height = Math.min(viewH * 0.48, viewW * 0.95)
  return { x: 0, y: viewH * 0.22, height }
}

export function DotField({ shape }: Props) {
  const { camera, size, gl } = useThree()
  const pointsRef = useRef<THREE.Points>(null)
  const count = shape.count

  // Simulation buffers live outside React state; useFrame mutates them.
  const sim = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const orbit = new Float32Array(count * 4) // radius, speed, phase, tilt
    for (let i = 0; i < count; i++) {
      // Start as a wide cloud so the portrait draws itself on load.
      const r = 6 + Math.random() * 6
      const a = Math.random() * TAU
      const b = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(b) * Math.cos(a)
      pos[i * 3 + 1] = r * Math.sin(b) * Math.sin(a)
      pos[i * 3 + 2] = r * Math.cos(b) - 4
      seed[i] = Math.random()
      orbit[i * 4] = 0.15 + Math.pow(Math.random(), 1.8) * 1.6
      orbit[i * 4 + 1] = (0.6 + Math.random() * 1.6) * (Math.random() < 0.85 ? 1 : -1)
      orbit[i * 4 + 2] = Math.random() * TAU
      orbit[i * 4 + 3] = (Math.random() - 0.5) * 1.4
    }
    return { pos, vel, seed, orbit, settledAt: 0, wasScrolling: false, loose: 1, yaw: 0, pitch: 0 }
  }, [count])

  const uniforms = useMemo(
    () => ({
      uSize: { value: 36 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uTime: { value: 0 },
      uLoose: { value: 1 },
    }),
    [gl],
  )

  useEffect(() => {
    uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2)
  }, [gl, size, uniforms])

  const pointerWorld = useMemo(() => new THREE.Vector3(), [])
  const ndc = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, rawDt) => {
    const points = pointsRef.current
    if (!points) return
    const dt = Math.min(rawDt, 1 / 30)
    const t = state.clock.elapsedTime
    const now = performance.now()
    const cam = camera as THREE.PerspectiveCamera

    // Visible world size at z = 0.
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.position.z
    const viewW = viewH * cam.aspect
    const layout = layoutFor(viewW, viewH)

    // Pointer projected onto the z = 0 plane (screen centre until one exists).
    ndc.set(motion.hasPointer ? motion.pointer.x : 0, motion.hasPointer ? motion.pointer.y : 0, 0.5)
    ndc.unproject(cam).sub(cam.position).normalize()
    pointerWorld.copy(cam.position).addScaledVector(ndc, -cam.position.z / ndc.z)

    const scrolling = isScrolling(now) && !motion.reducedMotion
    if (sim.wasScrolling && !scrolling) sim.settledAt = t
    if (!sim.wasScrolling && scrolling) motion.scrollSpeed = Math.max(motion.scrollSpeed, 0.5)
    sim.wasScrolling = scrolling
    motion.scrollSpeed *= Math.exp(-dt * 3)

    sim.loose += ((scrolling ? 1 : 0) - sim.loose) * Math.min(1, dt * (scrolling ? 6 : 2.5))
    uniforms.uLoose.value = sim.loose
    uniforms.uTime.value = t

    // Gentle 3D parallax: the head turns a little toward the cursor.
    const targetYaw = motion.hasPointer ? motion.pointer.x * 0.35 : Math.sin(t * 0.3) * 0.15
    const targetPitch = motion.hasPointer ? -motion.pointer.y * 0.18 : 0
    sim.yaw += (targetYaw - sim.yaw) * Math.min(1, dt * 2)
    sim.pitch += (targetPitch - sim.pitch) * Math.min(1, dt * 2)
    const cy = Math.cos(sim.yaw)
    const sy = Math.sin(sim.yaw)
    const cp = Math.cos(sim.pitch)
    const sp = Math.sin(sim.pitch)
    const breathe = 1 + Math.sin(t * 1.2) * 0.008
    const scale = layout.height * breathe
    const depth = layout.height * 1.0

    const { pos, vel, seed, orbit } = sim
    const home = shape.positions
    const sinceSettle = t - sim.settledAt
    const spread = 1 + Math.min(motion.scrollSpeed, 4) * 0.5
    const repelR = layout.height * 0.12
    const repelR2 = repelR * repelR
    const px = pointerWorld.x
    const py = pointerWorld.y
    const damp = Math.exp(-dt * (scrolling ? 3.2 : 6.5))

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      let tx: number
      let ty: number
      let tz: number
      let k: number

      if (scrolling) {
        // Swarm: each dot orbits the cursor on its own tilted ring.
        const i4 = i * 4
        const r = orbit[i4] * spread * (layout.height * 0.24)
        const a = orbit[i4 + 2] + t * orbit[i4 + 1]
        const tilt = orbit[i4 + 3]
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        const wob = Math.sin(t * 1.7 + seed[i] * 40) * 0.12 * r
        tx = px + ca * r + wob
        ty = py + sa * r * Math.cos(tilt)
        tz = sa * r * Math.sin(tilt) + wob
        k = 4 + seed[i] * 14 // varied stiffness → dots trail in streams
      } else {
        // Portrait: rotate the home point (yaw, then pitch) and place it.
        const hx = home[i3] * scale
        const hy = home[i3 + 1] * scale
        const hz = home[i3 + 2] * depth
        const x1 = hx * cy + hz * sy
        const z1 = -hx * sy + hz * cy
        const y2 = hy * cp - z1 * sp
        const z2 = hy * sp + z1 * cp
        tx = layout.x + x1
        ty = layout.y + y2
        tz = z2
        // Staggered pull-in so the face "draws itself" after each scroll.
        const delay = seed[i] * 0.55
        const ramp = Math.min(1, Math.max(0, (sinceSettle - delay) / 0.6))
        k = (motion.reducedMotion ? 30 : 34) * ramp * ramp
      }

      let ax = (tx - pos[i3]) * k
      let ay = (ty - pos[i3 + 1]) * k
      const az = (tz - pos[i3 + 2]) * k

      if (!scrolling && motion.hasPointer) {
        // Brush the dots away with the cursor; the spring heals the face.
        const dx = pos[i3] - px
        const dy = pos[i3 + 1] - py
        const d2 = dx * dx + dy * dy
        if (d2 < repelR2 && d2 > 1e-6) {
          const d = Math.sqrt(d2)
          const f = ((repelR - d) / repelR) * 90
          ax += (dx / d) * f
          ay += (dy / d) * f
        }
      }

      vel[i3] = (vel[i3] + ax * dt) * damp
      vel[i3 + 1] = (vel[i3 + 1] + ay * dt) * damp
      vel[i3 + 2] = (vel[i3 + 2] + az * dt) * damp
      pos[i3] += vel[i3] * dt
      pos[i3 + 1] += vel[i3 + 1] * dt
      pos[i3 + 2] += vel[i3 + 2] * dt
    }

    points.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[sim.pos, 3]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aTone" args={[shape.tone, 1]} />
        <bufferAttribute attach="attributes-aEdge" args={[shape.edge, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[sim.seed, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
