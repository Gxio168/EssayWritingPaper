/* 行数调整（1–200），行列结构一变，格子数组随之增减。
 *
 * 两条关键约束：
 * 1. 结构变化后旧的撤销记录里存的索引不再可靠，必须整栈作废
 *    （连同该答题纸归档的历史），并把 baseline 归零。
 * 2. 正因为第 1 条，缩小行数会**不可撤销**地砍掉尾部文字，
 *    所以只要有文字会被砍掉就必须先问一句——静默丢数据是这个模块唯一不可接受的输出。 */

import { COLS, DRAFT_KEY } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { openDialog } from '../ui/dialog.js'
import { markDirty } from '../paper/autosave.js'
import { buildDOM } from './build.js'

export function setRows(n) {
  n = parseInt(n, 10)
  if (isNaN(n)) n = app.rows
  n = Math.max(1, Math.min(200, n))
  dom.rowsInput.value = n
  if (n === app.rows) return

  const total = n * COLS
  // 不假设内容前缀连续（导入的数据允许有空洞）：直接数被留在截断区之外的字。
  let lost = 0
  let lastFilled = -1
  for (let i = 0; i < app.cells.length; i++) {
    if (!app.cells[i]) continue
    lastFilled = i
    if (i >= total) lost++
  }
  if (lost > 0) {
    const needed = Math.floor(lastFilled / COLS) + 1
    openDialog({
      title: '缩小行数会删掉文字',
      icon: 'danger',
      danger: true,
      message:
        '当前内容需要 <b>' + needed + '</b> 行，改成 <b>' + n + '</b> 行会丢掉最后 <b>' + lost +
        '</b> 个字。<br>行数变化会让撤销失效，这一步<b>无法用 Ctrl + Z 撤回</b>。',
      cancelText: '取消',
      confirmText: '仍要缩小',
    }).then(function (go) {
      dom.rowsInput.value = go ? n : app.rows
      if (go) applyRows(n)
    })
    return
  }

  applyRows(n)
}

function applyRows(n) {
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
