import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

export const MEMBER_COOKIE = 'idky_member'
export const OAUTH_STATE_COOKIE = 'idky_xkzhi_state'
const MEMBER_SESSION_SECONDS = 60 * 60 * 24 * 7
const OAUTH_STATE_SECONDS = 60 * 10

export type XkzhiUser = {
  social_uid: string
  provider: string
  nickname: string
  avatar: string
  exp: number
}

export const XkzhiProviders = [
  'qq',
  'wx',
  'sina',
  'baidu',
  'huawei',
  'google',
  'microsoft',
  'dingtalk',
  'gitee',
  'github'
] as const

export function xkzhiConfigured() {
  return Boolean(
    process.env.XKZHI_APPKEY &&
      process.env.XKZHI_SESSION_SECRET &&
      process.env.XKZHI_SESSION_SECRET.length >= 32
  )
}

function signingSecret() {
  const secret = process.env.XKZHI_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('XKZHI_SESSION_SECRET is not configured')
  }
  return secret
}

function signature(value: string) {
  return createHmac('sha256', signingSecret()).update(value).digest()
}

function cookieValue(req: NextApiRequest, name: string) {
  const header = req.headers.cookie || ''
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim()
    }
  }
  return ''
}

function secureFlag() {
  return process.env.NODE_ENV === 'production' ? '; Secure' : ''
}

export function createMemberSession(user: Omit<XkzhiUser, 'exp'>) {
  const payload: XkzhiUser = {
    social_uid: user.social_uid,
    provider: user.provider,
    nickname: user.nickname,
    avatar: user.avatar,
    exp: Math.floor(Date.now() / 1000) + MEMBER_SESSION_SECONDS
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signed = signature(encoded).toString('base64url')
  return encoded + '.' + signed
}

export function readMemberSession(req: NextApiRequest): XkzhiUser | null {
  const token = cookieValue(req, MEMBER_COOKIE)
  const parts = token.split('.')
  const encoded = parts[0]
  const suppliedSignature = parts[1]
  if (!encoded || !suppliedSignature || parts.length !== 2) return null

  try {
    const expected = signature(encoded)
    const supplied = Buffer.from(suppliedSignature, 'base64url')
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      return null
    }

    const user = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (
      typeof user?.social_uid !== 'string' ||
      typeof user?.provider !== 'string' ||
      typeof user?.nickname !== 'string' ||
      typeof user?.exp !== 'number' ||
      user.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return {
      social_uid: user.social_uid,
      provider: user.provider,
      nickname: user.nickname.slice(0, 100),
      avatar:
        typeof user.avatar === 'string' && user.avatar.startsWith('https://')
          ? user.avatar
          : '',
      exp: user.exp
    }
  } catch {
    return null
  }
}

export function memberCookieHeader(token: string) {
  return (
    MEMBER_COOKIE +
    '=' +
    token +
    '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' +
    MEMBER_SESSION_SECONDS +
    secureFlag()
  )
}

export function clearMemberCookie(res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    MEMBER_COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + secureFlag()
  )
}

export function createOAuthStateCookie(state: string, next: string) {
  const encodedNext = Buffer.from(next).toString('base64url')
  const value = state + '.' + encodedNext
  const signed = signature(value).toString('base64url')
  return (
    OAUTH_STATE_COOKIE +
    '=' +
    value +
    '.' +
    signed +
    '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' +
    OAUTH_STATE_SECONDS +
    secureFlag()
  )
}

export function readOAuthStateCookie(req: NextApiRequest) {
  const cookie = cookieValue(req, OAUTH_STATE_COOKIE)
  const parts = cookie.split('.')
  const state = parts[0]
  const encodedNext = parts[1]
  const suppliedSignature = parts[2]
  if (!state || !encodedNext || !suppliedSignature || parts.length !== 3) return null

  try {
    const value = state + '.' + encodedNext
    const expected = signature(value)
    const supplied = Buffer.from(suppliedSignature, 'base64url')
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      return null
    }

    const next = Buffer.from(encodedNext, 'base64url').toString('utf8')
    return { state, next: safeReturnTo(next) ? next : '/member/login?success=1' }
  } catch {
    return null
  }
}

export function clearOAuthStateCookie() {
  return (
    OAUTH_STATE_COOKIE +
    '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' +
    secureFlag()
  )
}

export function safeReturnTo(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.startsWith('/api/auth/xkzhi')
  )
}

export function newOAuthState() {
  return randomBytes(32).toString('base64url')
}

export function safeAvatar(value: unknown) {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}
