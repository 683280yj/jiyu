import type { NextApiRequest, NextApiResponse } from 'next'
import { clearMemberCookie } from '@/lib/auth/xkzhi'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  clearMemberCookie(res)
  return res.status(204).end()
}
