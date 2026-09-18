/* 撤销 / 重做。
 *
 * 一条「记录」= 一次操作造成的所有格子变化 [{ idx, prev, next }]，
 * 因为插入/删除会牵动一整段后移内容，必须整组回滚。
 *
 * 两道保护：
 * 1. app.undoBaseline —— 本次打开时的栈深度，撤销不会退到载入之前，
 *    避免误触 Ctrl+Z 把刚打开的答题纸清空。
 * 2. app.undoHistory —— 按答题纸 id 归档（未存档草稿记在 DRAFT_KEY 下），
 *    切换答题纸时 stash / restore，来回切不丢历史。 */

import { DRAFT_KEY } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { toast } from '../ui/toast.js'
import { focusCell } from './focus.js'
import { updateStat } from './stat.js'
import { markDirty } from '../paper/autosave.js'

export function undo() {
  if (!app.undoStack.length) return
  // 不撤销到本次打开之前的状态，避免误触把刚打开的答题纸清空
  if (app.undoStack.length <= app.undoBaseline) {
    toast('已经回到打开时的状态了')
    return
  }
  const records = app.undoStack.pop()
  app.redoStack.push(records)

  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i]
    app.cells[r.idx] = r.prev
    if (app.inputs[r.idx]) app.inputs[r.idx].value = r.prev
  }
  focusCell(records[0].idx)
  updateStat()
  updateUndoButtons()
  markDirty()
}

export function redo() {
  if (!app.redoStack.length) return
  const records = app.redoStack.pop()
  app.undoStack.push(records)

  for (const r of records) {
    app.cells[r.idx] = r.next
    if (app.inputs[r.idx]) app.inputs[r.idx].value = r.next
  }
  focusCell(records[records.length - 1].idx)
  updateStat()
  updateUndoButtons()
  markDirty()
}

export function updateUndoButtons() {
  dom.undoBtn.disabled = app.undoStack.length <= app.undoBaseline
  dom.redoBtn.disabled = app.redoStack.length === 0
}

// 撤销历史按答题纸归档：切走时存起来，切回时恢复
export function stashHistory() {
  if (!app.undoStack.length && !app.redoStack.length) return
  app.undoHistory.set(app.activeId || DRAFT_KEY, {
    undo: app.undoStack.slice(),
    redo: app.redoStack.slice(),
  })
}

export function restoreHistory(id) {
  const h = app.undoHistory.get(id || DRAFT_KEY)
  app.undoStack.length = 0
  app.redoStack.length = 0
  if (h) {
    app.undoStack.push.apply(app.undoStack, h.undo)
    app.redoStack.push.apply(app.redoStack, h.redo)
  }
  // 当前深度即本次“打开”位置，撤销不再往回退
  app.undoBaseline = app.undoStack.length
  updateUndoButtons()
}
