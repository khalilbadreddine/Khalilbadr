import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { DotScene } from '../scenes/types'
import { isScrolling, motion } from '../state/motion'
import { fragmentShader, vertexShader } from './shaders'

interface Props {
  /** One scene per page section, in order; all share the same dot count. */
  scenes: DotScene[]
  /** Titles cycled on the monitor in the desktop scene. */
  screenTitles: string[]
}

const TAU = Math.PI * 2

/** Where the scene sits and how tall it is, in world units at z = 0. */
function layoutFor(viewW: number, viewH: number, aspect: number) {
  if (viewW / viewH > 1) {
    const height = Math.min(viewH * 0.8, (viewW * 0.52) / aspect)
    return { x: viewW * 0.2, y: -viewH * 0.02, height }
  }
  const height = Math.min(viewH * 0.46, (viewW * 0.94) / aspect)
  return { x: 0, y: viewH * 0.22, height }
}

/** Project titles drawn into a texture the monitor samples. */
function titleTexture(titles: string[]) {
  const w = 512
  const h = 310
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h * titles.length
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  titles.forEach((title, i) => {
    // With flipY, texture v = 0 is the canvas bottom: title i fills slot i from the bottom.
    const top = canvas.height - (i + 1) * h
    const lines = title.split('\n')
    lines.forEach((line, l) => {
      ctx.font = `700 ${l === 0 ? 76 : 44}px "Space Grotesk", system-ui, sans-serif`
      ctx.fillText(line, w / 2, top + h / 2 + (l - (lines.length - 1) / 2) * 86)
    })
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  return tex
}

export function DotField({ scenes, screenTitles }: Props) {
  const { camera, size, gl } = useThree()
  const pointsRef = useRef<THREE.Points>(null)
  const count = scenes[0].data.tone.length

  // Simulation buffers live outside React state; useFrame mutates them.
  const sim = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const speed = new Float32Array(count)
    const orbit = new Float32Array(count * 4) // radius, speed, phase, tilt
    for (let i = 0; i < count; i++) {
      // Start as a wide cloud so the first shape draws itself on load.
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
    const first = scenes[0].data
    return {
      pos,
      vel,
      seed,
      speed,
      orbit,
      tone: new Float32Array(first.tone),
      glow: new Float32Array(first.glow),
      uv: new Float32Array(first.uv),
      scene: 0,
      fade: 1,
      settledAt: 0,
      wasScrolling: false,
      loose: 1,
      yaw: 0,
      pitch: 0,
    }
  }, [count, scenes])

  const uniforms = useMemo(
    () => ({
      uSize: { value: 36 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uTime: { value: 0 },
      uLoose: { value: 1 },
      uPointer: { value: new THREE.Vector2(999, 999) },
      uHasPointer: { value: 0 },
      uCenter: { value: new THREE.Vector2() },
      uScale: { value: 1 },
      uTitles: { value: titleTexture(screenTitles) },
      uTitleCount: { value: screenTitles.length },
      uDotScale: { value: 1 },
      uGain: { value: 1 },
    }),
    [gl, screenTitles],
  )

  useEffect(() => {
    uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2)
  }, [gl, size, uniforms])

  useEffect(() => () => uniforms.uTitles.value.dispose(), [uniforms])

  const pointerWorld = useMemo(() => new THREE.Vector3(), [])
  const ndc = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, rawDt) => {
    const points = pointsRef.current
    if (!points) return
    const geo = points.geometry
    const dt = Math.min(rawDt, 1 / 30)
    const t = state.clock.elapsedTime
    const now = performance.now()
    const cam = camera as THREE.PerspectiveCamera

    // --- Which scene, and cross-fade its colours in --------------------------
    const index = Math.min(Math.max(motion.section, 0), scenes.length - 1)
    const scene = scenes[index]
    if (index !== sim.scene) {
      sim.scene = index
      sim.fade = 0
      sim.uv.set(scene.data.uv)
      geo.attributes.aUv.needsUpdate = true
    }
    if (sim.fade < 1) {
      sim.fade = Math.min(1, sim.fade + dt * 1.6)
      const k = sim.fade >= 1 ? 1 : Math.min(1, dt * 5)
      const { tone, glow } = scene.data
      for (let i = 0; i < count; i++) {
        sim.tone[i] += (tone[i] - sim.tone[i]) * k
        sim.glow[i] += (glow[i] - sim.glow[i]) * k
      }
      geo.attributes.aTone.needsUpdate = true
      geo.attributes.aGlow.needsUpdate = true
    }

    // --- Layout and pointer ---------------------------------------------------
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.position.z
    const viewW = viewH * cam.aspect
    const layout = layoutFor(viewW, viewH, scene.aspect)

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
    uniforms.uPointer.value.set(pointerWorld.x, pointerWorld.y)
    uniforms.uHasPointer.value = motion.hasPointer ? 1 : 0
    uniforms.uCenter.value.set(layout.x, layout.y)
    uniforms.uScale.value = layout.height
    const ease = Math.min(1, dt * 3)
    uniforms.uDotScale.value += ((scene.dotSize ?? 1) - uniforms.uDotScale.value) * ease
    uniforms.uGain.value += ((scene.gain ?? 1) - uniforms.uGain.value) * ease

    // Animated scenes pose themselves; the pointer is passed in scene units.
    scene.update?.(t, {
      pointer: { x: (pointerWorld.x - layout.x) / layout.height, y: (pointerWorld.y - layout.y) / layout.height },
      hasPointer: motion.hasPointer,
    })

    // Gentle 3D parallax: the scene turns a little toward the cursor.
    const targetYaw = (motion.hasPointer ? motion.pointer.x * 0.35 : Math.sin(t * 0.3) * 0.15) * scene.parallax
    const targetPitch = (motion.hasPointer ? -motion.pointer.y * 0.18 : 0) * scene.parallax
    sim.yaw += (targetYaw - sim.yaw) * Math.min(1, dt * 2)
    sim.pitch += (targetPitch - sim.pitch) * Math.min(1, dt * 2)
    const cy = Math.cos(sim.yaw)
    const sy = Math.sin(sim.yaw)
    const cp = Math.cos(sim.pitch)
    const sp = Math.sin(sim.pitch)
    const scale = layout.height * (1 + Math.sin(t * 1.2) * 0.006)

    const { pos, vel, seed, orbit, speed } = sim
    const home = scene.data.home
    const sinceSettle = t - sim.settledAt
    const spread = 1 + Math.min(motion.scrollSpeed, 4) * 0.5
    const repelR = layout.height * 0.1
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
        // Shape: rotate the home point (yaw, then pitch) and place it.
        const hx = home[i3] * scale
        const hy = home[i3 + 1] * scale
        const hz = home[i3 + 2] * scale
        const x1 = hx * cy + hz * sy
        const z1 = -hx * sy + hz * cy
        tx = layout.x + x1
        ty = layout.y + hy * cp - z1 * sp
        tz = hy * sp + z1 * cp
        // Staggered pull-in so the shape "draws itself" after each scroll.
        const delay = seed[i] * 0.55
        const ramp = Math.min(1, Math.max(0, (sinceSettle - delay) / 0.6))
        k = 34 * ramp * ramp
      }

      let ax = (tx - pos[i3]) * k
      let ay = (ty - pos[i3 + 1]) * k
      const az = (tz - pos[i3 + 2]) * k

      if (!scrolling && motion.hasPointer) {
        // Brush the dots away with the cursor; the spring heals the shape.
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

      const vx = (vel[i3] + ax * dt) * damp
      const vy = (vel[i3 + 1] + ay * dt) * damp
      const vz = (vel[i3 + 2] + az * dt) * damp
      vel[i3] = vx
      vel[i3 + 1] = vy
      vel[i3 + 2] = vz
      pos[i3] += vx * dt
      pos[i3 + 1] += vy * dt
      pos[i3 + 2] += vz * dt
      speed[i] = Math.sqrt(vx * vx + vy * vy + vz * vz)
    }

    geo.attributes.position.needsUpdate = true
    geo.attributes.aSpeed.needsUpdate = true
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[sim.pos, 3]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aTone" args={[sim.tone, 1]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aGlow" args={[sim.glow, 1]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aUv" args={[sim.uv, 2]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aSeed" args={[sim.seed, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[sim.speed, 1]} usage={THREE.DynamicDrawUsage} />
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
