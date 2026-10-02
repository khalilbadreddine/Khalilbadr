import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect, useMemo, useState } from 'react'
import { Section } from './components/Section'
import { SCREEN_TITLES, SECTIONS } from './content'
import { useScrollState } from './hooks/useScrollState'
import { DotField } from './particles/DotField'
import { loadImageSampler } from './particles/sampleImage'
import { buildScenes } from './scenes'
import type { DotScene } from './scenes/types'

const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`

const isSmallScreen = () => window.matchMedia('(max-width: 720px)').matches

function useScenes(count: number) {
  const [scenes, setScenes] = useState<DotScene[] | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Dot text is drawn with the page font, so wait for it.
      await document.fonts?.ready
      const [portrait, head] = await Promise.all([loadImageSampler(asset('portrait.png')), loadImageSampler(asset('head.png'))])
      if (!cancelled) setScenes(buildScenes(SECTIONS.map((s) => s.scene), count, { portrait, head }))
    })().catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [count])
  return scenes
}

export default function App() {
  useScrollState()
  const small = useMemo(isSmallScreen, [])
  const bloom = useMemo(() => !small && !window.matchMedia('(prefers-reduced-motion: reduce)').matches, [small])
  const scenes = useScenes(small ? 10000 : 24000)

  return (
    <>
      <div className="stage" aria-hidden="true">
        <Canvas camera={{ position: [0, 0, 10], fov: 35 }} dpr={[1, 2]} gl={{ antialias: false }}>
          <color attach="background" args={['#05070d']} />
          {scenes && <DotField scenes={scenes} screenTitles={SCREEN_TITLES} />}
          {bloom && (
            <EffectComposer multisampling={0}>
              <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.65} />
              <Vignette offset={0.3} darkness={0.6} />
            </EffectComposer>
          )}
        </Canvas>
      </div>
      <main>
        {SECTIONS.map((s, i) => (
          <Section key={s.id} {...s} index={i} total={SECTIONS.length} />
        ))}
      </main>
    </>
  )
}
