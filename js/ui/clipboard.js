/* 复制：把当前答题纸的全文送进剪贴板。
 *
 * 两层实现：优先 navigator.clipboard.writeText（需要安全上下文），
 * 失败或不可用时退回到隐藏 textarea + execCommand('copy')。 */

import { app } from '../state.js'
import { toast } from './toast.js'

// 当前答题纸上的文字（按格子顺序拼起来，空格子跳过）
function stateText() {
  let s = ''
  for (let i = 0; i < app.cells.length; i++) if (app.cells[i]) s += app.cells[i]
  return s
}

// 用隐藏的 textarea + execCommand 兜底：没有剪贴板 API 时（非安全上下文 / 旧浏览器）也能复制
function copyViaTextarea(str) {
  const ta = document.createElement('textarea')
  ta.value = str
  ta.setAttribute('readonly', 'readonly')
  ta.style.position = 'fixed'
  ta.style.top = '0'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)

  let ok = false
  const sel = window.getSelection ? window.getSelection() : null
  const savedRanges = []
  if (sel) {
    for (let i = 0; i < sel.rangeCount; i++) savedRanges.push(sel.getRangeAt(i))
  }

  ta.select()
  if (ta.setSelectionRange) ta.setSelectionRange(0, ta.value.length)
  try {
    ok = document.execCommand('copy')
  } catch (e) {
    ok = false
  }

  if (ta.parentNode) ta.parentNode.removeChild(ta)

  // 还原原来的选区与光标
  if (sel) {
    sel.removeAllRanges()
    for (const r of savedRanges) sel.addRange(r)
  }
  return ok
}

// 把当前答题纸的内容以纯文本放进剪贴板，之后可以直接 Ctrl+V 粘贴
export function copyText() {
  const str = stateText()
  if (!str.length) {
    toast('这张答题纸还是空的，没有可复制的内容')
    return
  }

  const done = function () {
    toast('已复制 ' + str.length + ' 个字，可以直接 Ctrl+V 粘贴')
  }
  const fallback = function () {
    if (copyViaTextarea(str)) done()
    else toast('复制失败，请手动选中内容后按 Ctrl+C')
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(str).then(done, fallback)
  } else {
    fallback()
  }
}
