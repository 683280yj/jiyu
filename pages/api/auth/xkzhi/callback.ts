import type { NextApiRequest, NextApiResponse } from 'next'
import {
  clearOAuthStateCookie,
  createMemberSession,
  memberCookieHeader,
  readOAuthStateCookie,
  safeAvatar,
  xkzhiConfigured,
  XkzhiProviders
} from '@/lib/auth/xkzhi'

const fail = (res: NextApiResponse, reason = 'callback') => {
  res.setHeader('Set-Cookie', clearOAuthStateCookie())
  return res.redirect(302, '/member/login?error=' + encodeURIComponent(reason))
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!xkzhiConfigured()) {
    return fail(res, 'not_configured')
  }

  const stateCookie = readOAuthStateCookie(req)
  const returnedState = Array.isArray(req.query.state)
    ? req.query.state[0]
    : req.query.state
  if (!stateCookie || !returnedState || returnedState !== stateCookie.state) {
    return fail(res, 'state')
  }

  const type = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code
  if (
    !type ||
    !XkzhiProviders.includes(type as (typeof XkzhiProviders)[number]) ||
    !code
  ) {
    return fail(res, 'callback')
  }

  const appId = process.env.XKZHI_APPID || '1023'
  const appKey = process.env.XKZHI_APPKEY as string
  const profileUrl = new URL('https://u.xkzhi.com/connect.php')
  profileUrl.searchParams.set('act', 'callback')
  profileUrl.searchParams.set('appid', appId)
  profileUrl.searchParams.set('appkey', appKey)
  profileUrl.searchParams.set('type', type)
  profileUrl.searchParams.set('code', code)

  try {
    const response = await fetch(profileUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    })
    const profile = await response.json()
    if (
      !response.ok ||
      Number(profile?.code) !== 0 ||
      typeof profile?.social_uid !== 'string' ||
      !profile.social_uid
    ) {
      return fail(res, 'callback')
    }

    const token = createMemberSession({
      social_uid: profile.social_uid.slice(0, 200),
      provider: type,
      nickname:
        typeof profile.nickname === 'string'
          ? profile.nickname.slice(0, 100)
          : '会员',
      avatar: safeAvatar(profile.faceimg)
    })

    res.setHeader('Set-Cookie', [
      memberCookieHeader(token),
      clearOAuthStateCookie()
    ])
    return res.redirect(302, stateCookie.next)
  } catch {
    return fail(res, 'callback')
  }
}
