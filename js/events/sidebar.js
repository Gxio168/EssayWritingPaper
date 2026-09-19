/* 侧边栏事件：记录列表（打开/删除）、搜索、排序、新建、导入导出、窄屏抽屉。
 *
 * 列表用事件委托 + data-id / data-del，所以 renderList 重绘内部不影响绑定。
 * 删除按钮要先 stopPropagation，否则会同时命中「打开这份答题纸」。 */

import { app } from '../state.js'
import { dom } from '../dom.js'
import { savePrefs } from '../storage/store.js'
import { setDrawer } from '../ui/drawer.js'
import { focusCaret } from '../grid/caret.js'
import { renderList } from '../paper/library.js'
import { guardUnsaved, loadPaper, newPaper, deletePaper } from '../paper/crud.js'
import { exportData, importData } from '../backup/transfer.js'

export function bindSidebarEvents() {
  dom.paperListEl.addEventListener('click', function (e) {
    const del = e.target.closest('[data-del]')
    if (del) {
      e.stopPropagation()
      deletePaper(del.dataset.del)
      return
    }
    const item = e.target.closest('.paper-item')
    if (!item) return
    const id = item.dataset.id
    if (id === app.activeId) {
      setDrawer(false)
      focusCaret(0)
      return
    }
    guardUnsaved('切换答题纸').then(function (go) {
      if (!go) return
      loadPaper(id)
    })
  })

  dom.searchInput.addEventListener('input', function () {
    app.searchTerm = this.value
    savePrefs()
    renderList()
  })

  dom.sortSelect.addEventListener('change', function () {
    app.sortMode = this.value
    savePrefs()
    renderList()
  })

  dom.newBtn.addEventListener('click', newPaper)
  dom.exportBtn.addEventListener('click', exportData)
  dom.importBtn.addEventListener('click', function () {
    dom.importFile.click()
  })
  dom.importFile.addEventListener('change', function () {
    const f = this.files && this.files[0]
    if (f) importData(f)
    this.value = ''
  })

  dom.menuBtn.addEventListener('click', function () {
    setDrawer(!document.body.classList.contains('drawer-open'))
  })
  dom.backdrop.addEventListener('click', function () {
    setDrawer(false)
  })
}
