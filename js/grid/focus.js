/* 焦点：格子没有原生光标概念，焦点位置由 app.activeIdx + .cell.active 高亮表达。
 *
 * focusCell 会对目标格做整格全选，这样继续输入即触发「插入并把后文整体后移」。 */

import { app } from '../state.js'

export function setActive(idx) {
  if (app.activeIdx === idx) return
  if (app.activeIdx >= 0 && app.cellDivs[app.activeIdx]) {
    app.cellDivs[app.activeIdx].classList.remove('active')
  }
  app.activeIdx = idx
  if (idx >= 0 && app.cellDivs[idx]) {
    app.cellDivs[idx].classList.add('active')
  }
}

export function focusCell(idx) {
  if (!app.inputs.length) return
  if (idx < 0) idx = 0
  if (idx >= app.inputs.length) idx = app.inputs.length - 1

  const inp = app.inputs[idx]
  inp.focus()
  try {
    inp.setSelectionRange(0, inp.value.length)
  } catch (e) {}
  setActive(idx)
}
