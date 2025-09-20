import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import session from 'express-session'
import morgan from 'morgan'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'node:url'

import rsvpRouter from '../src/tabs/rsvp.js'
import adminRouter from '../src/tabs/admin.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// GCS Image Configuration Helper
let gcsConfig = null;
try {
  const configPath = path.join(__dirname, '../scripts/gcs-config.json');
  if (fs.existsSync(configPath)) {
    gcsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`✅ Loaded ${gcsConfig.totalImages} images from Google Cloud Storage`);
  }
} catch (error) {
  console.log('ℹ️  GCS config not found, using local images');
}

// Helper functions for image URLs
function getGCSImages(galleryType) {
  if (gcsConfig && gcsConfig.galleries[galleryType]) {
    return gcsConfig.galleries[galleryType].map(img => img.url);
  }
  return null;
}

function getGCSBackground(imageName) {
  if (gcsConfig && gcsConfig.galleries.backgrounds) {
    const exact = gcsConfig.galleries.backgrounds[imageName];
    if (exact) return exact;
    
    // Try partial matches
    const lowerName = imageName.toLowerCase();
    for (const [key, url] of Object.entries(gcsConfig.galleries.backgrounds)) {
      if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
        return url;
      }
    }
  }
  return null;
}

function getGCSLogo() {
  return gcsConfig?.galleries?.logo || '/images/gallery/Wedding%20Logo.png';
}

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
  res.locals.logoUrl = getGCSLogo()
  next()
})

// Routes
app.get('/', (req, res) => {
  const heroImage = getGCSBackground('hero') || '/images/hero.jpg';
  res.render('home', { title: 'Home', heroImage })
})

app.get('/our-story', (req, res) => {
  res.render('our-story', { title: 'Our Story' })
})

app.get('/gallery', async (req, res) => {
  let images = [];
  let galleryBg = null;

  // Try to get images from GCS first
  const gcsImages = getGCSImages('nischithartham');
  if (gcsImages && gcsImages.length > 0) {
    images = gcsImages;
    galleryBg = images[0]; // Use first image as background
    console.log(`✅ Using ${images.length} images from Google Cloud Storage`);
  } else {
    // Fallback to local filesystem for development
    const nischitharthamDir = path.join(__dirname, '../public/images/gallery/Nischithartham Pics');
    try {
      const files = await fs.promises.readdir(nischitharthamDir);
      images = files
        .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
        .filter(f => !/^gallery-bg\./i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(name => `/images/gallery/Nischithartham Pics/${name}`);
      
      const bgFile = files.find(f => /^gallery-bg\.(jpe?g|png|gif|webp|avif)$/i.test(f));
      if (bgFile) {
        galleryBg = `/images/gallery/Nischithartham Pics/${bgFile}`;
      }
      console.log(`ℹ️  Using ${images.length} local images (GCS not configured)`);
    } catch (e) {
      console.log('Local gallery directory not found');
    }
    
    if (!galleryBg && images.length) {
      galleryBg = images[0];
    }
  }
  
  res.render('gallery', { title: 'Nischithartham Gallery', images, bodyClass: 'page-gallery-bg', galleryBg });
});

app.get('/proposal-gallery', async (req, res) => {
  let images = [];
  let galleryBg = null;

  // Try to get images from GCS first
  const gcsImages = getGCSImages('proposal');
  if (gcsImages && gcsImages.length > 0) {
    images = gcsImages;
    galleryBg = images[0]; // Use first image as background
    console.log(`✅ Using ${images.length} proposal images from Google Cloud Storage`);
  } else {
    // Fallback to local filesystem for development
    const proposalDir = path.join(__dirname, '../public/images/gallery/Proposal Pics');
    try {
      const files = await fs.promises.readdir(proposalDir);
      console.log('Proposal Pics files:', files);
      images = files
        .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
        .filter(f => !/^proposal-bg\./i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(name => `/images/gallery/Proposal Pics/${name}`);
      console.log('Proposal Pics images:', images);
      
      const bgFile = files.find(f => /^proposal-bg\.(jpe?g|png|gif|webp|avif)$/i.test(f));
      if (bgFile) {
        galleryBg = `/images/gallery/Proposal Pics/${bgFile}`;
      }
      console.log('Proposal Pics galleryBg:', galleryBg);
      console.log(`ℹ️  Using ${images.length} local proposal images (GCS not configured)`);
    } catch (e) {
      console.error('Error reading Proposal Pics:', e);
    }
    
    if (!galleryBg && images.length) galleryBg = images[0];
  }

  res.render('proposal-gallery', { title: 'Proposal Gallery', images, bodyClass: 'page-proposal-bg', galleryBg });
});

app.get('/ceremony', (req, res) => {
  const ceremonyBg = getGCSBackground('mandapam') || 
                    getGCSBackground('ceremony') || 
                    '/images/gallery/Ceremony/mandapam.jpg';
  res.render('ceremony', { title: 'Ceremony', ceremonyBg })
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

// Connect to database for serverless
const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_site'
mongoose.connect(mongo).catch(err => {
  console.error('Database connection failed:', err)
})

// Export the Express app as a Vercel serverless function
export default app;
