export const MEMBER_ONLY_TAG = '会员专享'

export function isMemberOnlyPost(post: { tags?: unknown } | null | undefined): boolean {
  return (
    Array.isArray(post?.tags) &&
    post.tags.some(tag => typeof tag === 'string' && tag.trim() === MEMBER_ONLY_TAG)
  )
}

export function stripMemberPostContent<T extends { post?: Record<string, any> | null }>(props: T): T & { post: Record<string, any> | null; memberOnly: boolean } {
  if (!props?.post || !isMemberOnlyPost(props.post)) {
    return { ...props, memberOnly: false }
  }

  const post = { ...props.post }
  delete post.blockMap
  delete post.content
  delete post.toc
  post.summary = '登录后查看会员专享内容'

  return { ...props, post, memberOnly: true }
}
