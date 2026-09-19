/* 测试环境桩：在 Node 里给引擎/渲染/撤销模块提供它们依赖的最小 DOM 表面。
 *
 * 原理：源码里所有 DOM 访问都走 dom.js 的 `dom` 对象、app.cellDivs、
 * document.title 与 getComputedStyle——全是普通属性读写，把桩塞进去，
 * 引擎逻辑（纯数据变换）就能在无浏览器环境跑。
 * 不 import 任何浏览器专属模块（events/、ui/dialog.js 等）。
 *
 * 用法：
 *   import { setupEnv, lastToastText } from './helpers/env.js'
 *   beforeEach(() => setupEnv(50))   // 2 行 × 25 格
 *   afterEach(cleanupEnv)            // 清掉 markDirty 挂的自动保存定时器 */

import { app } from '../../js/state.js'
import { dom } from '../../js/dom.js'

const toastState = { text: '', count: 0 }

function classListStub() {
  return {
    add() {},
    remove() {},
    toggle() {},
  }
}

export function setupEnv(cellCount) {
  if (!globalThis.document) {
    globalThis.document = {
      title: '',
      // buildDOM（撤销恢复行数时会走到）需要的最小 createElement 桩
      createElement: function () {
        return {
          className: '',
          dataset: {},
          style: {},
          textContent: '',
          classList: classListStub(),
          appendChild() {},
        }
      },
      createDocumentFragment: function () {
        return { appendChild() {} }
      },
    }
  }
  if (!globalThis.getComputedStyle) {
    globalThis.getComputedStyle = function () {
      return { getPropertyValue: function () { return '36px' } }
    }
  }

  toastState.text = ''
  toastState.count = 0
  dom.statEl = { textContent: '' }
  Object.defineProperty(dom, 'toastEl', {
    configurable: true,
    get: function () {
      return toastElStub
    },
  })
  const toastElStub = {
    get textContent() {
      return toastState.text
    },
    set textContent(v) {
      toastState.text = String(v)
      toastState.count++
    },
    classList: classListStub(),
  }
  dom.undoBtn = { disabled: false }
  dom.redoBtn = { disabled: false }
  dom.paperTitle = { textContent: '' }
  dom.saveBtn = { textContent: '', classList: { toggle() {} } }
  dom.paperListEl = { querySelectorAll: function () { return [] } }
  dom.rowsInput = { value: '40' }
  dom.nameInput = { value: '' }
  dom.storageWarn = { style: {}, textContent: '' }

  // 隐藏 textarea 桩：值 + 选区，行为与真 textarea 对齐
  dom.hiddenInput = {
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
    selectionDirection: 'forward',
    focus() {},
    setSelectionRange(start, end, dir) {
      this.selectionStart = start
      this.selectionEnd = end
      if (dir) this.selectionDirection = dir
    },
  }
  dom.gridEl = {
    style: {},
    innerHTML: '',
    appendChild() {},
  }
  dom.caretEl = { style: {}, classList: classListStub() }

  // 重置全部共享状态，测试之间互不污染
  app.rows = Math.ceil(cellCount / 25)
  app.text = ''
  app.caret = 0
  app.anchor = 0
  app.cellDivs = []
  app.rendered = []
  for (let i = 0; i < cellCount; i++) {
    app.cellDivs.push({ textContent: '', classList: classListStub() })
    app.rendered.push('')
  }
  app.selRange = [-1, -1]
  app.curCell = -1
  app.undoStack.length = 0
  app.redoStack.length = 0
  app.undoHistory = new Map()
  app.undoBaseline = 0
  app.papers = []
  app.activeId = null
  app.dirty = false
  clearTimeout(app.saveTimer)
  app.saveTimer = null
  app.skipNameDirty = false
  app.searchTerm = ''
  app.sortMode = 'time-desc'
  app.dlgOpen = false
  app.storageOK = true
}

export function cleanupEnv() {
  clearTimeout(app.saveTimer)
  app.saveTimer = null
}

// 摆数据：'_' 表示故意留空（空格）。返回值即 app.text。
export function fillText(pattern) {
  const s = Array.from(pattern)
    .map(function (c) {
      return c === '_' ? ' ' : c
    })
    .join('')
  app.text = s
  dom.hiddenInput.value = s
  app.caret = s.length
  app.anchor = s.length
  return s
}

export function lastToastText() {
  return toastState.text
}

// 累计 toast 次数（限流断言用）
export function toastCount() {
  return toastState.count
}
