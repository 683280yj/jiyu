import BLOG from "@/blog.config"

export default function getAllPageIds(collectionQuery, collectionId, collectionView, viewIds) {
  if (!collectionQuery && !collectionView) {
    return []
  }
  let pageIds = []
  const queryViews = getCollectionQueryViews(collectionQuery, collectionId)

  try {
    // Notion数据库中的第几个视图用于站点展示和排序：
    const groupIndex = BLOG.NOTION_INDEX || 0
    if (viewIds && viewIds.length > 0) {
      const viewId = viewIds[groupIndex] || viewIds[0]
      const view = queryViews?.[viewId]
      const ids = getBlockIdsFromView(view)
      if (ids) {
        for (const id of ids) {
          pageIds.push(id)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching page IDs:', { collectionId, viewIds }, error)
  }

  // 否则按照数据库原始排序
  if (pageIds.length === 0 && queryViews && Object.values(queryViews).length > 0) {
    const pageSet = new Set()
    Object.values(queryViews).forEach(view => {
      getBlockIdsFromView(view)?.forEach(id => pageSet.add(id))
    })
    pageIds = [...pageSet]
    // console.log('PageIds: 从collectionQuery获取', collectionQuery, pageIds.length)
  }
  return pageIds
}

function getCollectionQueryViews(collectionQuery, collectionId) {
  if (!collectionQuery || !collectionId) {
    return null
  }
  return (
    collectionQuery[collectionId] ||
    collectionQuery[toUuid(collectionId)] ||
    collectionQuery[collectionId.replaceAll?.('-', '')]
  )
}

function getBlockIdsFromView(view) {
  if (!view) {
    return []
  }
  if (Array.isArray(view.blockIds)) {
    return view.blockIds
  }
  const groupResults = view.collection_group_results
  if (Array.isArray(groupResults?.blockIds)) {
    return groupResults.blockIds
  }
  if (groupResults && typeof groupResults === 'object') {
    return Object.values(groupResults).flatMap(result => result?.blockIds || [])
  }
  return []
}

function toUuid(id) {
  if (!id || id.includes('-')) {
    return id
  }
  return id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
}
