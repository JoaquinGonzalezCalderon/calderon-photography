import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceRoots = [path.join(root, 'fotos'), path.join(root, 'desafio ciudadania')]
const photosFile = path.join(root, 'src', 'data', 'photos.ts')
const albumsFile = path.join(root, 'src', 'data', 'albums.ts')

const albumNames = {
  scentea: 'Scentea',
  lossantos: 'Los Santos',
  campusparty: 'Campus Party Paraná',
  jornadauader: 'Jornada Recreativa y Deportiva UADER',
  tekomates: 'Teko Mates',
  'desafio ciudadania': 'Desafío Ciudadanía',
}

const albumCovers = {
  campusparty: 'campusparty-dscn4144-vsco',
  jornadauader: 'jornadauader-dscn5111',
  tekomates: 'tekomates-dscn5603',
  'desafio ciudadania': 'desafio-ciudadania-dscn6298',
  scentea: 'scentea-dscn6114',
  lossantos: 'lossantos-dscn6493-01',
}

const albumCategories = {
  campusparty: 'EVENTS',
  jornadauader: 'EVENTS',
  tekomates: 'OTHER',
  'desafio ciudadania': 'EVENTS',
  scentea: 'OTHER',
  lossantos: 'OTHER',
}

const driveUrls = {
  campusparty: 'https://drive.google.com/drive/folders/1V56aB8jfkvvkJLJo8y1XT35Rolyw_rrO?usp=sharing',
  jornadauader: 'https://drive.google.com/drive/folders/1GmKaRL7Q5cAtRlXvuQU0T0QOEIFqBtvq?usp=sharing',
  tekomates: 'https://drive.google.com/drive/folders/14MNtGRw_4O1LFl9O_zwQi51kCwn0UVf1?usp=sharing',
  'desafio ciudadania': 'https://drive.google.com/drive/folders/1EGfYnA4cN1ykFvVD4pE7M4QuptNYBcjp?usp=sharing',
  scentea: 'https://drive.google.com/drive/u/1/folders/1N7iPyQVrwzDpUguv07yhMY49Lp5L2PEl',
  lossantos: 'https://drive.google.com/drive/folders/1Kj2s15P81QRqUbpzC6N9pR2NjkeopuN6?usp=sharing',
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(full))
    else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) files.push(full)
  }
  return files.sort((a, b) => a.localeCompare(b))
}

const slugify = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase()

const quote = (value) => JSON.stringify(value)
const files = []
for (const sourceRoot of sourceRoots) {
  const prefix = path.basename(sourceRoot) === 'fotos' ? '' : path.basename(sourceRoot)
  for (const file of await walk(sourceRoot)) files.push({ file, sourceRoot, prefix })
}
const seen = new Set()
const records = []

for (const entry of files) {
  const { file, sourceRoot, prefix } = entry
  const relative = path.join(prefix, path.relative(sourceRoot, file))
  const [folder] = relative.split(path.sep)
  const parsed = path.parse(relative)
  const hash = crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')
  if (seen.has(hash)) continue
  seen.add(hash)

  const metadata = await sharp(file, { failOn: 'none' }).rotate().metadata()
  const width = metadata.width ?? 2000
  const height = metadata.height ?? 1333
  const id = `${slugify(folder)}-${slugify(parsed.name)}`
  const folderPath = slugify(folder).replaceAll('\\', '/')
  const filename = `${parsed.name}`
  const category = albumCategories[folder] ?? 'OTHER'

  records.push({ folder, id, filename, width, height, category, folderPath })
}

const photoLines = records.map(({ id, folderPath, filename, category, width, height }) => {
  const orientation = width >= height ? 'landscape' : 'portrait'
  const tags = category === 'EVENTS' ? "['evento', 'documental']" : "['documental', 'personas']"
  return `  photo(${quote(id)}, ${quote(folderPath)}, ${quote(category)}, ${tags}, ${quote(orientation)}, ${width}, ${height}),`
}).join('\n')

const albumOrder = ['campusparty', 'jornadauader', 'tekomates', 'desafio ciudadania', 'scentea', 'lossantos']
const albumFolders = [...new Set(records.map((record) => record.folder))].sort((a, b) => albumOrder.indexOf(a) - albumOrder.indexOf(b))
const driveLines = albumFolders.map((folder) => `  ${quote(slugify(folder))}: ${quote(driveUrls[folder] ?? '')},`).join('\\n')
const albumLines = albumFolders.map((folder) => {
  const albumRecords = records.filter((record) => record.folder === folder)
  const photoIds = albumRecords.map((record) => record.id)
  return `  { id: ${quote(slugify(folder))}, title: ${quote(albumNames[folder] ?? folder)}, year: '2026', coverPhoto: ${quote(albumCovers[folder] ?? photoIds[0])}, photoIds: ${JSON.stringify(photoIds)}, association: 'unconfirmed' },`
}).join('\n')

await fs.writeFile(photosFile, `export type Category = 'SPORTS' | 'EVENTS' | 'OTHER'\nexport type Orientation = 'portrait' | 'landscape'\n\nexport interface Photo {\n  id: string\n  src: string\n  medium: string\n  large: string\n  title: string\n  category: Category\n  tags: string[]\n  year: string\n  orientation: Orientation\n  featured: boolean\n  width: number\n  height: number\n}\n\nconst photo = (id: string, folder: string, category: Category, tags: string[], orientation: Orientation, width: number, height: number, featured = true): Photo => ({\n  id,\n  src: \`/photos/web/\${folder}/\${id}-thumb.webp\`,\n  medium: \`/photos/web/\${folder}/\${id}-medium.webp\`,\n  large: \`/photos/web/\${folder}/\${id}-large.webp\`,\n  title: category === 'EVENTS' ? 'Registro de evento' : 'Observación',\n  category,\n  tags,\n  year: '2026',\n  orientation,\n  featured,\n  width,\n  height,\n})\n\nexport const photos: Photo[] = [\n${photoLines}\n]\n\nexport const featuredPhotos = photos.filter((item) => item.featured)\n`, 'utf8')

await fs.writeFile(albumsFile, `import { photos, type Photo } from './photos'\n\nexport interface Album {\n  id: string\n  title: string\n  year: string\n  place?: string\n  coverPhoto: string\n  photoIds: string[]\n  association: 'confirmed' | 'unconfirmed'\n}\n\nexport const albums: Album[] = [\n${albumLines}\n]\n\nexport const albumPhotos = (album: Album): Photo[] => album.photoIds.map((id) => photos.find((photo) => photo.id === id)).filter((photo): photo is Photo => Boolean(photo))\nexport const albumCover = (album: Album): Photo => photos.find((photo) => photo.id === album.coverPhoto) ?? albumPhotos(album)[0]\n`, 'utf8')

console.log(`Generated ${records.length} unique photos across ${albumFolders.length} albums.`)
