/* 字数统计：工具栏右侧的「已写 / 总格数」。字数不含空白（空格是留空的格子）。 */

import { COLS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { countChars } from '../lib/text.js'

export function updateStat() {
  dom.statEl.textContent =
    countChars(app.text) + ' / ' + app.rows * COLS + ' 字'
}
