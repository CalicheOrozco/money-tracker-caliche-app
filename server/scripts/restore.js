// Puts a backup made by backup.js back into a database.
//   npm run restore -- backup.enc              shows what it would do
//   npm run restore -- backup.enc --yes        restores into empty collections
//   npm run restore -- backup.enc --yes --replace   also overwrites collections with data
// It uses MONGODB_URI and MONGODB_DB, and BACKUP_PASSPHRASE for encrypted files.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import mongoose from 'mongoose'
import { decrypt, isEncrypted } from './backupCrypto.js'

const args = process.argv.slice(2)
const file = args.find(arg => !arg.startsWith('--'))
const confirmed = args.includes('--yes')
const replace = args.includes('--replace')

async function main () {
  if (!file) throw new Error('Usage: npm run restore -- <file> [--yes] [--replace]')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set')

  let packed = readFileSync(file)
  if (isEncrypted(packed)) {
    if (!process.env.BACKUP_PASSPHRASE) throw new Error('This backup is encrypted. Set BACKUP_PASSPHRASE.')
    packed = decrypt(packed, process.env.BACKUP_PASSPHRASE)
  }
  const { EJSON } = mongoose.mongo.BSON
  const backup = EJSON.parse(gunzipSync(packed).toString(), { relaxed: false })
  if (backup.app !== 'Money Tracker' || !backup.collections) throw new Error('This is not a Money Tracker backup.')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB })
  const db = mongoose.connection.db
  console.log(`Backup from ${new Date(backup.createdAt).toISOString()} into database "${db.databaseName}".`)

  const plan = []
  for (const [name, docs] of Object.entries(backup.collections)) {
    const existing = await db.collection(name).countDocuments()
    plan.push({ name, docs, existing })
    console.log(`  ${name}: ${docs.length} in backup, ${existing} now${existing && !replace ? ' (skipped, not empty)' : ''}`)
  }

  if (!confirmed) {
    console.log('Nothing changed. Run again with --yes to restore.')
  } else {
    for (const { name, docs, existing } of plan) {
      if (existing && !replace) continue
      if (existing) await db.collection(name).deleteMany({})
      if (docs.length) await db.collection(name).insertMany(docs)
    }
    console.log('Restored.')
  }
  await mongoose.disconnect()
}

main().catch(async error => {
  console.error(error.message)
  await mongoose.disconnect()
  process.exit(1)
})
