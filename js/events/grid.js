/* #grid 上的事件委托：一格一 input，但监听器只挂在容器上，重建网格后无需重绑。
 *
 * composing 闸门：输入法组词期间的 input 事件一律忽略，改由 compositionend
 * 统一结算，否则会把一个汉字的中间态当成多次输入。
 * setTimeout(...,0) 是为了等浏览器把值落到 input 上再读。 */

import { COLS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { setActive, focusCell } from '../grid/focus.js'
import { insertChars } from '../grid/edit.js'
import { undo, redo } from '../grid/undo.js'
import { processValue, handleBackspace, handleDelete } from '../grid/input.js'

export function bindGridEvents() {
  dom.gridEl.addEventListener('focusin', function (e) {
    if (e.target.tagName !== 'INPUT') return
    const inp = e.target
    setActive(Number(inp.dataset.idx))
    setTimeout(function () {
      if (!inp.isConnected) return
      try {
        inp.setSelectionRange(0, inp.value.length)
      } catch (err) {}
    }, 0)
  })

  dom.gridEl.addEventListener('compositionstart', function () {
    app.composing = true
  })

  dom.gridEl.addEventListener('compositionend', function (e) {
    app.composing = false
    const inp = e.target
    if (!inp || inp.tagName !== 'INPUT') return
    setTimeout(function () {
      if (!inp.isConnected) return
      const idx = Number(inp.dataset.idx)
      if (inp.value !== (app.cells[idx] || '')) {
        processValue(inp)
      }
    }, 0)
  })

  dom.gridEl.addEventListener('input', function (e) {
    const inp = e.target
    if (inp.tagName !== 'INPUT') return
    if (app.composing || e.isComposing) return
    processValue(inp)
  })

  dom.gridEl.addEventListener('keydown', function (e) {
    const inp = e.target
    if (!inp || inp.tagName !== 'INPUT') return

    const idx = Number(inp.dataset.idx)
    const mod = e.ctrlKey || e.metaKey

    if (mod && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
      return
    }
    if (mod && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault()
      redo()
      return
    }
    if (mod) return

    switch (e.key) {
      case 'Backspace':
        e.preventDefault()
        handleBackspace(idx)
        break
      case 'Delete':
        e.preventDefault()
        handleDelete(idx)
        break
      case 'Enter':
        // 另起一行 = 落到下一行行首，而不是下一行的同一列
        e.preventDefault()
        focusCell(idx - (idx % COLS) + COLS)
        break
      case 'ArrowLeft':
        e.preventDefault()
        focusCell(idx - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        focusCell(idx + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusCell(idx - COLS)
        break
      case 'ArrowDown':
        e.preventDefault()
        focusCell(idx + COLS)
        break
      case 'Home':
        e.preventDefault()
        focusCell(idx - (idx % COLS))
        break
      case 'End':
        e.preventDefault()
        focusCell(idx - (idx % COLS) + COLS - 1)
        break
      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) focusCell(idx - 1)
        else focusCell(idx + 1)
        break
      default:
        break
    }
  })

  dom.gridEl.addEventListener('paste', function (e) {
    const inp = e.target
    if (!inp || inp.tagName !== 'INPUT') return
    e.preventDefault()

    const text = (e.clipboardData || window.clipboardData).getData('text') || ''
    const chars = Array.from(text).filter(function (c) {
      return c !== '\n' && c !== '\r' && c !== '\t'
    })
    if (!chars.length) return

    const idx = Number(inp.dataset.idx)
    insertChars(idx, chars)
  })
}
