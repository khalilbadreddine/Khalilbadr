import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { Hero } from './components/Hero'
import { Section } from './components/Section'
import { useScrollState } from './hooks/useScrollState'
import { DotField } from './particles/DotField'
import { dotCountForDevice, usePortraitPoints } from './particles/usePortraitPoints'

// Milestone 1: every section settles back into the portrait. Milestone 2
// gives each section its own shape (card, globe, trophy…).
const SECTIONS = [
  {
    kicker: '2026 — Present',
    title: 'The Recipe Seeker',
    body: 'Founded and built a nutrition-first recipe platform with React, Node.js and Supabase — USDA nutrition data, an AI-assisted publishing pipeline and a Pinterest audience of 11,000 followers.',
  },
  {
    kicker: '2025 — 2026 · VNB-IT, France',
    title: 'Payments, end to end',
    body: 'Rebuilt a Django + Stripe payment module from intern to freelance owner: Stripe Connect, 3D Secure, code reviews and team coordination.',
  },
  {
    kicker: 'Selected work',
    title: 'Hackathons & products',
    body: '2nd place at the Orange Mega Hackathon leading a team of four on an ML health chatbot, plus a full-stack e-commerce app with React, Redux and Express.',
  },
  {
    kicker: 'Say hello',
    title: "Let's build something",
    body: 'KhalilBadre5@gmail.com',
  },
]

export default function App() {
  useScrollState()
  const count = useMemo(dotCountForDevice, [])
  const portrait = usePortraitPoints(count)

  return (
    <>
      <div className="stage" aria-hidden="true">
        <Canvas camera={{ position: [0, 0, 10], fov: 35 }} dpr={[1, 2]} gl={{ antialias: false, alpha: true }}>
          {portrait && <DotField shape={portrait} />}
        </Canvas>
      </div>
      <main>
        <Hero />
        {SECTIONS.map((s) => (
          <Section key={s.title} {...s} />
        ))}
      </main>
    </>
  )
}
