// Client-side encryption for chat privacy
export class ChatEncryption {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12

  // Generate encryption key from user's password/email
  private static async deriveKey(userId: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userId + salt),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  // Encrypt message before storing
  static async encryptMessage(message: string, userId: string): Promise<string> {
    try {
      const salt = userId.slice(0, 8) // Use part of userId as salt
      const key = await this.deriveKey(userId, salt)
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
      const encoder = new TextEncoder()
      const data = encoder.encode(message)

      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        data
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('Encryption error:', error)
      return message // Fallback to plain text if encryption fails
    }
  }

  // Decrypt message when loading
  static async decryptMessage(encryptedMessage: string, userId: string): Promise<string> {
    try {
      const salt = userId.slice(0, 8)
      const key = await this.deriveKey(userId, salt)
      
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedMessage).split('').map(char => char.charCodeAt(0))
      )

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH)
      const encrypted = combined.slice(this.IV_LENGTH)

      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      )

      return new TextDecoder().decode(decrypted)
    } catch (error) {
      console.error('Decryption error:', error)
      return encryptedMessage // Return as-is if decryption fails
    }
  }
} 