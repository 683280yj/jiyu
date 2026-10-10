import BLOG from '@/blog.config'
import useNotification from '@/components/Notification'
import OpenWrite from '@/components/OpenWrite'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import { useGlobal } from '@/lib/global'
import { stripMemberPostContent } from '@/lib/auth/members'
import { getPageTableOfContents } from '@/lib/db/notion/getPageTableOfContents'
import { getPasswordQuery } from '@/lib/utils/password'
import { checkSlugHasMorThanTwoSlash, checkSlugHasNoSlash, processPostData } from '@/lib/utils/post'
import { DynamicLayout } from '@/themes/theme'
import md5 from 'js-md5'
import { useRouter } from 'next/router'
import { idToUuid } from 'notion-utils'
import { useEffect, useState } from 'react'

/**
 * 根据notion的slug访问页面
 * 只解析一级目录例如 /about
 * @param {*} props
 * @returns
 */
const MemberOnlyGate = props => {
  const router = useRouter()
  const [state, setState] = useState({ loading: true, post: null, signedIn: false })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const sessionResponse = await fetch('/api/auth/xkzhi/session', { cache: 'no-store' })
        const session = await sessionResponse.json()
        if (!session.user) {
          if (!cancelled) setState({ loading: false, post: null, signedIn: false })
          return
        }
        const path = props.post?.slug?.split('/').map(segment => encodeURIComponent(segment)).join('/')
        const response = await fetch('/api/members/' + path, { cache: 'no-store' })
        if (!response.ok) throw new Error('Unable to load member content')
        const data = await response.json()
        if (!cancelled) setState({ loading: false, post: data.post, signedIn: true })
      } catch {
        if (!cancelled) setState({ loading: false, post: null, signedIn: false })
      }
    }
    load()
    return () => { cancelled = true }
  }, [props.post?.slug])

  if (state.loading) return <main className='mx-auto max-w-3xl px-6 py-20 text-center'>正在验证会员登录…</main>
  if (!state.signedIn || !state.post) return (
    <main className='mx-auto max-w-xl px-6 py-20 text-center'>
      <h1 className='text-2xl font-semibold'>会员专享内容</h1>
      <p className='mt-3 text-gray-600 dark:text-gray-300'>登录后即可阅读这篇文章。</p>
      <a className='mt-6 inline-block rounded-lg bg-gray-900 px-5 py-3 text-white dark:bg-white dark:text-gray-900' href={'/member/login?next=' + encodeURIComponent(router.asPath)}>前往会员登录</a>
    </main>
  )
  return <Slug {...props} post={state.post} memberOnly={false} />
}
const Slug = props => {
  if (props.memberOnly) return <MemberOnlyGate {...props} />

  const { post } = props
  const router = useRouter()
  const { locale } = useGlobal()

  // 文章锁🔐
  const [lock, setLock] = useState(post?.password && post?.password !== '')
  const { showNotification, Notification } = useNotification()

  /**
   * 验证文章密码
   * @param {*} passInput
   */
  const validPassword = passInput => {
    if (!post) {
      return false
    }
    const encrypt = md5(post?.slug + passInput)
    if (passInput && encrypt === post?.password) {
      setLock(false)
      // 输入密码存入localStorage，下次自动提交
      localStorage.setItem('password_' + router.asPath, passInput)
      showNotification(locale.COMMON.ARTICLE_UNLOCK_TIPS) // 设置解锁成功提示显示
      return true
    }
    return false
  }

  // 文章加载
  useEffect(() => {
    // 文章加密
    if (post?.password && post?.password !== '') {
      setLock(true)
    } else {
      setLock(false)
    }

    // 读取上次记录 自动提交密码
    const passInputs = getPasswordQuery(router.asPath)
    if (passInputs.length > 0) {
      for (const passInput of passInputs) {
        if (validPassword(passInput)) {
          break // 密码验证成功，停止尝试
        }
      }
    }
  }, [post])

  // 文章加载
  useEffect(() => {
    if (lock) {
      return
    }
    // 文章解锁后生成目录与内容
    if (post?.blockMap?.block) {
      post.content = Object.keys(post.blockMap.block).filter(
        key => post.blockMap.block[key]?.value?.parent_id === post.id
      )
      post.toc = getPageTableOfContents(post, post.blockMap)
    }
  }, [router, lock])

  props = { ...props, lock, validPassword }
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return (
    <>
      {/* 文章布局 */}
      <DynamicLayout theme={theme} layoutName='LayoutSlug' {...props} />
      {/* 解锁密码提示框 */}
      {post?.password && post?.password !== '' && !lock && <Notification />}
      {/* 导流工具 */}
      <OpenWrite />
    </>
  )
}

export async function getStaticPaths() {
  if (!BLOG.isProd) {
    return {
      paths: [],
      fallback: true
    }
  }

  const from = 'slug-paths'
  const { allPages } = await fetchGlobalAllData({ from })
  const paths = allPages
    ?.filter(row => checkSlugHasNoSlash(row))
    .map(row => ({ params: { prefix: row.slug } }))
  return {
    paths: paths,
    fallback: true
  }
}

export async function getStaticProps({ params: { prefix }, locale }) {
  const props = await resolvePostProps({
    prefix,
    locale,
  })
  return {
    props: stripMemberPostContent(props),
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
        'NEXT_REVALIDATE_SECOND',
        BLOG.NEXT_REVALIDATE_SECOND,
        props.NOTION_CONFIG
      )
  }
}

export default Slug
