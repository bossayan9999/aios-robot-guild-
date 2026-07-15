const encoder = new TextEncoder()

function bytesToHex(bytes: Uint8Array) { return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('') }
function hexToBytes(hex: string) { return new Uint8Array(hex.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []) }

export function randomHex(length = 32) { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return bytesToHex(bytes) }

export async function sha256(value: string) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))))
}

export async function hashPassword(password: string, saltHex = randomHex(16)) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 210_000, hash: 'SHA-256' }, key, 256)
  return { hash: bytesToHex(new Uint8Array(bits)), salt: saltHex }
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  const result = await hashPassword(password, salt)
  if (result.hash.length !== expected.length) return false
  let different = 0
  for (let index = 0; index < expected.length; index++) different |= result.hash.charCodeAt(index) ^ expected.charCodeAt(index)
  return different === 0
}

export function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get('Cookie') || ''
  const match = cookies.split(';').map(item => item.trim()).find(item => item.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}
