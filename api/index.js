import express from 'express'
import session from 'express-session'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

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
app.get('/faq', (req, res) => res.render('faq', { 
  title: 'FAQ',
  faqBg: 'images/gallery/FAQ/faqbackground-optimized.webp'
}))
app.get('/registry', (req, res) => res.render('registry', { 
  title: 'Registry',
  registryBg: 'images/gallery/Registry/registrybackground-optimized.webp'
}))

// Image lists (hardcoded to avoid file system access in serverless)
const nischitharthamImages = [
  '/images/gallery/Nischithartham Pics/1.jpg',
  '/images/gallery/Nischithartham Pics/2.jpg',
  '/images/gallery/Nischithartham Pics/3.jpg',
  '/images/gallery/Nischithartham Pics/4.jpg',
  '/images/gallery/Nischithartham Pics/6.jpg',
  '/images/gallery/Nischithartham Pics/9.jpg',
  '/images/gallery/Nischithartham Pics/10.jpg',
  '/images/gallery/Nischithartham Pics/13.jpg',
  '/images/gallery/Nischithartham Pics/19.jpg',
  '/images/gallery/Nischithartham Pics/20.jpg',
  '/images/gallery/Nischithartham Pics/22.jpg',
  '/images/gallery/Nischithartham Pics/23.jpg',
  '/images/gallery/Nischithartham Pics/25.jpg',
  '/images/gallery/Nischithartham Pics/26.jpg',
  '/images/gallery/Nischithartham Pics/28.jpg',
  '/images/gallery/Nischithartham Pics/31.jpg',
  '/images/gallery/Nischithartham Pics/34.jpg',
  '/images/gallery/Nischithartham Pics/35.jpg',
  '/images/gallery/Nischithartham Pics/36.jpg',
  '/images/gallery/Nischithartham Pics/40.jpg',
  '/images/gallery/Nischithartham Pics/43.jpg',
  '/images/gallery/Nischithartham Pics/44.jpg',
  '/images/gallery/Nischithartham Pics/46.jpg',
  '/images/gallery/Nischithartham Pics/49.jpg',
  '/images/gallery/Nischithartham Pics/51.jpg',
  '/images/gallery/Nischithartham Pics/52.jpg',
  '/images/gallery/Nischithartham Pics/53.jpg',
  '/images/gallery/Nischithartham Pics/55.jpg',
  '/images/gallery/Nischithartham Pics/59.jpg',
  '/images/gallery/Nischithartham Pics/60.jpg',
  '/images/gallery/Nischithartham Pics/65.jpg',
  '/images/gallery/Nischithartham Pics/68.jpg',
  '/images/gallery/Nischithartham Pics/70.jpg',
  '/images/gallery/Nischithartham Pics/72.jpg',
  '/images/gallery/Nischithartham Pics/73.jpg',
  '/images/gallery/Nischithartham Pics/75.jpg',
  '/images/gallery/Nischithartham Pics/76.jpg',
  '/images/gallery/Nischithartham Pics/79.jpg',
  '/images/gallery/Nischithartham Pics/81.jpg',
  '/images/gallery/Nischithartham Pics/83.jpg',
  '/images/gallery/Nischithartham Pics/84.jpg',
  '/images/gallery/Nischithartham Pics/85.jpg',
  '/images/gallery/Nischithartham Pics/88.jpg',
  '/images/gallery/Nischithartham Pics/89.jpg',
  '/images/gallery/Nischithartham Pics/90.jpg',
  '/images/gallery/Nischithartham Pics/93.jpg',
  '/images/gallery/Nischithartham Pics/95.jpg',
  '/images/gallery/Nischithartham Pics/96.jpg',
  '/images/gallery/Nischithartham Pics/97.jpg',
  '/images/gallery/Nischithartham Pics/98.jpg',
  '/images/gallery/Nischithartham Pics/99.jpg',
  '/images/gallery/Nischithartham Pics/100.jpg',
  '/images/gallery/Nischithartham Pics/101.jpg',
  '/images/gallery/Nischithartham Pics/102.jpg',
  '/images/gallery/Nischithartham Pics/104.jpg',
  '/images/gallery/Nischithartham Pics/105.jpg',
  '/images/gallery/Nischithartham Pics/111.jpg',
  '/images/gallery/Nischithartham Pics/115.jpg',
  '/images/gallery/Nischithartham Pics/116.jpg',
  '/images/gallery/Nischithartham Pics/118.jpg',
  '/images/gallery/Nischithartham Pics/119.jpg',
  '/images/gallery/Nischithartham Pics/120.jpg',
  '/images/gallery/Nischithartham Pics/122.jpg',
  '/images/gallery/Nischithartham Pics/124.jpg',
  '/images/gallery/Nischithartham Pics/127.jpg',
  '/images/gallery/Nischithartham Pics/129.jpg',
  '/images/gallery/Nischithartham Pics/130.jpg',
  '/images/gallery/Nischithartham Pics/132.jpg',
  '/images/gallery/Nischithartham Pics/134.jpg',
  '/images/gallery/Nischithartham Pics/136.jpg',
  '/images/gallery/Nischithartham Pics/137.jpg',
  '/images/gallery/Nischithartham Pics/138.jpg',
  '/images/gallery/Nischithartham Pics/142.jpg',
  '/images/gallery/Nischithartham Pics/147.jpg',
  '/images/gallery/Nischithartham Pics/150.jpg',
  '/images/gallery/Nischithartham Pics/152.jpg',
  '/images/gallery/Nischithartham Pics/153.jpg',
  '/images/gallery/Nischithartham Pics/155.jpg',
  '/images/gallery/Nischithartham Pics/156.jpg',
  '/images/gallery/Nischithartham Pics/157.jpg',
  '/images/gallery/Nischithartham Pics/158.jpg',
  '/images/gallery/Nischithartham Pics/161.jpg',
  '/images/gallery/Nischithartham Pics/162.jpg',
  '/images/gallery/Nischithartham Pics/163.jpg',
  '/images/gallery/Nischithartham Pics/164.jpg',
  '/images/gallery/Nischithartham Pics/165.jpg',
  '/images/gallery/Nischithartham Pics/166.jpg',
  '/images/gallery/Nischithartham Pics/167.jpg',
  '/images/gallery/Nischithartham Pics/169.jpg',
  '/images/gallery/Nischithartham Pics/170.jpg',
  '/images/gallery/Nischithartham Pics/171.jpg',
  '/images/gallery/Nischithartham Pics/172.jpg',
  '/images/gallery/Nischithartham Pics/173.jpg',
  '/images/gallery/Nischithartham Pics/174.jpg',
  '/images/gallery/Nischithartham Pics/175.jpg',
  '/images/gallery/Nischithartham Pics/178.jpg',
  '/images/gallery/Nischithartham Pics/182.jpg',
  '/images/gallery/Nischithartham Pics/184.jpg',
  '/images/gallery/Nischithartham Pics/185.jpg',
  '/images/gallery/Nischithartham Pics/186.jpg',
  '/images/gallery/Nischithartham Pics/187.jpg',
  '/images/gallery/Nischithartham Pics/188.jpg',
  '/images/gallery/Nischithartham Pics/192.jpg',
  '/images/gallery/Nischithartham Pics/193.jpg',
  '/images/gallery/Nischithartham Pics/194.jpg',
  '/images/gallery/Nischithartham Pics/195.jpg',
  '/images/gallery/Nischithartham Pics/196.jpg',
  '/images/gallery/Nischithartham Pics/198.jpg',
  '/images/gallery/Nischithartham Pics/201.jpg',
  '/images/gallery/Nischithartham Pics/203.jpg',
  '/images/gallery/Nischithartham Pics/204.jpg',
  '/images/gallery/Nischithartham Pics/205.jpg',
  '/images/gallery/Nischithartham Pics/206.jpg',
  '/images/gallery/Nischithartham Pics/207.jpg',
  '/images/gallery/Nischithartham Pics/208.jpg',
  '/images/gallery/Nischithartham Pics/209.jpg',
  '/images/gallery/Nischithartham Pics/210.jpg',
  '/images/gallery/Nischithartham Pics/211.jpg',
  '/images/gallery/Nischithartham Pics/212.jpg',
  '/images/gallery/Nischithartham Pics/213.jpg',
  '/images/gallery/Nischithartham Pics/214.jpg'
]

const proposalImages = [
  '/images/gallery/Proposal Pics/1.jpg',
  '/images/gallery/Proposal Pics/2.jpg',
  '/images/gallery/Proposal Pics/3.jpg',
  '/images/gallery/Proposal Pics/4.jpg',
  '/images/gallery/Proposal Pics/5.jpg',
  '/images/gallery/Proposal Pics/6.jpg',
  '/images/gallery/Proposal Pics/7.jpg',
  '/images/gallery/Proposal Pics/8.jpg',
  '/images/gallery/Proposal Pics/9.jpg',
  '/images/gallery/Proposal Pics/10.jpg',
  '/images/gallery/Proposal Pics/11.jpg',
  '/images/gallery/Proposal Pics/12.jpg',
  '/images/gallery/Proposal Pics/13.jpg',
  '/images/gallery/Proposal Pics/14.jpg',
  '/images/gallery/Proposal Pics/15.jpg',
  '/images/gallery/Proposal Pics/16.jpg',
  '/images/gallery/Proposal Pics/17.jpg',
  '/images/gallery/Proposal Pics/18.jpg',
  '/images/gallery/Proposal Pics/19.jpg',
  '/images/gallery/Proposal Pics/20.jpg',
  '/images/gallery/Proposal Pics/21.jpg',
  '/images/gallery/Proposal Pics/22.jpg',
  '/images/gallery/Proposal Pics/23.jpg',
  '/images/gallery/Proposal Pics/24.jpg',
  '/images/gallery/Proposal Pics/25.jpg',
  '/images/gallery/Proposal Pics/26.jpg',
  '/images/gallery/Proposal Pics/27.jpg',
  '/images/gallery/Proposal Pics/28.jpg',
  '/images/gallery/Proposal Pics/29.jpg',
  '/images/gallery/Proposal Pics/30.jpg',
  '/images/gallery/Proposal Pics/31.jpg',
  '/images/gallery/Proposal Pics/32.jpg',
  '/images/gallery/Proposal Pics/33.jpg',
  '/images/gallery/Proposal Pics/34.jpg',
  '/images/gallery/Proposal Pics/35.jpg',
  '/images/gallery/Proposal Pics/36.jpg',
  '/images/gallery/Proposal Pics/37.jpg',
  '/images/gallery/Proposal Pics/38.jpg',
  '/images/gallery/Proposal Pics/39.jpg',
  '/images/gallery/Proposal Pics/40.jpg',
  '/images/gallery/Proposal Pics/41.jpg',
  '/images/gallery/Proposal Pics/42.jpg',
  '/images/gallery/Proposal Pics/43.jpg',
  '/images/gallery/Proposal Pics/44.jpg',
  '/images/gallery/Proposal Pics/45.jpg',
  '/images/gallery/Proposal Pics/46.jpg',
  '/images/gallery/Proposal Pics/47.jpg'
]

// Gallery routes without file system access
app.get('/gallery', (req, res) => {
  res.render('gallery', { 
    title: 'Nischithartham Gallery', 
    images: nischitharthamImages, 
    bodyClass: 'page-gallery-bg', 
    galleryBg: nischitharthamImages[0] || null 
  })
})

app.get('/proposal-gallery', (req, res) => {
  res.render('proposal-gallery', { 
    title: 'Proposal Gallery', 
    images: proposalImages, 
    bodyClass: 'page-proposal-bg', 
    galleryBg: proposalImages[0] || null 
  })
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
