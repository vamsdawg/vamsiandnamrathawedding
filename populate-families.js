// Script to populate guest data
// Run this once to add your wedding guests to the database

import mongoose from 'mongoose'
import Guest from './src/models/Family.js' // Using updated Guest model
import dotenv from 'dotenv'

dotenv.config()

const sampleGuests = [
  { name: "Yedhara Family (Sridhar)" },
  { name: "Dasaraju Family" },
  { name: "Chintalacharuvu Family (Koti)" },
  { name: "Chintalacharuvu Family (Subbarao)" },
  { name: "Nukkala Family" },
  { name: "Vegesna Family (Siva)" },
  { name: "Vegesna Family (Harinatharaju)" },
  { name: "Kalidindi Family (Murali)" },
  { name: "Kalidindi (Durga)" },
  { name: "Chanderraju Family (Chenchuraju)" },
  { name: "Sagi Family (Srinivas)" },
  { name: "Sagi Family (Chakri)" },
  { name: "Sagi Family (Rangaraju)" },
  { name: "Sagi Family (Neeladhri raju )" },
  { name: "Chanderraju Family (Varma)" },
  { name: "Dintakurti Family" },
  { name: "Yedhara Family (Raju)" },
  { name: "Unnithan Family" },
  { name: "Verma Family" },
  { name: "Penmetsa Family (Rajesh)" },
  { name: "Raju Family (DLN)" },
  { name: "Petluri Family" },
  { name: "Kothacheruvu Family" },
  { name: "Amara Family" },
  { name: "Yavanamanda Family" },
  { name: "Muppala Family (Raju)" },
  { name: "Nandimandalam Family" },
  { name: "Muppala Family (Siva)" },
  { name: "Muppala Family (Jay)" },
  { name: "Gottumukkala Family" },
  { name: "Kakani Family (Seshu)" },
  { name: "Kakani Family (Satish)" },
  { name: "Palacharla Family" },
  { name: "Rao Family" },
  { name: "Reddy Family (Narsa)" },
  { name: "Reddy Family (Raghu)" },
  { name: "Dhantaluru Family" },
  { name: "Yarabarla Family (Nerendra)" },
  { name: "Yarabarla Family (Nagindra)" },
  { name: "Arnipalli Family" },
  { name: "Rajan Family" },
  { name: "Raj Family (Gasper)" },
  { name: "Cooke Family" },
  { name: "Plaster Family" },
  { name: "Epps Family" },
  { name: "Strom Family" },
  { name: "Parekh Family" },
  { name: "Glenn Family" },
  { name: "Abram Haghnazari" },
  { name: "Tony Wilson" },
  { name: "Sashi Boduvala" },
  { name: "Shiva Kapoor" },
  { name: "Balaji Lenin" },
  { name: "Jamie Connolly" },
  { name: "Turnner Pham" },
  { name: "Vinay Bhamidipati" },
  { name: "Pedro Damy" },
  { name: "Felipe" },
  { name: "Erick Vilches" },
  { name: "Drew Werntz" },
  { name: "Saini Family" },
  { name: "Sagi Family (Snehit)" },
  { name: "Varma Family (Vinay)" },
  { name: "Vegesna Family (Mohan)" },
  { name: "Vegesna Family (Surya)" },
  { name: "Penmetsa Family (Padmaja)" },
  { name: "Ada Family (Ravi)" },
  { name: "Ada Family (Srinivas)" },
  { name: "Narendrula Family" },
  { name: "Janani Rammohan" }
]

async function populateGuests() {
  try {
    const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_site'
    await mongoose.connect(mongo)
    console.log('Connected to database')
    
    // Clear existing guests (optional)
    await Guest.deleteMany({})
    
    // Add sample guests
    for (const guestData of sampleGuests) {
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
