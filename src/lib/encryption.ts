import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY
  if (!key) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY environment variable is not set')
  }
  // Key should be 32 bytes (256 bits) for AES-256
  // If it's a hex string, convert it. Otherwise, hash it.
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex')
  }
  // Hash the key to get consistent 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encryptedData (all in hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey()
  const parts = encryptedText.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format')
  }

  const [ivHex, authTagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Mask a password for display (show last 4 chars)
export function maskPassword(password: string): string {
  if (password.length <= 4) {
    return '****'
  }
  return '****' + password.slice(-4)
}
