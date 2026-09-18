/* 左侧记录列表：排序、搜索（名称 + 全文）、HTML 渲染、命中片段高亮。
 *
 * 渲染策略：整表 innerHTML 重绘（renderList）+ 只改高亮和角标的轻量刷新
 * （updateActiveBadge）。后者给打字等高频路径用，避免每次按键重绘整张列表。
 *
 * 安全：所有插进 innerHTML 的用户数据都必须先过 esc()。 */

import { app } from '../state.js'
import { dom } from '../dom.js'
import { esc, fmtTime } from '../lib/format.js'
import { paperText } from '../lib/text.js'

export function sortedPapers() {
  const list = app.papers.slice()
  list.sort(function (a, b) {
    switch (app.sortMode) {
      case 'time-asc':
        return a.updatedAt - b.updatedAt
      case 'name-asc':
        return a.name.localeCompare(b.name, 'zh-Hans-CN')
      case 'name-desc':
        return b.name.localeCompare(a.name, 'zh-Hans-CN')
      case 'created-desc':
        return b.createdAt - a.createdAt
      default:
        return b.updatedAt - a.updatedAt
    }
  })
  return list
}

// 命中处前后各留 10 个字符，命中段用 <b> 包起来
function snippetOf(text, term) {
  const lower = text.toLowerCase()
  const i = lower.indexOf(term.toLowerCase())
  if (i < 0) return ''
  // 转成码点数组，避免把代理对（如 emoji）从中间切断
  const chars = Array.from(text)
  let pos = 0,
    cpStart = -1,
    cpEnd = chars.length
  for (let k = 0; k < chars.length; k++) {
    const next = pos + chars[k].length
    if (cpStart < 0 && next > i) cpStart = k
    if (next >= i + term.length) {
      cpEnd = k + 1
      break
    }
    pos = next
  }
  if (cpStart < 0) cpStart = 0
  const from = Math.max(0, cpStart - 10)
  const to = Math.min(chars.length, cpEnd + 10)
  return (
    (from > 0 ? '…' : '') +
    esc(chars.slice(from, cpStart).join('')) +
    '<b>' +
    esc(chars.slice(cpStart, cpEnd).join('')) +
    '</b>' +
    esc(chars.slice(cpEnd, to).join('')) +
    (to < chars.length ? '…' : '')
  )
}

function paperHTML(p, term) {
  const txt = term ? paperText(p) : ''
  const snip = term ? snippetOf(txt, term) : ''
  const cnt = typeof p.wordCount === 'number' ? p.wordCount : Object.keys(p.data || {}).length
  return (
    '<div class="paper-item' +
    (p.id === app.activeId ? ' active' : '') +
    '" data-id="' +
    p.id +
    '" title="' +
    esc(p.name) +
    '">' +
    '<div class="pi-row1">' +
    '<div class="pi-name">' +
    esc(p.name) +
    '</div>' +
    (app.dirty && p.id === app.activeId ? '<span class="pi-badge">未保存</span>' : '') +
    '<button class="pi-del" type="button" data-del="' +
    p.id +
    '" title="删除">×</button>' +
    '</div>' +
    '<div class="pi-row2"><span>' +
    cnt +
    ' 字</span><span>' +
    fmtTime(p.updatedAt) +
    '</span></div>' +
    (snip ? '<div class="pi-snippet">' + snip + '</div>' : '') +
    '</div>'
  )
}

export function renderList() {
  const term = app.searchTerm.trim()
  let list = sortedPapers()

  if (term) {
    const lower = term.toLowerCase()
    list = list.filter(function (p) {
      return (
        p.name.toLowerCase().indexOf(lower) >= 0 ||
        paperText(p).toLowerCase().indexOf(lower) >= 0
      )
    })
  }

  if (!list.length) {
    dom.paperListEl.innerHTML =
      '<div class="empty">' +
      (term
        ? '没有找到匹配的答题纸<br>换个关键词试试'
        : '还没有保存的答题纸<br>写完内容后点「保存」即可留档') +
      '</div>'
    return
  }

  dom.paperListEl.innerHTML = list
    .map(function (p) {
      return paperHTML(p, term)
    })
    .join('')
}

// 只刷新列表里的高亮与“未保存”角标，避免每次按键整表重绘
export function updateActiveBadge() {
  const items = dom.paperListEl.querySelectorAll('.paper-item')
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const isActive = item.dataset.id === app.activeId
    item.classList.toggle('active', isActive)
    const row1 = item.querySelector('.pi-row1')
    const badge = item.querySelector('.pi-badge')
    if (isActive && app.dirty && !badge && row1) {
      const span = document.createElement('span')
      span.className = 'pi-badge'
      span.textContent = '未保存'
      row1.insertBefore(span, row1.querySelector('.pi-del'))
    } else if ((!isActive || !app.dirty) && badge) {
      badge.remove()
    }
  }
}
