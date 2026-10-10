export const MEMBER_ONLY_TAG = '会员专享'

export function isMemberOnlyPost(post) {
  return (
    Array.isArray(post?.tags) &&
    post.tags.some(tag => typeof tag === 'string' && tag.trim() === MEMBER_ONLY_TAG)
  )
}

export function stripMemberPostContent(props) {
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
