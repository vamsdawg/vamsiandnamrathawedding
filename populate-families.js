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
    await mongoose.connect(mongo)
    console.log('Connected to database')
    
    // Read guests from CSV file
    const csvFilePath = './Guest List - Vamsi List.csv'
    const guestsFromCSV = await readGuestsFromCSV(csvFilePath)
    
    if (guestsFromCSV.length === 0) {
      console.log('No guests found in CSV file')
      process.exit(1)
    }
    
    // Clear existing guests (optional)
    await Guest.deleteMany({})
    console.log('Cleared existing guests')
    
    // Add guests from CSV
    for (const guestData of guestsFromCSV) {
      const guest = new Guest(guestData)
      await guest.save()
      console.log(`Added ${guest.name}`)
    }
    
    console.log('All guests added successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

populateGuests()
