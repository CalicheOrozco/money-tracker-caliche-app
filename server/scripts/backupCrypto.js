import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

// Backups are encrypted with AES-256-GCM, which also detects a damaged or altered
// file, using a key derived from a passphrase with scrypt.
// File layout: MAGIC | salt (16) | iv (12) | auth tag (16) | ciphertext.
const MAGIC = Buffer.from('MTBACKUP1')
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 512 * 1024 * 1024 }

const keyFor = (passphrase, salt) => scryptSync(passphrase, salt, 32, SCRYPT)

export function encrypt (data, passphrase) {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFor(passphrase, salt), iv)
  const body = Buffer.concat([cipher.update(data), cipher.final()])
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body])
}

export const isEncrypted = file => file.subarray(0, MAGIC.length).equals(MAGIC)

export function decrypt (file, passphrase) {
  let at = MAGIC.length
  const take = size => file.subarray(at, (at += size))
  const salt = take(16)
  const iv = take(12)
  const tag = take(16)
  const decipher = createDecipheriv('aes-256-gcm', keyFor(passphrase, salt), iv)
  decipher.setAuthTag(tag)
  try {
    return Buffer.concat([decipher.update(file.subarray(at)), decipher.final()])
  } catch {
    throw new Error('Wrong passphrase, or the backup file is damaged.')
  }
}
