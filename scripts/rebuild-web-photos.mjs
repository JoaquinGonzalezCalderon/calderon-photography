// Re-encodes the web versions of every catalogued photo from the camera originals
// at higher quality. Only regenerates files that already exist in public/photos/web.
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceRoots = ['fotos', 'INNOVALAB', 'desafio ciudadania', 'lossantos', 'scentea'].map((dir) => path.join(root, dir))
const outputRoot = path.join(root, 'public', 'photos', 'web')
const sizes = { thumb: [640, 80], medium: [1200, 82], large: [2048, 84] }
const slugify = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : /\.(jpe?g|png|webp)$/i.test(entry.name) ? [full] : []
  }))).flat()
}

let done = 0
for (const sourceRoot of sourceRoots.filter((dir) => existsSync(dir))) {
  for (const file of await walk(sourceRoot)) {
    const relative = path.relative(sourceRoot, file)
    const parts = relative.split(path.sep)
    const folder = slugify(parts.length > 1 ? parts[0] : path.basename(sourceRoot))
    const base = `${folder}-${slugify(path.parse(file).name)}`
    const outDir = path.join(outputRoot, folder)
    if (!existsSync(path.join(outDir, `${base}-large.webp`))) continue
    const image = sharp(file, { failOn: 'none' }).rotate()
    for (const [label, [width, quality]] of Object.entries(sizes)) {
      await image.clone().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5, smartSubsample: true }).toFile(path.join(outDir, `${base}-${label}.webp`))
    }
    done += 1
  }
}
console.log(`Rebuilt ${done} photos.`)
