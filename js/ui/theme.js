/* 主题切换：浅色 / 深色。
 *
 * data-theme 挂在 <html> 上，CSS 变量在 base.css 里成对定义。
 * index.html 的内联脚本在 CSS 解析前就按偏好（或系统设置）设好了初始主题；
 * 这里只负责按钮交互与偏好持久化。app.theme 为空表示「跟随系统」。 */

import { app } from '../state.js'
import { dom } from '../dom.js'
import { savePrefs } from '../storage/store.js'

export function initTheme() {
  applyTheme(app.theme)
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  app.theme = next
  savePrefs()
}

function applyTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#16181d' : '#eef1f5')
  if (dom.themeBtn) {
    dom.themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙'
    dom.themeBtn.title = theme === 'dark' ? '切换到浅色' : '切换到深色'
  }
}
