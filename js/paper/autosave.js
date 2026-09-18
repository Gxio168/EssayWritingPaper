/* 脏标记与自动保存。
 *
 * 分工很关键：只有「已存档」的答题纸才会自动落盘。未命名的新草稿绝不偷偷写库，
 * 由用户点「保存」决定何时留档——这样半途的空白草稿不会污染左侧记录列表。
 *
 * markDirty 是网格层（edit/undo/resize）唯一的出口，所以那个方向只有单向依赖：
 * grid/* → paper/autosave → paper/header + paper/library + storage。 */

import { AUTOSAVE_DELAY } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { persist } from '../storage/store.js'
import { toSparse, countChars } from '../lib/text.js'
import { findPaper, isSaved } from './model.js'
import { updateHeader } from './header.js'
import { renderList, updateActiveBadge } from './library.js'

export function markDirty() {
  app.dirty = true
  updateHeader()
  updateActiveBadge()
  clearTimeout(app.saveTimer)
  app.saveTimer = setTimeout(function () {
    // 未命名/未保存的草稿不自动落盘，由用户点击“保存”决定
    if (isSaved()) autosave()
  }, AUTOSAVE_DELAY)
}

export function autosave() {
  const p = app.activeId ? findPaper(app.activeId) : null
  if (!p) return
  if (dom.nameInput.value.trim()) p.name = dom.nameInput.value.trim()
  p.rows = app.rows
  p.data = toSparse(app.cells)
  p.wordCount = countChars(app.cells)
  p.updatedAt = Date.now()
  if (persist()) {
    app.dirty = false
    updateHeader()
    renderList()
  }
}
