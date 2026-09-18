/* 行数调整（1–200），行列结构一变，格子数组随之增减。
 *
 * 关键约束：结构变化后旧的撤销记录里存的索引不再可靠，必须整栈作废
 * （连同该答题纸归档的历史），并把 baseline 归零。 */

import { COLS, DRAFT_KEY } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { markDirty } from '../paper/autosave.js'
import { buildDOM } from './build.js'

export function setRows(n) {
  n = parseInt(n, 10)
  if (isNaN(n)) n = app.rows
  n = Math.max(1, Math.min(200, n))
  dom.rowsInput.value = n
  if (n === app.rows) return
  app.rows = n

  const total = app.rows * COLS
  while (app.cells.length < total) app.cells.push('')
  if (app.cells.length > total) app.cells.length = total

  // 行列结构变化后，旧的撤销记录索引不再可靠
  app.undoStack.length = 0
  app.redoStack.length = 0
  app.undoBaseline = 0
  app.undoHistory.delete(app.activeId || DRAFT_KEY)

  buildDOM()
  markDirty()
}
