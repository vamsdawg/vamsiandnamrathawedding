import { Router } from 'express'
import Rsvp from '../models/Rsvp.js'
import Guest from '../models/Family.js' // Using the updated Guest model

const router = Router()

router.get('/', async (req, res) => {
  res.render('rsvp', { title: 'RSVP', values: {} })
})

// Search guests endpoint
router.get('/search-guests', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 2) {
      return res.json([])
    }
    
    const guests = await Guest.find({
      name: { $regex: q, $options: 'i' }
    }).limit(10)
    
    const results = guests.map(guest => ({
      guestId: guest._id,
      name: guest.name,
      rsvpSubmitted: guest.rsvpSubmitted
    }))
    
    res.json(results)
  } catch (err) {
    console.error('Error searching guests:', err)
    res.status(500).json([])
  }
})

router.post('/', async (req, res) => {
  try {
    const { guestId, adultsAttending, attendingWedding, attendingReception, usingHotelBlock, message } = req.body
    
    if (guestId) {
      // Check if guest exists
      const existingGuest = await Guest.findById(guestId)
      if (!existingGuest) {
        throw new Error('Guest not found')
      }
      
      // Process event selections from dropdowns
      const isAttendingWedding = attendingWedding === 'yes'
      const isAttendingReception = attendingReception === 'yes'
      
      // Update guest RSVP
      const guest = await Guest.findByIdAndUpdate(guestId, {
        adultsAttending: parseInt(adultsAttending) || 0,
        attendingWedding: isAttendingWedding,
        attendingReception: isAttendingReception,
        usingHotelBlock: usingHotelBlock === 'yes',
        message: message || '',
        rsvpSubmitted: true,
        updatedAt: new Date()
      }, { new: true })
      
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
        return res.status(400).render('rsvp', { 
          title: 'RSVP', 
          error: 'An RSVP with this name or email already exists. Please contact us if you need to make changes.', 
          values: req.body 
        })
      }
      
      const doc = await Rsvp.create({ name, email, attending, guests, message })
      res.render('rsvp-success', { title: 'RSVP Received', doc, isUpdate: false })
    }
  } catch (err) {
    console.error('Error saving RSVP', err)
    res.status(400).render('rsvp', { 
      title: 'RSVP', 
      error: 'Please check your input and try again.', 
      values: req.body 
    })
  }
})

export default router
