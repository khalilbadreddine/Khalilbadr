// Mutable, render-loop friendly state. DOM listeners write here and the
// particle field reads it every frame, so nothing re-renders React per frame.
export const motion = {
  /** Pointer in normalized device coords (-1..1, y up). */
  pointer: { x: 0, y: 0 },
  /** True once a mouse/touch has reported a position. */
  hasPointer: false,
  /** performance.now() of the last scroll event. */
  lastScrollAt: -Infinity,
  /** Smoothed scroll speed in px/ms. */
  scrollSpeed: 0,
  /** Index of the section closest to the viewport centre. */
  section: 0,
  reducedMotion: false,
}

/** How long scrolling must pause before the dots re-form. */
export const SETTLE_DELAY_MS = 180

export const isScrolling = (now: number) => now - motion.lastScrollAt < SETTLE_DELAY_MS
