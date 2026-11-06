// Saves every collection of the database to one compressed file, encrypted when
// BACKUP_PASSPHRASE is set. Used by the weekly GitHub Action and by hand:
//   npm run backup -- backup.enc
// Restore it with `npm run restore`. Only counts are printed, never data, because
// the Action's logs are public.
import { writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import mongoose from 'mongoose'
import { encrypt } from './backupCrypto.js'

// Short-lived or rebuildable data: sessions, rate limits and error reports.
const SKIP = new Set(['tokens', 'ratelimits', 'errorreports'])

async function main () {
  const output = process.argv[2]
  if (!output) throw new Error('Usage: npm run backup -- <file>')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set')
  const passphrase = process.env.BACKUP_PASSPHRASE || ''
  if (!passphrase && !process.argv.includes('--plain')) {
    throw new Error('BACKUP_PASSPHRASE is not set. Pass --plain to write an unencrypted backup on purpose.')
  }

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB })
  const db = mongoose.connection.db
  const names = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map(c => c.name)
    .filter(name => !SKIP.has(name) && !name.startsWith('system.'))
    .sort()

  const collections = {}
  let documents = 0
  for (const name of names) {
    collections[name] = await db.collection(name).find().toArray()
    documents += collections[name].length
  }
  await mongoose.disconnect()

  // Extended JSON keeps ObjectIds and dates as they were, so a restore is exact.
  const { EJSON } = mongoose.mongo.BSON
  const json = EJSON.stringify({ app: 'Money Tracker', version: 1, createdAt: new Date(), collections }, { relaxed: false })
  const packed = gzipSync(Buffer.from(json))
  writeFileSync(output, passphrase ? encrypt(packed, passphrase) : packed)
  console.log(`Backed up ${documents} documents in ${names.length} collections${passphrase ? ', encrypted' : ''}.`)
}

main().catch(async error => {
  console.error(error.message)
  await mongoose.disconnect()
  process.exit(1)
})
