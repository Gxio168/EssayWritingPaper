/* 光标定位：把「格子上的某个位置」翻译成零宽 caret 并画出来。
 *
 * caret p 的含义：下一个字符落在第 p 格（p 及其后内容整体后移）。
 * 点击格子左半 → p = idx；右半 → p = idx + 1。 */

import { app } from '../state.js'
import { dom } from '../dom.js'
import { syncTextarea, renderCaret } from './render.js'

export function clampCaret(p) {
  return Math.max(0, Math.min(p, app.text.length))
}

// 设置光标/选区并重画（不挪焦点，调用方决定是否 focus 隐藏输入框）
export function setCaret(p, anchor) {
  syncTextarea(p, anchor === undefined ? p : anchor)
  renderCaret()
}

// 聚焦隐藏输入框并把光标放到指定位置（crud/工具栏的 focusCell 替代品）
export function focusCaret(p, anchor) {
  dom.hiddenInput.focus()
  setCaret(p, anchor)
}
