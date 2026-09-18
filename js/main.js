/* 入口：解析 DOM → 绑定事件 → 初始化。
 *
 * 顺序不能调整：
 * 1. initDom() 必须最先跑。其它模块只在函数体内访问 dom.*，所以模块加载期
 *    不会踩到空引用，但别把 dom.* 的读取写到任何模块的顶层。
 * 2. 事件绑定先于 init()，与原单文件实现一致：init() 里弹出的首个命名对话框
 *    依赖监听器已经就位。 */

import { COLS } from './config.js'
import { app } from './state.js'
import { dom, initDom } from './dom.js'
import { checkStorage, loadPrefs, loadStore } from './storage/store.js'
import { buildDOM } from './grid/build.js'
import { focusCell } from './grid/focus.js'
import { updateHeader } from './paper/header.js'
import { renderList, sortedPapers } from './paper/library.js'
import { askNewName, startFresh, doSave, loadPaper } from './paper/crud.js'
import { toast } from './ui/toast.js'
import { bindGridEvents } from './events/grid.js'
import { bindToolbarEvents } from './events/toolbar.js'
import { bindSidebarEvents } from './events/sidebar.js'
import { bindGlobalEvents } from './events/global.js'

function init() {
  checkStorage()
  loadPrefs()

  const store = loadStore()
  app.papers = store.papers

  dom.sortSelect.value = app.sortMode

  app.rows = parseInt(dom.rowsInput.value, 10) || 40
  app.cells = new Array(app.rows * COLS).fill('')
  buildDOM()

  updateHeader()
  renderList()
  focusCell(0)

  if (app.papers.length) {
    // 打开最近修改的一份
    const latest = sortedPapers()[0]
    if (latest) loadPaper(latest.id)
  } else {
    // 第一次使用：先要个名字并落档，之后输入的每一笔改动都会被自动保存
    askNewName().then(function (name) {
      if (!name) return
      startFresh(name)
      doSave(name)
      focusCell(0)
      toast('已创建「' + name + '」，边写边自动保存')
    })
  }
}

initDom()
bindGridEvents()
bindToolbarEvents()
bindSidebarEvents()
bindGlobalEvents()
init()
