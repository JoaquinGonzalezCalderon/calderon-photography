import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { albumCover, albumPhotos, albums, driveUrls, type Album } from './data/albums'
import type { Photo } from './data/photos'
import { site } from './config/site'
import { albumDescriptions } from './config/album-descriptions'

type Transition = 'opening' | 'open' | 'closing'

function App() {
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null)
  const [activeArea, setActiveArea] = useState<'home' | 'systems' | 'dj' | 'photography'>('home')
  const [albumOrder] = useState(() => [...albums].sort(() => Math.random() - 0.5))
  const [transition, setTransition] = useState<Transition>('opening')
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const scrollPosition = useRef(0)

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
      const id = window.location.pathname.split('/').filter(Boolean).pop()
      const album = id ? albums.find((item) => item.id === id) : undefined
      if (album && !activeAlbum) openAlbum(album)
      if (!id && activeAlbum) closeAlbum(false)
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
    setActiveAlbum(album)
    setTransition('opening')
    window.history.pushState({}, '', `/album/${album.id}`)
  }

  useEffect(() => {
    const id = window.location.pathname.split('/').filter(Boolean).pop()
    const album = id ? albums.find((item) => item.id === id) : undefined
    if (album) openAlbum(album)
  }, [])

  const closeAlbum = (updateUrl = true) => {
    if (!activeAlbum) return
    if (updateUrl) window.history.pushState({}, '', '/')
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
    {activeArea === 'home' ? <HomeHub onOpenArea={setActiveArea} /> : activeArea === 'photography' ? <Home albums={albumOrder} onOpenAlbum={openAlbum} onBack={() => setActiveArea('home')} /> : <AreaPlaceholder area={activeArea} onBack={() => setActiveArea('home')} />}
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
  const moveCardWithPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    const pressure = Math.max(0.18, 1 - Math.hypot(x, y) * 0.9)
    event.currentTarget.style.setProperty('--pointer-x', `${(x * 12).toFixed(1)}px`)
    event.currentTarget.style.setProperty('--pointer-y', `${(y * 12).toFixed(1)}px`)
    event.currentTarget.style.setProperty('--tilt-x', `${(x * -7).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--tilt-y', `${(y * 7).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--sink', `${(pressure * 9).toFixed(1)}px`)
    event.currentTarget.style.setProperty('--card-scale', `${(1 - pressure * 0.022).toFixed(4)}`)
  }
  const resetCardPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.style.setProperty('--pointer-x', '0px')
    event.currentTarget.style.setProperty('--pointer-y', '0px')
    event.currentTarget.style.setProperty('--tilt-x', '0deg')
    event.currentTarget.style.setProperty('--tilt-y', '0deg')
    event.currentTarget.style.setProperty('--sink', '0px')
    event.currentTarget.style.setProperty('--card-scale', '1')
  }
  return <main className={`home-hub${openingArea ? ' is-leaving-up' : ''}`}>
    <header className="archive-header"><span className="header-side">JOAQUÍN CALDERÓN</span><Logo /><span className="header-side header-side-right">PORTFOLIO / 2026</span></header>
    <section className="area-selector" aria-labelledby="area-selector-title">
      <div className="board-edition"><span>J. CALDERÓN / PERFIL 01</span><span>ENTRE RÍOS · ARGENTINA</span></div>
      <div className="board-tags" aria-hidden="true"><span>SISTEMAS</span><span>DJ</span><span>FOTOGRAFÍA</span></div>
      <figure className="home-portrait"><img src="/areas/portrait-cutout.png" alt="Retrato en blanco y negro de Joaquín Calderón, recortado sobre fondo transparente" /></figure>
      <div className="area-selector-content"><div className="area-selector-intro"><p className="micro-label">HOLA, SOY...</p><h1 id="area-selector-title">Joaquín<br />Calderón</h1></div>
        <div className="area-grid">{areas.map((area) => <button className={`area-card ${area.className}${openingArea === area.id ? ' is-opening' : ''}`} key={area.id} onPointerMove={moveCardWithPointer} onPointerLeave={resetCardPointer} onClick={() => enterArea(area.id)} disabled={Boolean(openingArea)}><span className="area-number">{area.number}</span><span className="area-card-copy"><span className="area-note">{area.note}</span><span className="area-title">{area.title}</span><span className="area-arrow" aria-hidden="true">↗</span></span><img className="area-card-thumbnail" src={area.image} alt="" loading="eager" /></button>)}</div>
      </div>
    </section>
    <footer className="archive-footer"><span>© JOAQUÍN CALDERÓN</span><div><a href={site.instagramUrl} target="_blank" rel="noreferrer">INSTAGRAM</a></div><span>ENTRE RÍOS</span></footer>
  </main>
}

function AreaPlaceholder({ area, onBack }: { area: 'systems' | 'dj'; onBack: () => void }) {
  const isDj = area === 'dj'
  return <main className={`area-placeholder ${isDj ? 'area-placeholder-dj' : 'area-placeholder-systems'}`}>
    <header className="archive-header"><button className="area-back" onClick={onBack}>← VOLVER</button><Logo /><span className="header-side header-side-right">{isDj ? 'MÚSICA / EN VIVO' : 'TECNOLOGÍA / SOLUCIONES'}</span></header>
    <section className="placeholder-content"><p className="micro-label">{isDj ? '02 / DJ' : '01 / ANALISTA EN SISTEMAS'}</p><h1>{isDj ? 'DJ' : <>Analista en<br />Sistemas.</>}</h1><p>Esta parte está empezando a tomar forma.</p><span className="placeholder-index">{isDj ? 'MÚSICA · SETS · EVENTOS' : 'SISTEMAS · PROYECTOS · IDEAS'}</span></section>
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
