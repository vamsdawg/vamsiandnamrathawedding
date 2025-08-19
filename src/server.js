import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import morgan from 'morgan'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'node:url'

import rsvpRouter from './tabs/rsvp.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// View engine
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'ejs')

// Middleware
app.use(morgan('dev'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

// Expose names/date to all views
app.use((req, res, next) => {
  res.locals.COUPLE_NAMES = process.env.COUPLE_NAMES || 'Your Names'
  res.locals.WEDDING_DATE = process.env.WEDDING_DATE || 'Your Date'
  next()
})

// Routes
app.get('/', (req, res) => {
  res.render('home', { title: 'Home' })
})

app.get('/our-story', (req, res) => {
  res.render('our-story', { title: 'Our Story' })
})

app.get('/gallery', async (req, res) => {
  const galleryDir = path.join(__dirname, '../public/images/gallery')
  const imagesDir = path.join(__dirname, '../public/images')
  let images = []
  let galleryBg = null
  try {
    const files = await fs.promises.readdir(galleryDir)
    images = files
      .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .filter(f => !/^gallery-bg\./i.test(f))
      .map(name => `/images/gallery/${name}`)
  } catch (e) {
    // directory may be empty or missing; ignore
  }
  // Try to find a gallery background in images/ first, then images/gallery/
  const candidates = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif']
  for (const ext of candidates) {
    const p = path.join(imagesDir, `gallery-bg.${ext}`)
    try { await fs.promises.access(p); galleryBg = `/images/gallery-bg.${ext}`; break } catch {}
  }
  if (!galleryBg) {
    for (const ext of candidates) {
      const p = path.join(galleryDir, `gallery-bg.${ext}`)
      try { await fs.promises.access(p); galleryBg = `/images/gallery/gallery-bg.${ext}`; break } catch {}
    }
  }
  if (!galleryBg && images.length) {
    galleryBg = images[0]
  }
  res.render('gallery', { title: 'Nischithartham Gallery', images, bodyClass: 'page-gallery-bg', galleryBg })
})

app.get('/proposal-gallery', async (req, res) => {
  const proposalDir = path.join(__dirname, '../public/images/proposal')
  const imagesDir = path.join(__dirname, '../public/images')
  let images = []
  let galleryBg = null
  try {
    const files = await fs.promises.readdir(proposalDir)
    images = files
      .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .filter(f => !/^proposal-bg\./i.test(f))
      .map(name => `/images/proposal/${name}`)
  } catch (e) {
    // directory may be empty or missing; ignore
  }
  const candidates = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif']
  // Look for proposal background in /images first
  for (const ext of candidates) {
    const p = path.join(imagesDir, `proposal-bg.${ext}`)
    try { await fs.promises.access(p); galleryBg = `/images/proposal-bg.${ext}`; break } catch {}
  }
  // Or inside /images/proposal
  if (!galleryBg) {
    for (const ext of candidates) {
      const p = path.join(proposalDir, `proposal-bg.${ext}`)
      try { await fs.promises.access(p); galleryBg = `/images/proposal/proposal-bg.${ext}`; break } catch {}
    }
  }
  if (!galleryBg && images.length) galleryBg = images[0]

  res.render('proposal-gallery', { title: 'Proposal Gallery', images, bodyClass: 'page-proposal-bg', galleryBg })
})

app.get('/ceremony', (req, res) => {
  res.render('ceremony', { title: 'Ceremony' })
})

app.use('/rsvp', rsvpRouter)

app.get('/registry', (req, res) => {
  res.render('registry', { title: 'Registry' })
})

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' })
})

// Start server after DB connects
async function start () {
  const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_site'
  await mongoose.connect(mongo)
  const port = process.env.PORT || 3000
  app.listen(port, () => console.log(`Wedding site on http://localhost:${port}`))
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
