import mongoose from 'mongoose'

let connection = null

// Serverless instances are reused between requests, so the connection is cached.
// It is cleared on failure, otherwise one failed attempt would break the instance
// for as long as it stays alive.
export default function connectDB () {
  if (!process.env.MONGODB_URI) {
    return Promise.reject(new Error('MONGODB_URI is not set'))
  }

  if (!connection) {
    connection = mongoose
      .connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DB,
        serverSelectionTimeoutMS: 5000
      })
      .catch(error => {
        connection = null
        throw error
      })
  }

  return connection
}
