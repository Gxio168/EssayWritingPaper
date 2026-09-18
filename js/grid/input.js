/* 输入判定：把「input 框里现在是什么」翻译成一次格子操作。
 *
 * 三条分支（顺序即优先级）：
 * 1. 变空 → 删除并让后文前移。
 * 2. 落在空格、单字、且后面已无内容 → 直接填这一格（正常书写路径，不推动任何东西）。
 * 3. 其余情况 → 插入模式，后文整体后移。
 *
 * 输入法组词期间不会被调用到（由 events/grid.js 的 composing 闸门拦下）。 */

import { app } from '../state.js'
import { deleteAt, fillCell, hasContentAfter, insertChars } from './edit.js'
import { focusCell } from './focus.js'

export function processValue(inp) {
  if (!inp || !inp.isConnected) return

  const idx = Number(inp.dataset.idx)
  const raw = inp.value
  const prev = app.cells[idx] || ''

  if (raw === prev) return

  if (!raw) {
    if (prev) deleteAt(idx)
    return
  }

  const chars = Array.from(raw).filter(function (c) {
    return c !== '\n' && c !== '\r' && c !== '\t'
  })

  if (chars.length === 0) {
    inp.value = prev
    return
  }

  // 落在空格上且后面已经没有内容：直接填进这一格，不需要推动任何东西
  if (!prev && chars.length === 1 && !hasContentAfter(idx)) {
    fillCell(idx, chars[0])
    return
  }

  // 插不下（答题纸写满）：浏览器已经把新字写进这一格的输入框了，必须还原，
  // 否则画面与 state 分叉，下一次按键的比对基准也会跟着错。
  if (!insertChars(idx, chars)) {
    inp.value = prev
    focusCell(idx)
  }
}

export function handleBackspace(idx) {
  if (idx < 0 || idx >= app.cells.length) return

  // 退格 = 删除光标所在格：有字删字，是空格就把后面的内容整体前移补位
  deleteAt(idx)

  // 删除后光标统一向前挪一格（连按退格可以一路往前删）
  focusCell(idx - 1)
}

export function handleDelete(idx) {
  if (!app.cells[idx]) return
  deleteAt(idx)
  focusCell(idx)
}
