import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { albumCover, albumPhotos, albums, driveUrls, loosePhotoIds, type Album } from './data/albums'
import { photos as allPhotos, type Photo } from './data/photos'
import { site } from './config/site'
import { langs, useI18n, type Messages } from './i18n'
import { Narrator } from './components/Narrator'
import { Orbit } from './components/Orbit'
import { SplitLetters, useMagnetic, usePointerParallax, useTilt } from './motion'

type Transition = 'opening' | 'open' | 'closing'
type PortfolioArea = 'home' | 'systems' | 'dj' | 'photography'
type Area = Exclude<PortfolioArea, 'home'>

const areaOrder: Area[] = ['systems', 'photography', 'dj']
const links = {
  whatsapp: 'https://wa.me/5491133693052',
  github: 'https://github.com/JoaquinGonzalezCalderon?tab=repositories',
  linkedin: 'https://www.linkedin.com/in/joaqu%C3%ADn-gonzalez-calder%C3%B3n-8b0b4837b/',
}

const djTracks = [
  { number: '01', title: 'Se Preparo - Ozuna X Salgo Pa la Calle - Daddy Yankee', src: '/areas/dj-track-01.mp3', cover: '/areas/dj-cover-01.webp' },
  { number: '02', title: 'World Hold On X Stereo Love', src: '/areas/dj-track-02.mp3', cover: '/areas/dj-cover-02.webp' },
  { number: '03', title: 'Its That Time X Im Not Alone', src: '/areas/dj-track-03.mp3', cover: '/areas/dj-cover-03.webp' },
  { number: '04', title: 'More X La Pregunta', src: '/areas/dj-track-04.mp3', cover: '/areas/dj-cover-04.webp' },
  { number: '05', title: 'Perro Negro X Koko', src: '/areas/dj-track-05.mp3', cover: '/areas/dj-cover-05.webp' },
  { number: '06', title: 'Un Ratito X Kloufrens', src: '/areas/dj-track-06.mp3', cover: '/areas/dj-cover-06.webp' },
]

function areaFromPathname(pathname: string): PortfolioArea {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/sistemas') return 'systems'
  if (path === '/dj') return 'dj'
  if (path === '/fotografia' || path.startsWith('/album/')) return 'photography'
  return 'home'
}

function albumFromPathname(pathname: string): Album | null {
  const match = pathname.match(/^\/album\/([^/]+)\/?$/)
  if (!match) return null
  let id = match[1]
  try { id = decodeURIComponent(id) } catch { /* keep the encoded path segment */ }
  return albums.find((album) => album.id === id) ?? null
}

function pathForArea(area: PortfolioArea) {
  return { home: '/', systems: '/sistemas', dj: '/dj', photography: '/fotografia' }[area]
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const pad = (value: number) => String(value).padStart(2, '0')

/** Adds `is-in` to every `[data-reveal]` element once it scrolls into view. */
function useReveal(key: unknown) {
  useEffect(() => {
    const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)')]
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-in'))
      return
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-in')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [key])
}

function App() {
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(() => albumFromPathname(window.location.pathname))
  const [activeArea, setActiveArea] = useState<PortfolioArea>(() => areaFromPathname(window.location.pathname))
  const [albumOrder] = useState(() => [...albums].sort(() => Math.random() - 0.5))
  const [transition, setTransition] = useState<Transition>(() => albumFromPathname(window.location.pathname) ? 'open' : 'opening')
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [showIntro, setShowIntro] = useState(() => (window.location.pathname.replace(/\/+$/, '') || '/') === '/')
  const scrollPosition = useRef(0)
  const albumReturnPath = useRef(activeAlbum ? '/fotografia' : '/')
  const navigationTimer = useRef<number | null>(null)
  const { t } = useI18n()

  const navigate = (area: PortfolioArea) => {
    const path = pathForArea(area)
    const show = () => {
      setActiveArea(area)
      if (window.location.pathname !== path) window.history.pushState({}, '', path)
      document.body.classList.remove('is-leaving')
      document.body.classList.add('is-arriving')
      navigationTimer.current = window.setTimeout(() => {
        document.body.classList.remove('is-arriving')
        navigationTimer.current = null
      }, 700)
    }
    if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current)
    document.body.classList.remove('is-arriving')
    if (area === activeArea) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
      return
    }
    if (prefersReducedMotion()) {
      show()
      return
    }
    document.body.classList.add('is-leaving')
    navigationTimer.current = window.setTimeout(show, 480)
  }

  useMagnetic(`${activeArea}-${showIntro}`)

  useEffect(() => () => {
    if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current)
    document.body.classList.remove('is-leaving', 'is-arriving')
  }, [])

  useEffect(() => {
    if (!showIntro) return
    const timer = window.setTimeout(() => setShowIntro(false), isReducedMotion ? 120 : 1400)
    return () => window.clearTimeout(timer)
  }, [showIntro, isReducedMotion])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setIsReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const name = 'Joaquín Gonzalez Calderón'
    document.title = activeAlbum ? `${activeAlbum.title} · ${t.areas.photography} · ${name}` : activeArea === 'home' ? `${name} · ${t.meta.home}` : `${t.areas[activeArea]} · ${name}`
  }, [activeAlbum, activeArea, t])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (lightbox) setLightbox(null)
        else if (activeAlbum) closeAlbum()
      }
      if (!lightbox) return
      if (event.key === 'ArrowRight') moveLightbox(1)
      if (event.key === 'ArrowLeft') moveLightbox(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeAlbum, lightbox])

  useEffect(() => {
    const handlePopState = () => {
      const album = albumFromPathname(window.location.pathname)
      if (album) {
        albumReturnPath.current = '/fotografia'
        setActiveArea('photography')
        if (activeAlbum?.id !== album.id) {
          setActiveAlbum(album)
          setTransition('open')
        }
        return
      }
      setActiveArea(areaFromPathname(window.location.pathname))
      if (activeAlbum) closeAlbum(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [activeAlbum])

  useLayoutEffect(() => {
    window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [activeArea])

  useLayoutEffect(() => {
    if (!activeAlbum) return
    scrollPosition.current = window.scrollY
    document.body.classList.add('album-is-open')
    document.body.style.top = `-${scrollPosition.current}px`
    const timer = window.setTimeout(() => setTransition('open'), isReducedMotion ? 0 : 140)
    return () => window.clearTimeout(timer)
  }, [activeAlbum, isReducedMotion])

  const openAlbum = (album: Album) => {
    albumReturnPath.current = pathForArea(activeArea)
    setActiveAlbum(album)
    setTransition('opening')
    window.history.pushState({}, '', `/album/${album.id}`)
  }

  const closeAlbum = (updateUrl = true) => {
    if (!activeAlbum) return
    if (updateUrl) window.history.replaceState({}, '', albumReturnPath.current || '/fotografia')
    setTransition('closing')
    setLightbox(null)
    window.setTimeout(() => {
      setActiveAlbum(null)
      document.body.classList.remove('album-is-open')
      document.body.style.top = ''
      window.scrollTo(0, scrollPosition.current)
    }, isReducedMotion ? 0 : 320)
  }

  const moveLightbox = (direction: 1 | -1) => {
    if (!lightbox) return
    const index = (lightbox.index + direction + lightbox.photos.length) % lightbox.photos.length
    setLightbox({ ...lightbox, index })
  }

  return <>
    {showIntro && <IntroSplash />}
    <div className="curtain" aria-hidden="true"><img src="/logo/calderon_logo.svg" alt="" /></div>
    <div className="site" inert={showIntro}>
      <SiteHeader current={activeArea} onNavigate={navigate} />
      {activeArea === 'home'
        ? <HomeCover onNavigate={navigate} isReady={!showIntro} />
        : activeArea === 'systems'
          ? <SystemsPage />
          : activeArea === 'photography'
            ? <PhotographyPage albums={albumOrder} onOpenAlbum={openAlbum} onOpenPhoto={(photos, index) => setLightbox({ photos, index })} />
            : <DJPage />}
      <SiteFooter showContact={activeArea !== 'home'} />
      {activeAlbum && <AlbumOverlay album={activeAlbum} transition={transition} onClose={closeAlbum} onOpenPhoto={(photos, index) => setLightbox({ photos, index })} />}
      {lightbox && <PhotoLightbox photo={lightbox.photos[lightbox.index]} index={lightbox.index} total={lightbox.photos.length} onClose={() => setLightbox(null)} onMove={moveLightbox} />}
    </div>
  </>
}

function SiteHeader({ current, onNavigate }: { current: PortfolioArea; onNavigate: (area: PortfolioArea) => void }) {
  const { t } = useI18n()
  const go = (area: PortfolioArea) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onNavigate(area)
  }
  return <header className="site-header">
    <a className="site-logo" href="/" onClick={go('home')} aria-label={t.nav.home}><img src="/logo/calderon_logo.svg" alt="" width="2172" height="724" /></a>
    <nav className="site-nav" aria-label={t.nav.sections}>
      {areaOrder.map((area) => <a key={area} href={pathForArea(area)} onClick={go(area)} aria-current={current === area ? 'page' : undefined}>{t.areas[area]}</a>)}
      <a className="site-nav-contact" href="#contacto" data-magnetic="0.25">{t.nav.contact}</a>
    </nav>
    <LangSwitch />
  </header>
}

/** Compact language menu in the header; the choice is remembered on this device. */
function LangSwitch() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (event: globalThis.PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus() } }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const current = langs.find((item) => item.id === lang)!
  return <div className={`lang${open ? ' is-open' : ''}`} ref={ref}>
    <button type="button" className="lang-toggle" aria-expanded={open} aria-haspopup="true" aria-label={`${t.langLabel}: ${current.name}`} onClick={() => setOpen((value) => !value)}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" /><path d="M1.75 8h12.5M8 1.75c1.7 1.8 2.5 3.9 2.5 6.25S9.7 12.45 8 14.25C6.3 12.45 5.5 10.35 5.5 8S6.3 3.55 8 1.75Z" /></svg>
      <span>{current.short}</span>
    </button>
    {open && <ul className="lang-menu">
      {langs.map((item) => <li key={item.id}><button type="button" lang={item.htmlLang} aria-current={item.id === lang || undefined} onClick={() => { setLang(item.id); setOpen(false) }}><span>{item.name}</span><i>{item.short}</i></button></li>)}
    </ul>}
  </div>
}

function SiteFooter({ showContact }: { showContact: boolean }) {
  const { t } = useI18n()
  const contacts = [
    { label: 'WhatsApp', value: '11 3369-3052', href: links.whatsapp },
    { label: 'Instagram', value: '@joaquinncalderon', href: site.instagramUrl },
    { label: 'LinkedIn', value: 'Joaquín Gonzalez Calderón', href: links.linkedin },
    { label: 'GitHub', value: 'JoaquinGonzalezCalderon', href: links.github },
  ]
  return <footer className="site-footer" id={showContact ? 'contacto' : undefined}>
    {showContact && <div className="contact" data-reveal>
      <h2 className="contact-title doodle"><span className="reveal-line"><span>{t.footer.titleTop}</span></span><span className="reveal-line"><span>{t.footer.titleBottom}</span></span></h2>
      <p className="contact-lede">{t.footer.lede}</p>
      <ul className="contact-list">
        {contacts.map((contact) => <li key={contact.label}><a href={contact.href} target="_blank" rel="noreferrer"><span>{contact.label}</span><strong>{contact.value}</strong><Arrow /></a></li>)}
      </ul>
    </div>}
    <div className="footer-base">
      <img src="/logo/calderon_logo.svg" alt="Calderón" width="2172" height="724" />
      <span>© 2026 Joaquín Gonzalez Calderón</span>
      <span>{t.footer.place}</span>
    </div>
  </footer>
}

function Arrow() {
  return <svg className="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" /></svg>
}

/** Latest additions to the portfolio, newest first. Each one links to where it lives. Only the newest five show, so adding one on top drops the oldest. */
/** Text and note for each one live in `news.items` of src/i18n.tsx, under the same `id`. */
type NewsItem = { id: keyof Messages['news']['items']; title: string; image: string; area: Area; anchor: string }
const news: NewsItem[] = ([
  { id: 'cuad', title: 'CUAD', image: '/areas/news/cuad.webp', area: 'systems', anchor: 'cuad' },
  { id: 'enjambre', title: 'ENJAMBRE', image: '/areas/news/enjambre.webp', area: 'systems', anchor: 'enjambre' },
  { id: 'may', title: 'MAY', image: '/areas/news/may.webp', area: 'systems', anchor: 'may' },
  { id: 'docentes', title: 'Docentes E', image: '/areas/news/docentes-e.webp', area: 'photography', anchor: 'albumes' },
  { id: 'sueltas', title: 'Fotos sueltas', image: '/areas/news/sueltas.webp', area: 'photography', anchor: 'sueltas' },
  { id: 'voider', title: 'Voider Goat', image: '/areas/news/voider.webp', area: 'systems', anchor: 'voider' },
] satisfies NewsItem[]).slice(0, 5)

function NewsTicker({ onNavigate }: { onNavigate: (area: PortfolioArea) => void }) {
  // `from` keeps the outgoing item on screen while it slides away; `dir` says which way both move
  const [slide, setSlide] = useState<{ index: number; from: number; dir: 1 | -1 }>({ index: 0, from: -1, dir: 1 })
  const [paused, setPaused] = useState(false)
  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const { t } = useI18n()
  // Warm the thumbnails so a slide never lands on an empty frame
  useEffect(() => { news.forEach((entry) => { new Image().src = entry.image }) }, [])
  const { index, from, dir } = slide
  const item = news[index]
  const goTo = (next: number, direction: 1 | -1) => setSlide((current) => next === current.index ? current : { index: next, from: current.index, dir: direction })
  const step = (direction: 1 | -1) => goTo((index + direction + news.length) % news.length, direction)
  useEffect(() => {
    if (paused || prefersReducedMotion()) return
    // Restarts on every change, so a manual step gets a full turn before the next auto one
    const timer = window.setInterval(() => { if (!document.hidden) setSlide((current) => ({ index: (current.index + 1) % news.length, from: current.index, dir: 1 })) }, 4200)
    return () => window.clearInterval(timer)
  }, [paused, index])
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (swipe.current?.moved) { event.preventDefault(); return }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onNavigate(item.area)
    // Wait for the page curtain, then bring the new item into view
    let tries = 0
    const find = () => {
      const target = document.getElementById(item.anchor)
      if (target && window.location.pathname === pathForArea(item.area)) target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
      else if (tries++ < 30) window.setTimeout(find, 100)
    }
    window.setTimeout(find, 650)
  }
  const onPointerDown = (event: PointerEvent<HTMLElement>) => { swipe.current = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY, moved: false } }
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = swipe.current
    if (!start) return
    const dx = event.clientX - start.x
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y)) { start.moved = true; step(dx < 0 ? 1 : -1) }
    window.setTimeout(() => { swipe.current = null }, 0)
  }
  const roll = (entry: NewsItem) => {
    const copy: { text: string; note: string; title?: string } = t.news.items[entry.id]
    return <>
      <span className="board-thumb"><img src={entry.image} alt="" width="144" height="96" /></span>
      <span className="board-copy">
        <span className="board-meta">{t.areas[entry.area]}<i>{copy.note}</i></span>
        <span className="board-text"><strong>{copy.title ?? entry.title}</strong> {copy.text}</span>
      </span>
    </>
  }
  return <aside className="board" aria-label={t.news.aria} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
    <span className="board-label"><i className="board-pulse" aria-hidden="true" />{t.news.label}</span>
    <a className="board-item" href={`${pathForArea(item.area)}#${item.anchor}`} onClick={open}>
      <span className="board-stage" style={{ '--dir': dir } as CSSProperties} aria-live="polite">
        {from >= 0 && <span className="board-roll is-out" key={`out-${from}-${index}`} aria-hidden="true" onAnimationEnd={(event) => { if (event.target === event.currentTarget) setSlide((current) => ({ ...current, from: -1 })) }}>{roll(news[from])}</span>}
        <span className="board-roll is-in" key={`in-${index}`}>{roll(item)}</span>
      </span>
      <span className="board-go" aria-hidden="true"><Arrow /></span>
    </a>
    <span className="board-controls">
      <span className="board-count" aria-hidden="true"><span className="board-count-now" key={index} style={{ '--dir': dir } as CSSProperties}>{pad(index + 1)}</span><i>/{pad(news.length)}</i></span>
      <span className="board-dots">{news.map((entry, dot) => <button type="button" key={entry.id} className={dot === index ? 'is-on' : ''} onClick={() => goTo(dot, dot > index ? 1 : -1)} aria-label={t.news.item(dot + 1, news.length)} aria-current={dot === index || undefined}><i style={{ '--t': paused ? 'paused' : 'running' } as CSSProperties} /></button>)}</span>
      <button type="button" onClick={() => step(-1)} aria-label={t.news.prev}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg></button>
      <button type="button" onClick={() => step(1)} aria-label={t.news.next}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></button>
    </span>
  </aside>
}

/* Camera viewfinder over the hero: live REC timecode, audio meters, and a focus box that rests on the face,
   follows the pointer and locks onto links. Clicking empty space takes a shot (flash + counter). */
function HeroViewfinder() {
  const ref = useRef<HTMLDivElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const [shots, setShots] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => {
      if (!clock.current) return
      const elapsed = (performance.now() - start) / 1000
      clock.current.textContent = `${pad(Math.floor(elapsed / 3600))}:${pad(Math.floor(elapsed / 60) % 60)}:${pad(Math.floor(elapsed) % 60)}:${pad(Math.floor((elapsed % 1) * 24))}`
    }, 1000 / 24)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    const hero = ref.current?.parentElement
    const photo = hero?.querySelector<HTMLImageElement>('.hero-portrait img')
    if (!hero || !photo) return
    const place = (left: number, top: number, width: number, height: number, mode: string) => {
      hero.style.setProperty('--fx', `${left.toFixed(1)}px`)
      hero.style.setProperty('--fy', `${top.toFixed(1)}px`)
      hero.style.setProperty('--fw', `${width.toFixed(1)}px`)
      hero.style.setProperty('--fh', `${height.toFixed(1)}px`)
      hero.dataset.focus = mode
    }
    // Face sits at roughly these fractions of the cutout
    const restOnFace = () => {
      const box = hero.getBoundingClientRect()
      const img = photo.getBoundingClientRect()
      place(img.left - box.left + img.width * 0.36, img.top - box.top + img.height * 0.28, img.width * 0.2, img.height * 0.36, 'face')
    }
    const move = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const box = hero.getBoundingClientRect()
      const target = (event.target as Element).closest('a, button')
      if (target && hero.contains(target)) {
        const rect = target.getBoundingClientRect()
        place(rect.left - box.left - 10, rect.top - box.top - 8, rect.width + 20, rect.height + 16, 'lock')
      } else place(event.clientX - box.left - 60, event.clientY - box.top - 44, 120, 88, 'hunt')
    }
    const shoot = (event: globalThis.MouseEvent) => {
      if ((event.target as Element).closest('a, button')) return
      setShots((count) => count + 1)
    }
    restOnFace()
    photo.addEventListener('load', restOnFace)
    const observer = new ResizeObserver(restOnFace)
    observer.observe(hero)
    hero.addEventListener('pointermove', move)
    hero.addEventListener('pointerleave', restOnFace)
    hero.addEventListener('click', shoot)
    return () => {
      photo.removeEventListener('load', restOnFace)
      observer.disconnect()
      hero.removeEventListener('pointermove', move)
      hero.removeEventListener('pointerleave', restOnFace)
      hero.removeEventListener('click', shoot)
    }
  }, [])
  return <div ref={ref} className="viewfinder" aria-hidden="true">
    <span className="vf-frame" />
    <span className="vf-thirds" />
    <span className="vf-rec"><i className="vf-dot" />REC <span ref={clock}>00:00:00:00</span></span>
    <span className="vf-meters"><span>L<i /></span><span>R<i /></span></span>
    <span className="vf-specs"><span>4K · 24P</span><span>ISO 800</span><span>1/50</span><span>ƒ1.8</span><span className="vf-shots">SHOT {String(shots).padStart(3, '0')}</span></span>
    <span className="vf-focus"><b>AF</b></span>
    {shots > 0 && <span className="vf-flash" key={shots} />}
  </div>
}

function HomeCover({ onNavigate, isReady }: { onNavigate: (area: PortfolioArea) => void; isReady: boolean }) {
  useReveal('home')
  const { t } = useI18n()
  const parallaxRef = usePointerParallax<HTMLElement>()
  useTilt('home')
  const go = (area: Area) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onNavigate(area)
  }
  const photoStacks = albums.slice(0, 3).map((album) => {
    const cover = albumCover(album)
    const rest = albumPhotos(album).filter((photo) => photo.id !== cover.id)
    return { album, photos: [rest[Math.floor(rest.length / 3)], rest[Math.floor((rest.length * 2) / 3)], cover].filter(Boolean) }
  })

  return <main className={`home${isReady ? ' is-ready' : ''}`}>
    <NewsTicker onNavigate={onNavigate} />
    <section ref={parallaxRef} className="hero-card" aria-labelledby="hero-title">
      <h1 className="hero-name" id="hero-title"><span className="sr-only">Joaquín Gonzalez </span><span className="hero-name-front">Calderón</span></h1>
      <figure className="hero-portrait">
        <img src="/areas/portrait-rec.webp" srcSet="/areas/portrait-rec-sm.webp 820w, /areas/portrait-rec.webp 1448w" sizes="(max-width: 760px) 120vw, 70vw" alt={t.hero.portraitAlt} width="1448" height="1086" fetchPriority="high" />
        <i className="hero-glint" aria-hidden="true" />
      </figure>
      <div className="hero-ghost" aria-hidden="true">Calderón</div>
      <HeroViewfinder />
      <div className="hero-intro">
        <p className="hero-kicker">{t.hero.kicker}</p>
        <p className="hero-lead">{t.hero.lead[0]}<br />{t.hero.lead[1]}</p>
        <nav className="hero-areas" aria-label={t.hero.areas}>
          {areaOrder.map((area) => <a key={area} href={pathForArea(area)} onClick={go(area)}>{t.areas[area]}<Arrow /></a>)}
        </nav>
      </div>
      <a className="hero-handle" href={site.instagramUrl} target="_blank" rel="noreferrer">@joaquinncalderon</a>
      <Narrator isReady={isReady} />
    </section>

    <div className="case-grid" id="areas">
      <a className="case-card case-systems" data-tilt href={pathForArea('systems')} onClick={go('systems')} data-reveal>
        <h2 className="case-title">{t.areas.systems}</h2>
        <p className="case-rule"><span>{t.cases.systemsRule}</span></p>
        <SystemsRotator />
        <span className="case-foot"><span>{t.cases.systemsFoot}</span><span className="case-cta">{t.cases.systemsCta} <Arrow /></span></span>
      </a>

      <a className="case-card case-photo" data-tilt href={pathForArea('photography')} onClick={go('photography')} data-reveal>
        <h2 className="case-title">{t.areas.photography}</h2>
        <p className="case-rule"><span>{t.cases.photoRule}</span></p>
        <span className="case-thumbs case-thumbs-stacks">
          {photoStacks.map(({ album, photos }) => <span className="case-stack" key={album.id}>
            {photos.map((photo) => <img key={photo.id} src={photo.src} srcSet={`${photo.src} 640w, ${photo.medium} 1200w`} sizes="(max-width: 760px) 30vw, 180px" alt="" loading="lazy" />)}
          </span>)}
        </span>
        <span className="case-foot"><span>{t.cases.albums(albums.length)}</span><span className="case-cta">{t.cases.photoCta} <Arrow /></span></span>
      </a>

      <a className="case-card case-dj" data-tilt href={pathForArea('dj')} onClick={go('dj')} data-reveal>
        <h2 className="case-title"><span className="case-deboss" aria-hidden="true">Mashups</span>DJ</h2>
        <p className="case-rule"><span>{t.cases.djRule}</span></p>
        <span className="case-thumbs case-thumbs-covers">
          {djTracks.slice(0, 3).map((track) => <img key={track.number} src={track.cover} alt="" loading="lazy" />)}
        </span>
        <span className="case-foot"><span>{t.cases.djFoot(djTracks.length)}</span><span className="case-cta">{t.cases.djCta} <Arrow /></span></span>
      </a>

      <section className="case-card case-contact" id="contacto" aria-labelledby="contact-card-title" data-reveal>
        <h2 className="case-contact-title" id="contact-card-title">{t.cases.contactTitle}</h2>
        <p className="case-contact-lede">{t.cases.contactLede}</p>
        <div className="qr-row">
          <a className="qr" href={links.whatsapp} target="_blank" rel="noreferrer"><img src="/areas/qr-whatsapp.svg" alt={t.cases.qrWhatsapp} width="120" height="120" /><span>WhatsApp</span></a>
          <a className="qr" href={site.instagramUrl} target="_blank" rel="noreferrer"><img src="/areas/qr-instagram.svg" alt={t.cases.qrInstagram} width="120" height="120" /><span>Instagram</span></a>
        </div>
        <ul className="case-contact-links">
          <li><a href={links.whatsapp} target="_blank" rel="noreferrer">11 3369-3052 <Arrow /></a></li>
          <li><a href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn <Arrow /></a></li>
          <li><a href={links.github} target="_blank" rel="noreferrer">GitHub <Arrow /></a></li>
        </ul>
      </section>
    </div>
  </main>
}

type DemoId = keyof Messages['systems']['demos']['items']
const systemsShowcase: { name?: string; demo?: DemoId; image: string; wip?: boolean; phone?: boolean }[] = [
  { name: 'Streak', image: '/areas/tustreak-desktop.webp' },
  { name: 'MAY', image: '/areas/may-home.webp', wip: true },
  { name: 'Voider Goat', image: '/areas/voidergoat-album.webp' },
  { name: 'STUGO', image: '/areas/stugo1.webp', phone: true },
  { name: 'ENJAMBRE', image: '/areas/enjambre-coe.webp' },
  { name: 'CUAD', image: '/areas/cuad-home.webp', wip: true },
  { name: 'Mate Único', image: '/areas/jgc-mate.webp' },
  { name: 'Inmobiliaria Andrea Duré', image: '/areas/jgc-inmobiliaria.webp' },
  { name: 'Barbería Los Santos', image: '/areas/jgc-barberia.webp', wip: true },
  { name: 'Analía Calderón', image: '/areas/jgc-amelia.webp', wip: true },
  { demo: 'cafeteria', image: '/areas/demo-cafeteria.webp' },
  { demo: 'bazar', image: '/areas/demo-bazar.webp' },
  { demo: 'tienda', image: '/areas/demo-tienda.webp' },
  { demo: 'barberia', image: '/areas/demo-barberia.webp' },
  { demo: 'gimnasio', image: '/areas/demo-gimnasio.webp' },
]

/** Cycles through every systems project, one in front and its neighbours tilted to the sides. */
function SystemsRotator() {
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const { t } = useI18n()
  const count = systemsShowcase.length
  const caption = (project: typeof systemsShowcase[number]) => project.demo ? `${t.demoPrefix} ${t.systems.demos.items[project.demo].name}` : project.wip ? `${project.name} (${t.status.wip.toLowerCase()})` : project.name
  useEffect(() => {
    if (prefersReducedMotion()) return
    const card = ref.current?.closest('.case-card')
    let paused = false
    let visible = true
    const pause = () => { paused = true }
    const resume = () => { paused = false }
    card?.addEventListener('pointerenter', pause)
    card?.addEventListener('pointerleave', resume)
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    if (ref.current) observer.observe(ref.current)
    const timer = window.setInterval(() => {
      if (!paused && visible && !document.hidden) setActive((current) => (current + 1) % count)
    }, 2600)
    return () => {
      window.clearInterval(timer)
      observer.disconnect()
      card?.removeEventListener('pointerenter', pause)
      card?.removeEventListener('pointerleave', resume)
    }
  }, [count])
  return <span className="rotator" ref={ref}>
    <span className="rotator-stage">
      {systemsShowcase.map((project, index) => {
        const offset = (index - active + count) % count
        const slot = offset === 0 ? 'center' : offset === 1 ? 'right' : offset === count - 1 ? 'left' : offset === 2 ? 'next' : 'away'
        return <img key={project.image} className={`rotator-item is-${slot}${project.phone ? ' is-phone' : ''}`} src={project.image} alt="" loading="lazy" />
      })}
    </span>
    <span className="rotator-caption" aria-live="off"><span key={active}>{caption(systemsShowcase[active])}</span><span>{active + 1} / {count}</span></span>
  </span>
}

function PageHead({ title, lede, children }: { title: string; lede: string; children?: ReactNode }) {
  return <section className="page-head">
    <h1 className="page-title"><span className="sr-only">{title}</span><SplitLetters text={title} /></h1>
    <div className="page-head-side">
      <p className="page-lede">{lede}</p>
      {children}
    </div>
  </section>
}

function SystemsPage() {
  const { t } = useI18n()
  useReveal('systems')
  return <main className="page systems">
    <PageHead title={t.areas.systems} lede={t.systems.lede}>
      <div className="page-head-links">
        <a className="pill-link" href={links.github} target="_blank" rel="noreferrer">GitHub <Arrow /></a>
        <a className="pill-link" href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn <Arrow /></a>
      </div>
    </PageHead>
    <FeaturedStreak />
    <FeaturedMay />
    <FeaturedVoider />
    <FeaturedStugo />
    <FeaturedEnjambre />
    <FeaturedCuad />
    <section className="clients" id="clientes" aria-labelledby="clients-title">
      <h2 className="section-title" id="clients-title" data-reveal><span className="reveal-line"><span>{t.systems.clientsTitle}</span></span></h2>
      <div className="clients-grid">
        <ClientSite title="Mate Único" description={t.systems.clients.mate.description} image="/areas/jgc-mate.webp" alt={t.systems.clients.mate.alt} href="https://mate-unico-deployed.vercel.app/" />
        <ClientSite title="Inmobiliaria Andrea Duré" description={t.systems.clients.inmobiliaria.description} image="/areas/jgc-inmobiliaria.webp" alt={t.systems.clients.inmobiliaria.alt} href="https://andreadure.com/" />
        <ClientSite title="Barbería Los Santos" description={t.systems.clients.barberia.description} image="/areas/jgc-barberia.webp" alt={t.systems.clients.barberia.alt} href="https://lossantos-coral.vercel.app/" inProgress />
        <ClientSite title={t.systems.clients.analia.title} description={t.systems.clients.analia.description} image="/areas/jgc-amelia.webp" alt={t.systems.clients.analia.alt} inProgress />
      </div>
    </section>
    <DemoShowcase />
  </main>
}

function Phone({ src, alt, title }: { src: string; alt: string; title: string }) {
  return <figure className="phone">
    <div className="phone-screen"><img src={src} alt={alt} loading="lazy" width="736" height="1594" /></div>
    <figcaption>{title}</figcaption>
  </figure>
}

function FeaturedStreak() {
  const { t } = useI18n()
  const screens = ['home', 'progress', 'gym', 'profile'].map((name, index) => ({ src: `/areas/tustreak-${name}.webp`, ...t.systems.streak.screens[index] }))
  return <article className="feature feature-streak" aria-labelledby="streak-title">
    <div className="feature-copy" data-reveal>
      <p className="feature-kind">{t.systems.streak.kind}</p>
      <div className="feature-title-row"><h2 id="streak-title">Streak</h2><span className="status is-live">{t.status.live}</span></div>
      <p className="feature-text">{t.systems.streak.text}</p>
      <ul className="feature-points">
        {t.systems.streak.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <details className="feature-more">
        <summary>{t.systems.streak.moreLabel}</summary>
        <p>{t.systems.streak.more}</p>
      </details>
      <a className="button" data-magnetic="0.2" href="https://www.streak.com.ar/app" target="_blank" rel="noreferrer">{t.systems.streak.cta} <Arrow /></a>
    </div>
    <div className="feature-phones streak-phones" aria-label={t.systems.streak.shots} data-reveal>
      {screens.map((screen) => <Phone key={screen.title} {...screen} />)}
    </div>
  </article>
}

function FeaturedVoider() {
  const { t } = useI18n()
  return <article className="feature feature-voider" id="voider" aria-labelledby="voider-title">
    <div className="voider-stage" data-reveal>
      <a className="voider-window voider-window-back" href="https://voidergoat-player.vercel.app/" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>voidergoat-player.vercel.app</span></span>
        <img src="/areas/voidergoat-home.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
      <a className="voider-window voider-window-front" href="https://voidergoat-player.vercel.app/album/winner-takes-it-all-wolv" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>voidergoat-player.vercel.app/album</span></span>
        <img src="/areas/voidergoat-album.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
      <span className="voider-phone" aria-hidden="true"><img src="/areas/voidergoat-m.webp" alt="" loading="lazy" width="400" height="800" /></span>
    </div>
    <div className="voider-copy" data-reveal>
      <p className="feature-kind">{t.systems.voider.kind}</p>
      <div className="feature-title-row"><h2 id="voider-title">Voider Goat</h2><span className="status is-live">{t.status.live}</span></div>
      <p className="feature-text feature-text-lead">{t.systems.voider.lead}</p>
      <p className="feature-text">{t.systems.voider.text}</p>
      <ul className="feature-points">
        {t.systems.voider.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <a className="button voider-cta" data-magnetic="0.2" href="https://voidergoat-player.vercel.app/" target="_blank" rel="noreferrer">{t.systems.voider.cta} <Arrow /></a>
    </div>
  </article>
}

function FeaturedMay() {
  const { t } = useI18n()
  return <article className="feature feature-shots feature-may" id="may" aria-labelledby="may-title">
    <div className="shots-stage" data-reveal>
      <a className="shots-window shots-window-back" href="https://may-editor.vercel.app/" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>may-editor.vercel.app</span></span>
        <img src="/areas/may-home.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
      <a className="shots-window shots-window-front" href="https://may-editor.vercel.app/espacios" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>MAY · AUDIO</span></span>
        <img src="/areas/may-mixer.webp" alt="" loading="lazy" width="1280" height="686" />
      </a>
    </div>
    <div className="shots-copy" data-reveal>
      <p className="feature-kind">{t.systems.may.kind}</p>
      <div className="feature-title-row"><h2 id="may-title">MAY</h2><span className="status is-wip">{t.status.wip}</span></div>
      <p className="feature-text feature-text-lead">{t.systems.may.lead}</p>
      <p className="feature-text">{t.systems.may.text}</p>
      <ul className="feature-points">
        {t.systems.may.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <a className="button shots-cta" data-magnetic="0.2" href="https://may-editor.vercel.app/" target="_blank" rel="noreferrer">{t.systems.may.cta} <Arrow /></a>
    </div>
  </article>
}

function FeaturedEnjambre() {
  const { t } = useI18n()
  return <article className="feature feature-shots feature-enjambre is-reversed" id="enjambre" aria-labelledby="enjambre-title">
    <div className="shots-stage" data-reveal>
      <a className="shots-window shots-window-back" href="https://enjambreer.vercel.app/drones/" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>enjambreer.vercel.app/drones</span></span>
        <img src="/areas/enjambre-drones.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
      <a className="shots-window shots-window-front" href="https://enjambreer.vercel.app/coe/" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>ENJAMBRE · Panel COE</span></span>
        <img src="/areas/enjambre-coe.webp" alt="" loading="lazy" width="1280" height="742" />
      </a>
    </div>
    <div className="shots-copy" data-reveal>
      <p className="feature-kind">{t.systems.enjambre.kind}</p>
      <div className="feature-title-row"><h2 id="enjambre-title">Enjambre</h2><span className="status">{t.status.team}</span></div>
      <p className="feature-text feature-text-lead">{t.systems.enjambre.lead}</p>
      <p className="feature-text">{t.systems.enjambre.text}</p>
      <ul className="feature-points">
        {t.systems.enjambre.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <a className="button shots-cta" data-magnetic="0.2" href="https://enjambreer.vercel.app/" target="_blank" rel="noreferrer">{t.systems.enjambre.cta} <Arrow /></a>
    </div>
  </article>
}

function FeaturedCuad() {
  const { t } = useI18n()
  return <article className="feature feature-shots feature-cuad" id="cuad" aria-labelledby="cuad-title">
    <div className="shots-stage" data-reveal>
      <a className="shots-window shots-window-back" href="https://cuad-eight.vercel.app/" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>cuad-eight.vercel.app</span></span>
        <img src="/areas/cuad-home.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
      <a className="shots-window shots-window-front" href="https://cuad-eight.vercel.app/" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>{t.systems.cuad.barNotes}</span></span>
        <img src="/areas/cuad-apuntes.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
    </div>
    <div className="shots-copy" data-reveal>
      <p className="feature-kind">{t.systems.cuad.kind}</p>
      <div className="feature-title-row"><h2 id="cuad-title">CUAD</h2><span className="status is-wip">{t.status.wip}</span></div>
      <p className="feature-text feature-text-lead">{t.systems.cuad.lead}</p>
      <p className="feature-text">{t.systems.cuad.text}</p>
      <ul className="feature-points">
        {t.systems.cuad.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <a className="button shots-cta" data-magnetic="0.2" href="https://cuad-eight.vercel.app/" target="_blank" rel="noreferrer">{t.systems.cuad.cta} <Arrow /></a>
    </div>
  </article>
}

function FeaturedStugo() {
  const { t } = useI18n()
  const screens = t.systems.stugo.screens.map((screen, index) => ({ src: `/areas/stugo${index + 1}.webp`, ...screen }))
  return <article className="feature feature-stugo" aria-labelledby="stugo-title">
    <div className="feature-title-row" data-reveal><h2 id="stugo-title">STUGO</h2><span className="status">{t.status.own}</span></div>
    <div className="feature-phones stugo-phones" aria-label={t.systems.stugo.shots} data-reveal>
      {screens.map((screen) => <Phone key={screen.title} {...screen} />)}
    </div>
    <div className="stugo-copy" data-reveal>
      <div>
        <p className="feature-kind">{t.systems.stugo.kind}</p>
        <p className="feature-text feature-text-lead">{t.systems.stugo.lead}</p>
        <p className="feature-text">{t.systems.stugo.text}</p>
      </div>
      <div>
        <ul className="feature-points">
          {t.systems.stugo.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
        <ul className="stack" aria-label={t.systems.stugo.stack}>
          {['React Native', 'Expo', 'TypeScript', 'FastAPI', 'PostgreSQL', 'Groq', 'Whisper'].map((tech) => <li key={tech}>{tech}</li>)}
        </ul>
      </div>
    </div>
  </article>
}

function ClientSite({ title, description, image, alt, href, inProgress = false }: { title: string; description: string; image: string; alt: string; href?: string; inProgress?: boolean }) {
  const { t } = useI18n()
  const picture = <img src={image} alt={alt} loading="lazy" width="1440" height="700" />
  return <article className="client" data-reveal="clip">
    {href ? <a className="client-image" href={href} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">{picture}</a> : <div className="client-image">{picture}</div>}
    <div className="client-info">
      {inProgress && <span className="status is-wip">{t.status.wip}</span>}
      <h3>{title}</h3>
      <p>{description}</p>
      {href && <a className="text-link" href={href} target="_blank" rel="noreferrer" aria-label={t.systems.viewSiteAria(title, inProgress)}>{inProgress ? t.systems.viewProgress : t.systems.viewSite} <Arrow /></a>}
    </div>
  </article>
}

const demos = [
  { id: 'cafeteria', domain: 'tu-cafeteria.vercel.app', accent: '#d39a5c' },
  { id: 'bazar', domain: 'tu-bazar.vercel.app', accent: '#c8643c' },
  { id: 'tienda', domain: 'tu-tienda-de-ropa.vercel.app', accent: '#c8ff2e' },
  { id: 'barberia', domain: 'tu-barberia-ten.vercel.app', accent: '#c9a24a' },
  { id: 'gimnasio', domain: 'tu-gimnasio-seven.vercel.app', accent: '#ff5a1f' },
] as const

/** Tabs for each business type; the stage shows the desktop and phone versions of the selected demo. */
function DemoShowcase() {
  const [active, setActive] = useState(0)
  const { t } = useI18n()
  const demo = demos[active]
  const copy = t.systems.demos.items[demo.id]
  const tabsRef = useRef<HTMLDivElement>(null)
  const select = (index: number) => {
    setActive(index)
    const tabs = tabsRef.current
    const tab = tabs?.querySelectorAll('button')[index]
    if (tabs && tab && tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: tab.offsetLeft - (tabs.clientWidth - tab.offsetWidth) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
  return <section className="demos" id="demos" aria-labelledby="demos-title" style={{ '--demo': demo.accent } as CSSProperties}>
    <div className="demos-head" data-reveal>
      <h2 className="section-title" id="demos-title">{t.systems.demos.title}</h2>
      <p>{t.systems.demos.lede}</p>
    </div>
    <div className="demo-tabs" role="tablist" aria-label={t.systems.demos.tabs} ref={tabsRef} onKeyDown={(event) => {
      const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
      if (!forward && event.key !== 'ArrowLeft' && event.key !== 'ArrowUp') return
      event.preventDefault()
      const next = (active + (forward ? 1 : -1) + demos.length) % demos.length
      select(next)
      tabsRef.current?.querySelectorAll('button')[next]?.focus()
    }}>
      {demos.map((item, index) => <button key={item.id} type="button" role="tab" id={`demo-tab-${item.id}`} aria-selected={index === active} aria-controls="demo-panel" tabIndex={index === active ? 0 : -1} style={{ '--tab': item.accent } as CSSProperties} onClick={() => select(index)}>
        <span className="demo-tab-dot" aria-hidden="true" />
        <span className="demo-tab-name">{t.systems.demos.items[item.id].name}</span>
        <span className="demo-tab-line">{t.systems.demos.items[item.id].tagline}</span>
      </button>)}
    </div>
    <div className="demo-panel" id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${demo.id}`}>
      <a className="demo-stage" href={`https://${demo.domain}`} target="_blank" rel="noreferrer" aria-label={t.systems.demos.open(copy.name)} key={demo.id}>
        <span className="demo-browser">
          <span className="demo-browser-bar" aria-hidden="true"><i /><i /><i /><span>{demo.domain}</span></span>
          <img src={`/areas/demo-${demo.id}.webp`} alt="" width="1280" height="800" />
        </span>
        <span className="demo-phone" aria-hidden="true"><img src={`/areas/demo-${demo.id}-m.webp`} alt="" width="400" height="800" /></span>
      </a>
      <div className="demo-info" key={`${demo.id}-info`}>
        <p className="demo-style">{copy.style}</p>
        <ul className="demo-features">{copy.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        <a className="button demo-cta" href={`https://${demo.domain}`} target="_blank" rel="noreferrer">{t.systems.demos.cta} <Arrow /></a>
      </div>
    </div>
    <span className="demo-preload" aria-hidden="true">{demos.map((item) => <img key={item.id} src={`/areas/demo-${item.id}.webp`} alt="" loading="lazy" />)}</span>
  </section>
}

function DJPage() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const trackFadeFrame = useRef<number | null>(null)
  const playAfterLoad = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioError, setAudioError] = useState(false)
  const activeTrack = djTracks[activeIndex]
  const { t } = useI18n()
  useReveal('dj')
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.load()
    if (playAfterLoad.current) {
      playAfterLoad.current = false
      audio.volume = 0
      void audio.play().catch(() => setAudioError(true))
    }
  }, [activeTrack.src])
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${pad(Math.floor(seconds % 60))}`
  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.volume = 0
      void audio.play().catch(() => setAudioError(true))
    }
    else audio.pause()
  }
  const fadeTrackIn = () => {
    if (trackFadeFrame.current !== null) window.cancelAnimationFrame(trackFadeFrame.current)
    const startedAt = performance.now()
    const fade = (now: number) => {
      const progress = Math.min((now - startedAt) / 700, 1)
      if (audioRef.current) audioRef.current.volume = 0.42 * progress
      if (progress < 1) trackFadeFrame.current = window.requestAnimationFrame(fade)
      else trackFadeFrame.current = null
    }
    trackFadeFrame.current = window.requestAnimationFrame(fade)
  }
  useEffect(() => () => {
    if (trackFadeFrame.current !== null) window.cancelAnimationFrame(trackFadeFrame.current)
  }, [])
  const selectTrack = (index: number, autoplay = false) => {
    if (index === activeIndex) {
      if (autoplay) togglePlayback()
      return
    }
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    playAfterLoad.current = autoplay
    setActiveIndex(index)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setAudioError(false)
  }
  const stepTrack = (direction: -1 | 1) => selectTrack((activeIndex + direction + djTracks.length) % djTracks.length, playing)
  const progress = duration ? Math.min(currentTime / duration, 1) : 0

  return <main className="page dj" id="mashups">
    <audio ref={audioRef} src={activeTrack.src} preload="auto" onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => { setPlaying(true); setAudioError(false); fadeTrackIn() }} onPause={() => { setPlaying(false); if (trackFadeFrame.current !== null) { window.cancelAnimationFrame(trackFadeFrame.current); trackFadeFrame.current = null } }} onEnded={() => { setPlaying(false); setCurrentTime(0) }} onError={() => setAudioError(true)} />
    <PageHead title="Mashups" lede={t.dj.lede} />
    <section className="dj-deck" aria-label={t.dj.deck}>
      <div className="dj-stage">
        <div className="dj-discs" style={{ '--progress': progress } as CSSProperties}>
          <span className={`dj-vinyl${playing ? ' is-playing' : ''}`} aria-hidden="true"><span className="dj-vinyl-disc"><img src={activeTrack.cover} alt="" /></span></span>
          {djTracks.map((track, index) => {
            const relativeIndex = (index - activeIndex + djTracks.length) % djTracks.length
            const selected = index === activeIndex
            const position = selected ? 'active' : relativeIndex === 1 ? 'next' : relativeIndex === djTracks.length - 1 ? 'previous' : 'hidden'
            const isAdjacent = position !== 'hidden'
            return <button type="button" key={track.number} className={`dj-disc is-${position}${selected && playing ? ' is-playing' : ''}`} onClick={() => selectTrack(index)} aria-label={t.dj.select(track.title, selected)} aria-pressed={selected} aria-hidden={!isAdjacent} tabIndex={isAdjacent ? 0 : -1}>
              <img src={track.cover} alt="" width="1254" height="1254" />
            </button>
          })}
        </div>
        <div className="dj-player">
          <p className="dj-now"><span>Mashup {activeTrack.number}</span><strong>{activeTrack.title}</strong></p>
          <div className="dj-controls">
            <button type="button" className="dj-step" onClick={() => stepTrack(-1)} aria-label={t.dj.prev}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM19 5.8v12.4c0 .8-.9 1.2-1.5.7L9.6 12.7a.9.9 0 0 1 0-1.4l7.9-6.2c.6-.5 1.5-.1 1.5.7Z" /></svg></button>
            <button type="button" className="dj-play" data-magnetic="0.35" onClick={togglePlayback} aria-label={playing ? t.dj.pause : t.dj.play}><svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M7 5h4v14H7zM14 5h4v14h-4z" /> : <path d="M8 5.3c0-.8.9-1.3 1.6-.8l9.6 6.7c.6.4.6 1.3 0 1.7l-9.6 6.7c-.7.5-1.6 0-1.6-.8V5.3Z" />}</svg></button>
            <button type="button" className="dj-step" onClick={() => stepTrack(1)} aria-label={t.dj.next}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM5 5.8v12.4c0 .8.9 1.2 1.5.7l7.9-6.2a.9.9 0 0 0 0-1.4L6.5 5.1C5.9 4.6 5 5 5 5.8Z" /></svg></button>
          </div>
          <div className="dj-timeline">
            <span>{formatTime(currentTime)}</span>
            <input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} style={{ '--progress': `${progress * 100}%` } as CSSProperties} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value) }} aria-label={t.dj.position} />
            <span>{formatTime(duration)}</span>
          </div>
          {audioError && <p className="dj-error" role="status">{t.dj.error}</p>}
        </div>
      </div>
      <div className="dj-side">
        <ol className="dj-tracklist" aria-label={t.dj.list}>
          {djTracks.map((track, index) => <li key={track.number}>
            <button type="button" className={index === activeIndex ? 'is-active' : ''} onClick={() => selectTrack(index, true)} aria-current={index === activeIndex ? 'true' : undefined}>
              <span className="dj-track-num">{index === activeIndex && playing ? <span className="eq" aria-hidden="true"><i /><i /><i /></span> : track.number}</span>
              <img src={track.cover} alt="" loading="lazy" />
              <span className="dj-track-title">{track.title}</span>
            </button>
          </li>)}
        </ol>
      </div>
    </section>
  </main>
}

/** Rows of 2 · 3 · 2 cards keep every album the same height. */
const albumLayout = ['pair', 'pair', 'trio', 'trio', 'trio', 'trio', 'trio', 'trio'] as const

const loosePhotos = loosePhotoIds.map((id) => allPhotos.find((photo) => photo.id === id)).filter((photo): photo is Photo => Boolean(photo))

const tilts = [-3, 2.5, -1.5, 3.5, -2.5, 1.5, -3.5]

/** Loose prints in a random order that keeps rotating: the first print moves to the end and the rest slide over (FLIP). */
function LooseBoard({ onOpenPhoto }: { onOpenPhoto: (photos: Photo[], index: number) => void }) {
  const [order, setOrder] = useState(() => [...loosePhotos].sort(() => Math.random() - 0.5))
  const boardRef = useRef<HTMLDivElement>(null)
  const before = useRef(new Map<string, DOMRect>())
  const paused = useRef(false)
  const { t } = useI18n()
  useEffect(() => {
    const board = boardRef.current
    if (!board || prefersReducedMotion() || order.length < 2) return
    let visible = false
    let touchedAt = 0
    let autoAt = 0
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    observer.observe(board)
    const onTouch = (event: Event) => { if (event.type === 'scroll' && performance.now() - autoAt < 1200) return; touchedAt = performance.now() }
    board.addEventListener('touchstart', onTouch, { passive: true })
    board.addEventListener('scroll', onTouch, { passive: true })
    const timer = window.setInterval(() => {
      if (paused.current || !visible || document.hidden) return
      if (board.scrollWidth > board.clientWidth + 4) {
        // Swipe strip: glide to the next print, back to the start at the end; never fight the user's finger
        if (performance.now() - touchedAt < 4000) return
        const boardBox = board.getBoundingClientRect()
        const center = boardBox.left + boardBox.width / 2
        const prints = [...board.children] as HTMLElement[]
        const next = prints.find((print) => { const box = print.getBoundingClientRect(); return box.left + box.width / 2 > center + 8 })
        const atEnd = board.scrollLeft + board.clientWidth >= board.scrollWidth - 4
        autoAt = performance.now()
        if (!next || atEnd) board.scrollTo({ left: 0, behavior: 'smooth' })
        else { const box = next.getBoundingClientRect(); board.scrollBy({ left: box.left + box.width / 2 - center, behavior: 'smooth' }) }
        touchedAt = 0
        return
      }
      board.querySelectorAll<HTMLElement>('.loose-print').forEach((print) => before.current.set(print.dataset.id!, print.getBoundingClientRect()))
      setOrder((current) => [...current.slice(1), current[0]])
    }, 3200)
    return () => {
      window.clearInterval(timer)
      observer.disconnect()
      board.removeEventListener('touchstart', onTouch)
      board.removeEventListener('scroll', onTouch)
    }
  }, [order.length])
  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board || !before.current.size) return
    board.querySelectorAll<HTMLElement>('.loose-print').forEach((print) => {
      const previous = before.current.get(print.dataset.id!)
      if (!previous) return
      const now = print.getBoundingClientRect()
      const dx = previous.left - now.left
      const dy = previous.top - now.top
      if (!dx && !dy) return
      print.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 900, easing: 'cubic-bezier(.16, 1, .3, 1)' })
    })
    before.current.clear()
  }, [order])
  return <div className="loose-board" ref={boardRef} data-reveal onPointerEnter={() => { paused.current = true }} onPointerLeave={() => { paused.current = false }} onFocus={() => { paused.current = true }} onBlur={() => { paused.current = false }}>
    {order.map((photo, index) => <button key={photo.id} data-id={photo.id} type="button" className={`loose-print${photo.orientation === 'portrait' ? ' is-portrait' : ''}`} style={{ '--r': `${tilts[index % tilts.length]}deg` } as CSSProperties} onClick={() => onOpenPhoto(order, index)} aria-label={t.photo.looseItem(index + 1, order.length)}>
      <img src={photo.src} srcSet={`${photo.src} 640w, ${photo.medium} 1200w`} sizes="(max-width: 760px) 70vw, 360px" alt="" loading="lazy" width={photo.width} height={photo.height} />
    </button>)}
  </div>
}

function PhotographyPage({ albums, onOpenAlbum, onOpenPhoto }: { albums: Album[]; onOpenAlbum: (album: Album) => void; onOpenPhoto: (photos: Photo[], index: number) => void }) {
  const totalPhotos = albums.reduce((sum, album) => sum + albumPhotos(album).length, 0)
  const [activeAlbumIndex, setActiveAlbumIndex] = useState(0)
  const { t } = useI18n()
  const [orbitItems, orbitAlbumIndex] = useMemo(() => {
    const items: { key: string; src: string; srcSet: string; alt: string }[] = []
    const owners: number[] = []
    albums.forEach((album, albumIndex) => {
      const photos = albumPhotos(album)
      const cover = albumCover(album)
      const rest = photos.filter((photo) => photo.id !== cover.id)
      const picks = [cover, ...[1, 2, 3].map((part) => rest[Math.floor((rest.length * part) / 4)]).filter(Boolean)]
      picks.forEach((photo) => {
        items.push({ key: photo.id, src: photo.src, srcSet: `${photo.src} 640w, ${photo.medium} 1200w`, alt: t.photo.openAlbum(album.title) })
        owners.push(albumIndex)
      })
    })
    return [items, owners] as const
  }, [albums, t])
  const featured = albums[activeAlbumIndex]
  useReveal('photography')
  return <main className="page photography">
    <PageHead title={t.areas.photography} lede={t.photo.lede}>
      <p className="page-meta">{t.photo.meta(albums.length, totalPhotos)}</p>
    </PageHead>
    <Orbit items={orbitItems} label={t.photo.orbit} onSelect={(index) => onOpenAlbum(albums[orbitAlbumIndex[index]])} onActiveChange={(index) => setActiveAlbumIndex(orbitAlbumIndex[index])}>
      <div className="orbit-info" key={featured.id}>
        <p className="orbit-info-meta">{t.photo.photosYear(albumPhotos(featured).length, featured.year)}</p>
        <h2 className="orbit-info-title">{featured.title}</h2>
        <button type="button" className="button" data-magnetic="0.2" onClick={() => onOpenAlbum(featured)}>{t.photo.viewAlbum} <Arrow /></button>
      </div>
    </Orbit>
    <h2 className="section-title album-grid-title" data-reveal><span className="reveal-line"><span>{t.photo.allAlbums}</span></span></h2>
    <section className="album-grid" id="albumes" aria-label={t.photo.albumsAria}>
      {albums.map((album, index) => <AlbumCard key={album.id} album={album} index={index} layout={albumLayout[index % albumLayout.length]} onOpen={() => onOpenAlbum(album)} />)}
    </section>
    <section className="loose" id="sueltas" aria-labelledby="loose-title">
      <div className="loose-head" data-reveal>
        <h2 className="section-title" id="loose-title"><span className="reveal-line"><span>{t.photo.looseTitle}</span></span></h2>
        <p>{t.photo.looseText}</p>
      </div>
      <LooseBoard onOpenPhoto={onOpenPhoto} />
    </section>
  </main>
}

function AlbumCard({ album, index, layout, onOpen }: { album: Album; index: number; layout: typeof albumLayout[number]; onOpen: () => void }) {
  const cover = albumCover(album)
  const photos = albumPhotos(album)
  const coverPhotos = [cover, ...photos.filter((photo) => photo.id !== cover.id)]
  const [coverIndex, setCoverIndex] = useState(0)
  const [hasRotated, setHasRotated] = useState(false)
  const [loadedCoverId, setLoadedCoverId] = useState<string | null>(null)
  const { t } = useI18n()
  useEffect(() => {
    if (coverPhotos.length < 2 || prefersReducedMotion()) return
    const interval = window.setInterval(() => {
      setCoverIndex((current) => (current + 1) % coverPhotos.length)
      setHasRotated(true)
    }, 6200 + index * 450)
    return () => window.clearInterval(interval)
  }, [coverPhotos.length, index])
  const currentCover = coverPhotos[coverIndex]
  const previousCover = coverPhotos[(coverIndex + coverPhotos.length - 1) % coverPhotos.length]
  const isCurrentCoverLoaded = loadedCoverId === currentCover.id
  const coverSizes = layout === 'pair' ? '(max-width: 760px) 100vw, 660px' : '(max-width: 760px) 100vw, 440px'
  return <article className={`album-card is-${layout}`} data-reveal="clip">
    <button className="album-card-open" onClick={onOpen} aria-label={t.photo.openAlbumCount(album.title, photos.length)}>
      <span className="album-card-image">
        {hasRotated && <img className="album-cover-frame" src={previousCover.medium} srcSet={`${previousCover.medium} 960w, ${previousCover.large} 2048w`} sizes={coverSizes} alt="" decoding="async" />}
        <img key={currentCover.id} className={`album-cover-frame album-cover-current${isCurrentCoverLoaded ? ' is-loaded' : ''}${hasRotated && isCurrentCoverLoaded ? ' is-transitioning' : ''}`} src={currentCover.medium} srcSet={`${currentCover.medium} 960w, ${currentCover.large} 2048w`} sizes={coverSizes} alt="" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoadedCoverId(currentCover.id)} />
      </span>
      <span className="album-card-meta">
        <strong>{album.title}</strong>
        <span>{t.photo.photosYear(photos.length, album.year)}</span>
      </span>
    </button>
    {driveUrls[album.id] && <a className="text-link album-card-drive" href={driveUrls[album.id]} target="_blank" rel="noreferrer">{t.photo.drive} <Arrow /></a>}
  </article>
}

function AlbumOverlay({ album, transition, onClose, onOpenPhoto }: { album: Album; transition: Transition; onClose: () => void; onOpenPhoto: (photos: Photo[], index: number) => void }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [view, setView] = useState<'orbit' | 'grid'>('orbit')
  const [frontPhoto, setFrontPhoto] = useState(0)
  const { t } = useI18n()
  const photos = albumPhotos(album)
  const orbitItems = useMemo(() => photos.map((photo, index) => ({ key: photo.id, src: photo.src, srcSet: `${photo.src} 640w, ${photo.medium} 1200w`, alt: t.album.enlarge(index + 1, photos.length) })), [album.id, t])
  return <section className={`album-overlay transition-${transition}${isScrolled ? ' is-scrolled' : ''}`} onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 24)} role="dialog" aria-modal="true" aria-label={t.album.dialog(album.title)}>
    <div className="album-backdrop" />
    <div className="album-bar">
      <button className="pill-link" onClick={() => onClose()}><svg className="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg> {t.album.close}</button>
      <span className="album-bar-title">{album.title}</span>
      <span className="album-bar-count">{t.album.photos(pad(photos.length))}</span>
    </div>
    <div className="album-content">
      <header className="album-head">
        <h1>{album.title}</h1>
        <div className="album-head-side">
          <p>{t.album.descriptions[album.id]}</p>
          <p className="album-head-meta">{t.photo.photosYear(photos.length, album.year)}{driveUrls[album.id] && <> · <a className="text-link" href={driveUrls[album.id]} target="_blank" rel="noreferrer">{t.photo.drive} <Arrow /></a></>}</p>
        </div>
      </header>
      <div className="view-toggle" role="group" aria-label={t.album.view}>
        <button type="button" aria-pressed={view === 'orbit'} onClick={() => setView('orbit')}>{t.album.orbit}</button>
        <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>{t.album.grid}</button>
      </div>
      {view === 'orbit' ? <Orbit items={orbitItems} label={t.album.photosOf(album.title)} onSelect={(index) => onOpenPhoto(photos, index)} onActiveChange={setFrontPhoto}>
        <div className="orbit-info">
          <p className="orbit-info-count">{pad(frontPhoto + 1)} <span>/ {pad(photos.length)}</span></p>
          <p className="orbit-info-hint">{t.album.hint}</p>
        </div>
      </Orbit> : <div className="album-gallery">{photos.map((photo, index) => <button className="album-photo" key={photo.id} onClick={() => onOpenPhoto(photos, index)} aria-label={t.album.enlarge(index + 1, photos.length)}><img src={photo.large} width={photo.width} height={photo.height} alt={t.album.photoAlt(album.title, index + 1)} decoding="async" loading={index < 3 ? 'eager' : 'lazy'} /></button>)}</div>}
      <div className="album-end"><span>{t.album.end(album.title)}</span><button className="pill-link" onClick={() => onClose()}>{t.album.back}</button></div>
    </div>
  </section>
}

function PhotoLightbox({ photo, index, total, onClose, onMove }: { photo: Photo; index: number; total: number; onClose: () => void; onMove: (direction: 1 | -1) => void }) {
  const touchStart = useRef(0)
  const { t } = useI18n()
  return <div className="lightbox" role="dialog" aria-modal="true" aria-label={t.lightbox.dialog} onTouchStart={(event) => { touchStart.current = event.changedTouches[0].clientX }} onTouchEnd={(event) => { const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 45) onMove(delta < 0 ? 1 : -1) }}>
    <div className="lightbox-bar"><span className="lightbox-count">{pad(index + 1)} / {pad(total)}</span><button className="pill-link" onClick={onClose}><svg className="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg> {t.album.close}</button></div>
    <img key={photo.id} src={photo.large} alt={t.lightbox.alt(index + 1, total)} />
    <div className="lightbox-controls">
      <button onClick={() => onMove(-1)} aria-label={t.lightbox.prev}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg></button>
      <button onClick={() => onMove(1)} aria-label={t.lightbox.next}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></button>
    </div>
  </div>
}

function IntroSplash() {
  return <div className="intro" aria-hidden="true"><img src="/logo/calderon_logo.svg" alt="" /></div>
}

export { App }
