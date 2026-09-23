import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceRoot = path.join(root, 'photo-source', 'originals')
const outputRoot = path.join(root, 'public', 'photos', 'web')
const sizes = { thumb: 680, medium: 1280, large: 2000 }

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
const files = await walk(sourceRoot)
for (const file of files) {
  const relative = path.relative(sourceRoot, file)
  const parsed = path.parse(relative)
  const outputDir = path.join(outputRoot, parsed.dir)
  await fs.mkdir(outputDir, { recursive: true })
  const image = sharp(file, { failOn: 'none' }).rotate()
  const metadata = await image.metadata()
  for (const [label, width] of Object.entries(sizes)) {
    const target = path.join(outputDir, `${parsed.name}-${label}.webp`)
    const resizeWidth = Math.min(width, metadata.width ?? width)
    await image.clone().resize({ width: resizeWidth, withoutEnlargement: true }).webp({ quality: 88 }).toFile(target)
  }
}
console.log(`Optimized ${files.length} source photos.`)
