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

  const navigateArea = (area: PortfolioArea) => {
    setActiveArea(area)
    const path = pathForArea(area)
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
  }

  const goHome = () => {
    setActiveArea('home')
    if (window.location.pathname !== '/') window.history.replaceState({}, '', '/')
  }

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
    {activeArea === 'home' ? <HomeHub onOpenArea={navigateArea} /> : activeArea === 'systems' ? <SystemsPortfolio onBack={goHome} /> : activeArea === 'photography' ? <Home albums={albumOrder} onOpenAlbum={openAlbum} onBack={goHome} /> : <AreaPlaceholder onBack={goHome} />}
    {activeAlbum && <AlbumOverlay album={activeAlbum} transition={transition} onClose={closeAlbum} onOpenPhoto={(photos, index) => setLightbox({ photos, index })} />}
    {lightbox && <PhotoLightbox photo={lightbox.photos[lightbox.index]} index={lightbox.index} total={lightbox.photos.length} onClose={() => setLightbox(null)} onMove={moveLightbox} />}
  </>
}

function Logo() { return <a className="archive-logo" href="/" aria-label="Calderón, inicio"><img src="/logo/calderon_logo.svg" alt="Calderón" /></a> }

function HomeHub({ onOpenArea }: { onOpenArea: (area: 'systems' | 'dj' | 'photography') => void }) {
  const [openingArea, setOpeningArea] = useState<'systems' | 'dj' | 'photography' | null>(null)
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
    <section className="area-selector" aria-label="Áreas del portfolio">
      <div className="board-topline">
        <div className="board-brand"><img className="board-logo" src="/logo/calderon_logo.svg" alt="Calderón" /><div className="board-edition"><span>PORTAFOLIO PERSONAL · 2026</span><span>ENTRE RÍOS · ARGENTINA</span></div></div>
      </div>
      <figure className="home-portrait"><img src="/areas/portrait-cutout.webp" alt="Retrato en blanco y negro de Joaquín Calderón" /><figcaption><span>JOAQUÍN CALDERÓN</span><span>AUTORRETRATO / 01</span></figcaption></figure>
      <aside className="home-about"><h1>SOBRE MÍ</h1><p>Joaquín González Calderón. 23 años.<br />Analista en Sistemas. DJ. Intento de fotógrafo.<br />¡Te invito a ver mis trabajos!</p></aside>
      <nav className="board-areas" aria-label="Elegí un área del portafolio">{areas.map((area) => <button className={`area-card ${area.className}${openingArea === area.id ? ' is-opening' : ''}`} key={area.id} onClick={() => enterArea(area.id)} onPointerMove={moveCardWeight} onPointerLeave={releaseCardWeight} disabled={Boolean(openingArea)}><img className="area-image" src={area.image} alt="" aria-hidden="true" /><span className="area-card-meta"><span>{area.number}</span><span className="area-note">{area.note}</span></span><span className="area-title">{area.title}</span><span className="area-arrow" aria-hidden="true">↗</span></button>)}</nav>
    </section>
    <footer className="archive-footer"><span>© JOAQUÍN CALDERÓN</span><div><a href={site.instagramUrl} target="_blank" rel="noreferrer">INSTAGRAM</a></div><span>ENTRE RÍOS</span></footer>
  </main>
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
        <div className="systems-section-heading"><div><p>PORTFOLIO / SELECCIÓN</p><h2 id="systems-projects-title">Proyectos</h2></div><span>01 — 04</span></div>
        <FeaturedStreak />
        <div className="systems-project-grid">
          <ProjectCard number="02" title="Mate Único" description="E-commerce full-stack con restricciones en base de datos y lógica avanzada de validación de stock." image="/areas/jgc-mate.webp" alt="Vista de la tienda online Mate Único" href="https://mate-unico-deployed.vercel.app/" status="SITIO EN VIVO" />
          <ProjectCard number="03" title="Inmobiliaria Andrea Duré" description="Sitio inmobiliario profesional y responsivo para el mercado local de Colón, Entre Ríos." image="/areas/jgc-inmobiliaria.webp" alt="Vista de la web inmobiliaria de Andrea Duré" href="https://andreadure.com/" status="SITIO EN VIVO" />
          <ProjectCard number="04" title="Barbería Los Santos" description="Plataforma web para presentar servicios, catálogo de cortes y reserva de turnos online." image="/areas/jgc-barberia.webp" alt="Vista del proyecto web Barbería Los Santos" status="EN DESARROLLO ACTIVO" />
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
    { src: '/areas/tustreak-home.webp', title: 'Inicio', alt: 'Inicio de TuStreak con racha diaria, hábito y botón de registro' },
    { src: '/areas/tustreak-progress.webp', title: 'Progreso', alt: 'Progreso de nivel, racha, consistencia e historial de TuStreak' },
    { src: '/areas/tustreak-gym.webp', title: 'Gym', alt: 'Objetivo semanal, rutina y estadísticas de entrenamiento en TuStreak' },
    { src: '/areas/tustreak-profile.webp', title: 'Perfil', alt: 'Perfil de TuStreak con avatar, hábito y opciones de personalización' },
  ]
  return <article className="systems-featured-project">
    <div className="systems-featured-copy">
      <p className="systems-featured-kicker"><span>01</span> PRODUCTO DIGITAL / APP WEB</p>
      <div className="systems-featured-title"><h3>TuStreak</h3><span>EN VIVO</span></div>
      <p className="systems-featured-description">TuStreak convierte la constancia en algo visible. Registrá tus hábitos con un toque, seguí tu racha diaria y mirá cómo avanzás con experiencia, niveles e historial. También reúne objetivos semanales, rutinas y estadísticas de gimnasio, con un perfil personalizable y tu propio avatar.</p>
      <ul className="systems-featured-details">
        <li>Rachas y hábitos diarios</li><li>Progreso, niveles e historial</li><li>Objetivos y rutinas de gym</li><li>Perfil y avatar personalizables</li>
      </ul>
      <a className="systems-featured-cta" href="https://tustreak.vercel.app/app" target="_blank" rel="noreferrer">ABRIR TUESTREAK <span aria-hidden="true">↗</span></a>
    </div>
    <div className="systems-streak-gallery" aria-label="Capturas de TuStreak">
      {screens.map((screen, index) => <figure className="systems-streak-shot" key={screen.title}>
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

function AreaPlaceholder({ onBack }: { onBack: () => void }) {
  return <main className="area-placeholder area-placeholder-dj">
    <header className="archive-header"><button className="area-back" onClick={onBack}>← VOLVER</button><Logo /><span className="header-side header-side-right">MÚSICA / EN VIVO</span></header>
    <section className="placeholder-content"><p className="micro-label">02 / DJ</p><h1>DJ</h1><p>Esta parte está empezando a tomar forma.</p><span className="placeholder-index">MÚSICA · SETS · EVENTOS</span></section>
    <footer className="archive-footer"><span>© JOAQUÍN CALDERÓN</span><button onClick={onBack}>VOLVER AL INICIO ↑</button><span>ENTRE RÍOS</span></footer>
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
