import { useEffect, useRef, useState } from 'react'

type Frame = 'idle' | 'open' | 'blink' | 'left' | 'right'

const intro = [
  'Hola, ¿cómo estás?',
  'Soy Joaquín Gonzalez Calderón, tengo 23 años. Soy analista en sistemas, y además DJ y fotógrafo amateur.',
]
const extras = [
  '¡Ey! Bajá y mirá las tres áreas del portfolio.',
  'Si tenés un proyecto, escribime al final de la página.',
  'En Fotografía podés hacer girar los álbumes.',
  'En DJ dale play a un mashup.',
]
const vowels = /[aeiouáéíóúAEIOUÁÉÍÓÚ]/
const pauses: Record<string, number> = { ',': 220, '.': 320, '?': 320, '!': 320, '¿': 0, '¡': 0 }

/**
 * Cartoon narrator: types its lines with lip-sync, blinks, breathes, looks toward
 * the pointer and answers when tapped. Sprites are stacked and switched by `data-frame`.
 */
export function Narrator({ isReady }: { isReady: boolean }) {
  const [isVisible, setIsVisible] = useState(false)
  const [frame, setFrame] = useState<Frame>('idle')
  const [look, setLook] = useState<'center' | 'left' | 'right'>('center')
  const [text, setText] = useState('')
  const [isSpeechVisible, setIsSpeechVisible] = useState(false)
  const [isTalking, setIsTalking] = useState(false)
  const [hop, setHop] = useState(0)
  const [spoken, setSpoken] = useState('')
  const characterRef = useRef<HTMLButtonElement>(null)
  const timers = useRef<number[]>([])
  const talking = useRef(false)
  const extraIndex = useRef(0)
  const reduce = useRef(false)

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  const clearTalk = () => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = [] }

  const say = (lines: string[], index = 0) => {
    const line = lines[index]
    talking.current = true
    setIsTalking(true)
    setIsSpeechVisible(true)
    setSpoken(line)
    setText('')
    if (reduce.current) {
      setText(line)
      setFrame('idle')
      talking.current = false
      setIsTalking(false)
      if (index + 1 < lines.length) later(() => say(lines, index + 1), 1600)
      return
    }
    let position = 0
    const step = () => {
      position += 1
      const char = line[position - 1]
      setText(line.slice(0, position))
      setFrame(vowels.test(char) ? 'open' : 'idle')
      if (position >= line.length) {
        later(() => {
          setFrame('idle')
          talking.current = false
          setIsTalking(false)
          if (index + 1 < lines.length) later(() => say(lines, index + 1), 900)
        }, 120)
        return
      }
      const pause = pauses[char] ?? 0
      if (pause) later(() => setFrame('idle'), 40)
      later(step, 32 + pause)
    }
    later(step, 260)
  }

  // Entrance and intro lines
  useEffect(() => {
    if (!isReady) return
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    later(() => setIsVisible(true), 700)
    later(() => say(intro), 1500)
    return clearTalk
  }, [isReady])

  // Blinking while idle
  useEffect(() => {
    if (!isVisible || reduce.current) return
    let timer = 0
    const blink = (double = false) => {
      if (!talking.current) {
        setFrame((current) => (current === 'idle' ? 'blink' : current))
        window.setTimeout(() => setFrame((current) => (current === 'blink' ? 'idle' : current)), 120)
        if (double) window.setTimeout(() => blink(false), 260)
      }
    }
    const schedule = () => {
      timer = window.setTimeout(() => { blink(Math.random() < 0.25); schedule() }, 2200 + Math.random() * 3200)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [isVisible])

  // Look toward the pointer (fine pointers) or glance around on touch screens
  useEffect(() => {
    if (!isVisible || reduce.current) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) {
      let frameId = 0
      const onMove = (event: PointerEvent) => {
        cancelAnimationFrame(frameId)
        frameId = requestAnimationFrame(() => {
          const box = characterRef.current?.getBoundingClientRect()
          if (!box) return
          const dx = event.clientX - (box.left + box.width / 2)
          const dy = event.clientY - (box.top + box.height / 2)
          const near = Math.hypot(dx, dy) < 1100
          setLook(!near || Math.abs(dx) < 70 ? 'center' : dx < 0 ? 'left' : 'right')
        })
      }
      window.addEventListener('pointermove', onMove)
      return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(frameId) }
    }
    let glance = 0
    let back = 0
    const schedule = () => {
      glance = window.setTimeout(() => {
        if (!talking.current) setLook(Math.random() < 0.5 ? 'left' : 'right')
        back = window.setTimeout(() => { setLook('center'); schedule() }, 1100)
      }, 2600 + Math.random() * 2600)
    }
    schedule()
    return () => { window.clearTimeout(glance); window.clearTimeout(back) }
  }, [isVisible])

  const poke = () => {
    if (!isVisible) return
    setHop((value) => value + 1)
    clearTalk()
    const line = extras[extraIndex.current % extras.length]
    extraIndex.current += 1
    say([line])
  }

  const shown: Frame = isTalking ? (frame === 'open' ? 'open' : 'idle') : frame === 'blink' ? 'blink' : look !== 'center' ? look : 'idle'

  return <aside className="narrator" aria-label="Presentación de Joaquín">
    <p className="sr-only" aria-live="polite">{spoken}</p>
    <p className={`narrator-bubble${isSpeechVisible ? ' is-visible' : ''}`} aria-hidden="true">{text}{isTalking && <span className="narrator-caret" aria-hidden="true" />}</p>
    <button
      ref={characterRef}
      type="button"
      className={`narrator-character${isVisible ? ' is-visible' : ''}${isTalking ? ' is-talking' : ''} look-${isTalking ? 'center' : look}`}
      data-frame={shown}
      onClick={poke}
      aria-label="Tocá al personaje de Joaquín para que diga algo más"
      tabIndex={isVisible ? 0 : -1}
    >
      <span className={`narrator-hop${hop ? ' is-hopping' : ''}`} key={hop}>
        <span className="narrator-body">
          <img className="f-idle" src="/areas/joaquin-cartoon-idle.webp" alt="" draggable={false} />
          <img className="f-open" src="/areas/joaquin-cartoon-speaking.webp" alt="" draggable={false} />
          <img className="f-blink" src="/areas/joaquin-blink.webp" alt="" draggable={false} />
          <img className="f-left" src="/areas/joaquin-glance-left.webp" alt="" draggable={false} />
          <img className="f-right" src="/areas/joaquin-glance-right.webp" alt="" draggable={false} />
        </span>
      </span>
      <span className="narrator-shadow" aria-hidden="true" />
    </button>
  </aside>
}
