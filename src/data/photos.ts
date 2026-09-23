export type Category = 'SPORTS' | 'EVENTS' | 'OTHER'
export type Orientation = 'portrait' | 'landscape'

export interface Photo {
  id: string
  src: string
  medium: string
  large: string
  title: string
  category: Category
  tags: string[]
  year: string
  orientation: Orientation
  featured: boolean
  width: number
  height: number
}

const photo = (id: string, folder: string, category: Category, tags: string[], orientation: Orientation, width: number, height: number, featured = true): Photo => ({
  id,
  src: `/photos/web/${folder}/${id}-thumb.webp`,
  medium: `/photos/web/${folder}/${id}-medium.webp`,
  large: `/photos/web/${folder}/${id}-large.webp`,
  title: category === 'SPORTS' ? 'Movimiento y ritmo' : category === 'EVENTS' ? 'Registro de evento' : 'Observación',
  category,
  tags,
  year: '2026',
  orientation,
  featured,
  width,
  height,
})

export const photos: Photo[] = [
  photo('football-01', 'football', 'SPORTS', ['football', 'action'], 'landscape', 2000, 1333),
  photo('basketball-01', 'basketball', 'SPORTS', ['basketball', 'action'], 'landscape', 2000, 1333),
  photo('volleyball-01', 'volleyball', 'SPORTS', ['volleyball', 'action'], 'landscape', 2000, 1333),
  photo('padel-01', 'padel', 'SPORTS', ['padel', 'action'], 'landscape', 2000, 1333),
  photo('football-02', 'football', 'SPORTS', ['football', 'detail'], 'portrait', 1333, 2000),
  photo('basketball-02', 'basketball', 'SPORTS', ['basketball', 'detail'], 'portrait', 1333, 2000),
  photo('volleyball-02', 'volleyball', 'SPORTS', ['volleyball', 'detail'], 'portrait', 1333, 2000),
  photo('padel-02', 'padel', 'SPORTS', ['padel', 'detail'], 'portrait', 1333, 2000),
  photo('football-03', 'football', 'SPORTS', ['football', 'action'], 'landscape', 2000, 1333),
  photo('events-01', 'events', 'EVENTS', ['event', 'group'], 'landscape', 2000, 1333),
  photo('other-01', 'other', 'OTHER', ['documentary', 'people'], 'portrait', 1333, 2000),
  photo('camera-01', 'camera', 'OTHER', ['documentary', 'people'], 'portrait', 1333, 2000),
  photo('camera-02', 'camera', 'OTHER', ['documentary', 'people'], 'landscape', 2000, 1333),
  photo('camera-03', 'camera', 'OTHER', ['documentary', 'people'], 'landscape', 2000, 1333),
]

export const featuredPhotos = photos.filter((item) => item.featured)
