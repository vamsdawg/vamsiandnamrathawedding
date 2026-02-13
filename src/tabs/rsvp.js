import { Router } from 'express'
import Rsvp from '../models/Rsvp.js'
import Guest from '../models/Family.js' // Using the updated Guest model
import { sendRsvpConfirmation } from '../utils/emailService.js'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load GCS config for background images
let gcsConfig = null;
try {
  const configPath = path.join(__dirname, '../../scripts/gcs-config.json');
  if (fs.existsSync(configPath)) {
    gcsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.log('ℹ️  GCS config not found in RSVP router');
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
  return null;
}

const router = Router()

router.get('/', async (req, res) => {
  const rsvpBg = getGCSBackground('rsvp background') || '/images/gallery/RSVP Image/RSVP Background.png';
  const rsvpLocked = process.env.RSVP_LOCKED === 'true';
  res.render('rsvp', { title: 'RSVP', values: {}, rsvpBg, rsvpLocked })
})

// Search guests endpoint with retry logic
router.get('/search-guests', async (req, res) => {
  // Check if RSVPs are locked
  const rsvpLocked = process.env.RSVP_LOCKED === 'true';
  if (rsvpLocked) {
    return res.status(403).json({ 
      error: 'RSVPs are now closed.',
      locked: true,
      results: []
    });
  }
  
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const { q } = req.query
      if (!q || q.length < 2) {
        return res.json([])
      }
      
      // Check connection state
      const mongoose = await import('mongoose');
      const connectionState = mongoose.default.connection.readyState;
      
      if (connectionState !== 1) {
        attempt++;
        console.error(`❌ Search attempt ${attempt}/${maxRetries} - Database disconnected (state: ${connectionState})`);
        
        if (attempt >= maxRetries) {
          return res.status(503).json({ 
            error: 'Database connection unavailable. Please refresh the page.',
            results: []
          });
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      console.log(`🔍 Searching for guests matching: "${q}" (attempt ${attempt + 1})`);
      
      // Perform the search with a timeout
      const searchPromise = Guest.find({
        name: { $regex: q, $options: 'i' }
      })
      .select('_id name rsvpSubmitted invitedCount') // Only fetch needed fields
      .limit(10)
      .maxTimeMS(8000) // 8 second query timeout
      .lean(); // Use lean() for better performance
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), 10000)
      );
      
      const guests = await Promise.race([searchPromise, timeoutPromise]);
      
      const results = guests.map(guest => ({
        guestId: guest._id,
        name: guest.name,
        rsvpSubmitted: guest.rsvpSubmitted || false,
        invitedCount: guest.invitedCount || 0
      }))
      
      console.log(`✅ Found ${results.length} guests matching: "${q}"`);
      return res.json(results)
      
    } catch (err) {
      attempt++;
      console.error(`❌ Search error (attempt ${attempt}/${maxRetries}):`, err.message, 'Query:', req.query.q);
      
      // If it's the last attempt, return error
      if (attempt >= maxRetries) {
        return res.status(500).json({ 
          error: 'Search failed after multiple attempts. Please refresh the page.',
          message: err.message,
          results: []
        })
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
})

router.post('/', async (req, res) => {
  // Check if RSVPs are locked (guests cannot submit, but admin can still edit via dashboard)
  const rsvpLocked = process.env.RSVP_LOCKED === 'true';
  if (rsvpLocked) {
    const rsvpBg = getGCSBackground('rsvp background') || '/images/gallery/RSVP Image/RSVP Background.png';
    return res.status(403).render('rsvp', { 
      title: 'RSVP', 
      error: 'RSVPs are now closed. Please contact us if you need to make changes.', 
      values: req.body,
      rsvpBg,
      rsvpLocked: true
    });
  }
  
  try {
    const { guestId, adultsAttending, attendingWedding, attendingReception, usingHotelBlock, message, email } = req.body
    
    if (guestId) {
      // Check if guest exists
      const existingGuest = await Guest.findById(guestId)
      if (!existingGuest) {
        throw new Error('Guest not found')
      }
      
      const invitedGuestCount = existingGuest.invitedCount || 0;
      if (parseInt(adultsAttending) > invitedGuestCount) {
        return res.status(400).render('rsvp', { 
          title: 'RSVP', 
          error: `You can only select up to ${invitedGuestCount} guests.`, 
          values: req.body,
          rsvpBg
        });
      }
      
      // Process event selections from dropdowns
      const isAttendingWedding = attendingWedding === 'yes'
      const isAttendingReception = attendingReception === 'yes'
      
      // Update guest RSVP
      const guest = await Guest.findByIdAndUpdate(guestId, {
        adultsAttending: parseInt(adultsAttending) || 0,
        email: email ? email.trim() : existingGuest.email, // Keep existing email if not provided
        attendingWedding: isAttendingWedding,
        attendingReception: isAttendingReception,
        usingHotelBlock: usingHotelBlock === 'yes',
        message: message || '',
        rsvpSubmitted: true,
        updatedAt: new Date()
      }, { new: true })
      
      // Send confirmation email if email is provided
      if (guest.email) {
        try {
          await sendRsvpConfirmation(guest.email, guest.name, {
            adultsAttending: guest.adultsAttending,
            attendingWedding: guest.attendingWedding,
            attendingReception: guest.attendingReception,
            usingHotelBlock: guest.usingHotelBlock,
            message: guest.message
          })
          console.log(`✅ Confirmation email sent to ${guest.email}`)
        } catch (emailError) {
          // Log the error but don't fail the RSVP
          console.error('⚠️ Failed to send confirmation email:', emailError)
        }
      }
      
      const isUpdate = existingGuest.rsvpSubmitted
      res.render('rsvp-success', { 
        title: isUpdate ? 'RSVP Updated' : 'RSVP Received', 
        guest,
        isUpdate 
      })
    } else {
      // Fallback for guests not in the system
      const { name, email, attending, guests, message } = req.body
      
      // Check if this name/email combo already exists in fallback system
      const existingRsvp = await Rsvp.findOne({ 
        $or: [
          { email: email },
          { name: { $regex: new RegExp(`^${name}$`, 'i') } }
        ]
      })
      
      if (existingRsvp) {
        const rsvpBg = getGCSBackground('rsvp background') || '/images/gallery/RSVP Image/RSVP Background.png';
        return res.status(400).render('rsvp', { 
          title: 'RSVP', 
          error: 'An RSVP with this name or email already exists. Please contact us if you need to make changes.', 
          values: req.body,
          rsvpBg
        })
      }
      
      const doc = await Rsvp.create({ name, email, attending, guests, message })
      res.render('rsvp-success', { title: 'RSVP Received', doc, isUpdate: false })
    }
  } catch (err) {
    console.error('Error saving RSVP', err)
    const rsvpBg = getGCSBackground('rsvp background') || '/images/gallery/RSVP Image/RSVP Background.png';
    res.status(400).render('rsvp', { 
      title: 'RSVP', 
      error: 'Please check your input and try again.', 
      values: req.body,
      rsvpBg
    })
  }
})

export default router
