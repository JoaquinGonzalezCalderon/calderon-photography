import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { albumCover, albumPhotos, albums, driveUrls, type Album } from './data/albums'
import type { Photo } from './data/photos'
import { site } from './config/site'
import { albumDescriptions } from './config/album-descriptions'

type Transition = 'opening' | 'open' | 'closing'
type PortfolioArea = 'home' | 'systems' | 'dj' | 'photography'

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

function App() {
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(() => albumFromPathname(window.location.pathname))
  const [activeArea, setActiveArea] = useState<PortfolioArea>(() => areaFromPathname(window.location.pathname))
  const [albumOrder] = useState(() => [...albums].sort(() => Math.random() - 0.5))
  const [transition, setTransition] = useState<Transition>(() => albumFromPathname(window.location.pathname) ? 'open' : 'opening')
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const scrollPosition = useRef(0)
  const albumReturnPath = useRef(activeAlbum ? '/fotografia' : '/')
  const navigationTimer = useRef<number | null>(null)

  const navigateArea = (area: PortfolioArea) => {
    setActiveArea(area)
    const path = pathForArea(area)
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
  }

  const goHome = () => {
    const showHome = () => {
      setActiveArea('home')
      if (window.location.pathname !== '/') window.history.replaceState({}, '', '/')
      document.body.classList.remove('is-navigating-back')
      document.body.classList.add('is-arriving-back')
      navigationTimer.current = window.setTimeout(() => {
        document.body.classList.remove('is-arriving-back')
        navigationTimer.current = null
      }, 420)
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current)
    document.body.classList.remove('is-arriving-back')
    if (reduceMotion) {
      showHome()
      return
    }
    document.body.classList.add('is-navigating-back')
    navigationTimer.current = window.setTimeout(showHome, 180)
  }

  useEffect(() => () => {
    if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current)
    document.body.classList.remove('is-navigating-back', 'is-arriving-back')
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setIsReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), isReducedMotion ? 120 : 1500)
    return () => window.clearTimeout(timer)
  }, [isReducedMotion])

  useEffect(() => {
    const titles: Record<PortfolioArea, string> = {
      home: 'Joaquín Calderón — Portfolio',
      systems: 'Analista en Sistemas — Joaquín Calderón',
      dj: 'DJ — Joaquín Calderón',
      photography: 'Fotografía — Joaquín Calderón',
    }
    document.title = activeAlbum
      ? `${activeAlbum.title} — Fotografía | Joaquín Calderón`
      : titles[activeArea]
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
    albumReturnPath.current = pathForArea(activeArea === 'photography' ? 'photography' : activeArea)
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
    {activeArea === 'home' ? <HomeHub onOpenArea={navigateArea} isReducedMotion={isReducedMotion} /> : activeArea === 'systems' ? <SystemsPortfolio onBack={goHome} /> : activeArea === 'photography' ? <Home albums={albumOrder} onOpenAlbum={openAlbum} onBack={goHome} /> : <DJPortfolio onBack={goHome} />}
    {activeAlbum && <AlbumOverlay album={activeAlbum} transition={transition} onClose={closeAlbum} onOpenPhoto={(photos, index) => setLightbox({ photos, index })} />}
    {lightbox && <PhotoLightbox photo={lightbox.photos[lightbox.index]} index={lightbox.index} total={lightbox.photos.length} onClose={() => setLightbox(null)} onMove={moveLightbox} />}
  </>
}

function Logo() { return <a className="archive-logo" href="/" aria-label="Calderón, inicio"><img src="/logo/calderon_logo.svg" alt="Calderón" /></a> }

function HomeHub({ onOpenArea, isReducedMotion }: { onOpenArea: (area: 'systems' | 'dj' | 'photography') => void; isReducedMotion: boolean }) {
  const [openingArea, setOpeningArea] = useState<'systems' | 'dj' | 'photography' | null>(null)
  const [portraitMode, setPortraitMode] = useState<'photo' | 'cartoon'>('photo')
  const [isAutoTalking, setIsAutoTalking] = useState(false)
  const showsCartoon = portraitMode === 'cartoon' || isAutoTalking
  const isTalking = !isReducedMotion && (portraitMode === 'cartoon' || isAutoTalking)
  useEffect(() => {
    if (isReducedMotion || portraitMode === 'cartoon') {
      setIsAutoTalking(false)
      return
    }
    let idleTimer = 0
    let talkingTimer = 0
    const scheduleNext = () => {
      idleTimer = window.setTimeout(() => {
        setIsAutoTalking(true)
        talkingTimer = window.setTimeout(() => {
          setIsAutoTalking(false)
          scheduleNext()
        }, 3200)
      }, 20000 + Math.random() * 12000)
    }
    scheduleNext()
    return () => {
      window.clearTimeout(idleTimer)
      window.clearTimeout(talkingTimer)
    }
  }, [isReducedMotion, portraitMode])
  const areas = [
    { id: 'systems' as const, number: '01', title: 'Analista en Sistemas', note: 'TECNOLOGÍA / SOLUCIONES', className: 'area-systems', image: '/areas/systems.webp' },
    { id: 'dj' as const, number: '02', title: 'DJ', note: 'MÚSICA / EN VIVO', className: 'area-dj', image: '/areas/dj.webp' },
    { id: 'photography' as const, number: '03', title: 'Fotografía', note: 'IMÁGENES / ARCHIVO', className: 'area-photography', image: '/areas/photography.webp' },
  ]
  const enterArea = (area: 'systems' | 'dj' | 'photography') => {
    if (openingArea) return
    setOpeningArea(area)
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260
    window.setTimeout(() => onOpenArea(area), delay)
  }
  const moveCardWeight = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse') return
    const card = event.currentTarget
    const bounds = card.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    card.style.setProperty('--weight-x', `${(x * 100).toFixed(1)}%`)
    card.style.setProperty('--weight-y', `${(y * 100).toFixed(1)}%`)
    card.style.setProperty('--tilt-x', `${((0.5 - y) * 3).toFixed(2)}deg`)
    card.style.setProperty('--tilt-y', `${((x - 0.5) * 3).toFixed(2)}deg`)
  }
  const releaseCardWeight = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const card = event.currentTarget
    card.style.setProperty('--weight-x', '50%')
    card.style.setProperty('--weight-y', '50%')
    card.style.setProperty('--tilt-x', '0deg')
    card.style.setProperty('--tilt-y', '0deg')
  }
  return <main className={`home-hub${openingArea ? ' is-leaving-up' : ''}`}>
    <div className="home-board-frame">
      <div className="board-topline">
        <div className="board-brand"><img className="board-logo" src="/logo/calderon_logo.svg" alt="Calderón" /><div className="board-edition"><span>PORTAFOLIO PERSONAL · 2026</span><span>ENTRE RÍOS · ARGENTINA</span></div></div>
      </div>
      <section className="area-selector" aria-label="Áreas del portfolio">
        <figure className={`home-portrait${portraitMode === 'cartoon' ? ' is-cartoon' : ''}${isAutoTalking ? ' is-auto-talking' : ''}${isTalking ? ' is-talking' : ''}`}>
          <button className="home-profile-toggle" type="button" aria-label={showsCartoon ? 'Cambiar al retrato fotográfico' : 'Cambiar al personaje cartoon'} aria-pressed={portraitMode === 'cartoon'} onClick={() => { setIsAutoTalking(false); setPortraitMode(showsCartoon ? 'photo' : 'cartoon') }}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.25 6.1a5.25 5.25 0 0 1 8.63 1.24M13.75 13.9a5.25 5.25 0 0 1-8.63-1.24M14.9 4.6v3.1h-3.1M5.1 15.4v-3.1h3.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
            <span>{showsCartoon ? 'VER FOTO' : 'VER CARTOON'}</span>
          </button>
          <span className="home-portrait-art">
            <img className="home-portrait-photo" src="/areas/portrait-cutout.webp" alt="Retrato en blanco y negro de Joaquín González Calderón" aria-hidden={showsCartoon} />
            <img className="home-portrait-cartoon home-portrait-cartoon-closed" src="/areas/joaquin-cartoon-closed.webp" alt={showsCartoon ? 'Personaje cartoon de Joaquín González Calderón' : ''} aria-hidden={!showsCartoon} />
            <img className="home-portrait-cartoon home-portrait-cartoon-open" src="/areas/joaquin-cartoon-open.webp" alt="" aria-hidden="true" />
          </span>
          <figcaption><span>JOAQUÍN GONZÁLEZ CALDERÓN</span></figcaption>
        </figure>
        <aside className="home-about"><h1>SOBRE MÍ</h1><p>Joaquín González Calderón. 23 años.<br />Analista en Sistemas. DJ. Fotografía.<br />¡Te invito a ver mis trabajos!</p></aside>
        <nav className="board-areas" aria-label="Elegí un área del portafolio">{areas.map((area) => <button className={`area-card ${area.className}${openingArea === area.id ? ' is-opening' : ''}`} key={area.id} onClick={() => enterArea(area.id)} onPointerMove={moveCardWeight} onPointerLeave={releaseCardWeight} disabled={Boolean(openingArea)}><img className="area-image" src={area.image} alt="" aria-hidden="true" /><span className="area-card-meta"><span>{area.number}</span><span className="area-note">{area.note}</span></span><span className="area-title">{area.title}</span><span className="area-arrow" aria-hidden="true">↗</span></button>)}</nav>
      </section>
    </div>
    <ContactSection />
  </main>
}

function ContactSection() {
  return <section className="home-contact" aria-labelledby="home-contact-title">
    <p id="home-contact-title">CONTACTO</p>
    <div className="home-contact-links">
      <a href="https://wa.me/5491133693052" target="_blank" rel="noreferrer"><span>WHATSAPP</span><strong>11 3369-3052</strong><b aria-hidden="true">↗</b></a>
      <a href={site.instagramUrl} target="_blank" rel="noreferrer"><span>INSTAGRAM</span><strong>@joaquinncalderon</strong><b aria-hidden="true">↗</b></a>
    </div>
  </section>
}

function SystemsPortfolio({ onBack }: { onBack: () => void }) {
  return <main className="systems-page">
    <header className="archive-header"><button className="area-back" onClick={onBack}>← VOLVER</button><Logo /><span className="header-side header-side-right">01 / SISTEMAS</span></header>
    <section className="systems-content" aria-labelledby="systems-title">
      <div className="systems-heading">
        <p className="systems-kicker"><span>01</span> TECNOLOGÍA / SOLUCIONES</p>
        <h1 id="systems-title">Proyectos que<br /><span>resuelven cosas.</span></h1>
        <div className="systems-heading-aside"><p className="systems-intro">Desarrollo web, comercio digital y soluciones para negocios.</p><nav className="systems-profile-links" aria-label="Perfiles profesionales"><a href="https://github.com/JoaquinGonzalezCalderon?tab=repositories" target="_blank" rel="noreferrer"><span>GH</span> GITHUB / REPOSITORIOS ↗</a><a href="https://www.linkedin.com/in/joaqu%C3%ADn-gonzalez-calder%C3%B3n-8b0b4837b/" target="_blank" rel="noreferrer"><span>in</span> LINKEDIN / PERFIL ↗</a></nav></div>
      </div>
      <section className="systems-projects" aria-labelledby="systems-projects-title">
        <div className="systems-section-heading"><div><p>PORTFOLIO / SELECCIÓN</p><h2 id="systems-projects-title">Proyectos</h2></div><span>01 — 05</span></div>
        <FeaturedStreak />
        <FeaturedStugo />
        <div className="systems-project-grid">
          <ProjectCard number="03" title="Mate Único" description="E-commerce full-stack con restricciones en base de datos y lógica avanzada de validación de stock." image="/areas/jgc-mate.webp" alt="Vista de la tienda online Mate Único" href="https://mate-unico-deployed.vercel.app/" status="SITIO EN VIVO" />
          <ProjectCard number="04" title="Inmobiliaria Andrea Duré" description="Sitio inmobiliario profesional y responsivo para el mercado local de Colón, Entre Ríos." image="/areas/jgc-inmobiliaria.webp" alt="Vista de la web inmobiliaria de Andrea Duré" href="https://andreadure.com/" status="SITIO EN VIVO" />
          <ProjectCard number="05" title="Barbería Los Santos" description="Plataforma web para presentar servicios, catálogo de cortes y reserva de turnos online." image="/areas/jgc-barberia.webp" alt="Vista del proyecto web Barbería Los Santos" href="https://lossantos-coral.vercel.app/" status="SITIO EN VIVO" />
        </div>
      </section>
      <section className="systems-demos" aria-labelledby="systems-demos-title">
        <div className="systems-section-heading"><div><p>EXPLORACIONES / 03</p><h2 id="systems-demos-title">Demos para comercios</h2></div><span>PLANTILLAS PREMIUM</span></div>
        <div className="systems-demo-grid">
          <DemoCard title="Cafetería" description="Diseño para cafeterías, pastelerías y locales gastronómicos." image="/areas/jgc-demo-cafeteria.webp" href="https://tu-cafeteria.vercel.app/" />
          <DemoCard title="Bazar" description="Catálogo interactivo para artículos del hogar, decoración y regalos." image="/areas/jgc-demo-bazar.webp" href="https://tu-bazar.vercel.app/" />
          <DemoCard title="Tienda" description="Estética visual para marcas de indumentaria y diseño de autor." image="/areas/jgc-demo-tienda.webp" href="https://tu-tienda-de-ropa.vercel.app/" />
        </div>
      </section>
    </section>
    <footer className="archive-footer"><span>© JOAQUÍN CALDERÓN</span><button onClick={onBack}>VOLVER AL INICIO ↑</button><span>ENTRE RÍOS</span></footer>
  </main>
}

function FeaturedStreak() {
  const screens = [
    { src: '/areas/tustreak-home.webp', title: 'Inicio', alt: 'Inicio de Streak con racha diaria, hábito y botón de registro' },
    { src: '/areas/tustreak-progress.webp', title: 'Progreso', alt: 'Progreso de nivel, racha, consistencia e historial de Streak' },
    { src: '/areas/tustreak-gym.webp', title: 'Gym', alt: 'Objetivo semanal, rutina y estadísticas de entrenamiento en Streak' },
    { src: '/areas/tustreak-profile.webp', title: 'Perfil', alt: 'Perfil de Streak con avatar, hábito y opciones de personalización' },
  ]
  return <article className="systems-featured-project">
    <div className="systems-featured-copy">
      <p className="systems-featured-kicker"><span>01</span> PRODUCTO DIGITAL / APP WEB</p>
      <div className="systems-featured-title"><h3>Streak</h3><span>EN VIVO</span></div>
      <p className="systems-featured-description">Streak reúne seguimiento de hábitos, entrenamiento y progreso en una app pensada para el celular e instalable como PWA. Registrá tu hábito diario y la toma de creatina, consultá la última vez que la marcaste y revisá un resumen semanal de actividad. La XP y los niveles reconocen la constancia sin perder lo acumulado cuando se corta una racha.</p>
      <p className="systems-featured-description systems-featured-description-extra">En Gym podés anotar entrenamientos y grupos musculares, editar el historial, crear rutinas propias y seguir objetivos semanales, mensuales y por músculo en el calendario. El perfil suma frases motivadoras, avatar, tema, color principal, hábito y recordatorios configurables. Cada cuenta guarda sus datos de forma privada.</p>
      <ul className="systems-featured-details">
        <li>Hábito diario, creatina y recordatorios</li><li>XP, niveles, rachas e historial</li><li>Rutinas, calendario y estadísticas de gym</li><li>Perfil personalizable y PWA instalable</li>
      </ul>
      <a className="systems-featured-cta" href="https://tustreak.vercel.app/app" target="_blank" rel="noreferrer">ABRIR STREAK <span aria-hidden="true">↗</span></a>
    </div>
    <div className="systems-streak-gallery" aria-label="Capturas de Streak">
      {screens.map((screen, index) => <figure className="systems-streak-shot" key={screen.title}>
        <div><img src={screen.src} alt={screen.alt} loading="lazy" /></div>
        <figcaption><span>0{index + 1}</span>{screen.title}</figcaption>
      </figure>)}
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
  return <article className="systems-featured-project systems-featured-stugo">
    <div className="systems-featured-copy">
      <p className="systems-featured-kicker"><span>02</span> PLATAFORMA HIPERLOCAL / MOBILE + WEB</p>
      <div className="systems-featured-title"><h3>STUGO</h3><span>PROYECTO PROPIO</span></div>
      <p className="systems-featured-description">Un ecosistema para la vida universitaria que conecta a estudiantes con vivienda verificada, viajes compartidos, actividades y servicios cotidianos, empezando por Concepción del Uruguay.</p>
      <p className="systems-featured-description systems-featured-description-extra">La app móvil y web reúne mapas y filtros locales, reservas de carpooling con contacto protegido, publicaciones inmobiliarias moderadas y un asistente conversacional por voz y texto. El asistente consulta información real de la plataforma y responde con tarjetas interactivas de viviendas, viajes, lugares y actividades.</p>
      <ul className="systems-featured-details">
        <li>Vivienda estudiantil, servicios y actividades</li><li>Carpooling con reservas y privacidad</li><li>App Expo y panel web de moderación</li><li>FastAPI, PostgreSQL y asistente con IA y voz</li>
      </ul>
      <div className="systems-stugo-stack" aria-label="Tecnologías principales"><span>React Native</span><span>Expo</span><span>TypeScript</span><span>FastAPI</span><span>PostgreSQL</span><span>Groq · Whisper</span></div>
    </div>
    <div className="systems-stugo-gallery" aria-label="Capturas de STUGO">
      {screens.map((screen, index) => <figure className="systems-stugo-shot" key={screen.title}>
        <div><img src={screen.src} alt={screen.alt} loading="lazy" /></div>
        <figcaption><span>0{index + 1}</span>{screen.title}</figcaption>
      </figure>)}
    </div>
  </article>
}

function ProjectCard({ number, title, description, image, alt, href, status }: { number: string; title: string; description: string; image: string; alt: string; href?: string; status: string }) {
  return <article className="systems-project-card">
    <div className="systems-project-image">{href ? <a href={href} target="_blank" rel="noreferrer" aria-label={`Abrir ${title} en una pestaña nueva`}><img src={image} alt={alt} loading="lazy" /></a> : <img src={image} alt={alt} loading="lazy" />}<span>{number} / {status}</span></div>
    <div className="systems-project-info"><h3>{title}</h3><p>{description}</p>{href ? <a className="systems-project-cta" href={href} target="_blank" rel="noreferrer">VER SITIO ↗</a> : <span className="systems-project-status">{status}</span>}</div>
  </article>
}

function DemoCard({ title, description, image, href }: { title: string; description: string; image: string; href: string }) {
  return <a className="systems-demo-card" href={href} target="_blank" rel="noreferrer">
    <span className="systems-demo-image"><img src={image} alt={`Demo de ${title}`} loading="lazy" /></span>
    <span className="systems-demo-info"><strong>{title}</strong><span>{description}</span><b>VER DEMO ↗</b></span>
  </a>
}

function DJPortfolioLegacy({ onBack }: { onBack: () => void }) {
  const tracks = [
    { number: '01', title: 'Se Preparo - Ozuna X Salgo Pa la Calle - Daddy Yankee', src: '/areas/dj-track-01.mp3', cover: '/areas/dj-cover-01.webp', dancer: '/areas/dj-dancer-one.webp', dancerStill: '/areas/dj-dancer-one-still.webp' },
    { number: '02', title: 'World Hold On X Stereo Love', src: '/areas/dj-track-02.mp3', cover: '/areas/dj-cover-02.webp', dancer: '/areas/dj-dancer-two.webp', dancerStill: '/areas/dj-dancer-two-still.webp' },
  ]
  return <main className="dj-page">
    <header className="archive-header"><button className="area-back" onClick={onBack}>← VOLVER</button><Logo /><span className="header-side header-side-right">02 / DJ · PRODUCCIÓN</span></header>
    <section className="dj-content" aria-labelledby="dj-title">
      <div className="dj-heading">
        <p className="dj-kicker"><span>02</span> MÚSICA / EN VIVO</p>
        <h1 id="dj-title">Ritmo propio<span>.</span></h1>
        <p className="dj-intro">Me gusta mezclar canciones, probar cruces y jugar con la energía de cada tema. Voy a ir publicando mis mashups acá.</p>
      </div>
      <div className="dj-feature">
        <figure className="dj-portrait">
          <img src="/areas/dj-portrait.webp" alt="Joaquín Calderón mezclando música en una cabina de DJ" />
          <figcaption><span>JOAQUÍN CALDERÓN</span><span>EN CABINA / 01</span></figcaption>
        </figure>
        <section className="dj-releases" aria-label="Temas originales">
          <div className="dj-release-heading"><h2>Mis mashups</h2><span>02 / EN ROTACIÓN</span></div>
          <div className="dj-track-list">
            {tracks.map((track) => <DJTrack key={track.number} {...track} />)}
          </div>
          <p className="dj-coming-soon">PRÓXIMAMENTE, MÁS MASHUPS <span>✳</span></p>
        </section>
      </div>
    </section>
    <footer className="archive-footer"><span>© JOAQUÍN CALDERÓN</span><button onClick={onBack}>VOLVER AL INICIO ↑</button><span>ENTRE RÍOS</span></footer>
  </main>
}

function DJTrack({ number, title, src, cover, dancer, dancerStill }: { number: string; title: string; src: string; cover: string; dancer: string; dancerStill: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioError, setAudioError] = useState(false)

  useEffect(() => {
    const pauseOtherTrack = (event: Event) => {
      const playingTrack = (event as CustomEvent<string>).detail
      if (playingTrack !== number) audioRef.current?.pause()
    }
    window.addEventListener('dj-track-play', pauseOtherTrack)
    return () => window.removeEventListener('dj-track-play', pauseOtherTrack)
  }, [number])

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play().catch(() => setAudioError(true))
    else audio.pause()
  }
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

  return <article className="dj-track">
    <audio ref={audioRef} src={src} preload="metadata" onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => { window.dispatchEvent(new CustomEvent('dj-track-play', { detail: number })); setPlaying(true); setAudioError(false) }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setCurrentTime(0) }} onError={() => setAudioError(true)} />
    <div className="dj-track-art" aria-hidden="true">
      <img className="dj-cover" src={cover} alt="" />
      <span className="dj-art-index">MASHUP / {number}</span>
    </div>
    <div className="dj-track-body">
      <div className="dj-track-meta"><span>{number}</span><span>JOAQUÍN CALDERÓN · MASHUP</span></div>
      <h3>{title}</h3>
      <div className={`dj-dancer-stage${playing ? ' is-playing' : ''}`} aria-hidden="true"><img src={playing ? dancer : dancerStill} alt="" /></div>
      <div className="dj-player">
        <button type="button" className="dj-play-button" onClick={togglePlayback} aria-label={`${playing ? 'Pausar' : 'Reproducir'} ${title}`}>{playing ? 'Ⅱ' : '▶'}</button>
        <input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value) }} aria-label={`Posición de reproducción de ${title}`} />
        <span className="dj-player-time">{formatTime(currentTime)} <i>/</i> {formatTime(duration)}</span>
      </div>
      {audioError && <p className="dj-audio-error" role="status">No se pudo cargar el tema. Intentá reproducirlo otra vez.</p>}
    </div>
  </article>
}

function DJPortfolio({ onBack }: { onBack: () => void }) {
  const tracks = [
    { number: '01', title: 'Se Preparo - Ozuna X Salgo Pa la Calle - Daddy Yankee', src: '/areas/dj-track-01.mp3', cover: '/areas/dj-cover-01.webp' },
    { number: '02', title: 'World Hold On X Stereo Love', src: '/areas/dj-track-02.mp3', cover: '/areas/dj-cover-02.webp' },
    { number: '03', title: 'Its That Time X Im Not Alone', src: '/areas/dj-track-03.mp3', cover: '/areas/dj-cover-03.webp' },
    { number: '04', title: 'More X La Pregunta', src: '/areas/dj-track-04.mp3', cover: '/areas/dj-cover-04.webp' },
  ]
  const audioRef = useRef<HTMLAudioElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioError, setAudioError] = useState(false)
  const activeTrack = tracks[activeIndex]
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.load()
  }, [activeTrack.src])
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play().catch(() => setAudioError(true))
    else audio.pause()
  }
  const selectTrack = (index: number) => {
    if (index === activeIndex) return
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    setActiveIndex(index)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setAudioError(false)
  }
  const stepTrack = (direction: -1 | 1) => selectTrack((activeIndex + direction + tracks.length) % tracks.length)

  return <main className="dj-page dj-player-page">
    <header className="archive-header"><button className="area-back" onClick={onBack}>← VOLVER</button><span className="header-side header-side-right">02 / DJ · PRODUCCIÓN</span></header>
    <section className="dj-content dj-player-content" aria-labelledby="dj-title">
      <audio ref={audioRef} src={activeTrack.src} preload="auto" onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => { setPlaying(true); setAudioError(false) }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setCurrentTime(0) }} onError={() => setAudioError(true)} />
      <div className="dj-heading dj-player-heading">
        <p className="dj-kicker"><span>02</span> MÚSICA / EN VIVO</p>
        <h1 id="dj-title"><img src="/logo/calderon_logo.svg" alt="Calderón" /><span>Mashups</span></h1>
      </div>
      <div className="dj-carousel" aria-label="Elegí un mashup">
        <div className="dj-disc-stack">
          {tracks.map((track, index) => {
            const relativeIndex = (index - activeIndex + tracks.length) % tracks.length
            const selected = index === activeIndex
            const position = selected ? 'active' : relativeIndex === 1 ? 'next' : relativeIndex === tracks.length - 1 ? 'previous' : 'hidden'
            const isAdjacent = selected || position !== 'hidden'
            return <button type="button" key={track.number} data-track={track.number} className={`dj-release-card is-${position}${selected ? ' is-selected' : ''}`} onClick={() => selectTrack(index)} aria-label={`${selected ? 'Seleccionado' : 'Seleccionar'}: ${track.title}`} aria-pressed={selected} aria-hidden={!isAdjacent} tabIndex={isAdjacent ? 0 : -1}>
              <span className="dj-release-card-art"><img src={track.cover} alt="" /><span className="dj-card-grain" /></span>
              <span className="dj-release-card-label"><span>MASHUP / {track.number}</span><strong>{track.title}</strong></span>
            </button>
          })}
        </div>
      </div>
      <section className="dj-bottom-player" aria-label={`Reproductor: ${activeTrack.title}`}>
        <div className="dj-player-controls">
          <div className="dj-player-buttons"><button type="button" onClick={() => stepTrack(-1)} aria-label="Mashup anterior">‹</button><button type="button" className="dj-play-button" onClick={togglePlayback} aria-label={playing ? 'Pausar mashup' : 'Reproducir mashup'}><svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M7 5h4v14H7zM15 5h4v14h-4z" /> : <path d="M7 4.8c0-.7.8-1.1 1.4-.7l11 7.2c.6.4.6 1.3 0 1.7l-11 7.2c-.6.4-1.4 0-1.4-.7V4.8Z" />}</svg></button><button type="button" onClick={() => stepTrack(1)} aria-label="Siguiente mashup">›</button></div>
          <div className="dj-player-timeline"><span>{formatTime(currentTime)}</span><input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value) }} aria-label="Posición de reproducción" /><span>{formatTime(duration)}</span></div>
        </div>
      </section>
      {audioError && <p className="dj-player-error" role="status">No se pudo cargar el mashup. Intentá reproducirlo otra vez.</p>}
    </section>
    <footer className="dj-page-footer"><span>CALDERÓN / MASHUPS</span></footer>
  </main>
}

function Home({ albums, onOpenAlbum, onBack }: { albums: Album[]; onOpenAlbum: (album: Album) => void; onBack: () => void }) {
  return <main className="archive-home">
    <header className="archive-header"><button className="area-back" onClick={onBack}>← VOLVER</button><Logo /><span className="header-side header-side-right">2026 / ARCHIVO</span></header>
    <section className="album-index" aria-labelledby="archive-title">
      <div className="index-intro"><p id="archive-title">COLECCIÓN DE ÁLBUMES</p><span>DESPLAZATE PARA EXPLORAR</span></div>
      <div className="album-wall">{albums.map((album, index) => <AlbumCard key={album.id} album={album} index={index} onOpen={() => onOpenAlbum(album)} />)}</div>
    </section>
    <footer className="archive-footer"><span>© JOAQUÍN CALDERÓN</span><div><a href={site.instagramUrl} target="_blank" rel="noreferrer">INSTAGRAM</a></div><span>ENTRE RÍOS</span></footer>
  </main>
}

function AlbumCard({ album, index, onOpen }: { album: Album; index: number; onOpen: () => void }) {
  const cover = albumCover(album)
  return <button className={`album-card album-card-${index + 1}`} data-album-id={album.id} onClick={onOpen} aria-label={`Abrir álbum ${album.title}`}>
    <span className="album-card-image" style={{ aspectRatio: `${cover.width} / ${cover.height}` }}><img src={cover.medium} srcSet={`${cover.medium} 960w, ${cover.large} 1600w`} sizes="(max-width: 760px) 94vw, 46vw" alt={`Portada del álbum ${album.title}`} loading={index === 0 ? 'eager' : 'lazy'} /></span>
    <span className="album-card-meta"><span>{album.title}</span><span>{album.year}</span></span>
    {driveUrls[album.id] && <a className="album-drive-link" href={driveUrls[album.id]} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>ABRIR EN DRIVE ↗</a>}
  </button>
}

function AlbumOverlay({ album, transition, onClose, onOpenPhoto }: { album: Album; transition: Transition; onClose: () => void; onOpenPhoto: (photos: Photo[], index: number) => void }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const photos = albumPhotos(album)
  return <section className={`album-overlay transition-${transition}${isScrolled ? ' is-scrolled' : ''}`} onScroll={(event) => setIsScrolled(event.currentTarget.scrollTop > 24)} aria-label={`Álbum ${album.title}`}>
    <div className="album-backdrop" />
    <div className="album-overlay-bar"><button onClick={onClose} aria-label="Cerrar álbum">CERRAR ×</button><span>ÁLBUM / {String(photos.length).padStart(2, '0')} FOTOGRAFÍAS</span><span>{album.year}</span></div>
    <div className="album-content">
      <div className="album-heading"><div><p className="micro-label">{album.association === 'confirmed' ? 'ENSAYO FOTOGRÁFICO' : 'ENSAYO FOTOGRÁFICO / SESIÓN'}</p><h1>{album.title}</h1><p className="album-description">{albumDescriptions[album.id]}</p></div><div className="album-heading-meta"><span>{album.year}</span>{driveUrls[album.id] && <a className="album-heading-drive" href={driveUrls[album.id]} target="_blank" rel="noreferrer">ABRIR EN DRIVE ↗</a>}</div></div>
      <div className="album-gallery">{photos.map((photo, index) => <button className={`album-photo album-photo-${index % 6}`} key={photo.id} onClick={() => onOpenPhoto(photos, index)}><img src={photo.large} style={{ aspectRatio: `${photo.width} / ${photo.height}` }} alt={`${album.title}, ${photo.tags.join(', ')}`} decoding="async" loading={index === 0 ? 'eager' : 'lazy'} /><span>VER / {String(index + 1).padStart(2, '0')}</span></button>)}</div>
      <div className="album-end"><span>{album.title}</span><button onClick={onClose}>CERRAR ÁLBUM ↑</button></div>
    </div>
  </section>
}

function PhotoLightboxLegacy({ photo, index, total, onClose, onMove }: { photo: Photo; index: number; total: number; onClose: () => void; onMove: (direction: 1 | -1) => void }) {
  const touchStart = useRef(0)
  return <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Fotografía ampliada" onTouchStart={(event) => { touchStart.current = event.changedTouches[0].clientX }} onTouchEnd={(event) => { const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 45) onMove(delta < 0 ? 1 : -1) }}><div className="lightbox-bar"><span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span><button onClick={onClose}>CLOSE ×</button></div><img src={photo.large} alt={`${photo.category}, ${photo.tags.join(', ')}`} /><div className="lightbox-controls"><button onClick={() => onMove(-1)} aria-label="Fotografía anterior">←</button><span>{photo.tags.join(' / ')}</span><button onClick={() => onMove(1)} aria-label="Fotografía siguiente">→</button></div></div>
}

function IntroSplash() {
  return <div className="intro-splash" aria-hidden="true"><img className="intro-splash-logo" src="/logo/calderon_logo.svg" alt="" /></div>
}

function PhotoLightbox({ photo, index, total, onClose, onMove }: { photo: Photo; index: number; total: number; onClose: () => void; onMove: (direction: 1 | -1) => void }) {
  const touchStart = useRef(0)
  return <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Fotografía ampliada" onTouchStart={(event) => { touchStart.current = event.changedTouches[0].clientX }} onTouchEnd={(event) => { const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 45) onMove(delta < 0 ? 1 : -1) }}><div className="lightbox-bar"><span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span><button onClick={onClose}>CERRAR ×</button></div><img src={photo.large} alt={`${photo.category}, ${photo.tags.join(', ')}`} /><div className="lightbox-controls"><button onClick={() => onMove(-1)} aria-label="Fotografía anterior">←</button><span>{photo.tags.join(' / ')}</span><button onClick={() => onMove(1)} aria-label="Fotografía siguiente">→</button></div></div>
}

export { App }
