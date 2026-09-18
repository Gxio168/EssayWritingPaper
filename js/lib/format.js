/* 无状态格式化工具：纯函数，不读 DOM、不碰 app。 */

export function uid() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  })
}

export function fmtTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const p2 = function (n) {
    return n < 10 ? '0' + n : '' + n
  }
  const hm = p2(d.getHours()) + ':' + p2(d.getMinutes())
  if (d.toDateString() === now.toDateString()) return '今天 ' + hm
  const y = new Date(now.getTime() - 86400000)
  if (d.toDateString() === y.toDateString()) return '昨天 ' + hm
  if (d.getFullYear() === now.getFullYear()) {
    return d.getMonth() + 1 + '月' + d.getDate() + '日 ' + hm
  }
  return d.getFullYear() + '/' + p2(d.getMonth() + 1) + '/' + p2(d.getDate())
}

// 名称里用的完整日期，例如 2026-09-15
function fmtDate(ts) {
  const d = ts === undefined ? new Date() : new Date(ts)
  const p2 = function (n) {
    return n < 10 ? '0' + n : '' + n
  }
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate())
}

// 名称里用的日期 + 时分秒，例如 2026-09-15 14:07:32
export function fmtStamp(ts) {
  const d = ts === undefined ? new Date() : new Date(ts)
  const p2 = function (n) {
    return n < 10 ? '0' + n : '' + n
  }
  return (
    fmtDate(d.getTime()) +
    ' ' +
    p2(d.getHours()) +
    ':' +
    p2(d.getMinutes()) +
    ':' +
    p2(d.getSeconds())
  )
}
