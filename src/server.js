// ...existing code...
// ...existing code...
// ...existing code...
// Move this route after 'const app = express()' initialization below
import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import session from 'express-session'
import morgan from 'morgan'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'node:url'

import rsvpRouter from './tabs/rsvp.js'
import adminRouter from './tabs/admin.js'

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

// Session middleware for admin authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'wedding-admin-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))

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
  const nischitharthamDir = path.join(__dirname, '../public/images/gallery/Nischithartham Pics');
  let images = [];
  let galleryBg = null;
  try {
    const files = await fs.promises.readdir(nischitharthamDir);
    images = files
      .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .filter(f => !/^gallery-bg\./i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(name => `/images/gallery/Nischithartham Pics/${name}`);
    // Find gallery-bg image in the same folder
    const bgFile = files.find(f => /^gallery-bg\.(jpe?g|png|gif|webp|avif)$/i.test(f));
    if (bgFile) {
      galleryBg = `/images/gallery/Nischithartham Pics/${bgFile}`;
    }
  } catch (e) {
    // directory may be empty or missing; ignore
  }
  if (!galleryBg && images.length) {
    galleryBg = images[0];
  }
  res.render('gallery', { title: 'Nischithartham Gallery', images, bodyClass: 'page-gallery-bg', galleryBg });
});

app.get('/proposal-gallery', async (req, res) => {
  const proposalDir = path.join(__dirname, '../public/images/gallery/Proposal Pics');
  let images = [];
  let galleryBg = null;
  try {
    const files = await fs.promises.readdir(proposalDir);
    console.log('Proposal Pics files:', files);
    images = files
      .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .filter(f => !/^proposal-bg\./i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(name => `/images/gallery/Proposal Pics/${name}`);
    console.log('Proposal Pics images:', images);
    // Find proposal-bg image in the same folder
    const bgFile = files.find(f => /^proposal-bg\.(jpe?g|png|gif|webp|avif)$/i.test(f));
    if (bgFile) {
      galleryBg = `/images/gallery/Proposal Pics/${bgFile}`;
    }
    console.log('Proposal Pics galleryBg:', galleryBg);
  } catch (e) {
    console.error('Error reading Proposal Pics:', e);
  }
  if (!galleryBg && images.length) galleryBg = images[0];

  res.render('proposal-gallery', { title: 'Proposal Gallery', images, bodyClass: 'page-proposal-bg', galleryBg });
});

app.get('/ceremony', (req, res) => {
  res.render('ceremony', { title: 'Ceremony' })
})

app.use('/rsvp', rsvpRouter)
app.use('/', adminRouter)

app.get('/registry', (req, res) => {
  // Look for a background image in gallery/Registry with supported naming patterns
  (async () => {
    const regDir = path.join(__dirname, '../public/images/gallery/Registry')
    let registryBg = null
    try {
      const files = await fs.promises.readdir(regDir)
      const bgFile = files.find(f => /^(registry[- _]?bg|registry[- _]?background|registrybackground|registry[- _]?bg[- _]?image)\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      if (bgFile) registryBg = `/images/gallery/Registry/${bgFile}`
    } catch (e) {
      // ignore if folder empty
    }
    const bodyClass = registryBg ? 'page-registry-bg' : ''
    res.render('registry', { title: 'Registry', bodyClass, registryBg })
  })()
})
// Event Schedule page
app.get('/event-schedule', (req, res) => {
  res.render('event-schedule', { title: 'Event Schedule' });
});

// FAQ page with optional background image (drop an image named faq-bg.* into /public/images/gallery/FAQ)
app.get('/faq', async (req, res) => {
  const faqDir = path.join(__dirname, '../public/images/gallery/FAQ')
  let faqBg = null
  try {
    const files = await fs.promises.readdir(faqDir)
    // Accept several naming patterns: faq-bg.*, faq background.*, faqbackground.*, faq-bg-image.*
    const bgFile = files.find(f => /^(faq[- _]?bg|faq[- _]?background|faqbackground|faq[- _]?bg[- _]?image)\.(jpe?g|png|gif|webp|avif)$/i.test(f))
    if (bgFile) {
      faqBg = `/images/gallery/FAQ/${bgFile}`
    }
  } catch (e) {
    // directory may be empty; ignore
  }
  const bodyClass = faqBg ? 'page-faq-bg' : ''
  res.render('faq', { title: 'FAQ', bodyClass, faqBg })
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

// Guard against multiple (duplicate) starts when nodemon spawns or file is imported twice
if (globalThis.__weddingServerStarted) {
  console.log('Server already started – skipping duplicate start() call')
} else {
  globalThis.__weddingServerStarted = true
  start().catch(err => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
}
