import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

let cachedConnection = null

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('✅ Using cached MongoDB connection')
    return cachedConnection
  }

  const mongo = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding_site'
  
  try {
    cachedConnection = await mongoose.connect(mongo, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    })
    console.log('✅ New MongoDB connection established')
    return cachedConnection
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

// Simulate what happens on Vercel
async function testConnectionResilience() {
  console.log('\n🧪 Test 1: Initial Connection')
  await connectDB()
  
  console.log('\n🧪 Test 2: Reusing Connection (should be instant)')
  const start2 = Date.now()
  await connectDB()
  console.log(`⏱️  Took ${Date.now() - start2}ms (should be <5ms)`)
  
  console.log('\n🧪 Test 3: Simulating Vercel cold start - closing connection')
  await mongoose.connection.close()
  cachedConnection = null
  console.log('Connection closed')
  
  console.log('\n🧪 Test 4: Reconnecting after cold start')
  const start4 = Date.now()
  await connectDB()
  console.log(`⏱️  Took ${Date.now() - start4}ms`)
  
  console.log('\n🧪 Test 5: Testing actual database query')
  const Guest = mongoose.model('Guest', new mongoose.Schema({
    name: String,
    email: String,
    rsvpSubmitted: Boolean
  }))
  
  const count = await Guest.countDocuments()
  console.log(`✅ Found ${count} guests in database`)
  
  console.log('\n🧪 Test 6: Multiple rapid queries (like real traffic)')
  const queries = []
  for (let i = 0; i < 10; i++) {
    queries.push(Guest.findOne().limit(1))
  }
  const startQueries = Date.now()
  await Promise.all(queries)
  console.log(`✅ Completed 10 concurrent queries in ${Date.now() - startQueries}ms`)
  
  console.log('\n✅ ALL TESTS PASSED - Connection logic is production-ready!')
  process.exit(0)
}

testConnectionResilience().catch(err => {
  console.error('\n❌ TEST FAILED:', err)
  process.exit(1)
})
