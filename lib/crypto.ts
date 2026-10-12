import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

function key() {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!secret || secret.length < 16) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be set before storing API credentials.")
  }

  return createHash("sha256").update(secret).digest()
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".")
}

export function decryptSecret(payload: string) {
  const [iv, tag, encrypted] = payload.split(".").map((part) => Buffer.from(part, "base64url"))
  const decipher = createDecipheriv("aes-256-gcm", key(), iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
