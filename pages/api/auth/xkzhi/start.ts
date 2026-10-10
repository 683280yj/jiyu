import type { NextApiRequest, NextApiResponse } from 'next'
import {
  createOAuthStateCookie,
  newOAuthState,
  safeReturnTo,
  xkzhiConfigured,
  XkzhiProviders,
  OAUTH_STATE_COOKIE
} from '@/lib/auth/xkzhi'

const CALLBACK_URI =
  process.env.XKZHI_REDIRECT_URI ||
  'https://www.idky.tech/api/auth/xkzhi/callback'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const type = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type
  if (!type || !XkzhiProviders.includes(type as (typeof XkzhiProviders)[number])) {
    return res.status(400).json({ error: 'Unsupported login provider' })
  }

  const appKey = process.env.XKZHI_APPKEY
  const appId = process.env.XKZHI_APPID || '1023'
  if (!xkzhiConfigured() || !appKey) {
    return res.status(503).json({ error: 'Login service is not configured' })
  }

  let callback: URL
  try {
    callback = new URL(CALLBACK_URI)
  } catch {
    return res.status(500).json({ error: 'Invalid callback configuration' })
  }
  if (
    callback.protocol !== 'https:' ||
    !['idky.tech', 'www.idky.tech'].includes(callback.hostname)
  ) {
    return res.status(500).json({ error: 'Invalid callback configuration' })
  }

  const nextValue = Array.isArray(req.query.next) ? req.query.next[0] : req.query.next
  const next = safeReturnTo(nextValue) ? nextValue : '/member/login?success=1'
  const state = newOAuthState()
  callback.searchParams.set('state', state)

  const loginUrl = new URL('https://u.xkzhi.com/connect.php')
  loginUrl.searchParams.set('act', 'login')
  loginUrl.searchParams.set('appid', appId)
  loginUrl.searchParams.set('appkey', appKey)
  loginUrl.searchParams.set('type', type)
  loginUrl.searchParams.set('redirect_uri', callback.toString())

  try {
    const response = await fetch(loginUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    })
    const payload = await response.json()
    if (
      !response.ok ||
      Number(payload?.code) !== 0 ||
      typeof payload?.url !== 'string'
    ) {
      return res.status(502).json({ error: 'Unable to start login' })
    }

    const providerUrl = new URL(payload.url)
    if (providerUrl.protocol !== 'https:') {
      return res.status(502).json({ error: 'Invalid provider redirect' })
    }

    res.setHeader('Set-Cookie', createOAuthStateCookie(state, next))
    return res.redirect(302, providerUrl.toString())
  } catch {
    return res.status(502).json({ error: 'Login provider is unavailable' })
  }
}
