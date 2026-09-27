/* 草稿板笔记单测：storage/store.js 的笔记读写 + paper/note.js 的键路由。
 *
 * 锁住三条行为：
 * 1. loadNotes 清洗：非法 JSON / 数组 / 非字符串值都不会污染 app.notes；
 * 2. 键约定与 undoHistory 一致：activeId 为空走 DRAFT_KEY，建档时迁移到真 id；
 * 3. 上限裁剪：超过 NOTE_MAX_LEN 的输入被裁掉并给出 toast。 */

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { app } from '../js/state.js'
import { dom } from '../js/dom.js'
import { setupEnv, cleanupEnv, lastToastText } from './helpers/env.js'
import { loadNotes, persistNotes, pruneNotes } from '../js/storage/store.js'
import { stashNote, showNote, moveNote, onNoteInput, noteKey } from '../js/paper/note.js'
import { LS_NOTES, DRAFT_KEY, NOTE_MAX_LEN } from '../js/config.js'

function installLS() {
  const map = new Map()
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem(k, v) {
      map.set(k, String(v))
    },
    removeItem: (k) => map.delete(k),
    __map: map,
  }
}

beforeEach(function () {
  setupEnv(50)
  installLS()
})
afterEach(function () {
  cleanupEnv()
  delete globalThis.localStorage
})

describe('loadNotes() 清洗', () => {
  test('非法 JSON：不抛错，保留内存中的笔记不变', () => {
    globalThis.localStorage.__map.set(LS_NOTES, '{oops')
    app.notes = { a: '原样' }
    loadNotes()
    assert.deepEqual(app.notes, { a: '原样' })
  })
  test('数组与非字符串值被丢弃', () => {
    globalThis.localStorage.__map.set(
      LS_NOTES,
      JSON.stringify(['x', 1])
    )
    loadNotes()
    assert.deepEqual(app.notes, {})

    globalThis.localStorage.__map.set(
      LS_NOTES,
      JSON.stringify({ p1: '笔记', p2: 42, p3: '', p4: { a: 1 } })
    )
    loadNotes()
    assert.deepEqual(app.notes, { p1: '笔记' })
  })
  test('persistNotes 往返：写进去的能原样读回来', () => {
    app.notes = { [DRAFT_KEY]: '要点一', p1: '提纲' }
    assert.equal(persistNotes(), true)
    app.notes = {}
    loadNotes()
    assert.deepEqual(app.notes, { [DRAFT_KEY]: '要点一', p1: '提纲' })
  })
})

describe('pruneNotes() 孤儿清理', () => {
  test('只保留 validKeys 里的键', () => {
    const out = pruneNotes({ p1: 'a', p2: 'b', __draft__: 'c' }, new Set(['p1', '__draft__']))
    assert.deepEqual(out, { p1: 'a', __draft__: 'c' })
  })
})

describe('笔记的键路由（paper/note.js）', () => {
  test('未存档走 DRAFT_KEY，建档后走真 id', () => {
    assert.equal(noteKey(), DRAFT_KEY)
    dom.draftInput.value = '临时要点'
    stashNote()
    assert.equal(app.notes[DRAFT_KEY], '临时要点')

    moveNote(DRAFT_KEY, 'p1')
    assert.equal(app.notes.p1, '临时要点')
    assert.ok(!(DRAFT_KEY in app.notes))

    app.activeId = 'p1'
    assert.equal(noteKey(), 'p1')
    dom.draftInput.value = ''
    showNote()
    assert.equal(dom.draftInput.value, '临时要点')
  })
  test('moveNote 不覆盖真 id 下已有的笔记', () => {
    app.notes = { [DRAFT_KEY]: '草稿', p1: '已有' }
    moveNote(DRAFT_KEY, 'p1')
    assert.deepEqual(app.notes, { p1: '已有' })
  })
  test('stashNote：空内容 = 删除该键', () => {
    app.notes = { [DRAFT_KEY]: '旧笔记' }
    dom.draftInput.value = ''
    stashNote()
    assert.deepEqual(app.notes, {})
  })
  test('onNoteInput 超限裁剪并 toast', () => {
    dom.draftInput.value = '字'.repeat(NOTE_MAX_LEN + 10)
    onNoteInput()
    assert.equal(dom.draftInput.value.length, NOTE_MAX_LEN)
    assert.equal(app.notes[DRAFT_KEY].length, NOTE_MAX_LEN)
    assert.ok(lastToastText().includes('草稿板'))
  })
})
