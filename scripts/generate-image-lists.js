import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Generate image lists for hardcoding in serverless function
async function generateImageLists() {
  try {
    // Nischithartham gallery
    const nischitharthamDir = path.join(__dirname, '../public/images/gallery/Nischithartham Pics')
    const nischitharthamFiles = await fs.promises.readdir(nischitharthamDir)
    const nischitharthamImages = nischitharthamFiles
      .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .filter(f => !/^nischithartham-bg\./i.test(f))
      .filter(f => !/-optimized\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(name => `'/images/gallery/Nischithartham Pics/${name}'`)

    // Proposal gallery
    const proposalDir = path.join(__dirname, '../public/images/gallery/Proposal Pics')
    let proposalImages = []
    try {
      const proposalFiles = await fs.promises.readdir(proposalDir)
      proposalImages = proposalFiles
        .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
        .filter(f => !/^proposal-bg\./i.test(f))
        .filter(f => !/-optimized\.(jpe?g|png|gif|webp|avif)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(name => `'/images/gallery/Proposal Pics/${name}'`)
    } catch (e) {
      console.log('No proposal pics directory found')
    }

    console.log('// Copy this into your api/index.js file')
    console.log('')
    console.log('// Nischithartham images:')
    console.log('const nischitharthamImages = [')
    console.log('  ' + nischitharthamImages.join(',\n  '))
    console.log(']')
    console.log('')
    console.log('// Proposal images:')
    console.log('const proposalImages = [')
    console.log('  ' + proposalImages.join(',\n  '))
    console.log(']')

  } catch (error) {
    console.error('Error generating image lists:', error)
  }
}

generateImageLists()
