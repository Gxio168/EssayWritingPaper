/* 网格 DOM 构建：rows 变化或切换答题纸时整表重建。
 *
 * 路线 B 后 #grid 是纯渲染层：每格一个 <div class="cell">，没有 input，
 * 输入由隐藏的 textarea（#hiddenInput）承担。格子按 dataset.idx 记序号；
 * 事件全部委托到 #grid 和 document 上，重建不需要重新绑定。
 * 光标竖线 .caret 也是在这里创建的唯一动态 DOM 引用（dom.caretEl）。 */

import { COLS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { updateStat } from './stat.js'
import { updateUndoButtons } from './undo.js'

export function buildDOM() {
  dom.gridEl.innerHTML = ''
  app.cellDivs = []
  app.rendered = []
  app.selRange = [-1, -1]
  app.curCell = -1

  const total = app.rows * COLS
  const frag = document.createDocumentFragment()

  for (let i = 0; i < total; i++) {
    const div = document.createElement('div')
    div.className = 'cell'
    div.dataset.idx = i
    frag.appendChild(div)
    app.cellDivs.push(div)
  }

  const caretEl = document.createElement('div')
  caretEl.className = 'caret'
  caretEl.style.display = 'none'
  frag.appendChild(caretEl)
  dom.caretEl = caretEl

  dom.gridEl.appendChild(frag)
  updateStat()
  updateUndoButtons()
}
