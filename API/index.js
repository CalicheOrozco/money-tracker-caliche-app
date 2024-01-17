import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import TransactionModel from './schema/transaction.js'
import mongoose from 'mongoose'
import authenticateToken from './auth/authenticateToken.js'

import signupRoute from './routes/signup.js'
import loginRoute from './routes/login.js'
import logoutRoute from './routes/logout.js'
import refreshTokenRoute from './routes/refreshToken.js'
import userRoute from './routes/user.js'
import { useImperativeHandle } from 'react'

const app = express()
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err))

app.use(cors())
app.use(express.json())
app.use('/api/signup', signupRoute)
app.use('/api/login', loginRoute)
app.use('/api/signout', logoutRoute)

// Ruta para renovar el token de acceso utilizando el token de actualización
app.use('/api/refresh-token', refreshTokenRoute)

app.use('/api/user', authenticateToken, userRoute)

app.get('/api/test', (req, res) => {
  res.json('Hello World!')
})

// get user transactions
app.get('/api/transactions/:id', async (req, res) => {
  const { id } = req.params
  console.log('id', id)
  const transactions = await TransactionModel.find({ userID: id })
  console.log('transactions', transactions)
  res.json(transactions)
})
// post user transaction
app.post('/api/transaction/:id', async (req, res) => {
  try {
    const { name, price, datetime, description, userID } = req.body
    // quitar los espacios en blanca del price
    const priceTrim = price.replace(/\s/g, '')
    // validar si el price trae signo - o +
    if (!priceTrim.includes('-') && !priceTrim.includes('+')) {
      console.log('el precio no tiene signo')
      return res
        .status(400)
        .json({ error: 'The price must include a - or + sign.' })
    }

    // validar que name no este vacio
    if (!name) {
      return res.status(400).json({ error: 'The name must not be empty.' })
    }

    // validar si el price trae un numero
    const priceNumber = Number(price.replace('-', '').replace('+', ''))
    if (isNaN(priceNumber)) {
      return res.status(400).json({ error: 'The price must be a number.' })
    }

    // validar si el datetime esta vacio
    if (!datetime) {
      return res.status(400).json({ error: 'The date must not be empty.' })
    }

    // validar si el datetime es una fecha valida
    const datetimeDate = new Date(datetime)
    if (isNaN(datetimeDate)) {
      return res.status(400).json({ error: 'The date must be a valid date.' })
    }

    const transaction = await TransactionModel.create({
      name,
      price: priceTrim,
      datetime,
      description,
      userID
    })
    res.json(transaction)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})
// post transaction
app.post('/api/transaction', async (req, res) => {
  try {
    const { name, price, datetime, description } = req.body

    // quitar los espacios en blanca del price
    const priceTrim = price.replace(/\s/g, '')
    // validar si el price trae signo - o +
    if (!priceTrim.includes('-') && !priceTrim.includes('+')) {
      console.log('el precio no tiene signo')
      return res
        .status(400)
        .json({ error: 'The price must include a - or + sign.' })
    }

    // validar que name no este vacio
    if (!name) {
      return res.status(400).json({ error: 'The name must not be empty.' })
    }

    // validar si el price trae un numero
    const priceNumber = Number(price.replace('-', '').replace('+', ''))
    if (isNaN(priceNumber)) {
      return res.status(400).json({ error: 'The price must be a number.' })
    }

    // validar si el datetime esta vacio
    if (!datetime) {
      return res.status(400).json({ error: 'The date must not be empty.' })
    }

    // validar si el datetime es una fecha valida
    const datetimeDate = new Date(datetime)
    if (isNaN(datetimeDate)) {
      return res.status(400).json({ error: 'The date must be a valid date.' })
    }

    const transaction = await TransactionModel.create({
      name,
      price: priceTrim,
      datetime,
      description
    })
    res.json(transaction)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

app.get('/api/transactions', async (req, res) => {
  // buscar las transations que no tienen userID
  const transactions = await TransactionModel.find({ userID: null })
  res.json(transactions)
})

// delete transaction
app.delete('/api/transaction/delete/:id', async (req, res) => {
  const { id } = req.params
  console.log('id', id)
  const transaction = await TransactionModel.findByIdAndDelete(id)
  res.json(transaction)
})

// update transaction
app.put('/api/transaction/update/:id', async (req, res) => {
  const { id } = req.params
  const { name, price, datetime, description } = req.body
  const priceTrim = price.replace(/\s/g, '')
  console.log('id', id)
  const transaction = await TransactionModel.findByIdAndUpdate(id, {
    name,
    price: priceTrim,
    datetime,
    description
  })
  res.json(transaction)
})

app.listen(5000, () => console.log('Server running on port 5000'))
