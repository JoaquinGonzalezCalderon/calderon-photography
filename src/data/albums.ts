import { photos, type Photo } from './photos'

export interface Album {
  id: string
  title: string
  year: string
  place?: string
  coverPhoto: string
  photoIds: string[]
  association: 'confirmed' | 'unconfirmed'
}

export const albums: Album[] = [
  { id: 'parana', title: 'Viaje a Paraná', year: '2026', coverPhoto: 'camera-01', photoIds: ['camera-01', 'other-01'], association: 'unconfirmed' },
  { id: 'tecomate', title: 'Tecomate', year: '2026', coverPhoto: 'camera-03', photoIds: ['camera-03', 'camera-02'], association: 'unconfirmed' },
  { id: 'jornada-recreativa-deportiva', title: 'Jornada Recreativa y Deportiva', year: '2026', coverPhoto: 'football-02', photoIds: ['football-02', 'football-01', 'football-03', 'basketball-01', 'basketball-02', 'volleyball-01', 'volleyball-02', 'padel-01', 'padel-02', 'events-01'], association: 'confirmed' },
]

export const albumPhotos = (album: Album): Photo[] => album.photoIds.map((id) => photos.find((photo) => photo.id === id)).filter((photo): photo is Photo => Boolean(photo))
export const albumCover = (album: Album): Photo => photos.find((photo) => photo.id === album.coverPhoto) ?? albumPhotos(album)[0]
