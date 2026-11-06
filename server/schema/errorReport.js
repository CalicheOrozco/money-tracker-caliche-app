import mongoose from 'mongoose'

// One document per distinct error, counted each time it happens again. Old ones
// disappear 30 days after they last happened.
const errorReportSchema = new mongoose.Schema({
  fingerprint: { type: String, required: true, unique: true },
  source: { type: String, enum: ['server', 'client', 'cron'], default: 'server' },
  message: { type: String, default: '' },
  stack: { type: String, default: '' },
  path: { type: String, default: '' },
  userID: { type: String, default: '' },
  count: { type: Number, default: 0 },
  firstAt: { type: Date, default: Date.now },
  lastAt: { type: Date, default: Date.now },
  notifiedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true, expires: 0 }
})

errorReportSchema.index({ lastAt: -1 })

const ErrorReport = mongoose.models.ErrorReport || mongoose.model('ErrorReport', errorReportSchema)

export default ErrorReport
