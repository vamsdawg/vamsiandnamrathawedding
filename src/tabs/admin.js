import { Router } from 'express'
import Guest from '../models/Family.js'
import Rsvp from '../models/Rsvp.js'

const router = Router()

// Simple password protection
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wedding2025admin'

// Admin login page
router.get('/admin', (req, res) => {
  res.render('admin-login', { title: 'Admin Login', error: null })
})

// Admin login handler
router.post('/admin', (req, res) => {
  const { password } = req.body
  
  if (password === ADMIN_PASSWORD) {
    // Set session or cookie
    req.session.isAdmin = true
    res.redirect('/admin/dashboard')
  } else {
    res.render('admin-login', { 
      title: 'Admin Login', 
      error: 'Incorrect password. Please try again.' 
    })
  }
})

// Admin dashboard (protected)
router.get('/admin/dashboard', async (req, res) => {
  // Check if user is authenticated
  if (!req.session.isAdmin) {
    return res.redirect('/admin')
  }
  
  try {
    // Get all guest RSVPs
    const guestRsvps = await Guest.find({ rsvpSubmitted: true }).sort({ name: 1 })
    
    // Get all fallback RSVPs
    const fallbackRsvps = await Rsvp.find({}).sort({ name: 1 })
    
    // Calculate statistics
    const totalAttending = guestRsvps.reduce((sum, guest) => sum + (guest.adultsAttending || 0), 0)
    const weddingAttendees = guestRsvps.filter(guest => guest.attendingWedding).length
    const receptionAttendees = guestRsvps.filter(guest => guest.attendingReception).length
    const hotelBlockUsers = guestRsvps.filter(guest => guest.usingHotelBlock).length
    
    res.render('admin-dashboard', { 
      guestRsvps, 
      fallbackRsvps,
      totalAttending,
      weddingAttendees,
      receptionAttendees,
      hotelBlockUsers,
      title: 'RSVP Admin Dashboard'
    })
  } catch (error) {
    console.error('Error fetching RSVPs:', error)
    res.status(500).send('Error loading admin dashboard')
  }
})

// Edit Guest RSVP (GET)
router.get('/admin/edit/:id', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect('/admin')
  }
  try {
    const guest = await Guest.findById(req.params.id)
    if (!guest) return res.status(404).send('Guest not found')
    res.render('admin-edit', { guest, title: 'Edit RSVP Entry' })
  } catch (error) {
    res.status(500).send('Error loading edit form')
  }
})

// Edit Guest RSVP (POST)
router.post('/admin/edit/:id', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect('/admin')
  }
  try {
    const update = {
      name: req.body.name,
      adultsAttending: req.body.adultsAttending,
      attendingWedding: req.body.attendingWedding === 'true',
      attendingReception: req.body.attendingReception === 'true',
      usingHotelBlock: req.body.usingHotelBlock === 'true',
      message: req.body.message
    }
    await Guest.findByIdAndUpdate(req.params.id, update)
    res.redirect('/admin/dashboard')
  } catch (error) {
    res.status(500).send('Error updating RSVP entry')
  }
})

// Delete Guest RSVP (POST)
router.post('/admin/delete/:id', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.redirect('/admin')
  }
  try {
    await Guest.findByIdAndDelete(req.params.id)
    res.redirect('/admin/dashboard')
  } catch (error) {
    res.status(500).send('Error deleting RSVP entry')
  }
})

// Admin logout
router.post('/admin/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/admin')
})

export default router
