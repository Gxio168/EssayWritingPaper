/* 答题纸生命周期：保存 / 打开 / 新建 / 删除，以及切换前的未保存拦截。
 *
 * 依赖方向：crud → grid(构建、撤销栈、焦点) + paper(model/header/library) + ui + storage。
 * 本模块不被 grid 依赖，所以不会形成回环。
 *
 * 落盘时机的既定事实（改动前先确认）：
 * - doSave 是唯一的建档/覆盖入口；savePaper 只负责「先有名字」这一前置交互。
 * - loadPaper 只切已存档记录；startFresh 只重置编辑区，两者都成对做
 *   stashHistory / restoreHistory。
 * - 新建路径会立刻 doSave 空答题纸，避免刷新丢失。 */

import { COLS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { esc, fmtTime, fmtStamp } from '../lib/format.js'
import { countChars, toSparse } from '../lib/text.js'
import { persist } from '../storage/store.js'
import { openDialog } from '../ui/dialog.js'
import { toast } from '../ui/toast.js'
import { setDrawer } from '../ui/drawer.js'
import { buildDOM } from '../grid/build.js'
import { focusCell } from '../grid/focus.js'
import { stashHistory, restoreHistory } from '../grid/undo.js'
import { buildCurrent, findPaper, isSaved } from './model.js'
import { autosave } from './autosave.js'
import { updateHeader } from './header.js'
import { renderList } from './library.js'

// 切换/新建前处理未保存内容：已存档的自动落盘，未存档草稿需用户确认
export function guardUnsaved(actionLabel) {
  if (!app.dirty) return Promise.resolve(true)
  if (isSaved()) {
    autosave()
    return Promise.resolve(true)
  }
  if (countChars(app.cells) === 0) return Promise.resolve(true)
  return openDialog({
    title: '尚未保存',
    icon: 'warn',
    message:
      '当前答题纸还没有保存，' +
      esc(actionLabel) +
      '后这份内容将会丢失。<br>' +
      '建议先点「保存」留档，再' +
      esc(actionLabel) +
      '。',
    cancelText: '返回保存',
    confirmText: '仍要' + actionLabel,
    danger: true,
  })
}

export function doSave(name) {
  let p = app.activeId ? findPaper(app.activeId) : null
  if (!p) {
    p = buildCurrent(name)
    app.papers.push(p)
    app.activeId = p.id
  } else {
    p.name = name
    p.rows = app.rows
    p.data = toSparse(app.cells)
    p.wordCount = countChars(app.cells)
    p.updatedAt = Date.now()
  }

  if (persist()) {
    app.dirty = false
    updateHeader()
    renderList()
    toast('已保存「' + p.name + '」')
    return true
  }
  return false
}

export function savePaper(quiet) {
  clearTimeout(app.saveTimer)
  let name = dom.nameInput.value.trim()

  if (name) {
    doSave(name)
    return
  }

  if (quiet) return
  openDialog({
    title: '给答题纸起个名字',
    icon: 'info',
    message: '名称会立刻存档，之后可以在左侧记录里按名称查找、排序。',
    input: {
      value: '申论练习 ' + fmtStamp(),
      placeholder: '例如：2024 省考 A 卷 第三题',
    },
    confirmText: '保存',
    cancelText: '取消',
  }).then(function (val) {
    if (!val) return
    const n = String(val).trim()
    if (!n) return
    dom.nameInput.value = n
    dom.paperTitle.textContent = n
    doSave(n)
  })
}

export function loadPaper(id) {
  const p = findPaper(id)
  if (!p) return
  if (p.id === app.activeId) return
  stashHistory()

  const n = Math.max(1, Math.min(200, p.rows || 40))
  const total = n * COLS
  const arr = new Array(total).fill('')
  const data = p.data || {}
  for (const k in data) {
    if (!Object.prototype.hasOwnProperty.call(data, k)) continue
    const i = Number(k)
    if (i >= 0 && i < total) arr[i] = String(data[k])
  }

  app.rows = n
  dom.rowsInput.value = n
  app.cells = arr
  app.activeId = p.id
  app.dirty = false

  buildDOM()
  restoreHistory(p.id)
  app.skipNameDirty = true
  dom.nameInput.value = p.name
  app.skipNameDirty = false

  updateHeader()
  renderList()
  setDrawer(false)
  focusCell(0)
  toast('已打开「' + p.name + '」')
}

// 把编辑区重置成一张干净的新答题纸（不涉及保存）
export function startFresh(name) {
  stashHistory()

  clearTimeout(app.saveTimer)
  app.rows = parseInt(dom.rowsInput.value, 10) || app.rows || 40
  app.cells = new Array(app.rows * COLS).fill('')
  app.activeId = null
  app.dirty = false

  buildDOM()
  restoreHistory(null)
  app.skipNameDirty = true
  dom.nameInput.value = name || ''
  app.skipNameDirty = false

  updateHeader()
  renderList()
  setDrawer(false)
  focusCell(0)
}

// 问用户要一个名称：确认返回名称字符串，取消返回 ''
export function askNewName() {
  return openDialog({
    title: '给新答题纸起个名字',
    icon: 'info',
    message:
      '名称会立刻存档，之后随时可以改。<br>' + '直接用默认名称也可以，点「开始作答」就行。',
    input: {
      value: '申论练习 ' + fmtStamp(),
      placeholder: '例如：2024 省考 A 卷 第三题',
    },
    confirmText: '开始作答',
    cancelText: '取消',
    restoreFocus: false,
  }).then(function (val) {
    return val ? String(val).trim() : ''
  })
}

export function newPaper() {
  guardUnsaved('新建').then(function (go) {
    if (!go) return
    askNewName().then(function (name) {
      if (!name) return // 取消：不改动当前内容
      startFresh(name)
      doSave(name) // 先把这份空答题纸落档，避免刷新丢失
      focusCell(0)
      toast('已新建「' + name + '」')
    })
  })
}

export function deletePaper(id) {
  const p = findPaper(id)
  if (!p) return

  const isCurrent = p.id === app.activeId
  openDialog({
    title: '删除这份记录？',
    icon: 'danger',
    danger: true,
    message:
      '将要删除 <b>「' +
      esc(p.name) +
      '」</b>（' +
      (p.wordCount || 0) +
      ' 字，' +
      fmtTime(p.updatedAt) +
      '）。<br>删除后无法恢复。' +
      (isCurrent ? '<br><br>它正是你当前正在编辑的这份，删除后画面会清空。' : ''),
    confirmText: '删除',
    cancelText: '取消',
  }).then(function (okVal) {
    if (!okVal) return
    app.papers = app.papers.filter(function (x) {
      return x.id !== id
    })
    if (app.activeId === id) {
      startFresh('')
      toast('已删除「' + p.name + '」，可从左侧「＋ 新建」再开一张')
    } else {
      toast('已删除「' + p.name + '」')
    }
    persist()
    updateHeader()
    renderList()
  })
}
