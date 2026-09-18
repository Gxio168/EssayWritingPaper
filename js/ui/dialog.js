/* 自定义对话框：替代原生 confirm / prompt。
 *
 * 约定：同一时刻只允许一个对话框（app.dlgOpen 互斥锁，重复调用直接 resolve(false)）。
 * 返回值是 Promise —— 确认给 true（带输入框时给输入字符串），取消/点遮罩/Esc 给 false。 */

import { app } from '../state.js'
import { dom } from '../dom.js'

// opts: { title, message, icon:'info'|'warn'|'danger', confirmText, cancelText,
//         danger:Boolean, input:{ value, placeholder }, restoreFocus:Boolean }
export function openDialog(opts) {
  opts = opts || {}
  if (app.dlgOpen) return Promise.resolve(false)
  app.dlgOpen = true

  const iconKind = opts.icon || (opts.danger ? 'danger' : 'info')
  const iconChar = iconKind === 'danger' ? '!' : iconKind === 'warn' ? '!' : 'i'

  const layer = document.createElement('div')
  layer.className = 'modal-layer'
  layer.innerHTML =
    '<div class="dialog" role="dialog" aria-modal="true">' +
    '<div class="dg-head">' +
    '<div class="dg-ico ' +
    iconKind +
    '">' +
    iconChar +
    '</div>' +
    '<div class="dg-title"></div>' +
    '</div>' +
    '<p class="dg-msg"></p>' +
    (opts.input ? '<input class="dg-input" type="text" autocomplete="off">' : '') +
    '<div class="dg-acts">' +
    '<button class="btn" type="button" data-act="cancel"></button>' +
    '<button class="btn ' +
    (opts.danger ? 'danger' : 'primary') +
    '" type="button" data-act="ok"></button>' +
    '</div>' +
    '</div>'

  const dlg = layer.firstChild
  const titleEl = dlg.querySelector('.dg-title')
  const msgEl = dlg.querySelector('.dg-msg')
  const okBtn = dlg.querySelector('[data-act=ok]')
  const cancelBtn = dlg.querySelector('[data-act=cancel]')
  const inputEl = dlg.querySelector('.dg-input')

  titleEl.textContent = opts.title || '提示'
  msgEl.innerHTML = opts.message || ''
  okBtn.textContent = opts.confirmText || '确定'
  cancelBtn.textContent = opts.cancelText || '取消'
  if (inputEl) {
    inputEl.value = (opts.input && opts.input.value) || ''
    inputEl.placeholder = (opts.input && opts.input.placeholder) || ''
  }

  dom.modalEl.appendChild(layer)

  return new Promise(function (resolve) {
    let settled = false
    let prevFocus = document.activeElement

    function cleanup() {
      document.removeEventListener('keydown', onKey, true)
      layer.classList.add('closing')
      setTimeout(function () {
        if (layer.parentNode) layer.parentNode.removeChild(layer)
        app.dlgOpen = false
        // 只在原焦点还挂在文档上时还原，避免聚焦到已被重建的单元格
        if (
          opts.restoreFocus !== false &&
          prevFocus &&
          prevFocus.isConnected &&
          prevFocus.focus
        ) {
          try {
            prevFocus.focus()
          } catch (e) {}
        }
      }, 160)
    }

    function done(val) {
      if (settled) return
      settled = true
      cleanup()
      resolve(val)
    }

    function ok() {
      if (inputEl) {
        const v = inputEl.value.trim()
        if (!v) {
          inputEl.classList.remove('shake')
          void inputEl.offsetWidth // 触发重排，重放动画
          inputEl.classList.add('shake')
          inputEl.focus()
          return
        }
        done(v)
        return
      }
      done(true)
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        done(false)
      } else if (e.key === 'Enter') {
        // 输入法组词中不提交
        if (e.isComposing || e.keyCode === 229) return
        e.preventDefault()
        e.stopPropagation()
        ok()
      }
    }

    okBtn.addEventListener('click', ok)
    cancelBtn.addEventListener('click', function () {
      done(false)
    })
    layer.addEventListener('mousedown', function (e) {
      if (e.target === layer) done(false)
    })
    document.addEventListener('keydown', onKey, true)

    requestAnimationFrame(function () {
      if (inputEl) {
        inputEl.focus()
        if (inputEl.select) inputEl.select()
      } else okBtn.focus()
    })
  })
}

export function alertDialog(title, message, icon) {
  return openDialog({
    title: title,
    message: message,
    icon: icon || 'info',
    cancelText: '知道了',
    confirmText: '好的',
  })
}
