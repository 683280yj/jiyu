# 星空聚合登录与会员文章

此功能适用于 Vercel 部署的 NotionNext。用户通过第三方账号登录后，网站用签名的 HttpOnly Cookie 维持会话。带有精确标签“会员专享”的页面从公开文章列表、搜索索引、站点地图和预览中隐藏；正文只在服务端校验会话后返回。

## Notion 页面标记

在要保护的 Notion 页面或文章的“标签”字段中添加：

会员专享

该标签会从访客可见的文章列表与导航中排除该页面。登录用户可通过页面原有 URL 阅读正文。移除标签即可恢复公开访问。

## Vercel 环境变量

在 Vercel 项目设置中添加以下变量。不要使用 NEXT_PUBLIC_ 前缀：

- XKZHI_APPID: 应用 ID，当前为 1023。
- XKZHI_APPKEY: 在登录服务后台重置后生成的新密钥。
- XKZHI_SESSION_SECRET: 至少 32 个随机字符，用于签名会话 Cookie。
- XKZHI_REDIRECT_URI: https://www.idky.tech/api/auth/xkzhi/callback

只把这些变量加到需要部署的 Vercel 环境。密钥不要提交到 Git、Notion 页面或浏览器代码。

## 登录服务回调设置

在服务后台的回调域名白名单中确认已允许 www.idky.tech。本实现将随机 OAuth state 放在回调地址的查询参数中，并要求服务回调时原样返回它；若服务没有保留 state，网站会拒绝该次登录，不应关闭此校验。

## 当前会员规则

此版本把“会员”定义为：完成任一受支持社交账号登录即可阅读会员专享页面。它不包含付费、人工审核、封禁名单或多级会员权限。
