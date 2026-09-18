/* 全局快捷键与页面级自动保存。
 *
 * 两条必须保住的规则：
 * 1. app.dlgOpen 为真时直接 return —— 弹窗开着的时候 Ctrl+S / Ctrl+Shift+N 不生效，
 *    否则会边打字边改存档。Esc 关抽屉由这里处理（关弹窗是 dialog.js 自己的捕获监听）。
 * 2. 只有「已存档」的答题纸才在切标签页 / 关页面时静默落盘；
 *    未存档草稿有内容时用 beforeunload 拦一次。 */

import { app } from '../state.js'
import { countChars } from '../lib/text.js'
import { setDrawer } from '../ui/drawer.js'
import { isSaved } from '../paper/model.js'
import { autosave } from '../paper/autosave.js'
import { savePaper, newPaper } from '../paper/crud.js'

export function bindGlobalEvents() {
  document.addEventListener('keydown', function (e) {
    const mod = e.ctrlKey || e.metaKey
    if (!mod) {
      if (e.key === 'Escape') setDrawer(false)
      return
    }
    if (app.dlgOpen) return // 弹窗打开时不触发全局操作
    const k = (e.key || '').toLowerCase()
    if (k === 's') {
      e.preventDefault()
      savePaper()
    } else if (k === 'n' && e.shiftKey) {
      e.preventDefault()
      newPaper()
    }
  })

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && app.dirty && isSaved()) autosave()
  })

  window.addEventListener('beforeunload', function () {
    if (app.dirty && isSaved()) {
      autosave()
    } else if (app.dirty && countChars(app.cells) > 0) {
      return '当前答题纸尚未保存，确定要离开吗？'
    }
    return undefined
  })
}
