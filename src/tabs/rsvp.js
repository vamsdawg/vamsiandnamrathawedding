import { Router } from 'express'
import Rsvp from '../models/Rsvp.js'

const router = Router()

router.get('/', async (req, res) => {
  res.render('rsvp', { title: 'RSVP', values: {} })
})

router.post('/', async (req, res) => {
  try {
    const { name, email, attending, guests, message } = req.body
  const doc = await Rsvp.create({ name, email, attending, guests, message })
  res.render('rsvp-success', { title: 'RSVP Received', doc })
  } catch (err) {
    console.error('Error saving RSVP', err)
  res.status(400).render('rsvp', { title: 'RSVP', error: 'Please check your input and try again.', values: req.body })
  }
})

export default router
