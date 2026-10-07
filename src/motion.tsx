import { useEffect, useRef, type CSSProperties } from 'react'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

/** Splits a word into letters that rise in sequence (styling lives in `.split`). */
export function SplitLetters({ text, delay = 0 }: { text: string; delay?: number }) {
  return <span className="split" aria-hidden="true">{[...text].map((letter, index) => <span key={index} style={{ '--i': index, '--d': `${delay}ms` } as CSSProperties}>{letter === ' ' ? ' ' : letter}</span>)}</span>
}

/** Elements marked `data-magnetic` lean toward the pointer while hovered. */
export function useMagnetic(key: unknown) {
  useEffect(() => {
    if (reduceMotion() || !finePointer()) return
    const elements = [...document.querySelectorAll<HTMLElement>('[data-magnetic]')]
    const cleanups = elements.map((element) => {
      const strength = Number(element.dataset.magnetic) || 0.3
      const move = (event: PointerEvent) => {
        const box = element.getBoundingClientRect()
        const x = (event.clientX - box.left - box.width / 2) * strength
        const y = (event.clientY - box.top - box.height / 2) * strength
        element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      }
      const leave = () => { element.style.transform = '' }
      element.addEventListener('pointermove', move)
      element.addEventListener('pointerleave', leave)
      return () => {
        element.removeEventListener('pointermove', move)
        element.removeEventListener('pointerleave', leave)
        element.style.transform = ''
      }
    })
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [key])
}

/** Writes eased pointer position (-1..1) into `--px` / `--py` on the element. */
export function usePointerParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const element = ref.current
    if (!element || reduceMotion() || !finePointer()) return
    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    let frame = 0
    const loop = () => {
      x += (targetX - x) * 0.07
      y += (targetY - y) * 0.07
      element.style.setProperty('--px', x.toFixed(4))
      element.style.setProperty('--py', y.toFixed(4))
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.001 ? requestAnimationFrame(loop) : 0
    }
    const move = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1
      targetY = (event.clientY / window.innerHeight) * 2 - 1
      if (!frame) frame = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(frame)
    }
  }, [])
  return ref
}
