import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { albumCover, albumPhotos, albums, driveUrls, type Album } from './data/albums'
import type { Photo } from './data/photos'
import { site } from './config/site'
import { albumDescriptions } from './config/album-descriptions'

type Transition = 'opening' | 'open' | 'closing'
type PortfolioArea = 'home' | 'systems' | 'dj' | 'photography'
type Area = Exclude<PortfolioArea, 'home'>

const areaLabels: Record<Area, string> = { systems: 'Sistemas', photography: 'Fotografía', dj: 'DJ' }
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
      }, 520)
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
    navigationTimer.current = window.setTimeout(show, 200)
  }

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
    const titles: Record<PortfolioArea, string> = {
      home: 'Joaquín Calderón · Portfolio',
      systems: 'Sistemas · Joaquín Calderón',
      dj: 'DJ · Joaquín Calderón',
      photography: 'Fotografía · Joaquín Calderón',
    }
    document.title = activeAlbum ? `${activeAlbum.title} · Fotografía · Joaquín Calderón` : titles[activeArea]
  }, [activeAlbum, activeArea])

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
    <div className="site" inert={showIntro}>
      <SiteHeader current={activeArea} onNavigate={navigate} />
      {activeArea === 'home'
        ? <HomeCover onNavigate={navigate} isReady={!showIntro} />
        : activeArea === 'systems'
          ? <SystemsPage />
          : activeArea === 'photography'
            ? <PhotographyPage albums={albumOrder} onOpenAlbum={openAlbum} />
            : <DJPage />}
      <SiteFooter />
      {activeAlbum && <AlbumOverlay album={activeAlbum} transition={transition} onClose={closeAlbum} onOpenPhoto={(photos, index) => setLightbox({ photos, index })} />}
      {lightbox && <PhotoLightbox photo={lightbox.photos[lightbox.index]} index={lightbox.index} total={lightbox.photos.length} onClose={() => setLightbox(null)} onMove={moveLightbox} />}
    </div>
  </>
}

function SiteHeader({ current, onNavigate }: { current: PortfolioArea; onNavigate: (area: PortfolioArea) => void }) {
  const go = (area: PortfolioArea) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onNavigate(area)
  }
  return <header className="site-header">
    <a className="site-logo" href="/" onClick={go('home')} aria-label="Calderón, inicio"><img src="/logo/calderon_logo.svg" alt="" width="2172" height="724" /></a>
    <nav className="site-nav" aria-label="Secciones">
      {(Object.keys(areaLabels) as Area[]).map((area) => <a key={area} href={pathForArea(area)} onClick={go(area)} aria-current={current === area ? 'page' : undefined}>{areaLabels[area]}</a>)}
      <a className="site-nav-contact" href="#contacto">Contacto</a>
    </nav>
  </header>
}

function SiteFooter() {
  const contacts = [
    { label: 'WhatsApp', value: '11 3369-3052', href: links.whatsapp },
    { label: 'Instagram', value: '@joaquinncalderon', href: site.instagramUrl },
    { label: 'LinkedIn', value: 'Joaquín Gonzalez Calderón', href: links.linkedin },
    { label: 'GitHub', value: 'JoaquinGonzalezCalderon', href: links.github },
  ]
  return <footer className="site-footer" id="contacto">
    <div className="contact" data-reveal>
      <h2 className="contact-title">¿Hacemos algo<br />juntos?</h2>
      <p className="contact-lede">Sitios, apps, fotos o música para tu evento. Escribime y lo vemos.</p>
      <ul className="contact-list">
        {contacts.map((contact) => <li key={contact.label}><a href={contact.href} target="_blank" rel="noreferrer"><span>{contact.label}</span><strong>{contact.value}</strong><Arrow /></a></li>)}
      </ul>
    </div>
    <div className="footer-base">
      <img src="/logo/calderon_logo.svg" alt="Calderón" width="2172" height="724" />
      <span>© 2026 Joaquín Gonzalez Calderón</span>
      <span>Entre Ríos, Argentina</span>
    </div>
  </footer>
}

function Arrow() {
  return <svg className="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" /></svg>
}

function HomeCover({ onNavigate, isReady }: { onNavigate: (area: PortfolioArea) => void; isReady: boolean }) {
  const [isCharacterVisible, setIsCharacterVisible] = useState(false)
  const [isSpeechVisible, setIsSpeechVisible] = useState(false)
  const [isAutoTalking, setIsAutoTalking] = useState(false)
  const [characterLook, setCharacterLook] = useState<'center' | 'left' | 'right'>('center')
  const [speechText, setSpeechText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  useReveal('home')
  useEffect(() => {
    if (!isReady) return
    let entranceTimer = 0
    let firstSpeechTimer = 0
    let typingStartTimer = 0
    let typingTimer = 0
    let nextMessageTimer = 0
    const messages = [
      'Hola, ¿cómo estás?',
      'Soy Joaquín Gonzalez Calderón, tengo 23 años. Soy analista en sistemas, DJ y fotógrafo.',
    ]
    const speak = (messageIndex: number) => {
      const message = messages[messageIndex]
      setIsSpeechVisible(true)
      typingStartTimer = window.setTimeout(() => {
        setIsAutoTalking(true)
        setSpeechText('')
        setIsTyping(true)
        let character = 0
        typingTimer = window.setInterval(() => {
          character += 1
          setSpeechText(message.slice(0, character))
          if (character >= message.length) {
            window.clearInterval(typingTimer)
            typingTimer = 0
            setIsTyping(false)
            setIsAutoTalking(false)
            if (messageIndex + 1 < messages.length) {
              nextMessageTimer = window.setTimeout(() => speak(messageIndex + 1), 900)
            }
          }
        }, 34)
      }, 320)
    }
    entranceTimer = window.setTimeout(() => {
      setIsCharacterVisible(true)
      firstSpeechTimer = window.setTimeout(() => speak(0), 900)
    }, 1100)
    return () => {
      window.clearTimeout(entranceTimer)
      window.clearTimeout(firstSpeechTimer)
      window.clearTimeout(typingStartTimer)
      window.clearInterval(typingTimer)
      window.clearTimeout(nextMessageTimer)
    }
  }, [isReady])
  useEffect(() => {
    if (!isCharacterVisible || isAutoTalking) {
      setCharacterLook('center')
      return
    }
    let glanceTimer = 0
    let returnTimer = 0
    let nextLook: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right'
    const scheduleGlance = (delay = 1800 + Math.random() * 2200) => {
      glanceTimer = window.setTimeout(() => {
        setCharacterLook(nextLook)
        nextLook = nextLook === 'left' ? 'right' : 'left'
        returnTimer = window.setTimeout(() => {
          setCharacterLook('center')
          scheduleGlance(2800 + Math.random() * 2400)
        }, 1050)
      }, delay)
    }
    scheduleGlance()
    return () => {
      window.clearTimeout(glanceTimer)
      window.clearTimeout(returnTimer)
    }
  }, [isCharacterVisible, isAutoTalking])

  const coverLines: { id: Area; title: string; meta: string; image: string }[] = [
    { id: 'systems', title: 'Apps y sitios web en vivo', meta: '5 proyectos', image: '/areas/systems.webp' },
    { id: 'photography', title: 'Eventos, marcas y comercios', meta: `${albums.length} álbumes`, image: '/areas/photography.webp' },
    { id: 'dj', title: 'Mashups para escuchar acá', meta: `${djTracks.length} temas`, image: '/areas/dj.webp' },
  ]
  const look = characterLook === 'left' ? ' is-looking-left' : characterLook === 'right' ? ' is-looking-right' : ''

  return <main className={`cover${isReady ? ' is-ready' : ''}`}>
    <h1 className="cover-masthead">
      <span className="sr-only">Joaquín Gonzalez Calderón: analista en sistemas, DJ y fotógrafo</span>
      <span className="cover-masthead-word" aria-hidden="true">{[...'Joaquín'].map((letter, index) => <span key={index} style={{ '--i': index } as CSSProperties}>{letter}</span>)}</span>
    </h1>
    <figure className="cover-portrait">
      <img src="/areas/portrait-yo2.webp" alt="Retrato de Joaquín Gonzalez Calderón con gorra" width="1239" height="1269" fetchPriority="high" />
    </figure>
    <div className="cover-intro">
      <p className="cover-name">Gonzalez Calderón</p>
      <nav className="cover-lines" aria-label="Áreas del portfolio">
        {coverLines.map((line, index) => <a key={line.id} className="cover-line" href={pathForArea(line.id)} style={{ '--i': index } as CSSProperties} onClick={(event) => { event.preventDefault(); onNavigate(line.id) }}>
          <img src={line.image} alt="" loading="lazy" />
          <span className="cover-line-label">{areaLabels[line.id]}</span>
          <strong className="cover-line-title">{line.title}</strong>
          <span className="cover-line-meta">{line.meta}</span>
          <Arrow />
        </a>)}
      </nav>
    </div>
    <aside className="narrator" aria-label="Presentación de Joaquín">
      <p className={`narrator-bubble${isSpeechVisible ? ' is-visible' : ''}${isTyping ? ' is-typing' : ''}`} aria-hidden={!isSpeechVisible}>{speechText}{isTyping && <span className="narrator-caret" aria-hidden="true" />}</p>
      <span className={`narrator-character${isCharacterVisible ? ' is-visible' : ''}${isAutoTalking ? ' is-talking' : ''}${look}`} role="img" aria-label="Personaje cartoon de Joaquín" aria-hidden={!isCharacterVisible}>
        <img className="narrator-idle" src="/areas/joaquin-cartoon-idle.webp" alt="" />
        <img className="narrator-open" src="/areas/joaquin-cartoon-speaking.webp" alt="" />
        <img className="narrator-glance narrator-glance-left" src="/areas/joaquin-glance-left.webp" alt="" />
        <img className="narrator-glance narrator-glance-right" src="/areas/joaquin-glance-right.webp" alt="" />
      </span>
    </aside>
  </main>
}

function PageHead({ title, lede, children }: { title: string; lede: string; children?: ReactNode }) {
  return <section className="page-head">
    <h1 className="page-title">{title}</h1>
    <div className="page-head-side">
      <p className="page-lede">{lede}</p>
      {children}
    </div>
  </section>
}

function SystemsPage() {
  useReveal('systems')
  return <main className="page systems">
    <PageHead title="Sistemas" lede="Desarrollo web, comercio digital y soluciones para negocios. Apps propias y sitios para clientes.">
      <div className="page-head-links">
        <a className="pill-link" href={links.github} target="_blank" rel="noreferrer">GitHub <Arrow /></a>
        <a className="pill-link" href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn <Arrow /></a>
      </div>
    </PageHead>
    <FeaturedStreak />
    <FeaturedStugo />
    <section className="clients" aria-labelledby="clients-title">
      <h2 className="section-title" id="clients-title" data-reveal>Sitios para clientes</h2>
      <div className="clients-grid">
        <ClientSite title="Mate Único" description="E-commerce full-stack con restricciones en base de datos y lógica avanzada de validación de stock." image="/areas/jgc-mate.webp" alt="Vista de la tienda online Mate Único" href="https://mate-unico-deployed.vercel.app/" />
        <ClientSite title="Inmobiliaria Andrea Duré" description="Sitio inmobiliario profesional y responsivo para el mercado local de Colón, Entre Ríos." image="/areas/jgc-inmobiliaria.webp" alt="Vista de la web inmobiliaria de Andrea Duré" href="https://andreadure.com/" />
        <ClientSite title="Barbería Los Santos" description="Plataforma web para presentar servicios, catálogo de cortes y reserva de turnos online." image="/areas/jgc-barberia.webp" alt="Vista del proyecto web Barbería Los Santos" href="https://lossantos-coral.vercel.app/" />
      </div>
    </section>
    <section className="demos" aria-labelledby="demos-title">
      <div className="demos-head" data-reveal>
        <h2 className="section-title" id="demos-title">Demos para comercios</h2>
        <p>Plantillas listas para adaptar a tu local.</p>
      </div>
      <ul className="demo-list">
        <DemoRow title="Cafetería" description="Diseño para cafeterías, pastelerías y locales gastronómicos." image="/areas/jgc-demo-cafeteria.webp" href="https://tu-cafeteria.vercel.app/" />
        <DemoRow title="Bazar" description="Catálogo interactivo para artículos del hogar, decoración y regalos." image="/areas/jgc-demo-bazar.webp" href="https://tu-bazar.vercel.app/" />
        <DemoRow title="Tienda" description="Estética visual para marcas de indumentaria y diseño de autor." image="/areas/jgc-demo-tienda.webp" href="https://tu-tienda-de-ropa.vercel.app/" />
      </ul>
    </section>
  </main>
}

function Phone({ src, alt, title }: { src: string; alt: string; title: string }) {
  return <figure className="phone">
    <div className="phone-screen"><img src={src} alt={alt} loading="lazy" width="736" height="1594" /></div>
    <figcaption>{title}</figcaption>
  </figure>
}

function FeaturedStreak() {
  const screens = [
    { src: '/areas/tustreak-home.webp', title: 'Inicio', alt: 'Inicio de Streak con racha diaria, hábito y botón de registro' },
    { src: '/areas/tustreak-progress.webp', title: 'Progreso', alt: 'Progreso de nivel, racha, consistencia e historial de Streak' },
    { src: '/areas/tustreak-gym.webp', title: 'Gym', alt: 'Objetivo semanal, rutina y estadísticas de entrenamiento en Streak' },
    { src: '/areas/tustreak-profile.webp', title: 'Perfil', alt: 'Perfil de Streak con avatar, hábito y opciones de personalización' },
  ]
  return <article className="feature feature-streak" aria-labelledby="streak-title">
    <div className="feature-copy" data-reveal>
      <p className="feature-kind">Producto digital · App web</p>
      <div className="feature-title-row"><h2 id="streak-title">Streak</h2><span className="status is-live">En vivo</span></div>
      <p className="feature-text">Streak reúne seguimiento de hábitos, entrenamiento y progreso en una app pensada para el celular e instalable como PWA. Registrá tu hábito diario y la toma de creatina, consultá la última vez que la marcaste y revisá un resumen semanal de actividad. La XP y los niveles reconocen la constancia sin perder lo acumulado cuando se corta una racha.</p>
      <ul className="feature-points">
        <li>Hábito diario, creatina y recordatorios</li><li>XP, niveles, rachas e historial</li><li>Rutinas, calendario y estadísticas de gym</li><li>Perfil personalizable y PWA instalable</li>
      </ul>
      <details className="feature-more">
        <summary>Más detalles</summary>
        <p>En Gym podés anotar entrenamientos y grupos musculares, editar el historial, crear rutinas propias y seguir objetivos semanales, mensuales y por músculo en el calendario. El perfil suma frases motivadoras, avatar, tema, color principal, hábito y recordatorios configurables. Cada cuenta guarda sus datos de forma privada.</p>
      </details>
      <a className="button" href="https://tustreak.vercel.app/app" target="_blank" rel="noreferrer">Abrir Streak <Arrow /></a>
    </div>
    <div className="feature-phones streak-phones" aria-label="Capturas de Streak" data-reveal>
      {screens.map((screen) => <Phone key={screen.title} {...screen} />)}
    </div>
  </article>
}

function FeaturedStugo() {
  const screens = [
    { src: '/areas/stugo1.webp', title: 'Inicio', alt: 'Inicio de STUGO con asistente, agenda, viajes y vivienda' },
    { src: '/areas/stugo2.webp', title: 'Servicios', alt: 'Categorías de servicios cotidianos y comercios cercanos en STUGO' },
    { src: '/areas/stugo3.webp', title: 'Asistente IA', alt: 'Asistente por voz y texto de STUGO con consultas rápidas de actividades y viajes' },
    { src: '/areas/stugo4.webp', title: 'Actividades', alt: 'Descubrimiento de actividades y eventos locales en STUGO' },
  ]
  return <article className="feature feature-stugo" aria-labelledby="stugo-title">
    <div className="feature-title-row" data-reveal><h2 id="stugo-title">STUGO</h2><span className="status">Proyecto propio</span></div>
    <div className="feature-phones stugo-phones" aria-label="Capturas de STUGO" data-reveal>
      {screens.map((screen) => <Phone key={screen.title} {...screen} />)}
    </div>
    <div className="stugo-copy" data-reveal>
      <div>
        <p className="feature-kind">Plataforma hiperlocal · Mobile + web</p>
        <p className="feature-text feature-text-lead">Un ecosistema para la vida universitaria que conecta a estudiantes con vivienda verificada, viajes compartidos, actividades y servicios cotidianos, empezando por Concepción del Uruguay.</p>
        <p className="feature-text">La app móvil y web reúne mapas y filtros locales, reservas de carpooling con contacto protegido, publicaciones inmobiliarias moderadas y un asistente conversacional por voz y texto. El asistente consulta información real de la plataforma y responde con tarjetas interactivas de viviendas, viajes, lugares y actividades.</p>
      </div>
      <div>
        <ul className="feature-points">
          <li>Vivienda estudiantil, servicios y actividades</li><li>Carpooling con reservas y privacidad</li><li>App Expo y panel web de moderación</li><li>FastAPI, PostgreSQL y asistente con IA y voz</li>
        </ul>
        <ul className="stack" aria-label="Tecnologías principales">
          {['React Native', 'Expo', 'TypeScript', 'FastAPI', 'PostgreSQL', 'Groq', 'Whisper'].map((tech) => <li key={tech}>{tech}</li>)}
        </ul>
      </div>
    </div>
  </article>
}

function ClientSite({ title, description, image, alt, href }: { title: string; description: string; image: string; alt: string; href: string }) {
  return <article className="client" data-reveal>
    <a className="client-image" href={href} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true"><img src={image} alt={alt} loading="lazy" width="1440" height="700" /></a>
    <div className="client-info">
      <h3>{title}</h3>
      <p>{description}</p>
      <a className="text-link" href={href} target="_blank" rel="noreferrer" aria-label={`Ver sitio de ${title}`}>Ver sitio <Arrow /></a>
    </div>
  </article>
}

function DemoRow({ title, description, image, href }: { title: string; description: string; image: string; href: string }) {
  return <li data-reveal>
    <a className="demo-row" href={href} target="_blank" rel="noreferrer">
      <span className="demo-thumb"><img src={image} alt="" loading="lazy" width="1024" height="497" /></span>
      <strong>{title}</strong>
      <span className="demo-desc">{description}</span>
      <span className="demo-cta">Ver demo <Arrow /></span>
    </a>
  </li>
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

  return <main className="page dj">
    <audio ref={audioRef} src={activeTrack.src} preload="auto" onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => { setPlaying(true); setAudioError(false); fadeTrackIn() }} onPause={() => { setPlaying(false); if (trackFadeFrame.current !== null) { window.cancelAnimationFrame(trackFadeFrame.current); trackFadeFrame.current = null } }} onEnded={() => { setPlaying(false); setCurrentTime(0) }} onError={() => setAudioError(true)} />
    <PageHead title="Mashups" lede="Me gusta mezclar canciones, probar cruces y jugar con la energía de cada tema. Voy a ir publicando mis mashups acá." />
    <section className="dj-deck" aria-label="Reproductor de mashups">
      <div className="dj-stage">
        <div className="dj-discs" style={{ '--progress': progress } as CSSProperties}>
          {djTracks.map((track, index) => {
            const relativeIndex = (index - activeIndex + djTracks.length) % djTracks.length
            const selected = index === activeIndex
            const position = selected ? 'active' : relativeIndex === 1 ? 'next' : relativeIndex === djTracks.length - 1 ? 'previous' : 'hidden'
            const isAdjacent = position !== 'hidden'
            return <button type="button" key={track.number} className={`dj-disc is-${position}${selected && playing ? ' is-playing' : ''}`} onClick={() => selectTrack(index)} aria-label={`${selected ? 'Seleccionado' : 'Seleccionar'}: ${track.title}`} aria-pressed={selected} aria-hidden={!isAdjacent} tabIndex={isAdjacent ? 0 : -1}>
              <img src={track.cover} alt="" width="1254" height="1254" />
            </button>
          })}
        </div>
        <div className="dj-player">
          <p className="dj-now"><span>Mashup {activeTrack.number}</span><strong>{activeTrack.title}</strong></p>
          <div className="dj-controls">
            <button type="button" className="dj-step" onClick={() => stepTrack(-1)} aria-label="Mashup anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM19 5.8v12.4c0 .8-.9 1.2-1.5.7L9.6 12.7a.9.9 0 0 1 0-1.4l7.9-6.2c.6-.5 1.5-.1 1.5.7Z" /></svg></button>
            <button type="button" className="dj-play" onClick={togglePlayback} aria-label={playing ? 'Pausar mashup' : 'Reproducir mashup'}><svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M7 5h4v14H7zM14 5h4v14h-4z" /> : <path d="M8 5.3c0-.8.9-1.3 1.6-.8l9.6 6.7c.6.4.6 1.3 0 1.7l-9.6 6.7c-.7.5-1.6 0-1.6-.8V5.3Z" />}</svg></button>
            <button type="button" className="dj-step" onClick={() => stepTrack(1)} aria-label="Siguiente mashup"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM5 5.8v12.4c0 .8.9 1.2 1.5.7l7.9-6.2a.9.9 0 0 0 0-1.4L6.5 5.1C5.9 4.6 5 5 5 5.8Z" /></svg></button>
          </div>
          <div className="dj-timeline">
            <span>{formatTime(currentTime)}</span>
            <input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} style={{ '--progress': `${progress * 100}%` } as CSSProperties} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value) }} aria-label="Posición de reproducción" />
            <span>{formatTime(duration)}</span>
          </div>
          {audioError && <p className="dj-error" role="status">No se pudo cargar el mashup. Intentá reproducirlo otra vez.</p>}
        </div>
      </div>
      <div className="dj-side">
        <ol className="dj-tracklist" aria-label="Lista de mashups">
          {djTracks.map((track, index) => <li key={track.number}>
            <button type="button" className={index === activeIndex ? 'is-active' : ''} onClick={() => selectTrack(index, true)} aria-current={index === activeIndex ? 'true' : undefined}>
              <span className="dj-track-num">{index === activeIndex && playing ? <span className="eq" aria-hidden="true"><i /><i /><i /></span> : track.number}</span>
              <img src={track.cover} alt="" loading="lazy" />
              <span className="dj-track-title">{track.title}</span>
            </button>
          </li>)}
        </ol>
        <figure className="dj-portrait" data-reveal>
          <img src="/areas/dj-portrait.webp" alt="Joaquín Calderón mezclando música en una cabina de DJ" loading="lazy" width="960" height="1280" />
        </figure>
      </div>
    </section>
  </main>
}

const albumLayout = ['wide', 'tall', 'tall', 'wide', 'half', 'half', 'full'] as const

function PhotographyPage({ albums, onOpenAlbum }: { albums: Album[]; onOpenAlbum: (album: Album) => void }) {
  const totalPhotos = albums.reduce((sum, album) => sum + albumPhotos(album).length, 0)
  useReveal('photography')
  return <main className="page photography">
    <PageHead title="Fotografía" lede="Coberturas de eventos y sesiones para marcas y comercios. Tocá un álbum para verlo completo.">
      <p className="page-meta">{albums.length} álbumes · {totalPhotos} fotos</p>
    </PageHead>
    <section className="album-grid" aria-label="Álbumes">
      {albums.map((album, index) => <AlbumCard key={album.id} album={album} index={index} layout={albumLayout[index % albumLayout.length]} onOpen={() => onOpenAlbum(album)} />)}
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
  return <article className={`album-card is-${layout}`} data-reveal>
    <button className="album-card-open" onClick={onOpen} aria-label={`Abrir álbum ${album.title}, ${photos.length} fotos`}>
      <span className="album-card-image">
        {hasRotated && <img className="album-cover-frame" src={previousCover.medium} alt="" decoding="async" />}
        <img key={currentCover.id} className={`album-cover-frame album-cover-current${isCurrentCoverLoaded ? ' is-loaded' : ''}${hasRotated && isCurrentCoverLoaded ? ' is-transitioning' : ''}`} src={currentCover.medium} alt="" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoadedCoverId(currentCover.id)} />
      </span>
      <span className="album-card-meta">
        <strong>{album.title}</strong>
        <span>{photos.length} fotos · {album.year}</span>
      </span>
    </button>
    {driveUrls[album.id] && <a className="text-link album-card-drive" href={driveUrls[album.id]} target="_blank" rel="noreferrer">Abrir en Drive <Arrow /></a>}
  </article>
}

function AlbumOverlay({ album, transition, onClose, onOpenPhoto }: { album: Album; transition: Transition; onClose: () => void; onOpenPhoto: (photos: Photo[], index: number) => void }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const photos = albumPhotos(album)
  return <section className={`album-overlay transition-${transition}${isScrolled ? ' is-scrolled' : ''}`} onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 24)} role="dialog" aria-modal="true" aria-label={`Álbum ${album.title}`}>
    <div className="album-backdrop" />
    <div className="album-bar">
      <button className="pill-link" onClick={() => onClose()}><svg className="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg> Cerrar</button>
      <span className="album-bar-title">{album.title}</span>
      <span className="album-bar-count">{pad(photos.length)} fotos</span>
    </div>
    <div className="album-content">
      <header className="album-head">
        <h1>{album.title}</h1>
        <div className="album-head-side">
          <p>{albumDescriptions[album.id]}</p>
          <p className="album-head-meta">{photos.length} fotos · {album.year}{driveUrls[album.id] && <> · <a className="text-link" href={driveUrls[album.id]} target="_blank" rel="noreferrer">Abrir en Drive <Arrow /></a></>}</p>
        </div>
      </header>
      <div className="album-gallery">{photos.map((photo, index) => <button className="album-photo" key={photo.id} onClick={() => onOpenPhoto(photos, index)} aria-label={`Ampliar foto ${index + 1} de ${photos.length}`}><img src={photo.large} width={photo.width} height={photo.height} alt={`${album.title}, foto ${index + 1}`} decoding="async" loading={index < 3 ? 'eager' : 'lazy'} /></button>)}</div>
      <div className="album-end"><span>Fin de {album.title}</span><button className="pill-link" onClick={() => onClose()}>Volver a los álbumes</button></div>
    </div>
  </section>
}

function PhotoLightbox({ photo, index, total, onClose, onMove }: { photo: Photo; index: number; total: number; onClose: () => void; onMove: (direction: 1 | -1) => void }) {
  const touchStart = useRef(0)
  return <div className="lightbox" role="dialog" aria-modal="true" aria-label="Fotografía ampliada" onTouchStart={(event) => { touchStart.current = event.changedTouches[0].clientX }} onTouchEnd={(event) => { const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 45) onMove(delta < 0 ? 1 : -1) }}>
    <div className="lightbox-bar"><span className="lightbox-count">{pad(index + 1)} / {pad(total)}</span><button className="pill-link" onClick={onClose}><svg className="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg> Cerrar</button></div>
    <img key={photo.id} src={photo.large} alt={`Foto ${index + 1} de ${total}`} />
    <div className="lightbox-controls">
      <button onClick={() => onMove(-1)} aria-label="Fotografía anterior"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg></button>
      <button onClick={() => onMove(1)} aria-label="Fotografía siguiente"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg></button>
    </div>
  </div>
}

function IntroSplash() {
  return <div className="intro" aria-hidden="true"><img src="/logo/calderon_logo.svg" alt="" /></div>
}

export { App }
