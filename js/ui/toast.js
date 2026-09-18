/* 轻提示：一条底部浮动的短暂消息，重复调用会重置计时。 */

import { dom } from '../dom.js'

let hideTimer = null

export function toast(msg) {
  dom.toastEl.textContent = msg
  dom.toastEl.classList.add('show')
  clearTimeout(hideTimer)
  hideTimer = setTimeout(function () {
    dom.toastEl.classList.remove('show')
  }, 1900)
}
