import mongoose from 'mongoose'

const GuestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rsvpSubmitted: { type: Boolean, default: false },
  adultsAttending: { type: Number, default: 0 },
  attendingWedding: { type: Boolean, default: false },
  attendingReception: { type: Boolean, default: false },
  usingHotelBlock: { type: Boolean, default: false },
  message: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true })

// Index for searching guest names
GuestSchema.index({ 'name': 'text' })

export default mongoose.model('Guest', GuestSchema)
