import mongoose from 'mongoose'

const RsvpSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  attending: { type: String, enum: ['yes', 'no', 'maybe'], required: true },
  guests: { type: Number, default: 0, min: 0 },
  message: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true })

export default mongoose.model('Rsvp', RsvpSchema)
