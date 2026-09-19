/* 存储层单测：storage/store.js
 *
 * 用可注入故障的 localStorage 桩验证三条防护：
 * 1. 写入失败 → persist 返回 false、dirty 不会被清、有用户可读的 toast；
 * 2. 配额已满与存储不可用给出不同文案，且 30 秒内不重复弹（autosave 高频重试）；
 * 3. 占用超过估算配额 80% → 侧边栏警告条建议导出备份。 */

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { app } from '../js/state.js'
import { dom } from '../js/dom.js'
import { setupEnv, cleanupEnv, lastToastText, toastCount } from './helpers/env.js'
import {
  persist,
  storageWarnText,
  checkStorage,
  loadStore,
  _resetFailToastForTest,
} from '../js/storage/store.js'
import { LS_KEY } from '../js/config.js'

// 可配置的 localStorage 桩：failWith 传 Error 时 setItem 抛错
function installLS(failWith) {
  const map = new Map()
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem(k, v) {
      if (failWith) throw failWith
      map.set(k, String(v))
    },
    removeItem: (k) => map.delete(k),
    __map: map,
  }
}

beforeEach(function () {
  setupEnv(50)
  installLS(null)
  _resetFailToastForTest()
})
afterEach(function () {
  cleanupEnv()
  delete globalThis.localStorage
})

describe('persist() 正常路径', () => {
  test('写入成功：返回 true，storageOK 为真，usageKB 有估算值', () => {
    app.papers = [{ id: 'p1', name: '测试', rows: 40, data: { 0: '一' }, wordCount: 1 }]
    assert.equal(persist(), true)
    assert.equal(app.storageOK, true)
    assert.ok(app.usageKB >= 1)
    const saved = JSON.parse(globalThis.localStorage.__map.get(LS_KEY))
    assert.equal(saved.papers.length, 1)
  })
})

describe('persist() 写入失败', () => {
  test('配额已满：返回 false + 「导出备份」指引的 toast', () => {
    installLS(Object.assign(new Error('full'), { name: 'QuotaExceededError' }))
    app.papers = [{ id: 'p1', name: '测试' }]
    assert.equal(persist(), false)
    assert.equal(app.storageOK, false)
    assert.ok(lastToastText().includes('导出备份'))
  })

  test('存储不可用（无痕模式等）：返回 false + 不同的 toast 文案', () => {
    installLS(new Error('denied'))
    assert.equal(persist(), false)
    assert.ok(lastToastText().includes('不可用'))
    assert.ok(!lastToastText().includes('已满'))
  })

  test('30 秒内高频重试不重复弹 toast（autosave 每 1.2s 一次）', () => {
    installLS(new Error('denied'))
    persist()
    assert.equal(toastCount(), 1)
    persist()
    persist()
    assert.equal(toastCount(), 1, '限流窗口内的重试不应再次弹 toast')
  })


  test('失败时侧边栏警告条显示存储不可用', () => {
    installLS(new Error('denied'))
    persist()
    assert.equal(dom.storageWarn.style.display, 'block')
    assert.ok(dom.storageWarn.textContent.includes('无痕'))
  })
})

describe('storageWarnText() 容量告警', () => {
  test('正常占用：不显示', () => {
    assert.equal(storageWarnText(true, 100), '')
  })
  test('超过估满值 80%：建议导出备份并给出百分比', () => {
    const t = storageWarnText(true, 4500)
    assert.ok(t.includes('导出备份'))
    assert.ok(t.includes('88%'))
  })
  test('存储不可用的文案优先于容量', () => {
    assert.ok(storageWarnText(false, 4500).includes('无痕'))
  })
})

describe('checkStorage() / loadStore() 自检', () => {
  test('存储可用性自检', () => {
    checkStorage()
    assert.equal(app.storageOK, true)
  })
  test('存档损坏（非法 JSON）时不抛错，得到空库', () => {
    globalThis.localStorage.__map.set(LS_KEY, '{oops')
    const store = loadStore()
    assert.deepEqual(store.papers, [])
  })
  test('清洗：结构不对的记录被丢弃', () => {
    globalThis.localStorage.__map.set(
      LS_KEY,
      JSON.stringify({ version: 1, papers: [{ id: 'ok', name: '好' }, null, { name: '没有 id' }] })
    )
    const store = loadStore()
    assert.equal(store.papers.length, 1)
    assert.equal(store.papers[0].id, 'ok')
  })
})
