import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceRoots = [path.join(root, 'fotos')]
const outputRoot = path.join(root, 'public', 'photos', 'web')
const sizes = { thumb: 640, medium: 1200, large: 2048 }

const slugify = (value) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase()

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(full))
    else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) files.push(full)
  }
  return files
}

await fs.mkdir(outputRoot, { recursive: true })
const files = []
for (const sourceRoot of sourceRoots) files.push(...await walk(sourceRoot).then((items) => items.map((file) => ({ file, sourceRoot }))))
for (const entry of files) {
  const { file, sourceRoot } = entry
  const relative = path.relative(sourceRoot, file)
  const parsed = path.parse(relative)
  const folder = parsed.dir.split(path.sep)[0] ?? ''
  const outputFolder = slugify(folder)
  const outputDir = path.join(outputRoot, outputFolder)
  await fs.mkdir(outputDir, { recursive: true })
  const outputBase = [outputFolder, parsed.name].filter(Boolean).map(slugify).join('-')
  const image = sharp(file, { failOn: 'none' }).rotate()
  const metadata = await image.metadata()
  for (const [label, width] of Object.entries(sizes)) {
    const target = path.join(outputDir, `${outputBase}-${label}.webp`)
    const resizeWidth = Math.min(width, metadata.width ?? width)
    await image.clone().resize({ width: resizeWidth, withoutEnlargement: true }).webp({ quality: 84, effort: 5 }).toFile(target)
  }
}
console.log(`Optimized ${files.length} source photos.`)
