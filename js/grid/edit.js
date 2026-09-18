/* 核心编辑引擎：所有格子变化都从 applyChanges 走，它是唯一写 app.cells 的入口，
 * 也是唯一往撤销栈压记录的入口。
 *
 * 「插入模式」的语义：
 * - insertChars：从 idx 起把已有内容整体后移，腾出 n 个格子放新字符。
 *   剩余格子不够时**整次拒绝**并返回 false，绝不静默丢弃尾部文字。
 * - fillCell：往空格子里填一个字，什么都不推动。
 * - deleteAt：删掉 idx 并把 idx 之后的内容整体前移补位。 */

import { MAX_UNDO } from '../config.js'
import { app } from '../state.js'
import { toast } from '../ui/toast.js'
import { markDirty } from '../paper/autosave.js'
import { focusCell } from './focus.js'
import { updateStat } from './stat.js'
import { updateUndoButtons } from './undo.js'

export function applyChanges(changes) {
  const records = []
  for (const c of changes) {
    if (c.idx >= app.cells.length) continue
    const prev = app.cells[c.idx] || ''
    if (prev === c.ch) continue
    records.push({ idx: c.idx, prev: prev, next: c.ch })
    app.cells[c.idx] = c.ch
    if (app.inputs[c.idx]) app.inputs[c.idx].value = c.ch
  }
  if (!records.length) return

  app.undoStack.push(records)
  if (app.undoStack.length > MAX_UNDO) app.undoStack.shift()
  app.redoStack.length = 0

  updateStat()
  updateUndoButtons()
  markDirty()
}

// idx 之后是否还有已填的格子
export function hasContentAfter(idx) {
  for (let i = idx + 1; i < app.cells.length; i++) {
    if (app.cells[i]) return true
  }
  return false
}

// 直接把一个字填进指定的空格子，不影响任何其它格子
export function fillCell(idx, ch) {
  if (idx < 0 || idx >= app.cells.length) return
  if (app.cells[idx]) return
  applyChanges([{ idx: idx, ch: ch }])
  focusCell(idx + 1)
}

// 在 idx 位置插入若干字符，idx 及其后的内容整体后移。
// 返回 false = 剩余格子装不下，本次插入未发生任何改动（调用方需还原输入框）。
export function insertChars(idx, chars) {
  const total = app.cells.length
  const n = chars.length
  if (n === 0 || idx < 0 || idx >= total) return false

  let last = -1
  for (let i = total - 1; i >= idx; i--) {
    if (app.cells[i]) {
      last = i
      break
    }
  }

  // 被推动的最后一个字落在 last + n，没有内容可推时新字落在 idx + n - 1。
  // 越过末尾就意味着尾部文字会被挤出去——宁可整次不写，也不静默丢字。
  const highest = (last >= idx ? last : idx - 1) + n
  if (highest >= total) {
    toast('答题纸已写满（' + total + ' 字），先增加行数或删掉一些内容才能插入')
    return false
  }

  const changes = []

  if (last >= idx) {
    for (let i = last; i >= idx; i--) {
      const target = i + n
      if (target < total) {
        changes.push({ idx: target, ch: app.cells[i] })
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (idx + i < total) {
      changes.push({ idx: idx + i, ch: chars[i] })
    }
  }

  applyChanges(changes)
  focusCell(Math.min(idx + n, total - 1))
  return true
}

// 删除 idx 位置的字符，后面的内容整体前移
export function deleteAt(idx) {
  const total = app.cells.length
  if (idx < 0 || idx >= total) return

  let last = -1
  for (let i = total - 1; i >= idx; i--) {
    if (app.cells[i]) {
      last = i
      break
    }
  }
  if (last < idx) return

  const changes = []
  for (let i = idx + 1; i <= last; i++) {
    changes.push({ idx: i - 1, ch: app.cells[i] })
  }
  changes.push({ idx: last, ch: '' })

  applyChanges(changes)
}
