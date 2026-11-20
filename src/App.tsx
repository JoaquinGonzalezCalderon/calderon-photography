import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { albumCover, albumPhotos, albums, driveUrls, loosePhotoIds, type Album } from './data/albums'
import { photos as allPhotos, type Photo } from './data/photos'
import { site } from './config/site'
import { langs, useI18n, type Messages } from './i18n'
import { Narrator } from './components/Narrator'
import { Orbit } from './components/Orbit'
import { SplitLetters, useMagnetic, usePointerParallax, useTilt } from './motion'

type Transition = 'opening' | 'open' | 'closing'
type PortfolioArea = 'home' | 'systems' | 'photography'
type Area = Exclude<PortfolioArea, 'home'>

const areaOrder: Area[] = ['systems', 'photography']
const links = {
  whatsapp: 'https://wa.me/5491133693052',
  github: 'https://github.com/JoaquinGonzalezCalderon?tab=repositories',
  linkedin: 'https://www.linkedin.com/in/joaqu%C3%ADn-gonzalez-calder%C3%B3n-8b0b4837b/',
}

function areaFromPathname(pathname: string): PortfolioArea {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/sistemas') return 'systems'
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
  return { home: '/', systems: '/sistemas', photography: '/fotografia' }[area]
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
          : <PhotographyPage albums={albumOrder} onOpenAlbum={openAlbum} onOpenPhoto={(photos, index) => setLightbox({ photos, index })} />}
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
  { id: 'latoska', title: 'Torneo Pádel La Toska 6/11/2026', image: '/areas/news/latoska.webp', area: 'photography', anchor: 'albumes' },
  { id: 'sueltas', title: 'Fotos sueltas', image: '/areas/news/sueltas.webp', area: 'photography', anchor: 'sueltas' },
  { id: 'tpf', title: 'TPF Computación Avanzada', image: '/areas/news/tfi.webp', area: 'systems', anchor: 'tpf' },
  { id: 'padel', title: 'Torneo LocosXelPadelBv', image: '/areas/news/padel.webp', area: 'photography', anchor: 'albumes' },
  { id: 'calde', title: 'Calde', image: '/areas/news/calde.webp', area: 'systems', anchor: 'calde' },
  { id: 'cflap', title: 'C FLAP', image: '/areas/news/cflap.webp', area: 'systems', anchor: 'cflap' },
  { id: 'desfile', title: 'Desfile Concepción', image: '/areas/news/desfile-concepcion.webp', area: 'photography', anchor: 'albumes' },
  { id: 'cuad', title: 'CUAD', image: '/areas/news/cuad.webp', area: 'systems', anchor: 'cuad' },
  { id: 'enjambre', title: 'ENJAMBRE', image: '/areas/news/enjambre.webp', area: 'systems', anchor: 'enjambre' },
  { id: 'may', title: 'MAY', image: '/areas/news/may.webp', area: 'systems', anchor: 'may' },
  { id: 'docentes', title: 'Docentes E', image: '/areas/news/docentes-e.webp', area: 'photography', anchor: 'albumes' },
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
      if (target && window.location.pathname === pathForArea(item.area)) {
        // Systems projects are tiles: bring the tile into view, then open it
        const isTile = target.hasAttribute('data-project')
        target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: isTile ? 'center' : 'start' })
        if (isTile) window.setTimeout(() => target.click(), prefersReducedMotion() ? 0 : 550)
      }
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
      <p className="hero-strip"><span>Joaquín Gonzalez Calderón</span><a href={site.instagramUrl} target="_blank" rel="noreferrer">@joaquinncalderon</a></p>
      <h1 className="hero-name" id="hero-title"><span className="hero-first">Joaquín Gonzalez </span><span className="hero-last">Calderón</span></h1>
      <figure className="hero-portrait">
        <img src="/areas/portrait-yo2.webp" alt={t.hero.portraitAlt} width="1239" height="1269" fetchPriority="high" />
      </figure>
      <nav className="hero-lines" aria-label={t.hero.areas}>
        {areaOrder.map((area) => <a key={area} href={pathForArea(area)} onClick={go(area)}><b>{t.areas[area]}<Arrow /></b><span>{area === 'systems' ? t.cases.systemsFoot : t.cases.albums(albums.length)}</span></a>)}
      </nav>
      <p className="hero-lead">{t.hero.lead[0]}<br />{t.hero.lead[1]}</p>
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
  { name: 'ENJAMBRE', image: '/areas/enjambre-coe.webp' },
  { name: 'CUAD', image: '/areas/cuad-home.webp', wip: true },
  { name: 'C FLAP', image: '/areas/cflap-board.webp' },
  { name: 'Calde', image: '/areas/calde-widget.webp', wip: true },
  { name: 'TPF Computación Avanzada', image: '/areas/tfi-home.webp' },
  { name: 'STUGO', image: '/areas/stugo1.webp', phone: true },
  { name: 'iPhone Pronu', image: '/areas/jgc-iphonepronu.webp', wip: true },
  { name: 'Raygal', image: '/areas/jgc-raygal.webp', wip: true },
  { name: 'Vino & Co', image: '/areas/jgc-vinoyco.webp', wip: true },
  { name: 'Inmobiliaria Andrea Duré', image: '/areas/jgc-inmobiliaria.webp' },
  { name: 'Barbería Los Santos', image: '/areas/jgc-barberia.webp', wip: true },
  { name: 'Analía Calderón', image: '/areas/jgc-amelia.webp', wip: true },
  { name: 'Mate Único', image: '/areas/jgc-mate.webp' },
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
    <ProjectBoard />
    <DemoShowcase />
  </main>
}

type ProjectId = 'streak' | 'may' | 'voider' | 'enjambre' | 'cuad' | 'cflap' | 'calde' | 'tpf' | 'stugo'
type ClientId = keyof Messages['systems']['clients']
type StatusId = keyof Messages['status']
/** One tile on the systems page. `Detail` is what opens when the tile is pressed. */
type BoardEntry = { id: string; group: 'projects' | 'clients'; name: string; image: string; status: StatusId; tone: string; fit?: 'contain' | 'phone'; kind: (t: Messages) => string; Detail: () => ReactNode }

const project = (id: ProjectId, name: string, image: string, status: StatusId, tone: string, Detail: () => ReactNode, fit?: BoardEntry['fit']): BoardEntry =>
  ({ id, group: 'projects', name, image, status, tone, fit, kind: (t) => t.systems[id].kind, Detail })

/** Client sites, in board order. Without `href` the site is only shown, never linked. */
const clientSites: Record<ClientId, { name: string; image: string; status: StatusId; href?: string }> = {
  iphonepronu: { name: 'iPhone Pronu', image: '/areas/jgc-iphonepronu.webp', status: 'wip' },
  raygal: { name: 'Raygal', image: '/areas/jgc-raygal.webp', status: 'wip' },
  vinoyco: { name: 'Vino & Co', image: '/areas/jgc-vinoyco.webp', status: 'wip' },
  inmobiliaria: { name: 'Inmobiliaria Andrea Duré', image: '/areas/jgc-inmobiliaria.webp', status: 'live', href: 'https://andreadure.com/' },
  barberia: { name: 'Barbería Los Santos', image: '/areas/jgc-barberia.webp', status: 'wip', href: 'https://lossantos-coral.vercel.app/' },
  analia: { name: 'Analía Calderón', image: '/areas/jgc-amelia.webp', status: 'wip' },
  mate: { name: 'Mate Único', image: '/areas/jgc-mate.webp', status: 'uni', href: 'https://mate-unico-deployed.vercel.app/' },
}

const client = (id: ClientId): BoardEntry => {
  const site = clientSites[id]
  return { id, group: 'clients', name: site.name, image: site.image, status: site.status, tone: '#f2efe8', kind: (t) => t.systems.clients[id].description, Detail: () => <ClientDetail id={id} /> }
}

const board: BoardEntry[] = [
  project('streak', 'Streak', '/areas/tustreak-home.webp', 'live', '#f2efe8', FeaturedStreak, 'phone'),
  project('may', 'MAY', '/areas/may-home.webp', 'wip', '#f7b500', FeaturedMay),
  project('voider', 'Voider Goat', '/areas/voidergoat-album.webp', 'live', '#e3170a', FeaturedVoider),
  project('enjambre', 'Enjambre', '/areas/enjambre-coe.webp', 'team', '#f26b1d', FeaturedEnjambre),
  project('cuad', 'CUAD', '/areas/cuad-home.webp', 'wip', '#cec8b0', FeaturedCuad),
  project('cflap', 'C FLAP', '/areas/cflap-board.webp', 'live', '#9b7bff', FeaturedCflap),
  project('calde', 'Calde', '/areas/calde-widget.webp', 'wip', '#e8784f', FeaturedCalde, 'contain'),
  project('tpf', 'TPF Computación Avanzada', '/areas/tfi-home.webp', 'team', '#2ed3a0', FeaturedTpf),
  project('stugo', 'STUGO', '/areas/stugo1.webp', 'team', '#7fb2ff', FeaturedStugo, 'phone'),
  client('iphonepronu'),
  client('raygal'),
  client('vinoyco'),
  client('inmobiliaria'),
  client('barberia'),
  client('analia'),
  client('mate'),
]

const statusClass = (status: StatusId) => status === 'live' ? ' is-live' : status === 'wip' ? ' is-wip' : ''

/** Every project and client site as a tile; pressing one grows a dialog out of it with the full project. */
function ProjectBoard() {
  const { t } = useI18n()
  const [active, setActive] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([])
  const closing = useRef(false)
  // Mirrors `active` so quick repeated clicks on next/prev never read a stale index
  const activeRef = useRef<number | null>(null)

  /** Uniform scale + offset that puts the dialog over the tile, so it looks like the tile opening up. */
  const tileTransform = (index: number) => {
    const tile = tileRefs.current[index]
    const dialog = dialogRef.current
    if (!tile || !dialog) return null
    const from = tile.getBoundingClientRect()
    const to = dialog.getBoundingClientRect()
    if (!from.width || !to.width || from.bottom < 0 || from.top > window.innerHeight) return null
    const dx = from.left + from.width / 2 - (to.left + to.width / 2)
    const dy = from.top + from.height / 2 - (to.top + to.height / 2)
    return `translate(${dx}px, ${dy}px) scale(${Math.max(from.width / to.width, .2)})`
  }

  const open = (index: number) => {
    const dialog = dialogRef.current
    if (!dialog) return
    closing.current = false
    activeRef.current = index
    setActive(index)
    window.history.replaceState(window.history.state, '', `#${board[index].id}`)
    if (dialog.open) { dialog.scrollTop = 0; return }
    dialog.showModal()
    dialog.scrollTop = 0
    if (prefersReducedMotion()) return
    const from = tileTransform(index)
    dialog.animate(from
      ? [{ transform: from, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: 'none', opacity: 1 }]
      : [{ transform: 'translateY(24px) scale(.97)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.16, 1, .3, 1)' })
  }

  const close = () => {
    const dialog = dialogRef.current
    if (!dialog?.open || closing.current) return
    closing.current = true
    window.history.replaceState(window.history.state, '', window.location.pathname)
    const current = activeRef.current
    const finish = () => { dialog.close(); activeRef.current = null; setActive(null); closing.current = false }
    if (prefersReducedMotion() || current === null) { finish(); return }
    const to = tileTransform(current)
    dialog.animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: .55 }, { transform: to ?? 'translateY(16px) scale(.97)', opacity: 0 }], { duration: 340, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' }).finished.then(() => {
      dialog.getAnimations().forEach((animation) => animation.cancel())
      finish()
    }, finish)
  }

  // Deep link: /sistemas#cuad opens CUAD
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    const index = board.findIndex((entry) => entry.id === id)
    if (index < 0) return
    tileRefs.current[index]?.scrollIntoView({ block: 'center' })
    const timer = window.setTimeout(() => open(index), 300)
    return () => window.clearTimeout(timer)
  }, [])

  const entry = active === null ? null : board[active]
  const step = (direction: 1 | -1) => { const current = activeRef.current; if (current !== null) open((current + direction + board.length) % board.length) }
  const groups = [
    { id: 'projects' as const, title: t.systems.projectsTitle },
    { id: 'clients' as const, title: t.systems.clientsTitle },
  ]

  return <>
    {groups.map((group) => <section className="board-group" id={group.id === 'clients' ? 'clientes' : 'proyectos'} aria-labelledby={`${group.id}-title`} key={group.id}>
      <div className="board-group-head" data-reveal>
        <h2 className="section-title" id={`${group.id}-title`}><span className="reveal-line"><span>{group.title}</span></span></h2>
        {group.id === 'projects' && <p>{t.systems.projectsHint}</p>}
      </div>
      <div className="tiles">
        {board.map((item, index) => item.group !== group.id ? null : <button type="button" key={item.id} id={item.id} data-project ref={(node) => { tileRefs.current[index] = node }} className={`tile${item.fit ? ` is-${item.fit}` : ''}`} style={{ '--tone': item.tone, '--i': index } as CSSProperties} onClick={() => open(index)} aria-haspopup="dialog" data-reveal>
          <span className="tile-media"><img src={item.image} alt="" loading="lazy" /></span>
          <span className="tile-body">
            <span className="tile-top"><span className="tile-num">{pad(index + 1)}</span><span className={`status${statusClass(item.status)}`}>{t.status[item.status]}</span></span>
            <span className="tile-name">{item.name}</span>
            <span className="tile-kind">{item.kind(t)}</span>
          </span>
          <span className="tile-open" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" /></svg></span>
        </button>)}
      </div>
    </section>)}

    <dialog ref={dialogRef} className="project-dialog" aria-label={entry ? t.systems.dialog(entry.name) : undefined} style={entry ? { '--tone': entry.tone } as CSSProperties : undefined} onCancel={(event) => { event.preventDefault(); close() }} onClick={(event) => { if (event.target === event.currentTarget) close() }}>
      {entry && <>
        <div className="project-dialog-bar">
          <button type="button" className="pill-link" onClick={close}><svg className="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg> {t.album.close}</button>
          <span className="project-dialog-count">{pad(active! + 1)} <span>/ {pad(board.length)}</span></span>
          <span className="project-dialog-nav">
            <button type="button" onClick={() => step(-1)} aria-label={t.systems.prevProject}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg></button>
            <button type="button" onClick={() => step(1)} aria-label={t.systems.nextProject}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></button>
          </span>
        </div>
        <div className="project-dialog-body" key={entry.id}><entry.Detail /></div>
      </>}
    </dialog>
  </>
}

function ClientDetail({ id }: { id: ClientId }) {
  const { t } = useI18n()
  const site = clientSites[id]
  const copy = t.systems.clients[id]
  const title = 'title' in copy ? copy.title : site.name
  const picture = <>
    <span className="demo-browser-bar"><i /><i /><i /><span>{site.href ? new URL(site.href).host : site.name}</span></span>
    <img src={site.image} alt={copy.alt} loading="lazy" width="1440" height="700" />
  </>
  // The site's cover fills the width; name and description sit underneath it
  return <article className="feature feature-client" aria-labelledby={`${id}-title`}>
    <div className="client-stage">
      {site.href ? <a className="client-window" href={site.href} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">{picture}</a> : <div className="client-window">{picture}</div>}
    </div>
    <div className="client-copy">
      <div>
        <p className="feature-kind">{t.systems.clientKind}</p>
        <div className="feature-title-row"><h2 id={`${id}-title`}>{title}</h2><span className={`status${statusClass(site.status)}`}>{t.status[site.status]}</span></div>
      </div>
      <div className="client-copy-side">
        <p className="feature-text feature-text-lead">{copy.description}</p>
        {site.href && <a className="button" data-magnetic="0.2" href={site.href} target="_blank" rel="noreferrer" aria-label={t.systems.viewSiteAria(title, site.status === 'wip')}>{site.status === 'wip' ? t.systems.viewProgress : t.systems.viewSite} <Arrow /></a>}
      </div>
    </div>
  </article>
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
  return <article className="feature feature-voider" aria-labelledby="voider-title">
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
  return <article className="feature feature-shots feature-may" aria-labelledby="may-title">
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
  return <article className="feature feature-shots feature-enjambre is-reversed" aria-labelledby="enjambre-title">
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
  return <article className="feature feature-shots feature-cuad" aria-labelledby="cuad-title">
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

function FeaturedCflap() {
  const { t } = useI18n()
  return <article className="feature feature-shots feature-cflap is-reversed" aria-labelledby="cflap-title">
    <div className="shots-stage" data-reveal>
      <a className="shots-window shots-window-back" href="https://cflap.vercel.app/" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>cflap.vercel.app</span></span>
        <img src="/areas/cflap-home.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
      <a className="shots-window shots-window-front" href="https://cflap.vercel.app/" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>{t.systems.cflap.barBoard}</span></span>
        <img src="/areas/cflap-board.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
    </div>
    <div className="shots-copy" data-reveal>
      <p className="feature-kind">{t.systems.cflap.kind}</p>
      <div className="feature-title-row"><h2 id="cflap-title">C FLAP</h2><span className="status is-live">{t.status.live}</span></div>
      <p className="feature-text feature-text-lead">{t.systems.cflap.lead}</p>
      <p className="feature-text">{t.systems.cflap.text}</p>
      <ul className="feature-points">
        {t.systems.cflap.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <a className="button shots-cta" data-magnetic="0.2" href="https://cflap.vercel.app/" target="_blank" rel="noreferrer">{t.systems.cflap.cta} <Arrow /></a>
    </div>
  </article>
}

/** A desktop widget, so it floats on its own instead of sitting in a browser window. */
function FeaturedCalde() {
  const { t } = useI18n()
  return <article className="feature feature-shots feature-calde" aria-labelledby="calde-title">
    <div className="shots-stage calde-stage" data-reveal>
      <img className="calde-widget" src="/areas/calde-widget.webp" alt={t.systems.calde.alt} loading="lazy" width="753" height="497" />
    </div>
    <div className="shots-copy" data-reveal>
      <p className="feature-kind">{t.systems.calde.kind}</p>
      <div className="feature-title-row"><h2 id="calde-title">Calde</h2><span className="status is-wip">{t.status.wip}</span></div>
      <p className="feature-text feature-text-lead">{t.systems.calde.lead}</p>
      <p className="feature-text">{t.systems.calde.text}</p>
      <ul className="feature-points">
        {t.systems.calde.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
    </div>
  </article>
}

function FeaturedTpf() {
  const { t } = useI18n()
  return <article className="feature feature-shots feature-tpf is-reversed" aria-labelledby="tpf-title">
    <div className="shots-stage" data-reveal>
      <a className="shots-window shots-window-back" href="https://tfi-interfaz.vercel.app/" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>tfi-interfaz.vercel.app</span></span>
        <img src="/areas/tfi-home.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
      <a className="shots-window shots-window-front" href="https://tfi-interfaz.vercel.app/#openmp" target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <span className="demo-browser-bar"><i /><i /><i /><span>{t.systems.tpf.barOpenmp}</span></span>
        <img src="/areas/tfi-openmp.webp" alt="" loading="lazy" width="1280" height="800" />
      </a>
    </div>
    <div className="shots-copy" data-reveal>
      <p className="feature-kind">{t.systems.tpf.kind}</p>
      <div className="feature-title-row"><h2 id="tpf-title">TPF Computación Avanzada</h2><span className="status">{t.status.team}</span></div>
      <p className="feature-text feature-text-lead">{t.systems.tpf.lead}</p>
      <p className="feature-text">{t.systems.tpf.text}</p>
      <ul className="feature-points">
        {t.systems.tpf.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <a className="button shots-cta" data-magnetic="0.2" href="https://tfi-interfaz.vercel.app/" target="_blank" rel="noreferrer">{t.systems.tpf.cta} <Arrow /></a>
    </div>
  </article>
}

function FeaturedStugo() {
  const { t } = useI18n()
  const screens = t.systems.stugo.screens.map((screen, index) => ({ src: `/areas/stugo${index + 1}.webp`, ...screen }))
  return <article className="feature feature-stugo" aria-labelledby="stugo-title">
    <div className="feature-title-row" data-reveal><h2 id="stugo-title">STUGO</h2><span className="status">{t.status.team}</span></div>
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

/** Rows of 2 · 3 · 2 cards keep every album the same height. */
const albumLayout: ('pair' | 'trio')[] = ['pair', 'pair', 'trio', 'trio', 'trio', 'trio', 'trio', 'trio', 'trio', 'trio', 'trio']

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
