export const crypto = typeof window === 'undefined' ? new Crypto() : window.crypto
