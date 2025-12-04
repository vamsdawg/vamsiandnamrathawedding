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
import { sendBulkEmail, sendTestEmail } from '../src/utils/emailService.js'
import Guest from '../src/models/Family.js'

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

// ========== EMAIL ROUTES FOR ADMIN ==========
// Admin email interface
app.get('/admin/emails', (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect('/admin/login')
  }
  res.render('admin-emails', { title: 'Email Guests' })
})

// Get email statistics for recipient filtering
app.get('/admin/email-stats', async (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const filter = req.query.filter || 'all'
    
    // Count total guests
    const totalGuests = await Guest.countDocuments({})
    
    // Count guests with email
    const guestsWithEmail = await Guest.countDocuments({ 
      email: { $exists: true, $ne: '' } 
    })
    
    // Build query based on filter
    let query = { email: { $exists: true, $ne: '' } }
    
    switch (filter) {
      case 'rsvp-yes':
        query.$or = [
          { attendingWedding: true },
          { attendingReception: true }
        ]
        break
      case 'rsvp-no':
        query.attendingWedding = false
        query.attendingReception = false
        query.rsvpSubmitted = true
        break
      case 'not-responded':
        query.rsvpSubmitted = { $ne: true }
        break
      case 'attending-wedding':
        query.attendingWedding = true
        break
      case 'attending-reception':
        query.attendingReception = true
        break
      case 'using-hotel':
        query.usingHotelBlock = true
        break
    }
    
    const selectedCount = await Guest.countDocuments(query)
    
    res.json({
      total: totalGuests,
      withEmail: guestsWithEmail,
      selected: selectedCount
    })
  } catch (error) {
    console.error('Error fetching email stats:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

// Send bulk email
app.post('/admin/send-bulk-email', async (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { subject, message, recipientFilter, isHtml } = req.body
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' })
    }
    
    // Build query based on filter
    let query = { email: { $exists: true, $ne: '' } }
    
    switch (recipientFilter) {
      case 'rsvp-yes':
        query.$or = [
          { attendingWedding: true },
          { attendingReception: true }
        ]
        break
      case 'rsvp-no':
        query.attendingWedding = false
        query.attendingReception = false
        query.rsvpSubmitted = true
        break
      case 'not-responded':
        query.rsvpSubmitted = { $ne: true }
        break
      case 'attending-wedding':
        query.attendingWedding = true
        break
      case 'attending-reception':
        query.attendingReception = true
        break
      case 'using-hotel':
        query.usingHotelBlock = true
        break
    }
    
    // Get recipients
    const guests = await Guest.find(query).select('name email').lean()
    
    if (guests.length === 0) {
      return res.status(400).json({ error: 'No recipients found matching the filter' })
    }
    
    // Format recipients for email service
    const recipients = guests.map(g => ({
      name: g.name,
      email: g.email
    }))
    
    // Send emails
    const result = await sendBulkEmail(recipients, subject, message, isHtml)
    
    res.json(result)
  } catch (error) {
    console.error('Error sending bulk email:', error)
    res.status(500).json({ error: error.message })
  }
})

// Send test email
app.post('/admin/send-test-email', async (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const { email, subject, message, isHtml } = req.body
    
    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'Email, subject, and message are required' })
    }
    
    // Send test email using the bulk email function with one recipient
    const recipients = [{ name: 'Test User', email }]
    const result = await sendBulkEmail(recipients, subject, message, isHtml)
    
    if (result.success && result.summary.sent > 0) {
      res.json({ success: true, messageId: result.results[0].messageId })
    } else {
      res.status(500).json({ success: false, error: result.results[0]?.error || 'Failed to send' })
    }
  } catch (error) {
    console.error('Error sending test email:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

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
  res.render('faq', { title: 'Travel & FAQ', bodyClass, faqBg });
});

// ========== SERVERLESS DATABASE CONNECTION CACHING ==========
// Cache the MongoDB connection across serverless function invocations
let cachedConnection = null;
let lastConnectionTime = null;
let isConnecting = false; // Prevent concurrent connection attempts

// Configure mongoose for serverless environment
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false); // Disable command buffering - fail fast instead of queuing
mongoose.set('bufferTimeoutMS', 5000); // Short buffer timeout to fail quickly

async function connectToDatabase() {
  const now = Date.now();
  const CONNECTION_MAX_AGE = 10 * 60 * 1000; // 10 minutes - keep connections alive longer for reliability
  
  // Check if we have a valid cached connection
  const readyState = mongoose.connection.readyState;
  const isConnectionValid = cachedConnection && 
                           readyState === 1 && // 1 = connected
                           lastConnectionTime &&
                           (now - lastConnectionTime) < CONNECTION_MAX_AGE;
  
  if (isConnectionValid) {
    console.log('✅ Using cached MongoDB connection (age: ' + Math.round((now - lastConnectionTime) / 1000) + 's, state: ' + readyState + ')');
    return cachedConnection;
  }

  // If another request is already connecting, wait for it
  if (isConnecting) {
    console.log('⏳ Waiting for existing connection attempt...');
    let attempts = 0;
    while (isConnecting && attempts < 50) { // Wait up to 5 seconds
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Connection established by concurrent request');
      return cachedConnection;
    }
  }

  isConnecting = true;
  
  try {
    // Close existing connection if it's not in a good state
    if (readyState !== 0 && readyState !== 1) {
      console.log('🔄 Closing unhealthy MongoDB connection (state: ' + readyState + ')...');
      try {
        await mongoose.connection.close(false); // Don't force, allow cleanup
      } catch (err) {
        console.error('Error closing stale connection:', err);
        // Force close if graceful close fails
        await mongoose.connection.close(true);
      }
    }

    console.log('🔄 Establishing new MongoDB connection...');
    
    const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_site';
    
    // Optimized options for serverless/Vercel with better reliability
    const opts = {
      serverSelectionTimeoutMS: 15000, // 15 seconds - give more time for initial connection
      socketTimeoutMS: 45000, // 45 seconds - longer socket timeout
      maxPoolSize: 10, // Increase pool size for better concurrent request handling
      minPoolSize: 1, // Keep minimum 1 connection warm
      maxIdleTimeMS: 600000, // 10 minutes - keep connections alive longer
      connectTimeoutMS: 15000, // 15 seconds
      retryWrites: true,
      retryReads: true, // Also retry reads
      w: 'majority',
      heartbeatFrequencyMS: 10000, // Check every 10 seconds - more frequent health checks
      serverApi: { version: '1', strict: true, deprecationErrors: true }, // Use stable API
    };

    cachedConnection = await mongoose.connect(mongo, opts);
    lastConnectionTime = Date.now();
    console.log('✅ MongoDB connected successfully (state: ' + mongoose.connection.readyState + ')');
    
    return cachedConnection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    cachedConnection = null;
    lastConnectionTime = null;
    throw error;
  } finally {
    isConnecting = false;
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
    
    // Verify connection is actually working before proceeding
    const state = mongoose.connection.readyState;
    if (state !== 1) {
      console.error('❌ Database connection state invalid:', state);
      throw new Error('Database connection not ready (state: ' + state + ')');
    }
    
    next();
  } catch (error) {
    console.error('Database connection middleware error:', error.message);
    
    // Reset connection cache on error
    cachedConnection = null;
    lastConnectionTime = null;
    
    // For RSVP search specifically, return empty array instead of error page
    if (req.path === '/rsvp/search-guests') {
      return res.status(503).json({ 
        error: 'Database temporarily unavailable. Please refresh and try again.',
        results: []
      });
    }
    
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Service Temporarily Unavailable</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>We're experiencing connectivity issues</h1>
        <p>Please refresh the page in a moment.</p>
        <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
          Refresh Page
        </button>
      </body>
      </html>
    `);
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
