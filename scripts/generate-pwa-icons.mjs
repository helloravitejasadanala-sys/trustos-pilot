import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

async function makeIcon(size, out) {
  const r = Math.round(size * 0.22)
  const fontSize = Math.round(size * 0.42)
  const pad = Math.round(size * 0.14)
  const inner = Math.round(size * 0.72)
  const innerR = Math.round(size * 0.12)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0D1B17"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${innerR}" fill="#1E6E68"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" fill="#C7E85A">T</text>
</svg>`
  await sharp(Buffer.from(svg)).png().toFile(out)
  console.log('wrote', out, size)
}

const pub = path.join(process.cwd(), 'public')
fs.mkdirSync(pub, { recursive: true })
await makeIcon(192, path.join(pub, 'icon-192.png'))
await makeIcon(512, path.join(pub, 'icon-512.png'))
await makeIcon(180, path.join(pub, 'apple-touch-icon.png'))
