import { useEffect, useState } from 'react'
import { samplePortrait, type DotShape } from './samplePortrait'

const PORTRAIT_URL = `${import.meta.env.BASE_URL}portrait.png`

export const dotCountForDevice = () => {
  const small = window.matchMedia('(max-width: 720px)').matches
  return small ? 10000 : 24000
}

export function usePortraitPoints(count: number) {
  const [shape, setShape] = useState<DotShape | null>(null)

  useEffect(() => {
    let cancelled = false
    samplePortrait(PORTRAIT_URL, count)
      .then((s) => !cancelled && setShape(s))
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [count])

  return shape
}
