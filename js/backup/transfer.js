/* 库的导出 / 导入（JSON 备份）。
 *
 * 导入侧的策略是「宁可宽松，绝不覆盖」：
 * - normalizeImported 逐字段校验并重建记录，换掉 id，越界的格子直接丢弃；
 * - 顶层结构允许三种形态：数组、{ papers: [] }、单个对象；
 * - 与库中同名的记录自动加 (2)、(3) 后缀，不与已有数据冲突。 */

import { COLS } from '../config.js'
import { app } from '../state.js'
import { uid } from '../lib/format.js'
import { persist } from '../storage/store.js'
import { alertDialog } from '../ui/dialog.js'
import { toast } from '../ui/toast.js'
import { isSaved } from '../paper/model.js'
import { autosave } from '../paper/autosave.js'
import { renderList } from '../paper/library.js'

export function exportData() {
  if (!app.papers.length) {
    alertDialog('还没有可以导出的内容', '先在左侧保存至少一份答题纸，再导出备份文件。')
    return
  }
  if (app.dirty && isSaved()) autosave()

  const payload = {
    app: 'shenlun-answer-sheet',
    version: 1,
    exportedAt: Date.now(),
    papers: app.papers,
  }
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const p2 = function (n) {
    return n < 10 ? '0' + n : '' + n
  }
  a.href = url
  a.download = '申论答题纸备份_' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(function () {
    URL.revokeObjectURL(url)
  }, 4000)
  toast('已导出 ' + app.papers.length + ' 份记录')
}

function normalizeImported(p) {
  if (!p || typeof p !== 'object') return null
  const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : '导入的答题纸'
  let r = parseInt(p.rows, 10)
  if (isNaN(r) || r < 1 || r > 200) r = 40
  let data = {}
  if (p.data && typeof p.data === 'object') {
    for (const k in p.data) {
      if (!Object.prototype.hasOwnProperty.call(p.data, k)) continue
      const i = Number(k)
      if (i >= 0 && i < r * COLS && p.data[k]) data[i] = String(p.data[k])
    }
  }
  const now = Date.now()
  return {
    id: uid(),
    name: name,
    rows: r,
    data: data,
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : now,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : now,
  }
}

export function importData(file) {
  if (!file) return
  if (!/\.json$/i.test(file.name || '') && file.type && file.type.indexOf('json') < 0) {
    alertDialog('这个文件读不了', '请选择由本页「导出备份」生成的 <b>.json</b> 备份文件。', 'warn')
    return
  }

  const reader = new FileReader()
  reader.onload = function () {
    let payload
    try {
      payload = JSON.parse(String(reader.result))
    } catch (e) {
      alertDialog('导入失败', '这个文件不是有效的 JSON，可能已损坏或选错了文件。', 'warn')
      return
    }
    let arr = null
    if (Array.isArray(payload)) arr = payload
    else if (payload && Array.isArray(payload.papers)) arr = payload.papers
    else if (payload && typeof payload === 'object') arr = [payload]

    if (!arr || !arr.length) {
      alertDialog('导入失败', '文件里没有找到任何答题纸数据。', 'warn')
      return
    }

    const clean = arr.map(normalizeImported).filter(Boolean)
    if (!clean.length) {
      alertDialog('导入失败', '数据格式不正确，无法识别其中的答题纸。', 'warn')
      return
    }

    // 同名去重（保留已有的，导入的加后缀）
    const used = {}
    app.papers.forEach(function (p) {
      used[p.name] = true
    })
    clean.forEach(function (p) {
      let n = p.name,
        i = 2
      while (used[n]) {
        n = p.name + ' (' + i + ')'
        i++
      }
      p.name = n
      used[n] = true
    })

    app.papers = app.papers.concat(clean)
    if (persist()) {
      renderList()
      toast('已导入 ' + clean.length + ' 份记录')
    }
  }
  reader.onerror = function () {
    alertDialog('导入失败', '读取文件时出错了，请重试或换一个文件。', 'warn')
  }
  reader.readAsText(file)
}
