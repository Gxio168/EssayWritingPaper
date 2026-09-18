/* 存储层：localStorage 的读写、数据清洗、偏好设置、可用性自检。
 *
 * 这里是唯一直接触碰 localStorage 的模块。所有写入失败都被吞掉并翻译成
 * storageOK=false + 一条用户可见的警告，调用方靠 persist() 的返回值决定是否
 * 清掉 dirty 标记。 */

import { LS_KEY, LS_PREFS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { toast } from '../ui/toast.js'

export function loadStore() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { papers: [] }
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.papers)) return { papers: [] }
    // 清洗：丢弃结构不对的记录
    data.papers = data.papers
      .filter(function (p) {
        return p && typeof p.id === 'string' && typeof p.name === 'string'
      })
      .map(function (p) {
        if (typeof p.rows !== 'number' || p.rows < 1 || p.rows > 200) p.rows = 40
        if (typeof p.data !== 'object' || p.data === null) p.data = {}
        if (typeof p.createdAt !== 'number') p.createdAt = Date.now()
        if (typeof p.updatedAt !== 'number') p.updatedAt = p.createdAt
        return p
      })
    return data
  } catch (e) {
    app.storageOK = false
    return { papers: [] }
  }
}

export function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ version: 1, papers: app.papers }))
    return true
  } catch (e) {
    app.storageOK = false
    updateStorageWarn()
    toast('保存失败：本地存储空间可能已满')
    return false
  }
}

export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(LS_PREFS) || '{}')
    if (p && typeof p.sort === 'string') app.sortMode = p.sort
    if (p && typeof p.search === 'string') app.searchTerm = p.search
  } catch (e) {}
}

export function savePrefs() {
  try {
    localStorage.setItem(LS_PREFS, JSON.stringify({ sort: app.sortMode, search: app.searchTerm }))
  } catch (e) {}
}

export function checkStorage() {
  try {
    const k = '__sl_test__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    app.storageOK = true
  } catch (e) {
    app.storageOK = false
  }
  updateStorageWarn()
}

function updateStorageWarn() {
  if (app.storageOK) {
    dom.storageWarn.style.display = 'none'
  } else {
    dom.storageWarn.style.display = 'block'
    dom.storageWarn.textContent =
      '⚠ 浏览器本地存储不可用（可能处于无痕模式），本次记录无法保存。'
  }
}
