// Fills the shared guest account with about six months of realistic activity
// ending today, so visitors see something meaningful. It only touches guest
// transactions (no userID). Run with --dry-run to see what it would do.
import mongoose from 'mongoose'
import TransactionModel from '../schema/transaction.js'

const DRY_RUN = process.argv.includes('--dry-run')
const MONTHS = 6

const CARDS = {
  bbva: ['BBVA Azul', 'BBVAIcon'],
  santander: ['Santander Free', 'SantanderIcon'],
  amex: ['Amex Oro', 'AmericaExpressIcon'],
  banorte: ['Banorte Débito', 'BanorteIcon']
}

// Deterministic, so every run produces the same kind of story.
let state = 42
const random = () => {
  state = (state * 9301 + 49297) % 233280
  return state / 233280
}
const between = (min, max) => Math.round((min + random() * (max - min)) * 100) / 100
const pick = list => list[Math.floor(random() * list.length)]

const pad = n => String(n).padStart(2, '0')
const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

function buildTransactions () {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today.getFullYear(), today.getMonth() - MONTHS, today.getDate())
  const rows = []

  const add = (date, name, amount, category, card = null, description = '', tags = []) => {
    if (date > today || date < start) return
    rows.push({
      userID: null,
      datetime: new Date(`${iso(date)}T00:00:00Z`),
      name,
      description,
      price: (amount < 0 ? '-' : '+') + Math.abs(amount).toFixed(2),
      category,
      card: card ? CARDS[card][0] : '',
      icon: card ? CARDS[card][1] : '',
      tags
    })
  }

  for (let m = MONTHS; m >= 0; m--) {
    const year = today.getFullYear()
    const month = today.getMonth() - m
    const day = d => new Date(year, month, d)
    const lastDay = new Date(year, month + 1, 0).getDate()

    add(day(15), 'Nómina quincena', 19250, 'Salary', null, 'Pago de nómina')
    add(day(lastDay), 'Nómina quincena', 19250, 'Salary', null, 'Pago de nómina')
    add(day(1), 'Renta departamento', -11800, 'Housing', null, 'Transferencia al casero')
    add(day(4), 'Telmex Infinitum', -489, 'Utilities', 'banorte', 'Internet')
    add(day(7), 'Netflix', -219, 'Streaming Service', 'amex')
    add(day(9), 'Spotify', -129, 'Streaming Service', 'amex')
    add(day(5), 'Smart Fit', -499, 'Personal Care', 'santander', 'Mensualidad gimnasio')
    add(day(12), 'Seguro de auto GNP', -1280, 'Insurance', 'bbva')
    if (month % 2 === 0) add(day(18), 'CFE', -between(640, 980), 'Utilities', 'banorte', 'Luz bimestral')

    for (let i = 0; i < 4; i++) {
      add(day(3 + i * 7 + Math.floor(random() * 3)), pick(['Walmart', 'Soriana', 'La Comer', 'Chedraui']), -between(650, 1900), 'Food', pick(['bbva', 'amex', 'banorte']), 'Despensa')
    }
    for (let i = 0; i < 6; i++) {
      add(day(1 + Math.floor(random() * 28)), 'Oxxo', -between(45, 140), 'Food', pick(['banorte', null]))
    }
    for (let i = 0; i < 3; i++) {
      add(day(2 + Math.floor(random() * 26)), pick(['Uber Eats', 'Rappi', 'Tacos El Güero', 'Sushi Itto', 'Starbucks']), -between(120, 620), 'Food', pick(['amex', 'santander']))
    }
    for (let i = 0; i < 3; i++) {
      add(day(4 + Math.floor(random() * 24)), 'Pemex', -between(700, 1150), 'Car & Fuel', 'bbva', 'Gasolina')
    }
    for (let i = 0; i < 5; i++) {
      add(day(1 + Math.floor(random() * 28)), pick(['Uber', 'DiDi']), -between(85, 210), 'Transportation', 'santander')
    }
    add(day(10 + Math.floor(random() * 10)), pick(['Amazon', 'Mercado Libre']), -between(350, 1800), 'Personal Spending', 'amex', pick(['Audífonos', 'Libros', 'Cosas de casa', 'Cargador']))
    if (random() > 0.4) add(day(20 + Math.floor(random() * 6)), 'Cinépolis', -between(180, 420), 'Recreation & Entertainment', 'santander', 'Cine')
    if (random() > 0.5) add(day(8 + Math.floor(random() * 15)), 'Farmacia Guadalajara', -between(120, 560), 'Medical & Healthcare', 'banorte')
    if (m % 2 === 1) add(day(16 + Math.floor(random() * 8)), 'Proyecto freelance', between(4500, 9000), 'Freelance Income', null, 'Diseño de logotipo')
    if (m % 3 === 0) add(day(22), pick(['Liverpool', 'Zara', 'Nike']), -between(900, 2600), 'Clothing', 'amex')
    if (m === 3) {
      add(day(10), 'Volaris', -3890, 'Travel', 'santander', 'Vuelo a CDMX', ['viaje-cdmx'])
      add(day(11), 'Hotel Roma Norte', -4200, 'Travel', 'santander', '2 noches', ['viaje-cdmx'])
      add(day(12), 'Contramar', -1350, 'Food', 'amex', 'Comida con amigos', ['viaje-cdmx'])
    }
    if (m === 1) add(day(14), 'Regalo cumpleaños Ana', -850, 'Gifts & Donations', 'bbva', '', ['regalo'])
    if (m === 2) add(day(6), 'Transferencia de Diego', 650, 'Friend Transfers', null, 'Cena compartida')
  }

  return rows.sort((a, b) => a.datetime - b.datetime)
}

async function main () {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set')
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB })

  const existing = await TransactionModel.countDocuments({ userID: null })
  const rows = buildTransactions()
  const income = rows.filter(r => r.price.startsWith('+')).length

  console.log(`Database: ${mongoose.connection.db.databaseName}`)
  console.log(`Guest transactions now: ${existing}`)
  console.log(`Would create: ${rows.length} (${income} income, ${rows.length - income} expenses), ${iso(rows[0].datetime)} to ${rows.at(-1).datetime.toISOString().slice(0, 10)}`)

  if (DRY_RUN) {
    console.log('Dry run, nothing changed.')
  } else {
    const { deletedCount } = await TransactionModel.deleteMany({ userID: null })
    await TransactionModel.insertMany(rows)
    console.log(`Deleted ${deletedCount} old guest transactions and created ${rows.length}.`)
  }

  await mongoose.disconnect()
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
