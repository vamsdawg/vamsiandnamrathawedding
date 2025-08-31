// Quick MongoDB Atlas connectivity test
// Usage: node scripts/test-mongo.js
import 'dotenv/config'
import mongoose from 'mongoose'

async function main () {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set in environment.')
    process.exit(1)
  }
  const start = Date.now()
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
    const elapsed = Date.now() - start
    const ping = await mongoose.connection.db.admin().ping()
    console.log(`Connected successfully in ${elapsed} ms. Ping OK:`, ping)
    console.log('Database name:', mongoose.connection.name)
    console.log('Host(s):', mongoose.connection.host)
  } catch (err) {
    console.error('Connection failed:', err.message)
  } finally {
    await mongoose.disconnect().catch(() => {})
    process.exit(0)
  }
}

main()
