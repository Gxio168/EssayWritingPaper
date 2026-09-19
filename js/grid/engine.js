/* 核心编辑引擎（路线 B）：文档是一个字符串 app.text。
 *
 * 所有格子变化都从这三个入口走：
 * - commit：输入事件的路径。textarea 的值已经是新文本，这里只负责把 diff
 *   应用到 app.text 并从 textarea 读回选区（不碰 .value，避免选区重置）。
 * - replaceRange：程序性替换（粘贴、Enter 垫空格）。装不下时整次拒绝返回
 *   false，绝不静默丢尾部文字。
 * - setText：整篇替换（载入、清空、撤销恢复）。不做容量检查，不做快照。
 *
 * 每次改动前由 pushUndo 压入 {text, caret, anchor} 快照——快照彼此独立，
 * 撤销时光标随快照精确还原。 */

import { COLS, MAX_UNDO } from '../config.js'
import { app } from '../state.js'
import { toast } from '../ui/toast.js'
import { markDirty } from '../paper/autosave.js'
import { syncTextarea, readSelFromTa, renderText, renderCaret } from './render.js'
import { updateStat } from './stat.js'
import { updateUndoButtons } from './undo.js'

export function capacity() {
  return app.rows * COLS
}

function afterChange() {
  updateStat()
  updateUndoButtons()
  markDirty()
}

// 编辑前压栈：快照记录「改动之前」的全文、光标与行数。
// 行数必须进快照：缩行截断后按 Ctrl+Z，恢复长文本的同时要把行数也带回来。
export function pushUndo() {
  app.undoStack.push({
    text: app.text,
    caret: app.caret,
    anchor: app.anchor,
    rows: app.rows,
  })
  if (app.undoStack.length > MAX_UNDO) app.undoStack.shift()
  app.redoStack.length = 0
}

// 输入事件路径：pos 处删 removed 个字符、插入 inserted（调用方已做过容量检查）
export function commit(pos, removed, inserted) {
  pushUndo()
  app.text = app.text.slice(0, pos) + inserted + app.text.slice(pos + removed)
  readSelFromTa()
  renderText()
  renderCaret()
  afterChange()
}

// 程序性替换 [a, b) → str。返回 false = 容量装不下，本次未发生任何改动。
export function replaceRange(a, b, str) {
  a = Math.max(0, Math.min(a, app.text.length))
  b = Math.max(a, Math.min(b, app.text.length))
  if (app.text.length - (b - a) + str.length > capacity()) {
    toast('答题纸已写满（' + capacity() + ' 字），先增加行数或删掉一些内容才能插入')
    return false
  }
  pushUndo()
  app.text = app.text.slice(0, a) + str + app.text.slice(b)
  syncTextarea(a + str.length, a + str.length)
  renderText()
  renderCaret()
  afterChange()
  return true
}

// 整篇替换（载入存档、清空、缩行截断）。不做快照，由调用方决定是否 pushUndo。
export function setText(text, caret, anchor) {
  app.text = String(text)
  syncTextarea(caret === undefined ? app.text.length : caret, anchor)
  renderText()
  renderCaret()
  afterChange()
}

// 清空当前答题纸（可撤销）
export function clearAll() {
  if (!app.text) return
  pushUndo()
  setText('', 0, 0)
}
