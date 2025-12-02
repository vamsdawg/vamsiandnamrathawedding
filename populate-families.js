// Script to populate guest data
// Run this once to add your wedding guests to the database

import mongoose from 'mongoose'
import Guest from './src/models/Family.js' // Using updated Guest model
import dotenv from 'dotenv'
import fs from 'fs'
import csv from 'csv-parser'

dotenv.config()

// Function to read guests from CSV file
function readGuestsFromCSV(filePath) {
  return new Promise((resolve, reject) => {
    const guests = []
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Read from "Database Name" and "Guest Count (Invited)" columns
        if (row['Database Name'] && row['Database Name'].trim()) {
          const invitedCount = parseInt(row['Guest Count (Invited)']) || 0
          guests.push({ 
            name: row['Database Name'].trim(),
            invitedCount: invitedCount
          })
        }
      })
      .on('end', () => {
        console.log(`Read ${guests.length} guests from CSV`)
        resolve(guests)
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

async function populateGuests() {
  try {
    const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_site'
    
    console.log('Connecting to MongoDB...')
    await mongoose.connect(mongo, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    })
    console.log('Connected to database')
    
    // Read guests from CSV file
    const csvFilePath = './Guest List - Combined Guest List.csv'
    const guestsFromCSV = await readGuestsFromCSV(csvFilePath)
    
    if (guestsFromCSV.length === 0) {
      console.log('No guests found in CSV file')
      process.exit(1)
    }
    
    // NOTE: We do NOT delete existing guests to preserve submitted RSVPs
    // Only add new guests that don't already exist in the database
    
    let addedCount = 0
    let skippedCount = 0
    let updatedCount = 0
    
    for (const guestData of guestsFromCSV) {
      // Check if guest already exists by name
      const existingGuest = await Guest.findOne({ name: guestData.name })
      
      if (existingGuest) {
        if (existingGuest.rsvpSubmitted) {
          // Guest has submitted RSVP - don't modify anything
          console.log(`⏭️  Skipped ${guestData.name} (RSVP already submitted)`)
          skippedCount++
        } else {
          // Guest exists but hasn't submitted - update invited count if different
          if (existingGuest.invitedCount !== guestData.invitedCount) {
            existingGuest.invitedCount = guestData.invitedCount
            await existingGuest.save()
            console.log(`🔄 Updated ${guestData.name} (invited count: ${guestData.invitedCount})`)
            updatedCount++
          } else {
            console.log(`⏭️  Skipped ${guestData.name} (already exists, no changes)`)
            skippedCount++
          }
        }
      } else {
        // New guest - add to database
        const guest = new Guest(guestData)
        await guest.save()
        console.log(`✅ Added ${guest.name} (invited: ${guest.invitedCount})`)
        addedCount++
      }
    }
    
    console.log('\n📊 Summary:')
    console.log(`✅ Added: ${addedCount} new guests`)
    console.log(`🔄 Updated: ${updatedCount} guests`)
    console.log(`⏭️  Skipped: ${skippedCount} guests (already in database or have RSVP)`)
    console.log(`📝 Total in CSV: ${guestsFromCSV.length}`)
    
    console.log('All guests added successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

populateGuests()
