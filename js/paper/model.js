/* 答题纸记录的只读查询与构造。不含任何副作用（不写存储、不碰 DOM）。
 *
 * 记录结构：{ id, name, rows, data(稀疏 map), wordCount, createdAt, updatedAt } */

import { uid } from '../lib/format.js'
import { toSparse, countChars } from '../lib/text.js'
import { app } from '../state.js'

export function buildCurrent(name) {
  const now = Date.now()
  return {
    id: uid(),
    name: name,
    rows: app.rows,
    data: toSparse(app.cells),
    wordCount: countChars(app.cells),
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
