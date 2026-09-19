/* 渲染层：把 app.text / 光标 / 选区画到格子上，并保持隐藏 textarea 的值同步。
 *
 * 三条规则：
 * 1. renderText 只重写内容变化的格子（app.rendered 记上次画过什么）；
 * 2. renderCaret 的选区/当前格高亮只在上次范围不同才遍历格子；
 * 3. syncTextarea 是「程序性写 textarea」的唯一入口——直接赋值 .value 会把
 *    选区重置到末尾，所以每次赋值后必须立刻恢复 selection。 */

import { COLS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'

// 把隐藏 textarea 的值与选区同步成 app.text / 指定光标。
// caret / anchor 省略时沿用 app 上的现值（只做钳制）。
export function syncTextarea(caret, anchor) {
  const ta = dom.hiddenInput
  if (ta.value !== app.text) ta.value = app.text

  const len = app.text.length
  let c = caret === undefined ? app.caret : caret
  let a = anchor === undefined ? app.caret : anchor
  c = Math.max(0, Math.min(c, len))
  a = Math.max(0, Math.min(a, len))
  try {
    ta.setSelectionRange(Math.min(a, c), Math.max(a, c), a <= c ? 'forward' : 'backward')
  } catch (e) {}
  app.caret = c
  app.anchor = a
}

// 从 textarea 读回选区（打字/原生方向键移动后，浏览器已经改好了 selection）
export function readSelFromTa() {
  const ta = dom.hiddenInput
  const s = ta.selectionStart
  const e = ta.selectionEnd
  const backward = ta.selectionDirection === 'backward'
  app.caret = backward ? s : e
  app.anchor = backward ? e : s
}

// 按字符串铺格子：只更新内容变化的格子
export function renderText() {
  const cells = app.cellDivs
  for (let i = 0; i < cells.length; i++) {
    const ch = app.text[i] || ''
    if (app.rendered[i] !== ch) {
      cells[i].textContent = ch
      app.rendered[i] = ch
    }
  }
  app.rendered.length = cells.length
}

// 光标竖线 + 选区跨格高亮 + 当前格软高亮
export function renderCaret() {
  const total = app.rows * COLS
  const a = Math.min(app.anchor, app.caret)
  const b = Math.max(app.anchor, app.caret)

  if (app.selRange[0] !== a || app.selRange[1] !== b) {
    for (let i = 0; i < total; i++) {
      const el = app.cellDivs[i]
      if (el) el.classList.toggle('sel', a < b && i >= a && i < b)
    }
    app.selRange = [a, b]
  }

  // 当前格 = 下一个字要落进去的格子
  const head = Math.max(0, Math.min(app.caret, total))
  const cur = Math.min(head, total - 1)
  if (app.curCell !== cur) {
    if (app.curCell >= 0 && app.cellDivs[app.curCell]) {
      app.cellDivs[app.curCell].classList.remove('cur')
    }
    if (app.cellDivs[cur]) app.cellDivs[cur].classList.add('cur')
    app.curCell = cur
  }

  const el = dom.caretEl
  if (!el) return
  if (head >= total) {
    el.style.display = 'none'
    return
  }
  const size = cellSize()
  el.style.display = 'block'
  el.style.left = (head % COLS) * size + 'px'
  el.style.top = Math.floor(head / COLS) * size + 'px'
  el.style.height = size + 'px'
}

function cellSize() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--cell')
  const n = parseFloat(v)
  return isNaN(n) ? 36 : n
}
