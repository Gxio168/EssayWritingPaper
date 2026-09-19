/* DOM 引用：保持「启动时一次性解析、之后不再查询」的语义。
 *
 * 用法限制：
 * - 只能在函数体内访问 dom.xxx；模块顶层读到的是 undefined，因为 initDom() 还没跑。
 * - 重建网格（buildDOM）替换的是 #grid 内部的子节点，#grid 本身不会消失，
 *   所以这里缓存的引用全程有效。唯一例外是 dom.caretEl：它由 buildDOM
 *   动态创建并重新赋值，不要在别处缓存它。 */

export const dom = {}

export function initDom() {
  dom.gridEl = document.getElementById('grid')
  dom.hiddenInput = document.getElementById('hiddenInput')
  dom.rowsInput = document.getElementById('rowsInput')
  dom.statEl = document.getElementById('stat')
  dom.undoBtn = document.getElementById('undoBtn')
  dom.redoBtn = document.getElementById('redoBtn')
  dom.clearBtn = document.getElementById('clearBtn')
  dom.nameInput = document.getElementById('nameInput')
  dom.saveBtn = document.getElementById('saveBtn')
  dom.copyBtn = document.getElementById('copyBtn')
  dom.newBtn = document.getElementById('newBtn')
  dom.themeBtn = document.getElementById('themeBtn')
  dom.paperListEl = document.getElementById('paperList')
  dom.searchInput = document.getElementById('searchInput')
  dom.sortSelect = document.getElementById('sortSelect')
  dom.paperTitle = document.getElementById('paperTitle')
  dom.exportBtn = document.getElementById('exportBtn')
  dom.importBtn = document.getElementById('importBtn')
  dom.importFile = document.getElementById('importFile')
  dom.menuBtn = document.getElementById('menuBtn')
  dom.backdrop = document.getElementById('backdrop')
  dom.toastEl = document.getElementById('toast')
  dom.modalEl = document.getElementById('modal')
  dom.storageWarn = document.getElementById('storageWarn')
}
