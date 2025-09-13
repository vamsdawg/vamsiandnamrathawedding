import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function handler(req, res) {
  try {
    const { gallery } = req.query
    
    let galleryDir
    if (gallery === 'nischithartham') {
      galleryDir = path.join(__dirname, '../public/images/gallery/Nischithartham Pics')
    } else if (gallery === 'proposal') {
      galleryDir = path.join(__dirname, '../public/images/gallery/Proposal Pics')
    } else {
      return res.status(400).json({ error: 'Invalid gallery type' })
    }

    const files = await fs.promises.readdir(galleryDir)
    const images = files
      .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .filter(f => !/-optimized\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .filter(f => !/^(nischithartham|proposal)-bg\./i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(name => `/images/gallery/${gallery === 'nischithartham' ? 'Nischithartham Pics' : 'Proposal Pics'}/${name}`)

    res.json({ images })
  } catch (error) {
    console.error('Error loading gallery:', error)
    res.status(500).json({ error: 'Failed to load gallery images' })
  }
}
