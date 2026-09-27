/* 草稿板：跟随答题纸的临时笔记（誊写前打腹稿 / 记要点）。
 *
 * app.notes = { key: 文本 }，key = 答题纸 id，未存档时用 DRAFT_KEY——
 * 与 undoHistory 的归档取键约定一致。面板只是一个普通 textarea：
 * 自由文本，不进网格引擎、不占容量、不参与撤销栈。
 *
 * 生命周期挂点（都在调用方，本模块不监听事件）：
 * - stashNote()  在 app.activeId 即将改变之前调用，把面板写回旧键；
 * - showNote()   在 app.activeId 改变之后调用，把新键的笔记映回面板；
 * - moveNote()   新纸建档（doSave 的创建分支）时把 DRAFT_KEY 笔记迁到真 id。 */

import { DRAFT_KEY, NOTE_MAX_LEN } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { persistNotes, pruneNotes, savePrefs } from '../storage/store.js'
import { toast } from '../ui/toast.js'
import { copyString } from '../ui/clipboard.js'

export function noteKey() {
  return app.activeId || DRAFT_KEY
}

// 面板当前内容写回当前键（activeId 变更前调用）
export function stashNote() {
  const key = noteKey()
  const text = dom.draftInput.value
  if (text) app.notes[key] = text
  else delete app.notes[key]
  persistNotes()
}

// 当前键的笔记映回面板（activeId 变更后调用）
export function showNote() {
  dom.draftInput.value = app.notes[noteKey()] || ''
}

export function moveNote(from, to) {
  if (from === to) return
  if (Object.prototype.hasOwnProperty.call(app.notes, from)) {
    if (app.notes[to]) delete app.notes[from] // 真 id 下已有笔记：迁移不覆盖它
    else {
      app.notes[to] = app.notes[from]
      delete app.notes[from]
    }
    persistNotes()
  }
}

// textarea input 事件：落库 + 上限裁剪（笔记是辅助数据，写入失败静默）
export function onNoteInput() {
  let text = dom.draftInput.value
  if (text.length > NOTE_MAX_LEN) {
    text = text.slice(0, NOTE_MAX_LEN)
    dom.draftInput.value = text
    toast('草稿板每份最多 ' + NOTE_MAX_LEN + ' 字，超出部分已裁掉')
  }
  if (text) app.notes[noteKey()] = text
  else delete app.notes[noteKey()]
  persistNotes()
}

export function dropNote(id) {
  if (app.notes[id]) {
    delete app.notes[id]
    persistNotes()
  }
}

// 启动时清掉孤儿笔记（答题纸被删 / 导入了陌生 id）
export function syncNotesWithLibrary() {
  const valid = new Set([DRAFT_KEY])
  for (const p of app.papers) valid.add(p.id)
  app.notes = pruneNotes(app.notes, valid)
  persistNotes()
}

export function copyNote() {
  copyString(dom.draftInput.value, '草稿板是空的', '草稿已复制，可直接 Ctrl+V 粘贴')
}

export function setDraftPanel(open) {
  app.draftOpen = !!open
  dom.draftPanel.classList.toggle('open', app.draftOpen)
  dom.draftBtn.classList.toggle('active', app.draftOpen)
  savePrefs()
}

export function toggleDraftPanel() {
  setDraftPanel(!app.draftOpen)
  if (app.draftOpen) dom.draftInput.focus()
  else dom.hiddenInput.focus()
}
