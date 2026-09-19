/* 存储层：localStorage 的读写、数据清洗、偏好设置、可用性与容量自检。
 *
 * 这里是唯一直接触碰 localStorage 的模块。写入失败会被翻译成三种用户可见的
 * 反馈，调用方靠 persist() 的返回值决定是否清掉 dirty 标记：
 * 1. toast —— 区分「空间已满」和「存储不可用」，并做 30 秒限流
 *    （autosave 每 1.2s 就会重试一次，不 flooder 的话会连续弹屏）；
 * 2. 侧边栏警告条 —— 存储不可用，或占用超过估满值的 80%；
 * 3. app.storageOK / app.usageKB —— 供其它模块查询。 */

import { LS_KEY, LS_PREFS } from '../config.js'
import { app } from '../state.js'
import { dom } from '../dom.js'
import { toast } from '../ui/toast.js'

const QUOTA_KB = 5 * 1024 // 主流浏览器 localStorage 配额约 5MB（按 UTF-16 每字符 2 字节估）
const WARN_RATIO = 0.8
const FAIL_TOAST_INTERVAL = 30000
let lastFailToastAt = 0

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
  let payload
  try {
    payload = JSON.stringify({ version: 1, papers: app.papers })
    localStorage.setItem(LS_KEY, payload)
  } catch (e) {
    app.storageOK = false
    updateStorageWarn()
    const now = Date.now()
    if (now - lastFailToastAt > FAIL_TOAST_INTERVAL) {
      lastFailToastAt = now
      toast(
        isQuotaError(e)
          ? '保存失败：本地存储空间已满，请先「导出备份」，再删除一些不需要的旧记录'
          : '保存失败：本地存储不可用，内容暂时只存在于当前页面里'
      )
    }
    return false
  }
  app.storageOK = true
  app.usageKB = bytesToKB(payload.length * 2) // localStorage 内部按 UTF-16 存
  updateStorageWarn()
  return true
}

function isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)
}

function bytesToKB(bytes) {
  return Math.max(1, Math.round(bytes / 1024))
}

// 仅供单测：重置失败 toast 的限流窗口（模块级时间戳会跨测试残留）
export function _resetFailToastForTest() {
  lastFailToastAt = 0
}

// 警告条文案（纯函数，方便单测）：返回空串表示不需要显示
export function storageWarnText(storageOK, usageKB) {
  if (!storageOK) {
    return '⚠ 浏览器本地存储不可用（可能处于无痕模式），本次记录无法保存。'
  }
  if (usageKB > QUOTA_KB * WARN_RATIO) {
    const pct = Math.min(99, Math.round((usageKB / QUOTA_KB) * 100))
    return (
      '⚠ 本地存储已用约 ' + pct + '%（' + usageKB + ' KB），' +
      '建议先「导出备份」，再删除不需要的旧记录。'
    )
  }
  return ''
}

// 持久化排序与主题。搜索词故意不存：下次打开时列表被上一轮的关键词筛着，
// 会被当成"记录丢了"，而它几乎从不跨会话复用。
export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(LS_PREFS) || '{}')
    if (p && typeof p.sort === 'string') app.sortMode = p.sort
    if (p && (p.theme === 'light' || p.theme === 'dark')) app.theme = p.theme
  } catch (e) {}
}

export function savePrefs() {
  try {
    localStorage.setItem(LS_PREFS, JSON.stringify({ sort: app.sortMode, theme: app.theme }))
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
  const text = storageWarnText(app.storageOK, app.usageKB)
  if (text) {
    dom.storageWarn.style.display = 'block'
    dom.storageWarn.textContent = text
  } else {
    dom.storageWarn.style.display = 'none'
  }
}
