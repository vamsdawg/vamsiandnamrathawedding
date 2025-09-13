import express from 'express'
import session from 'express-session'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

// Import route handlers
import rsvpRouter from '../src/tabs/rsvp.js'
import adminRouter from '../src/tabs/admin.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Basic middleware
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'wedding-admin-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}))

// Global variables
app.use((req, res, next) => {
  res.locals.COUPLE_NAMES = process.env.COUPLE_NAMES || 'Namratha & Vamsi'
  res.locals.WEDDING_DATE = process.env.WEDDING_DATE || 'February 28, 2026'
  next()
})

// MongoDB connection
let isConnected = false
async function connectToDatabase() {
  if (isConnected) return
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    isConnected = true
  } catch (error) {
    console.error('MongoDB connection error:', error)
  }
}

// Simple routes (without heavy file operations)
app.get('/', (req, res) => res.render('home', { title: 'Home' }))
app.get('/our-story', (req, res) => res.render('our-story', { title: 'Our Story' }))
app.get('/ceremony', (req, res) => res.render('ceremony', { title: 'Ceremony' }))
app.get('/event-schedule', (req, res) => res.render('event-schedule', { title: 'Event Schedule' }))
app.get('/faq', (req, res) => res.render('faq', { title: 'FAQ' }))
app.get('/registry', (req, res) => res.render('registry', { title: 'Registry' }))

// Gallery routes with lightweight file operations
app.get('/gallery', async (req, res) => {
  try {
    const nischitharthamDir = path.join(__dirname, '../public/images/gallery/Nischithartham Pics')
    const files = await fs.promises.readdir(nischitharthamDir)
    const images = files
      .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .filter(f => !/^nischithartham-bg\./i.test(f))
      .filter(f => !/-optimized\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(name => `/images/gallery/Nischithartham Pics/${name}`)
    
    res.render('gallery', { 
      title: 'Nischithartham Gallery', 
      images, 
      bodyClass: 'page-gallery-bg', 
      galleryBg: images[0] || null 
    })
  } catch (error) {
    res.render('gallery', { 
      title: 'Nischithartham Gallery', 
      images: [], 
      bodyClass: 'page-gallery-bg', 
      galleryBg: null 
    })
  }
})

app.get('/proposal-gallery', async (req, res) => {
  try {
    const proposalDir = path.join(__dirname, '../public/images/gallery/Proposal Pics')
    const files = await fs.promises.readdir(proposalDir)
    const images = files
      .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .filter(f => !/^proposal-bg\./i.test(f))
      .filter(f => !/-optimized\.(jpe?g|png|gif|webp|avif)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(name => `/images/gallery/Proposal Pics/${name}`)
    
    res.render('proposal-gallery', { 
      title: 'Proposal Gallery', 
      images, 
      bodyClass: 'page-proposal-bg', 
      galleryBg: images[0] || null 
    })
  } catch (error) {
    res.render('proposal-gallery', { 
      title: 'Proposal Gallery', 
      images: [], 
      bodyClass: 'page-proposal-bg', 
      galleryBg: null 
    })
  }
})

// Route handlers
app.use('/rsvp', rsvpRouter)
app.use('/', adminRouter)

// 404
app.use((req, res) => res.status(404).render('404', { title: 'Not Found' }))

// Serverless handler
export default async function handler(req, res) {
  await connectToDatabase()
  return app(req, res)
}
