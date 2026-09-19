/* 答题纸记录的只读查询与构造。不含任何副作用（不写存储、不碰 DOM）。
 *
 * 记录结构：{ id, name, rows, data(稀疏 map), wordCount, createdAt, updatedAt }
 * data 由 app.text 转换而来，存档格式与旧版完全一致。 */

import { uid } from '../lib/format.js'
import { textToSparse, countChars } from '../lib/text.js'
import { app } from '../state.js'

export function buildCurrent(name) {
  const now = Date.now()
  return {
    id: uid(),
    name: name,
    rows: app.rows,
    data: textToSparse(app.text),
    wordCount: countChars(app.text),
    createdAt: now,
    updatedAt: now,
  }
}

export function findPaper(id) {
  for (let i = 0; i < app.papers.length; i++) if (app.papers[i].id === id) return app.papers[i]
  return null
}

// 当前编辑的这张是否已经在库里（决定 dirty 时能否自动落盘）
export function isSaved() {
  return !!(app.activeId && findPaper(app.activeId))
}
