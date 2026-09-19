/* 撤销 / 重做单测：grid/undo.js（快照栈）
 *
 * 锁住的不变量（路线 B 后仍然成立的三条）：
 * 1. undo() 不许退到 app.undoBaseline 之前；
 * 2. 撤销后光标随快照精确还原（不再跳到离编辑点很远的位置）；
 * 3. stashHistory / restoreHistory 按 id 归档，未存档草稿用 DRAFT_KEY。 */

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { app } from '../js/state.js'
import { dom } from '../js/dom.js'
import { setupEnv, cleanupEnv, fillText, lastToastText } from './helpers/env.js'
import { replaceRange, pushUndo } from '../js/grid/engine.js'
import { undo, redo, stashHistory, restoreHistory, updateUndoButtons } from '../js/grid/undo.js'
import { syncTextarea } from '../js/grid/render.js'
import { DRAFT_KEY } from '../js/config.js'

beforeEach(() => setupEnv(50))
afterEach(() => cleanupEnv())

describe('undo() / redo() 基本回路', () => {
  test('undo 恢复快照的旧全文，redo 重放', () => {
    fillText('一二')
    replaceRange(2, 2, '三')
    undo()
    assert.equal(app.text, '一二')
    redo()
    assert.equal(app.text, '一二三')
  })

  test('撤销后光标随快照还原（不再跳到记录首格）', () => {
    fillText('一二三')
    replaceRange(3, 3, '四五六') // 光标在 6
    assert.equal(app.caret, 6)
    undo()
    assert.equal(app.caret, 3) // 回到插入前
    redo()
    assert.equal(app.caret, 6)
  })

  test('带选区时的快照还原（头/锚都随快照回来）', () => {
    fillText('一二三四五')
    syncTextarea(3, 1) // 摆出选区 [1,3)：头在 3，锚在 1
    replaceRange(1, 3, 'XY')
    assert.equal(app.text, '一XY四五')
    undo()
    assert.equal(app.text, '一二三四五')
    assert.equal(app.caret, 3)
    assert.equal(app.anchor, 1)
  })

  test('空栈 undo / redo 是无操作', () => {
    undo()
    redo()
    assert.equal(app.undoStack.length, 0)
    assert.equal(app.redoStack.length, 0)
  })

  test('undo 后做新编辑，redoStack 被清空', () => {
    fillText('')
    replaceRange(0, 0, '一')
    undo()
    assert.equal(app.redoStack.length, 1)
    replaceRange(0, 0, '二')
    assert.equal(app.redoStack.length, 0)
  })

  test('textarea 的值随快照一起还原', () => {
    fillText('一二三')
    replaceRange(0, 0, 'X')
    assert.equal(dom.hiddenInput.value, 'X一二三')
    undo()
    assert.equal(dom.hiddenInput.value, '一二三')
  })
})

describe('undoBaseline 保护', () => {
  test('栈深 <= baseline 时拒绝撤销并提示', () => {
    fillText('一二')
    replaceRange(2, 2, '三')
    app.undoBaseline = 1 // 模拟「打开时的深度」
    const before = app.text
    undo()
    assert.equal(app.text, before)
    assert.ok(lastToastText().includes('打开时的状态'))
  })

  test('undoBtn.disabled 反映 baseline（栈深 <= baseline 即禁用）', () => {
    fillText('')
    replaceRange(0, 0, '一') // 栈深 1
    app.undoBaseline = 1
    updateUndoButtons()
    assert.equal(dom.undoBtn.disabled, true)

    app.undoBaseline = 0
    updateUndoButtons()
    assert.equal(dom.undoBtn.disabled, false)
  })

  test('空栈且 baseline=0：撤销按钮禁用、undo 静默返回', () => {
    updateUndoButtons()
    assert.equal(dom.undoBtn.disabled, true)
    undo()
    assert.equal(lastToastText(), '') // 无 toast
  })
})

describe('缩行截断的撤销（快照带行数）', () => {
  test('Ctrl+Z 撤回截断：文字与行数一起恢复；重做再次截断', () => {
    fillText('一'.repeat(30)) // 需要 2 行
    // 真实路径（resize.js 的 applyRows）：先快照（此时 rows 仍是 2），再改行数、截断
    pushUndo()
    app.rows = 1
    app.text = app.text.slice(0, 25)

    // 撤销：回到截断前 —— 30 个字 + 2 行都要回来
    undo()
    assert.equal(app.text.length, 30)
    assert.equal(app.rows, 2)

    // 重做：再次截断 —— 行数跟着快照回到 1
    redo()
    assert.equal(app.text.length, 25)
    assert.equal(app.rows, 1)
  })
})

describe('stashHistory / restoreHistory', () => {
  test('按答题纸 id 归档，切走再切回历史还在', () => {
    fillText('')
    replaceRange(0, 0, '一')
    app.activeId = 'paper-a'
    stashHistory()

    app.undoStack.length = 0
    app.redoStack.length = 0

    restoreHistory('paper-a')
    assert.equal(app.undoStack.length, 1)
  })

  test('未存档草稿归档在 DRAFT_KEY 下', () => {
    app.activeId = null
    fillText('')
    replaceRange(0, 0, '一')
    stashHistory()
    assert.ok(app.undoHistory.has(DRAFT_KEY))

    app.undoStack.length = 0
    restoreHistory(null)
    assert.equal(app.undoStack.length, 1)
  })

  test('restore 后 baseline 重置为当前栈深：先有新编辑才允许撤销', () => {
    fillText('')
    replaceRange(0, 0, '一')
    replaceRange(1, 1, '二')
    app.activeId = 'paper-b'
    stashHistory()
    app.undoStack.length = 0

    restoreHistory('paper-b')
    assert.equal(app.undoBaseline, 2)

    // 刚 restore 完，栈深(2) <= baseline(2)：撤销被拦，历史不被清掉
    undo()
    assert.equal(app.undoStack.length, 2)

    // 产生一条新编辑后：可以撤一条（回到 baseline 深度为止）
    replaceRange(2, 2, '三')
    undo()
    assert.equal(app.undoStack.length, 2)
    undo() // 再撤被 baseline 拦住
    assert.equal(app.undoStack.length, 2)
    assert.equal(app.text, '一二')
  })

  test('restore 不存在的 id：得到空栈，baseline 为 0', () => {
    restoreHistory('no-such-id')
    assert.equal(app.undoStack.length, 0)
    assert.equal(app.undoBaseline, 0)
    assert.equal(dom.undoBtn.disabled, true)
  })

  test('空栈 stash 是无操作，不覆盖已有归档', () => {
    app.activeId = 'paper-c'
    app.undoHistory.set('paper-c', { undo: [{ text: 'x', caret: 0, anchor: 0 }], redo: [] })
    stashHistory()
    assert.equal(app.undoHistory.get('paper-c').undo.length, 1)
  })
})
