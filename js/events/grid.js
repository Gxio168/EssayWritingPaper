/* 网格输入（路线 B）：唯一接收键入的元素是隐藏的 #hiddenInput textarea。
 *
 * 浏览器替我们做了最难的部分：打字、退格/删除的方向语义、左右方向键、
 * 拖选、双击选词、IME 组合窗口——全部发生在 textarea 里，原生且正确。
 * 这里只做三件事：
 * 1. input 事件：diff textarea 新值与 app.text，经容量检查后交给引擎；
 * 2. keydown：拦下需要「格子语义」的键（Enter/上下/Home/End/撤销），
 *    Tab 故意不拦——让焦点能走出网格；
 * 3. 鼠标：点格子 → caret，拖动 → 跨格选区，双击 → 选连续非空白段。 */

import { COLS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { diffTexts } from '../lib/text.js'
import { capacity, commit, replaceRange } from '../grid/engine.js'
import { syncTextarea, readSelFromTa, renderCaret } from '../grid/render.js'
import { clampCaret, setCaret } from '../grid/caret.js'
import { undo, redo } from '../grid/undo.js'
import { toast } from '../ui/toast.js'

export function bindGridEvents() {
  const ta = dom.hiddenInput

  /* ---------- 编辑：diff → 引擎 ---------- */

  let preSel = null
  ta.addEventListener('beforeinput', function () {
    preSel = { caret: app.caret, anchor: app.anchor }
  })

  ta.addEventListener('input', function () {
    const val = ta.value
    if (/[\n\r\t]/.test(val)) return revertEdit()
    if (val === app.text) {
      readSelFromTa()
      renderCaret()
      return
    }
    if (val.length > capacity()) {
      revertEdit()
      toast('答题纸已写满（' + capacity() + ' 字），先增加行数或删掉一些内容才能插入')
      return
    }
    const d = diffTexts(app.text, val)
    commit(d.pos, d.removed, d.inserted)
  })

  // 整次拒绝：还原 textarea 的值与选区，画面与 state 不分叉
  function revertEdit() {
    ta.value = app.text
    syncTextarea(preSel ? preSel.caret : app.caret, preSel ? preSel.anchor : app.anchor)
    renderCaret()
  }

  /* ---------- 键盘 ---------- */

  ta.addEventListener('keydown', function (e) {
    const mod = e.ctrlKey || e.metaKey
    if (mod) {
      const k = (e.key || '').toLowerCase()
      if (k === 'z') {
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) redo()
        else undo()
      } else if (k === 'y') {
        e.preventDefault()
        e.stopPropagation()
        redo()
      }
      // 其余组合键（Ctrl+S / Ctrl+Alt+N…）放行给全局监听
      return
    }
    if (e.isComposing || e.keyCode === 229) return

    switch (e.key) {
      case 'Enter': {
        // 另起一行 = 落到下一行行首。行首在正文内就纯导航；
        // 在正文末尾之外就垫空格把光标送过去（空格 = 留空的格子，不计字数）
        e.preventDefault()
        e.stopPropagation()
        const p = app.caret
        const target = Math.floor(p / COLS) * COLS + COLS
        if (target <= app.text.length) {
          setCaret(target, target)
        } else if (app.anchor === app.caret) {
          if (target <= capacity()) replaceRange(p, p, ' '.repeat(target - p))
          // 超过容量：没有下一行可去，忽略
        } else {
          setCaret(app.text.length, app.text.length)
        }
        break
      }
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        moveCaret(-COLS, e.shiftKey)
        break
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        moveCaret(COLS, e.shiftKey)
        break
      case 'Home':
        e.preventDefault()
        e.stopPropagation()
        rowNav(false, e.shiftKey)
        break
      case 'End':
        e.preventDefault()
        e.stopPropagation()
        rowNav(true, e.shiftKey)
        break
      // Tab 故意不拦截：让焦点走出网格到工具栏（修复旧版 Tab 被无条件吞掉）
      default:
        break
    }
  })

  function moveCaret(dp, extend) {
    const head = clampCaret(app.caret + dp)
    if (extend) setCaret(head, app.anchor)
    else setCaret(head, head)
  }

  function rowNav(toEnd, extend) {
    const rowStart = Math.floor(app.caret / COLS) * COLS
    const target = toEnd ? Math.min(rowStart + COLS, app.text.length) : rowStart
    if (extend) setCaret(target, app.anchor)
    else setCaret(target, target)
  }

  /* ---------- 粘贴：过滤换行，整段替换选区 ---------- */

  ta.addEventListener('paste', function (e) {
    e.preventDefault()
    e.stopPropagation()
    const text = (e.clipboardData || window.clipboardData).getData('text') || ''
    const chars = Array.from(text)
      .filter(function (c) {
        return c !== '\n' && c !== '\r' && c !== '\t'
      })
      .join('')
    if (!chars) return
    replaceRange(ta.selectionStart, ta.selectionEnd, chars)
  })

  /* ---------- 原生选区变化（左右方向键 / Shift+左右）同步到网格 ---------- */

  document.addEventListener('selectionchange', function () {
    if (document.activeElement !== ta) return
    readSelFromTa()
    renderCaret()
  })

  /* ---------- 鼠标：点格子定位 / 拖动选区 / 双击选段 ---------- */

  let dragging = false

  dom.gridEl.addEventListener('mousedown', function (e) {
    const cell = e.target.closest && e.target.closest('.cell')
    if (!cell) return
    e.preventDefault() // 不让焦点掉到 body 上
    const p = hitCaret(cell, e)
    ta.focus()
    if (e.shiftKey) setCaret(p, app.anchor)
    else {
      dragging = true
      setCaret(p, p)
    }
  })

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const cell = el && el.closest ? el.closest('.cell') : null
    if (cell) setCaret(hitCaret(cell, e), app.anchor)
  })

  document.addEventListener('mouseup', function () {
    dragging = false
  })

  dom.gridEl.addEventListener('dblclick', function (e) {
    const cell = e.target.closest && e.target.closest('.cell')
    if (!cell) return
    e.preventDefault()
    const idx = Number(cell.dataset.idx)
    if (idx >= app.text.length || /\s/.test(app.text[idx] || ' ')) {
      ta.focus()
      setCaret(idx, idx)
      return
    }
    let a = idx
    let b = idx + 1
    while (a > 0 && !/\s/.test(app.text[a - 1])) a--
    while (b < app.text.length && !/\s/.test(app.text[b])) b++
    ta.focus()
    setCaret(b, a)
  })

  // 点格子左半 → 光标在该格之前；右半 → 在该格之后
  function hitCaret(cell, e) {
    const idx = Number(cell.dataset.idx)
    const rect = cell.getBoundingClientRect()
    const after = e.clientX - rect.left > rect.width / 2
    return clampCaret(idx + (after ? 1 : 0))
  }
}
