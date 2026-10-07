import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface OrbitItem {
  key: string
  src: string
  srcSet?: string
  alt: string
}

const AUTO_SPEED = -4 // degrees per second; negative turns the wheel to the left
const MIN_CARDS = 18

/**
 * Cards laid out on a huge circle whose top arc peeks into view, inspired by
 * "orbit" carousels. It cruises on its own, follows drag/flick with inertia,
 * snaps with the arrow buttons or keyboard, and pauses while hovered.
 * All per-frame work writes transforms straight to the DOM; React only hears
 * about it when the front card changes.
 */
export function Orbit({ items, onSelect, onActiveChange, label, children }: {
  items: OrbitItem[]
  onSelect: (index: number) => void
  onActiveChange?: (index: number) => void
  label: string
  children?: ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])
  const onActiveRef = useRef(onActiveChange)
  onActiveRef.current = onActiveChange
  const [front, setFront] = useState(0)
  const engine = useRef({ snapBy: (_steps: number) => {}, wasDrag: false })

  // Repeat short lists so the circle is always full.
  const repeat = Math.max(1, Math.ceil(MIN_CARDS / Math.max(items.length, 1)))
  const cards = Array.from({ length: items.length * repeat }, (_, index) => ({ ...items[index % items.length], slot: index, source: index % items.length }))
  const count = cards.length

  useEffect(() => {
    const root = rootRef.current
    if (!root || !count) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const step = 360 / count
    let radius = 800
    let rotation = 0
    let velocity = reduce ? 0 : AUTO_SPEED
    let snapTarget: number | null = null
    let idleUntil = 0
    let hovering = false
    let dragging = false
    let dragStartX = 0
    let lastX = 0
    let lastMoveAt = 0
    let dragVelocity = 0
    let frame = 0
    let last = performance.now()
    let visible = true
    let activeSource = -1

    const measure = () => {
      const card = cardRefs.current[0]
      if (!card) return
      const width = card.offsetWidth
      radius = (count * width * 1.1) / (2 * Math.PI)
      root.style.setProperty('--orbit-r', `${radius}px`)
    }

    const render = () => {
      let best = 0
      let bestDistance = Infinity
      for (let index = 0; index < count; index += 1) {
        const element = cardRefs.current[index]
        if (!element) continue
        let angle = (index * step + rotation) % 360
        if (angle > 180) angle -= 360
        if (angle < -180) angle += 360
        const distance = Math.abs(angle)
        if (distance < bestDistance) { bestDistance = distance; best = index }
        if (distance > 95) {
          element.style.visibility = 'hidden'
          continue
        }
        const near = Math.max(0, 1 - distance / (step * 1.4))
        element.style.visibility = ''
        element.style.zIndex = String(200 - Math.round(distance))
        element.style.transform = `rotate(${angle.toFixed(3)}deg) translateY(${(-radius).toFixed(1)}px) scale(${(1 + near * 0.08).toFixed(4)})`
        element.style.setProperty('--near', near.toFixed(3))
      }
      const source = best % items.length
      if (source !== activeSource) {
        activeSource = source
        setFront(best)
        onActiveRef.current?.(source)
      }
    }

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!dragging) {
        if (snapTarget !== null) {
          rotation += (snapTarget - rotation) * (1 - Math.exp(-dt * 9))
          if (Math.abs(snapTarget - rotation) < 0.02) { rotation = snapTarget; snapTarget = null }
          velocity = 0
        } else {
          const cruise = reduce || hovering || now < idleUntil ? 0 : AUTO_SPEED
          velocity = cruise + (velocity - cruise) * Math.exp(-dt * 2.2)
          rotation += velocity * dt
        }
      }
      render()
      frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0
    }
    const start = () => {
      if (frame) return
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }

    engine.current.snapBy = (steps: number) => {
      const base = snapTarget ?? rotation
      snapTarget = Math.round(base / step) * step - steps * step
      idleUntil = performance.now() + 3500
      start()
    }

    const toDegrees = (pixels: number) => (pixels / radius) * (180 / Math.PI)
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      dragging = true
      engine.current.wasDrag = false
      dragStartX = lastX = event.clientX
      lastMoveAt = performance.now()
      dragVelocity = 0
      snapTarget = null
      root.classList.add('is-dragging')
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      const now = performance.now()
      const delta = toDegrees(event.clientX - lastX)
      rotation += delta
      dragVelocity = delta / Math.max((now - lastMoveAt) / 1000, 0.008)
      lastX = event.clientX
      lastMoveAt = now
      if (Math.abs(event.clientX - dragStartX) > 6 && !engine.current.wasDrag) {
        engine.current.wasDrag = true
        root.setPointerCapture(event.pointerId)
      }
    }
    const onPointerUp = () => {
      if (!dragging) return
      dragging = false
      root.classList.remove('is-dragging')
      if (performance.now() - lastMoveAt > 90) dragVelocity = 0
      velocity = Math.max(-240, Math.min(240, dragVelocity))
      idleUntil = performance.now() + 2500
    }
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      event.preventDefault()
      snapTarget = null
      velocity -= event.deltaX * 0.35
      idleUntil = performance.now() + 2500
    }
    const onEnter = () => { hovering = true }
    const onLeave = () => { hovering = false }

    measure()
    render()
    const resize = new ResizeObserver(() => { measure(); render() })
    resize.observe(root)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
    })
    observer.observe(root)
    const onVisibility = () => { if (!document.hidden) start() }
    document.addEventListener('visibilitychange', onVisibility)
    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointermove', onPointerMove)
    root.addEventListener('pointerup', onPointerUp)
    root.addEventListener('pointercancel', onPointerUp)
    root.addEventListener('wheel', onWheel, { passive: false })
    const stage = root.querySelector('.orbit-stage')
    stage?.addEventListener('pointerenter', onEnter)
    stage?.addEventListener('pointerleave', onLeave)
    start()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', onPointerUp)
      root.removeEventListener('pointercancel', onPointerUp)
      root.removeEventListener('wheel', onWheel)
      stage?.removeEventListener('pointerenter', onEnter)
      stage?.removeEventListener('pointerleave', onLeave)
    }
  }, [count, items.length])

  return <div className="orbit" ref={rootRef} role="region" aria-roledescription="carrusel" aria-label={label} onKeyDown={(event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); engine.current.snapBy(1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); engine.current.snapBy(-1) }
  }}>
    <div className="orbit-stage">
      {cards.map((card, index) => <button
        key={`${card.key}-${card.slot}`}
        ref={(element) => { cardRefs.current[index] = element }}
        type="button"
        className={`orbit-card${index === front ? ' is-front' : ''}`}
        tabIndex={index === front ? 0 : -1}
        aria-hidden={index !== front}
        aria-label={card.alt}
        onClick={() => { if (!engine.current.wasDrag) onSelect(card.source) }}
      >
        <img src={card.src} srcSet={card.srcSet} sizes="(max-width: 760px) 180px, 240px" alt="" draggable={false} loading={index < 8 || index > count - 8 ? 'eager' : 'lazy'} decoding="async" />
      </button>)}
    </div>
    <div className="orbit-center">
      {children}
      <div className="orbit-arrows">
        <button type="button" onClick={() => engine.current.snapBy(-1)} aria-label="Anterior"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg></button>
        <button type="button" onClick={() => engine.current.snapBy(1)} aria-label="Siguiente"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></button>
      </div>
    </div>
  </div>
}
