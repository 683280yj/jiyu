import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

const providers = [
  ['qq', 'QQ'],
  ['wx', '微信'],
  ['github', 'GitHub'],
  ['google', 'Google'],
  ['microsoft', 'Microsoft'],
  ['sina', '微博'],
  ['baidu', '百度'],
  ['huawei', '华为'],
  ['dingtalk', '钉钉'],
  ['gitee', 'Gitee']
]

const errorMessages = {
  state: '登录回调校验失败，请重新发起登录。',
  callback: '登录没有完成，请换一个平台或稍后重试。',
  not_configured: '登录服务尚未配置完成。',
  success: '登录成功。'
}

export default function MemberLogin() {
  const router = useRouter()
  const [status, setStatus] = useState({ loading: true, configured: false, user: null })

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/xkzhi/session', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => {
        if (!cancelled) {
          setStatus({
            loading: false,
            configured: Boolean(data.configured),
            user: data.user || null
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ loading: false, configured: false, user: null })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const nextValue = Array.isArray(router.query.next)
    ? router.query.next[0]
    : router.query.next
  const next =
    typeof nextValue === 'string' &&
    nextValue.startsWith('/') &&
    !nextValue.startsWith('//') &&
    !nextValue.includes('\\')
      ? nextValue
      : '/member/login?success=1'

  const error = Array.isArray(router.query.error)
    ? router.query.error[0]
    : router.query.error
  const notice = errorMessages[error] ||
    (router.query.success ? errorMessages.success : '')

  const logout = async () => {
    await fetch('/api/auth/xkzhi/logout', { method: 'POST' })
    setStatus(current => ({ ...current, user: null }))
  }

  return (
    <main className='min-h-screen px-5 py-16 flex justify-center bg-gray-50 dark:bg-gray-950'>
      <section className='w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-7 md:p-10 shadow-sm'>
        <a href='/' className='text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white'>
          ← 返回首页
        </a>
        <h1 className='mt-6 text-2xl font-semibold text-gray-900 dark:text-white'>
          会员登录
        </h1>
        <p className='mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300'>
          登录后可阅读标记为“会员专享”的文章。登录仅用于身份识别，不代表付费或人工审核会员资格。
        </p>

        {notice && (
          <p role='status' className='mt-5 rounded-lg bg-blue-50 dark:bg-blue-950 px-4 py-3 text-sm text-blue-800 dark:text-blue-200'>
            {notice}
          </p>
        )}

        {status.loading ? (
          <p className='mt-8 text-sm text-gray-500'>正在检查登录状态…</p>
        ) : status.user ? (
          <div className='mt-8 rounded-xl border border-gray-200 dark:border-gray-700 p-4'>
            <div className='flex items-center gap-3'>
              {status.user.avatar ? (
                <img
                  src={status.user.avatar}
                  alt=''
                  referrerPolicy='no-referrer'
                  className='h-12 w-12 rounded-full object-cover'
                />
              ) : (
                <div className='h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center'>
                  {status.user.nickname?.slice(0, 1) || '会'}
                </div>
              )}
              <div>
                <p className='font-medium text-gray-900 dark:text-white'>
                  {status.user.nickname}
                </p>
                <p className='text-xs text-gray-500'>已通过 {status.user.provider} 登录</p>
              </div>
            </div>
            <div className='mt-5 flex gap-3'>
              <a href={next} className='rounded-lg bg-gray-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-gray-900'>
                继续阅读
              </a>
              <button
                type='button'
                onClick={logout}
                className='rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm'>
                退出登录
              </button>
            </div>
          </div>
        ) : status.configured ? (
          <div className='mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {providers.map(([type, label]) => (
              <a
                key={type}
                href={'/api/auth/xkzhi/start?type=' + encodeURIComponent(type) + '&next=' + encodeURIComponent(next)}
                className='rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-3 text-center text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800'>
                使用 {label} 登录
              </a>
            ))}
          </div>
        ) : (
          <p className='mt-8 rounded-lg bg-amber-50 dark:bg-amber-950 px-4 py-3 text-sm text-amber-900 dark:text-amber-100'>
            登录服务尚未完成配置，请稍后再试。
          </p>
        )}

        <p className='mt-8 text-xs leading-5 text-gray-500'>
          登录凭证由第三方平台验证。网站只保留登录所需的账号标识、昵称和头像，并通过安全会话 Cookie 记住登录状态。
        </p>
      </section>
    </main>
  )
}
