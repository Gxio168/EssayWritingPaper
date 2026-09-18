/* 字数统计：工具栏右侧的「已写 / 总格数」。 */

import { app } from '../state.js'
import { dom } from '../dom.js'

export function updateStat() {
  let n = 0
  for (let i = 0; i < app.cells.length; i++) if (app.cells[i]) n++
  dom.statEl.textContent = n + ' / ' + app.cells.length + ' 字'
}
