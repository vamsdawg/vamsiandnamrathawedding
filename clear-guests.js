// Script to clear all guest data before migrating to new schema
import mongoose from 'mongoose'
import Guest from './src/models/Family.js'
import dotenv from 'dotenv'

dotenv.config()

async function clearAllGuests() {
  try {
    // Connect to your Atlas cluster
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB Atlas')
    
    // Clear guests from the current database
    const result = await Guest.deleteMany({})
    console.log(`Deleted ${result.deletedCount} guests from database`)
    
    console.log('All guest data cleared! You can now run npm run populate-guests')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

clearAllGuests()