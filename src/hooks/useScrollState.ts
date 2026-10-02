import { useEffect, useState } from 'react'
import { motion } from '../state/motion'

/**
 * Wires scroll + pointer listeners into the shared motion store and tracks
 * which section is in view. Returns the active section index for the UI.
 */
export function useScrollState(sectionSelector = '[data-section]') {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncReduced = () => (motion.reducedMotion = media.matches)
    syncReduced()
    media.addEventListener('change', syncReduced)

    let lastY = window.scrollY
    let lastT = performance.now()
    const onScroll = () => {
      const now = performance.now()
      const speed = Math.abs(window.scrollY - lastY) / Math.max(now - lastT, 1)
      motion.scrollSpeed = motion.scrollSpeed * 0.7 + speed * 0.3
      motion.lastScrollAt = now
      lastY = window.scrollY
      lastT = now
    }

    const setPointer = (clientX: number, clientY: number) => {
      motion.pointer.x = (clientX / window.innerWidth) * 2 - 1
      motion.pointer.y = -(clientY / window.innerHeight) * 2 + 1
      motion.hasPointer = true
    }
    const onPointer = (e: PointerEvent) => setPointer(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) setPointer(t.clientX, t.clientY)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })

    const sections = Array.from(document.querySelectorAll<HTMLElement>(sectionSelector))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = sections.indexOf(entry.target as HTMLElement)
          motion.section = index
          setActive(index)
        }
      },
      // A thin band across the middle of the viewport: whichever section
      // crosses it is the one being read.
      { rootMargin: '-45% 0px -45% 0px' },
    )
    sections.forEach((s) => observer.observe(s))

    return () => {
      media.removeEventListener('change', syncReduced)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
      observer.disconnect()
    }
  }, [sectionSelector])

  return active
}
