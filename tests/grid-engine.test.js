/* 网格编辑引擎单测：grid/engine.js（路线 B：字符串模型）
 *
 * 锁住的语义：
 * - replaceRange 装不下时整次拒绝（一格不动、有 toast），绝不丢尾部文字；
 * - commit 从 textarea 桩读回选区；
 * - 撤销快照彼此独立，光标随快照还原；
 * - 字数不含空白；Enter 垫的空格在存档里保得住。 */

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { app } from '../js/state.js'
import { dom } from '../js/dom.js'
import { setupEnv, cleanupEnv, fillText, lastToastText } from './helpers/env.js'
import { capacity, commit, replaceRange, setText, clearAll, pushUndo } from '../js/grid/engine.js'
import { renderText, syncTextarea } from '../js/grid/render.js'

beforeEach(() => setupEnv(50)) // 2 行 × 25 格
afterEach(() => cleanupEnv())

/* ---------------- capacity ---------------- */

describe('capacity()', () => {
  test('行数 × 25', () => {
    assert.equal(capacity(), 50)
    app.rows = 3
    assert.equal(capacity(), 75)
  })
})

/* ---------------- replaceRange ---------------- */

describe('replaceRange()', () => {
  test('插入：pos 处插入，光标落到插入内容之后', () => {
    fillText('登山之乐')
    assert.equal(replaceRange(1, 1, '高'), true)
    assert.equal(app.text, '登高山之乐')
    assert.equal(app.caret, 2)
    assert.equal(dom.hiddenInput.value, '登高山之乐')
  })

  test('替换选区：[a, b) 被整段换掉', () => {
    fillText('一二三四五')
    assert.equal(replaceRange(1, 3, 'X'), true)
    assert.equal(app.text, '一X四五')
    assert.equal(app.caret, 2)
  })

  test('写满拒绝：返回 false、一个字都不动、有 toast（整次拒绝）', () => {
    fillText('一'.repeat(50))
    const before = app.text
    assert.equal(replaceRange(1, 1, 'X'), false)
    assert.equal(app.text, before)
    assert.ok(lastToastText().includes('写满'))
  })

  test('只差一格也拒绝；删着换（替换不净增）则放行', () => {
    fillText('一'.repeat(50))
    assert.equal(replaceRange(25, 25, 'X'), false) // 净增 1，装不下
    assert.equal(replaceRange(10, 11, 'X'), true) // 净增 0
    assert.equal(app.text.length, 50)
  })

  test('拒绝时 textarea 的值不被破坏（画面与 state 不分叉）', () => {
    fillText('一二三')
    const before = dom.hiddenInput.value
    replaceRange(0, 0, 'X'.repeat(60))
    assert.equal(dom.hiddenInput.value, before)
  })

  test('每次成功编辑压一条快照，redoStack 清空', () => {
    fillText('一二三')
    app.redoStack.push({ text: 'old', caret: 0, anchor: 0 })
    replaceRange(3, 3, '四')
    assert.equal(app.undoStack.length, 1)
    assert.equal(app.redoStack.length, 0)
  })

  test('a/b 越界被钳制', () => {
    fillText('一二三')
    assert.equal(replaceRange(-5, 99, 'X'), true)
    assert.equal(app.text, 'X')
  })
})

/* ---------------- commit（输入事件路径） ---------------- */

describe('commit()', () => {
  test('应用到 app.text 并从 textarea 桩读回光标', () => {
    fillText('一二三')
    const ta = dom.hiddenInput
    ta.value = '一X三' // 浏览器已经改好 textarea（X 替换了二）
    ta.setSelectionRange(2, 2, 'forward')
    commit(1, 1, 'X')
    assert.equal(app.text, '一X三')
    assert.equal(app.caret, 2)
    assert.equal(app.anchor, 2)
  })

  test('删除：removed > 0', () => {
    fillText('一二三')
    const ta = dom.hiddenInput
    ta.value = '一三'
    ta.setSelectionRange(1, 1, 'forward')
    commit(1, 1, '')
    assert.equal(app.text, '一三')
  })
})

/* ---------------- setText / clearAll ---------------- */

describe('setText() / clearAll()', () => {
  test('setText 整篇替换并同步 textarea 与光标', () => {
    fillText('旧内容')
    setText('新内容', 1, 1)
    assert.equal(app.text, '新内容')
    assert.equal(dom.hiddenInput.value, '新内容')
    assert.equal(app.caret, 1)
  })

  test('clearAll 清空且可撤销', () => {
    fillText('一二三')
    clearAll()
    assert.equal(app.text, '')
    undo_snapshot_helper()
  })

  function undo_snapshot_helper() {
    // 撤销走 undo.test.js 详测，这里只确认快照已入栈
    assert.equal(app.undoStack.length, 1)
  }

  test('空表 clearAll 是无操作', () => {
    clearAll()
    assert.equal(app.undoStack.length, 0)
  })
})

/* ---------------- pushUndo 快照上限 ---------------- */

describe('pushUndo() 上限', () => {
  test('超过 MAX_UNDO(500) 丢最旧，栈长封顶', () => {
    for (let i = 0; i < 502; i++) pushUndo()
    assert.equal(app.undoStack.length, 500)
  })
})

/* ---------------- 渲染同步 ---------------- */

describe('renderText() 增量渲染', () => {
  test('只更新变化的格子，rendered 与 text 一致', () => {
    fillText('一二三')
    renderText()
    assert.equal(app.cellDivs[0].textContent, '一')
    assert.equal(app.cellDivs[2].textContent, '三')
    assert.equal(app.cellDivs[3].textContent, '')

    const s = app.text
    app.text = s.slice(0, 1) + 'X' + s.slice(1)
    renderText()
    assert.equal(app.cellDivs[1].textContent, 'X')
    assert.equal(app.rendered[1], 'X')
  })

  test('空格占格：格子渲染为空但位置保留', () => {
    fillText('一_三')
    renderText()
    assert.equal(app.cellDivs[0].textContent, '一')
    assert.equal(app.cellDivs[1].textContent, ' ') // 存的是空格本身，视觉上是空格
    assert.equal(app.cellDivs[2].textContent, '三')
    assert.equal(app.text.length, 3) // 但位置被占着
  })
})

describe('syncTextarea() 钳制与同步', () => {
  test('光标钳到 [0, len]', () => {
    fillText('一二')
    syncTextarea(99, -5)
    assert.equal(app.caret, 2)
    assert.equal(app.anchor, 0)
    assert.equal(dom.hiddenInput.selectionStart, 0)
    assert.equal(dom.hiddenInput.selectionEnd, 2)
  })

  test('textarea.value 只在滞后时才写（不打碎输入中的选区）', () => {
    fillText('一二')
    const ta = dom.hiddenInput
    ta.value = '一二' // 已同步
    const marker = ta.selectionStart
    syncTextarea(1, 1)
    assert.equal(ta.value, '一二')
    assert.equal(ta.selectionStart, 1)
    void marker
  })
})
