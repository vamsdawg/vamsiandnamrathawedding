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
    
    // First try to get the specific proposal-bg image from backgrounds
    galleryBg = getGCSBackground('proposal-bg') || getGCSBackground('proposalbg');
    
    // If not found in backgrounds, search in the proposal gallery array
    if (!galleryBg && gcsConfig && gcsConfig.galleries && gcsConfig.galleries.proposal) {
      const bgImage = gcsConfig.galleries.proposal.find(img => 
        img.fileName && img.fileName.toLowerCase().includes('proposal-bg')
      );
      if (bgImage) {
        galleryBg = bgImage.url;
      }
    }
    
    // Fall back to first image if still not found
    if (!galleryBg) {
      galleryBg = images[0];
    }
    
    // Filter out the background image from the gallery
    if (galleryBg) {
      images = images.filter(url => url !== galleryBg);
    }
    
    console.log(`✅ Using ${images.length} proposal images from Google Cloud Storage`);
    console.log(`✅ Proposal background: ${galleryBg}`);
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
  const registryBg = getGCSBackground('mandapam') || getGCSBackground('ceremony');
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

// ========== SERVERLESS DATABASE CONNECTION CACHING ==========
// Cache the MongoDB connection across serverless function invocations
let cachedConnection = null;
let lastConnectionTime = null;

// Configure mongoose for serverless environment
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false); // Disable command buffering
mongoose.set('bufferTimeoutMS', 30000); // 30 second timeout

async function connectToDatabase() {
  const now = Date.now();
  const CONNECTION_MAX_AGE = 10 * 60 * 1000; // 10 minutes - refresh connection periodically
  
  // Check if we have a valid cached connection
  const isConnectionValid = cachedConnection && 
                           mongoose.connection.readyState === 1 &&
                           lastConnectionTime &&
                           (now - lastConnectionTime) < CONNECTION_MAX_AGE;
  
  if (isConnectionValid) {
    console.log('✅ Using cached MongoDB connection (age: ' + Math.round((now - lastConnectionTime) / 1000) + 's)');
    return cachedConnection;
  }

  // Close existing connection if it's stale
  if (mongoose.connection.readyState !== 0) {
    console.log('🔄 Closing stale MongoDB connection...');
    try {
      await mongoose.connection.close();
    } catch (err) {
      console.error('Error closing stale connection:', err);
    }
  }

  try {
    console.log('🔄 Establishing new MongoDB connection...');
    
    const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_site';
    
    const opts = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 600000, // 10 minutes - keep connections alive
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
    };

    cachedConnection = await mongoose.connect(mongo, opts);
    lastConnectionTime = Date.now();
    console.log('✅ MongoDB connected successfully');
    
    return cachedConnection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    cachedConnection = null;
    lastConnectionTime = null;
    throw error;
  }
}

// Handle connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  cachedConnection = null;
  lastConnectionTime = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  cachedConnection = null;
  lastConnectionTime = null;
});

// Connection health monitoring
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
  lastConnectionTime = Date.now();
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
  lastConnectionTime = Date.now();
});

// Middleware to ensure database connection before handling requests
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection middleware error:', error);
    res.status(503).json({ 
      error: 'Database temporarily unavailable. Please try again in a moment.',
      message: 'We are experiencing connectivity issues. Your request is safe to retry.'
    });
  }
});

// Connect to database immediately on module load
connectToDatabase().catch(err => {
  console.error('Initial database connection failed:', err);
});
// ========== END SERVERLESS DATABASE CONNECTION CACHING ==========

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' })
})

// Export the Express app as a Vercel serverless function
export default app;
