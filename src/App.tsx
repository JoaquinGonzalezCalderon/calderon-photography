import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { albumCover, albumPhotos, albums, type Album } from './data/albums'
import type { Photo } from './data/photos'
import { site } from './config/site'

type Transition = 'opening' | 'open' | 'closing'
type Rect = { top: number; left: number; width: number; height: number }

function App() {
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null)
  const [transition, setTransition] = useState<Transition>('opening')
  const [coverRect, setCoverRect] = useState<Rect | null>(null)
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null)
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const scrollPosition = useRef(0)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setIsReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

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
    const timer = window.setTimeout(() => setTransition('open'), isReducedMotion ? 0 : 620)
    return () => window.clearTimeout(timer)
  }, [activeAlbum, isReducedMotion])

  const openAlbum = (album: Album) => {
    const element = document.querySelector<HTMLElement>(`[data-album-id="${album.id}"]`)
    const rect = element?.getBoundingClientRect()
    setCoverRect(rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null)
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
    }, isReducedMotion ? 0 : 650)
  }

  const moveLightbox = (direction: 1 | -1) => {
    if (!lightbox) return
    const index = (lightbox.index + direction + lightbox.photos.length) % lightbox.photos.length
    setLightbox({ ...lightbox, index })
  }

  return <>
    <Home onOpenAlbum={openAlbum} />
    {activeAlbum && <AlbumOverlay album={activeAlbum} transition={transition} coverRect={coverRect} onClose={closeAlbum} onOpenPhoto={(photos, index) => setLightbox({ photos, index })} />}
    {lightbox && <PhotoLightbox photo={lightbox.photos[lightbox.index]} index={lightbox.index} total={lightbox.photos.length} onClose={() => setLightbox(null)} onMove={moveLightbox} />}
  </>
}

function Logo() { return <a className="archive-logo" href="/" aria-label="Calderón, inicio"><img src="/logo/calderon_logo.svg" alt="Calderón" /></a> }

function Home({ onOpenAlbum }: { onOpenAlbum: (album: Album) => void }) {
  return <main className="archive-home">
    <header className="archive-header"><span className="header-side">PHOTOGRAPHY / ARGENTINA</span><Logo /><span className="header-side header-side-right">2026 / ARCHIVE</span></header>
    <section className="album-index" aria-labelledby="archive-title">
      <div className="index-intro"><p id="archive-title">A COLLECTION OF ALBUMS</p><span>SCROLL TO EXPLORE</span></div>
      <div className="album-wall">{albums.map((album, index) => <AlbumCard key={album.id} album={album} index={index} onOpen={() => onOpenAlbum(album)} />)}</div>
    </section>
    <footer className="archive-footer"><span>© JOAQUÍN CALDERÓN</span><div><a href={site.instagramUrl || '#'} onClick={(event) => { if (!site.instagramUrl) event.preventDefault() }}>INSTAGRAM</a><a href={site.email ? `mailto:${site.email}` : '#'} onClick={(event) => { if (!site.email) event.preventDefault() }}>EMAIL</a></div><span>BUENOS AIRES</span></footer>
  </main>
}

function AlbumCard({ album, index, onOpen }: { album: Album; index: number; onOpen: () => void }) {
  const cover = albumCover(album)
  return <button className={`album-card album-card-${index + 1}`} data-album-id={album.id} onClick={onOpen} aria-label={`Abrir álbum ${album.title}`}>
    <span className="album-card-image" style={{ aspectRatio: `${cover.width} / ${cover.height}` }}><img src={cover.src} alt={`Portada del álbum ${album.title}`} loading={index === 0 ? 'eager' : 'lazy'} /></span>
    <span className="album-card-meta"><span>{album.title}</span><span>{album.year}</span></span>
  </button>
}

function AlbumOverlay({ album, transition, coverRect, onClose, onOpenPhoto }: { album: Album; transition: Transition; coverRect: Rect | null; onClose: () => void; onOpenPhoto: (photos: Photo[], index: number) => void }) {
  const photos = albumPhotos(album)
  const cover = albumCover(album)
  const from = coverRect ?? { top: window.innerHeight * .3, left: window.innerWidth * .25, width: window.innerWidth * .5, height: window.innerHeight * .4 }
  const coverRatio = cover.width / cover.height
  let targetWidth = Math.min(window.innerWidth * .72, 980)
  let targetHeight = targetWidth / coverRatio
  if (targetHeight > window.innerHeight * .7) {
    targetHeight = window.innerHeight * .7
    targetWidth = targetHeight * coverRatio
  }
  const target = { top: (window.innerHeight - targetHeight) / 2, left: (window.innerWidth - targetWidth) / 2, width: targetWidth, height: targetHeight }
  const style = { '--from-top': `${from.top}px`, '--from-left': `${from.left}px`, '--from-width': `${from.width}px`, '--from-height': `${from.height}px`, '--to-top': `${target.top}px`, '--to-left': `${target.left}px`, '--to-width': `${target.width}px`, '--to-height': `${target.height}px` } as CSSProperties
  return <section className={`album-overlay transition-${transition}`} aria-label={`Álbum ${album.title}`}>
    <div className="album-backdrop" />
    <div className="album-overlay-bar"><button onClick={onClose} aria-label="Cerrar álbum">CLOSE ×</button><span>ALBUM / {String(photos.length).padStart(2, '0')} PHOTOGRAPHS</span><span>{album.year}</span></div>
    <div className="album-opening-cover" style={style}><img src={cover.large} alt="" /></div>
    <div className="album-content">
      <div className="album-heading"><div><p className="micro-label">{album.association === 'confirmed' ? 'PHOTO ESSAY' : 'PHOTO ESSAY / SESSION'}</p><h1>{album.title}</h1></div><div className="album-heading-meta"><span>{album.year}</span><button onClick={onClose}>BACK ↑</button></div></div>
      <div className="album-gallery">{photos.map((photo, index) => <button className={`album-photo album-photo-${index % 6}`} key={photo.id} onClick={() => onOpenPhoto(photos, index)}><img src={photo.large} style={{ aspectRatio: `${photo.width} / ${photo.height}` }} alt={`${album.title}, ${photo.tags.join(', ')}`} loading={index < 2 ? 'eager' : 'lazy'} /><span>VIEW / {String(index + 1).padStart(2, '0')}</span></button>)}</div>
      <div className="album-end"><span>{album.title}</span><button onClick={onClose}>CLOSE ALBUM ↑</button></div>
    </div>
  </section>
}

function PhotoLightbox({ photo, index, total, onClose, onMove }: { photo: Photo; index: number; total: number; onClose: () => void; onMove: (direction: 1 | -1) => void }) {
  const touchStart = useRef(0)
  return <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Fotografía ampliada" onTouchStart={(event) => { touchStart.current = event.changedTouches[0].clientX }} onTouchEnd={(event) => { const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 45) onMove(delta < 0 ? 1 : -1) }}><div className="lightbox-bar"><span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span><button onClick={onClose}>CLOSE ×</button></div><img src={photo.large} alt={`${photo.category}, ${photo.tags.join(', ')}`} /><div className="lightbox-controls"><button onClick={() => onMove(-1)} aria-label="Fotografía anterior">←</button><span>{photo.tags.join(' / ')}</span><button onClick={() => onMove(1)} aria-label="Fotografía siguiente">→</button></div></div>
}

export { App }
