/* 行数调整（1–200）。容量 = 行数 × 25。
 *
 * 路线 B 后撤销是快照栈，与行列结构无关——缩行截断**可以 Ctrl+Z 撤回**了，
 * 旧的「缩行整栈作废」约束随之取消。但确认弹窗保留：磁盘上的存档仍会被
 * 截短，多问一句总没错。 */

import { COLS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { openDialog } from '../ui/dialog.js'
import { markDirty } from '../paper/autosave.js'
import { pushUndo } from './engine.js'
import { syncTextarea, renderText, renderCaret } from './render.js'
import { buildDOM } from './build.js'

export function setRows(n) {
  n = parseInt(n, 10)
  if (isNaN(n)) n = app.rows
  n = Math.max(1, Math.min(200, n))
  dom.rowsInput.value = n
  if (n === app.rows) return

  const total = n * COLS
  if (app.text.length > total) {
    const lost = app.text.length - total
    const needed = Math.floor((app.text.length - 1) / COLS) + 1
    openDialog({
      title: '缩小行数会删掉文字',
      icon: 'danger',
      danger: true,
      message:
        '当前内容需要 <b>' + needed + '</b> 行，改成 <b>' + n + '</b> 行会丢掉最后 <b>' + lost +
        '</b> 个字。<br>这一步可以用 <b>Ctrl + Z</b> 撤回。',
      cancelText: '取消',
      confirmText: '仍要缩小',
    }).then(function (go) {
      dom.rowsInput.value = go ? n : app.rows
      if (go) applyRows(n)
    })
    return
  }

  applyRows(n)
}

function applyRows(n) {
  const total = n * COLS
  if (app.text.length > total) {
    pushUndo() // 必须在改 rows 之前：快照要记下缩行前的行数
    app.text = app.text.slice(0, total)
  }
  app.rows = n

  buildDOM()
  syncTextarea() // 光标收回有效范围
  renderText()
  renderCaret()
  markDirty()
}
