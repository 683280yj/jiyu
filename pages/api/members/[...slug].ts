import type { NextApiRequest, NextApiResponse } from 'next'
import BLOG from '@/blog.config'
import { readMemberSession } from '@/lib/auth/xkzhi'
import { isMemberOnlyPost } from '@/lib/auth/members'
import { resolvePostProps } from '@/lib/db/SiteDataApi'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Vary', 'Cookie')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!readMemberSession(req)) {
    return res.status(401).json({ error: 'Sign in required' })
  }

  const segments = Array.isArray(req.query.slug) ? req.query.slug : []
  if (segments.length === 0) {
    return res.status(400).json({ error: 'Missing page path' })
  }

  try {
    const props = await resolvePostProps({
      prefix: segments[0],
      slug: segments[1],
      suffix: segments.slice(2),
      locale: BLOG.LANG,
      from: 'member-content'
    })
    if (!props?.post || !isMemberOnlyPost(props.post)) {
      return res.status(404).json({ error: 'Member page not found' })
    }

    return res.status(200).json({ post: props.post })
  } catch {
    return res.status(502).json({ error: 'Unable to load member content' })
  }
}
