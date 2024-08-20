import { Crypto } from '@peculiar/webcrypto'

export const crypto = typeof window === 'undefined' ? new Crypto() : window.crypto
