/* 工具栏事件：行数、名称、保存、复制、撤销/重做、清空。
 *
 * 这里只做「读事件 → 调领域函数」，不写业务规则。
 * 两处刻意保留的细节：
 * - nameInput 的 input 回调要看 skipNameDirty，程序性回填名称时不能标脏。
 * - saveBtn 只在已有名字时才把焦点还给网格，否则由命名弹窗接管焦点。 */

import { app } from '../state.js'
import { dom } from '../dom.js'
import { countChars } from '../lib/text.js'
import { openDialog } from '../ui/dialog.js'
import { toast } from '../ui/toast.js'
import { copyText } from '../ui/clipboard.js'
import { setRows } from '../grid/resize.js'
import { clearAll } from '../grid/engine.js'
import { undo, redo } from '../grid/undo.js'
import { focusCaret } from '../grid/caret.js'
import { updateHeader } from '../paper/header.js'
import { savePaper } from '../paper/crud.js'

export function bindToolbarEvents() {
  dom.rowsInput.addEventListener('change', function () {
    setRows(this.value)
  })
  dom.rowsInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      this.blur()
      setRows(this.value)
    }
  })

  dom.nameInput.addEventListener('input', function () {
    if (app.skipNameDirty) return
    dom.paperTitle.textContent = this.value.trim() || '申论答题纸'
    updateHeader()
  })
  dom.nameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      savePaper()
      this.blur()
    }
  })

  dom.saveBtn.addEventListener('click', function () {
    // 已经有名字就直接存档；否则弹窗补名字，由弹窗流程接管焦点
    if (dom.nameInput.value.trim()) dom.hiddenInput.focus()
    savePaper()
  })

  dom.copyBtn.addEventListener('click', function () {
    copyText()
  })

  dom.undoBtn.addEventListener('click', function () {
    undo()
    dom.hiddenInput.focus()
  })
  dom.redoBtn.addEventListener('click', function () {
    redo()
    dom.hiddenInput.focus()
  })

  dom.clearBtn.addEventListener('click', function () {
    const n = countChars(app.text)
    if (!n) {
      toast('当前答题纸已经是空的')
      return
    }

    openDialog({
      title: '清空这张答题纸？',
      icon: 'warn',
      danger: true,
      message:
        '将清除当前答题纸上的 <b>' +
        n +
        '</b> 个字，' +
        '答题纸本身和名称都会保留。<br>清空之后可以用 <b>Ctrl + Z</b> 撤销。',
      confirmText: '清空',
      cancelText: '取消',
    }).then(function (okVal) {
      if (!okVal) return
      clearAll()
      focusCaret(0)
    })
  })
}
