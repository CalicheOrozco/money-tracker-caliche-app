// Marks an account as the app admin, who can reset other users' passwords.
// Usage: npm run make-admin <username>      grant
//        npm run make-admin <username> --remove
import mongoose from 'mongoose'
import User from '../schema/user.js'

const args = process.argv.slice(2)
const remove = args.includes('--remove')
const username = args.find(arg => !arg.startsWith('--'))

async function main () {
  if (!username) throw new Error('Usage: npm run make-admin <username> [--remove]')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set')
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB })

  const matches = await User.findByUsername(username)
  const user = matches.length === 1 ? matches[0] : matches.find(u => u.username === username.trim())
  if (!user) throw new Error(matches.length ? 'More than one account matches. Use the exact spelling.' : `No account is called "${username}".`)

  user.admin = !remove
  await user.save()
  console.log(`Database: ${mongoose.connection.db.databaseName}`)
  console.log(`${user.username} ${remove ? 'is no longer' : 'is now'} an admin.`)
  await mongoose.disconnect()
}

main().catch(async error => {
  console.error(error.message)
  await mongoose.disconnect()
  process.exit(1)
})
