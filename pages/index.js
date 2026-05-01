import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, getPostBlocks } from '@/lib/db/SiteDataApi'
import { generateRobotsTxt } from '@/lib/utils/robots.txt'
import { generateRss } from '@/lib/utils/rss'
import { generateSitemapXml } from '@/lib/utils/sitemap.xml'
import { DynamicLayout } from '@/themes/theme'
import { generateRedirectJson } from '@/lib/utils/redirect'
import { checkDataFromAlgolia } from '@/lib/plugins/algolia'
import { delay } from '@/lib/utils'

/**
 * 首页布局
 * @param {*} props
 * @returns
 */
const Index = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutIndex' {...props} />
}

/**
 * SSG 获取数据
 * @returns
 */
export async function getStaticProps(req) {
  const { locale } = req
  const from = 'index'
  let props = await fetchGlobalAllData({ from, locale })
  if (isNotionFetchFailed(props)) {
    await delay(1000)
    props = await fetchGlobalAllData({ from: `${from}-retry`, locale })
  }
  const POST_PREVIEW_LINES = siteConfig(
    'POST_PREVIEW_LINES',
    12,
    props?.NOTION_CONFIG
  )
  props.posts = props.allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )

  // 处理分页
  if (siteConfig('POST_LIST_STYLE') === 'scroll') {
    // 滚动列表默认给前端返回所有数据
  } else if (siteConfig('POST_LIST_STYLE') === 'page') {
    props.posts = props.posts?.slice(
      0,
      siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)
    )
  }

  // 预览文章内容
  if (siteConfig('POST_LIST_PREVIEW', false, props?.NOTION_CONFIG)) {
    for (const i in props.posts) {
      const post = props.posts[i]
      if (post.password && post.password !== '') {
        continue
      }
      post.blockMap = await getPostBlocks(post.id, 'slug', POST_PREVIEW_LINES)
    }
  }

  if (shouldRunBuildTasks()) {
    await runBuildTasks(props)
  }

  // 生成全文索引 - 仅在 yarn build 时执行 && process.env.npm_lifecycle_event === 'build'

  delete props.allPages

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

function isNotionFetchFailed(props) {
  return props?.allPages?.some(page => page?.slug === 'oops')
}

function shouldRunBuildTasks() {
  return process.env.npm_lifecycle_event === 'build' || process.env.EXPORT
}

async function runBuildTasks(props) {
  const tasks = [
    ['robots', () => generateRobotsTxt(props)],
    ['rss', () => generateRss(props)],
    ['sitemap', () => generateSitemapXml(props)],
    ['algolia', () => checkDataFromAlgolia(props)]
  ]
  if (siteConfig('UUID_REDIRECT', false, props?.NOTION_CONFIG)) {
    tasks.push(['redirect', () => generateRedirectJson(props)])
  }

  for (const [name, task] of tasks) {
    try {
      await task()
    } catch (error) {
      console.warn(`[Index build task] ${name} skipped`, error?.message)
    }
  }
}

export default Index
