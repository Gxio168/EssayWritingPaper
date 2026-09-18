/* 网格 DOM 构建：rows 变化或切换答题纸时整表重建。
 *
 * 每格一个 <input type=text>，靠 dataset.idx 记住自己的格子序号；
 * 事件全部委托到 #grid 上（见 events/grid.js），所以重建不需要重新绑定。
 * 只补长 cells 数组、不截断——缩短由 resize.js 负责。 */

import { COLS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { updateStat } from './stat.js'
import { updateUndoButtons } from './undo.js'

export function buildDOM() {
  dom.gridEl.innerHTML = ''
  app.inputs = []
  app.cellDivs = []
  app.activeIdx = -1

  const frag = document.createDocumentFragment()
  const total = app.rows * COLS

  while (app.cells.length < total) app.cells.push('')

  for (let i = 0; i < total; i++) {
    const div = document.createElement('div')
    div.className = 'cell'

    const inp = document.createElement('input')
    inp.type = 'text'
    inp.autocomplete = 'off'
    inp.spellcheck = false
    inp.setAttribute('autocorrect', 'off')
    inp.setAttribute('autocapitalize', 'off')
    inp.dataset.idx = i
    inp.value = app.cells[i] || ''

    div.appendChild(inp)
    frag.appendChild(div)

    app.inputs.push(inp)
    app.cellDivs.push(div)
  }

  dom.gridEl.appendChild(frag)
  updateStat()
  updateUndoButtons()
}
