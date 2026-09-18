/* 标题区同步：纸张大标题、浏览器标签标题、保存按钮的三态文案。
 *
 * 未存档（activeId 为空或库里找不到）时，大标题实时跟随名称输入框，
 * 且保存按钮始终高亮，提示这份内容还没落盘。 */

import { app } from '../state.js'
import { dom } from '../dom.js'
import { findPaper } from './model.js'

export function updateHeader() {
  const p = app.activeId ? findPaper(app.activeId) : null

  if (p) {
    dom.paperTitle.textContent = p.name
    document.title = p.name + ' · 申论答题纸'
    dom.saveBtn.textContent = app.dirty ? '保存 •' : '已保存'
    dom.saveBtn.classList.toggle('primary', app.dirty)
  } else {
    dom.paperTitle.textContent = dom.nameInput.value.trim() || '申论答题纸'
    document.title = '申论答题纸 · 每行25格'
    dom.saveBtn.textContent = '保存'
    dom.saveBtn.classList.toggle('primary', true)
  }
}
