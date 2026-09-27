/* 复制：把当前答题纸的全文送进剪贴板。
 *
 * 两层实现：优先 navigator.clipboard.writeText（需要安全上下文），
 * 失败或不可用时退回到隐藏 textarea + execCommand('copy')。 */

import { app } from '../state.js'
import { countChars } from '../lib/text.js'
import { toast } from './toast.js'

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

// 通用出口：把任意字符串送进剪贴板，空内容 / 成功 / 失败各给一条消息
export function copyString(str, emptyMsg, okMsg) {
  if (!str.length) {
    toast(emptyMsg)
    return
  }
  const done = function () {
    toast(okMsg)
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

// 把当前答题纸的内容以纯文本放进剪贴板，之后可以直接 Ctrl+V 粘贴
export function copyText() {
  copyString(
    app.text,
    '这张答题纸还是空的，没有可复制的内容',
    '已复制 ' + countChars(app.text) + ' 个字，可以直接 Ctrl+V 粘贴'
  )
}
