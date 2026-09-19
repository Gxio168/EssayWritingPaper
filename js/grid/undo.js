/* 撤销 / 重做（路线 B：快照栈）。
 *
 * 一条记录 = 整篇快照 { text, caret, anchor }。相比旧版增量记录
 * [{idx, prev, next}]，快照不可能索引错位，撤销时光标随快照精确还原。
 *
 * 两道保护不变：
 * 1. app.undoBaseline —— 撤销不会退到本次打开之前；
 * 2. app.undoHistory —— 按答题纸 id 归档（未存档草稿记在 DRAFT_KEY 下）。
 *
 * 行数调整不再作废撤销栈：快照与行列结构无关，缩行截断也可以 Ctrl+Z 撤回。 */

import { DRAFT_KEY } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { toast } from '../ui/toast.js'
import { syncTextarea, renderText, renderCaret } from './render.js'
import { buildDOM } from './build.js'
import { updateStat } from './stat.js'
import { markDirty } from '../paper/autosave.js'

export function undo() {
  if (!app.undoStack.length) return
  // 不撤销到本次打开之前的状态，避免误触把刚打开的答题纸清空
  if (app.undoStack.length <= app.undoBaseline) {
    toast('已经回到打开时的状态了')
    return
  }
  const snap = app.undoStack.pop()
  app.redoStack.push({ text: app.text, caret: app.caret, anchor: app.anchor, rows: app.rows })
  applySnap(snap)
}

export function redo() {
  if (!app.redoStack.length) return
  const snap = app.redoStack.pop()
  app.undoStack.push({ text: app.text, caret: app.caret, anchor: app.anchor, rows: app.rows })
  applySnap(snap)
}

function applySnap(snap) {
  app.text = snap.text

  // 快照的行数与当前不同 = 这一步跨过了行数调整（如缩行截断的撤销）：
  // 行数跟着快照走并整表重建，保证容量与文字永远匹配
  if (snap.rows && snap.rows !== app.rows) {
    app.rows = snap.rows
    dom.rowsInput.value = snap.rows
    buildDOM()
  }

  syncTextarea(snap.caret, snap.anchor)
  renderText()
  renderCaret()
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
