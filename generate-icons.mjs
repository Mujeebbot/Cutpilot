/**
 * generate-icons.mjs
 * Generates production-ready favicon and app icon assets from public/favicon.svg:
 * - public/favicon-16.png (16x16)
 * - public/favicon-32.png (32x32)
 * - public/apple-touch-icon.png (180x180)
 * - public/favicon.ico (multi-resolution 16x16 & 32x32 ICO)
 */

import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const svgBuffer = readFileSync(path.join(__dirname, 'public', 'favicon.svg'))

function buildIco(pngBuffers) {
  // ICO header: 6 bytes
  const count = pngBuffers.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // image type (1 = icon)
  header.writeUInt16LE(count, 4) // number of images

  let offset = 6 + count * 16
  const dirEntries = []
  const dataBuffers = []

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(width === 256 ? 0 : width, 0)
    entry.writeUInt8(height === 256 ? 0 : height, 1)
    entry.writeUInt8(0, 2) // color palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(buffer.length, 8) // size of image data
    entry.writeUInt32LE(offset, 12) // offset from start of file

    dirEntries.push(entry)
    dataBuffers.push(buffer)
    offset += buffer.length
  }

  return Buffer.concat([header, ...dirEntries, ...dataBuffers])
}

async function main() {
  console.log('Rendering CutPilot icon assets from favicon.svg...')

  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer()
  writeFileSync(path.join(__dirname, 'public', 'favicon-16.png'), png16)
  console.log('✓ public/favicon-16.png (16x16)')

  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer()
  writeFileSync(path.join(__dirname, 'public', 'favicon-32.png'), png32)
  console.log('✓ public/favicon-32.png (32x32)')

  const png180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer()
  writeFileSync(path.join(__dirname, 'public', 'apple-touch-icon.png'), png180)
  console.log('✓ public/apple-touch-icon.png (180x180)')

  const icoBuffer = buildIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
  ])
  writeFileSync(path.join(__dirname, 'public', 'favicon.ico'), icoBuffer)
  console.log('✓ public/favicon.ico (16x16 & 32x32 multi-resolution)')

  console.log('All branding assets generated successfully!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
