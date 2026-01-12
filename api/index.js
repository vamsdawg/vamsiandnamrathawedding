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

// ========== MONGOOSE CONFIGURATION FOR SERVERLESS ==========
// Configure mongoose for serverless environment - MUST be before any connection attempts
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false); // Fail fast instead of queuing commands
mongoose.set('bufferTimeoutMS', 3000); // Very short buffer timeout
// ========== END MONGOOSE CONFIGURATION ==========

// ========== MONGOOSE CONFIGURATION FOR SERVERLESS ==========
// Configure mongoose for serverless environment - MUST be before any connection attempts
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false); // Fail fast instead of queuing commands
mongoose.set('bufferTimeoutMS', 3000); // Very short buffer timeout

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

// ========== SERVERLESS DATABASE CONNECTION SETUP ==========
// **CRITICAL: This must come BEFORE route registration!**

let cachedConnection = null;
let lastConnectionTime = null;
let connectionPromise = null; // For handling concurrent connection attempts

async function connectToDatabase() {
  // If already connecting, wait for that attempt to complete
  if (connectionPromise) {
    console.log('⏳ Connection attempt already in progress, waiting...');
    return connectionPromise;
  }

  const now = Date.now();
  const CONNECTION_MAX_AGE = 5 * 60 * 1000; // 5 minutes - refresh more frequently
  const readyState = mongoose.connection.readyState;
  
  // Check if we have a valid cached connection
  const isConnectionValid = cachedConnection && 
                           readyState === 1 && // 1 = connected
                           lastConnectionTime &&
                           (now - lastConnectionTime) < CONNECTION_MAX_AGE;
  
  if (isConnectionValid) {
    console.log(`✅ Using cached MongoDB connection (age: ${Math.round((now - lastConnectionTime) / 1000)}s)`);
    return cachedConnection;
  }

  // Create new connection attempt
  connectionPromise = (async () => {
    try {
      // Close existing connection if it's not healthy
      if (readyState !== 0 && readyState !== 1) {
        console.log(`🔄 Closing unhealthy MongoDB connection (state: ${readyState})...`);
        try {
          await Promise.race([
            mongoose.connection.close(false),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Close timeout')), 5000))
          ]);
        } catch (err) {
          console.error('Error closing stale connection, forcing close:', err.message);
          await mongoose.connection.close(true);
        }
      }

      console.log('🔄 Establishing new MongoDB connection...');
      
      const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_site';
      
      // Aggressive connection options optimized for Vercel serverless
      const opts = {
        serverSelectionTimeoutMS: 10000, // 10 seconds - reduced for faster failure
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2, // Keep more connections warm
        maxIdleTimeMS: 300000, // 5 minutes
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 5000, // More frequent heartbeats (5s)
      };

      // Add retry logic for connection
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔌 Connection attempt ${attempt}/3...`);
          cachedConnection = await Promise.race([
            mongoose.connect(mongo, opts),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout after 12s')), 12000)
            )
          ]);
          
          lastConnectionTime = Date.now();
          console.log(`✅ MongoDB connected successfully on attempt ${attempt}`);
          return cachedConnection;
        } catch (err) {
          lastError = err;
          console.error(`❌ Connection attempt ${attempt}/3 failed:`, err.message);
          
          if (attempt < 3) {
            const delay = attempt * 500; // Backoff: 500ms, 1000ms
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error('❌ All MongoDB connection attempts failed:', error.message);
      cachedConnection = null;
      lastConnectionTime = null;
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

// Handle connection lifecycle events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  cachedConnection = null;
  lastConnectionTime = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
  cachedConnection = null;
  lastConnectionTime = null;
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected event');
  lastConnectionTime = Date.now();
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected event');
  lastConnectionTime = Date.now();
});

// Pre-warm the connection on module load (don't await - fire and forget)
console.log('🚀 Pre-warming database connection...');
connectToDatabase().catch(err => {
  console.error('⚠️  Initial connection pre-warm failed (will retry on first request):', err.message);
});

// ========== DATABASE CONNECTION MIDDLEWARE ==========
// **CRITICAL: This runs BEFORE all routes that need database access**
app.use(async (req, res, next) => {
  // Skip database check for static routes that don't need DB
  const staticPaths = ['/css', '/js', '/images', '/our-story', '/ceremony', '/registry', '/event-schedule', '/faq', '/gallery', '/proposal-gallery'];
  const isStaticRoute = staticPaths.some(path => req.path.startsWith(path)) || req.path === '/';
  
  if (isStaticRoute && req.path !== '/') {
    return next();
  }
  
  try {
    await connectToDatabase();
    
    // Double-check connection state
    const state = mongoose.connection.readyState;
    if (state !== 1) {
      throw new Error(`Database not ready (state: ${state})`);
    }
    
    next();
  } catch (error) {
    console.error(`❌ Database middleware error for ${req.method} ${req.path}:`, error.message);
    
    // Reset connection cache
    cachedConnection = null;
    lastConnectionTime = null;
    
    // Special handling for RSVP search API - return JSON error
    if (req.path === '/rsvp/search-guests') {
      return res.status(503).json({ 
        error: 'Unable to connect to database. Please try again in a moment.',
        results: []
      });
    }
    
    // For other routes, show error page with retry button
    return res.status(503).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Service Temporarily Unavailable</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #d32f2f; margin-bottom: 20px; }
          p { color: #666; line-height: 1.6; margin: 15px 0; }
          button { 
            padding: 12px 24px; 
            font-size: 16px; 
            background: #1976d2; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer;
            margin-top: 20px;
          }
          button:hover { background: #1565c0; }
          .error-code { font-size: 12px; color: #999; margin-top: 30px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ Connection Issue</h1>
          <p>We're having trouble connecting to our servers.</p>
          <p>This is usually temporary. Please try again.</p>
          <button onclick="location.reload()">🔄 Refresh Page</button>
          <p class="error-code">If this persists after multiple attempts, please contact us directly.</p>
        </div>
      </body>
      </html>
    `);
  }
});
// ========== END DATABASE CONNECTION MIDDLEWARE ==========

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

// ========== OLD DATABASE CONNECTION CODE REMOVED ==========
// Database connection is now handled at the top, before routes are registered
// ========== END OLD DATABASE CONNECTION CODE ==========

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' })
})

// Export the Express app as a Vercel serverless function
export default app;
