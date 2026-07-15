import { describe, expect, it } from 'vitest'
import { hashPassword, randomHex, sha256, verifyPassword } from '../worker/security'

describe('worker security primitives', () => {
  it('hashes and verifies passwords without storing plaintext', async () => {
    const password = 'correct-horse-battery-staple'
    const encoded = await hashPassword(password)
    expect(encoded.hash).not.toContain(password)
    expect(encoded.salt).toHaveLength(32)
    expect(await verifyPassword(password, encoded.salt, encoded.hash)).toBe(true)
    expect(await verifyPassword('incorrect-password', encoded.salt, encoded.hash)).toBe(false)
  })

  it('creates random session material and deterministic token hashes', async () => {
    const first = randomHex()
    const second = randomHex()
    expect(first).toHaveLength(64)
    expect(first).not.toBe(second)
    expect(await sha256(first)).toBe(await sha256(first))
  })
})
