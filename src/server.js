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

// Mongoose connection caching for serverless (Vercel)
let cachedConnection = null

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('✅ Using cached MongoDB connection')
    return cachedConnection
  }

  const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_site'
  
  try {
    cachedConnection = await mongoose.connect(mongo, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    })
    console.log('✅ New MongoDB connection established')
    return cachedConnection
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// GCS Image Configuration Helper
let gcsConfig = null;
try {
  // Try multiple paths for different environments (local dev vs Vercel)
  const configPaths = [
    path.join(__dirname, '../scripts/gcs-config.json'),
    path.join(process.cwd(), 'scripts/gcs-config.json')
  ];
  
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      gcsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`✅ Loaded ${gcsConfig.totalImages} images from Google Cloud Storage (${configPath})`);
      break;
    }
  }
  
  if (!gcsConfig) {
    console.log('⚠️  GCS config not found at any expected path');
  }
} catch (error) {
  console.log('❌ Error loading GCS config:', error.message);
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
    
    // Try partial matches in backgrounds
    const lowerName = imageName.toLowerCase();
    for (const [key, url] of Object.entries(gcsConfig.galleries.backgrounds)) {
      if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
        return url;
      }
    }
  }
  
  // Also search in allImages for additional background images like mandapam
  if (gcsConfig && gcsConfig.allImages) {
    const lowerName = imageName.toLowerCase();
    for (const [path, imageInfo] of Object.entries(gcsConfig.allImages)) {
      const fileName = imageInfo.fileName.toLowerCase();
      if (fileName.includes(lowerName) || lowerName.includes(fileName.replace(/\.[^/.]+$/, ""))) {
        return imageInfo.url;
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

// Ensure DB connection on each request (for Vercel serverless)
app.use(async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (error) {
    console.error('DB connection error:', error)
    res.status(503).json({ error: 'Database connection failed. Please try again.' })
  }
})
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
  const ceremonyBg = getGCSBackground('registry') || 
                    getGCSBackground('registrybackground') || 
                    '/images/gallery/Registry/registrybackground.jpg';
  res.render('ceremony', { title: 'Ceremony', ceremonyBg })
})

app.use('/rsvp', rsvpRouter)
app.use('/', adminRouter)

app.get('/registry', (req, res) => {
  const registryBg = getGCSBackground('registrybackground');
  const bodyClass = registryBg ? 'page-registry-bg' : '';
  res.render('registry', { title: 'Registry', bodyClass, registryBg });
});
// Event Schedule page
app.get('/event-schedule', (req, res) => {
  const eventBg = getGCSBackground('background') || '/images/gallery/Event Schedule/background.png';
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyADSZ9lbX4v-oesOpC_dqk_7aWPQhHUrq0';
  res.render('event-schedule', { title: 'Event Schedule', eventBg, mapsApiKey });
});

// FAQ page with background image from GCS
app.get('/faq', (req, res) => {
  const faqBg = getGCSBackground('faq') || 
               getGCSBackground('faqbackground') ||
               getGCSBackground('faq background');
  const bodyClass = faqBg ? 'page-faq-bg' : '';
  res.render('faq', { title: 'FAQ', bodyClass, faqBg });
});

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' })
})

// Start server after DB connects
async function start () {
  await connectDB()
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
