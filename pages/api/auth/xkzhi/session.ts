import type { NextApiRequest, NextApiResponse } from 'next'
import { readMemberSession, xkzhiConfigured } from '@/lib/auth/xkzhi'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = readMemberSession(req)
  return res.status(200).json({
    configured: xkzhiConfigured(),
    user: user
      ? {
          social_uid: user.social_uid,
          provider: user.provider,
          nickname: user.nickname,
          avatar: user.avatar
        }
      : null
  })
}
