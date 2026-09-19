/* lib/ 纯函数单测：format.js + text.js
 * 这些函数不碰 DOM、不读 app，直接测。 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { uid, esc, fmtTime, fmtStamp } from '../js/lib/format.js'
import {
  textToSparse,
  sparseToText,
  countChars,
  paperText,
  diffTexts,
} from '../js/lib/text.js'

/* ---------------- format.js ---------------- */

describe('esc()', () => {
  test('转义全部五类 HTML 特殊字符', () => {
    assert.equal(esc('&<>"\''), '&amp;&lt;&gt;&quot;&#39;')
  })
  test('普通中文与字母数字原样通过', () => {
    assert.equal(esc('申论答题纸 abc123'), '申论答题纸 abc123')
  })
  test('非字符串输入被转成字符串', () => {
    assert.equal(esc(123), '123')
  })
  test('XSS 向量整体被中和', () => {
    const out = esc('<img src=x onerror="alert(1)">')
    assert.ok(!out.includes('<'))
    assert.ok(!out.includes('"'))
  })
})

describe('uid()', () => {
  test('以 p 开头，批量生成不重复', () => {
    const seen = new Set()
    for (let i = 0; i < 2000; i++) {
      const id = uid()
      assert.ok(id.startsWith('p'), 'uid 应以 p 开头: ' + id)
      assert.ok(!seen.has(id), 'uid 不应重复: ' + id)
      seen.add(id)
    }
  })
})

describe('fmtTime()', () => {
  test('今天的记录显示「今天 HH:MM」', () => {
    const d = new Date()
    d.setHours(9, 5, 0, 0)
    assert.equal(fmtTime(d.getTime()), '今天 09:05')
  })
  test('昨天的时间戳显示「昨天 HH:MM」', () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    d.setHours(23, 0, 0, 0)
    assert.equal(fmtTime(d.getTime()), '昨天 23:00')
  })
})

describe('fmtStamp()', () => {
  test('输出 YYYY-MM-DD HH:MM:SS 格式', () => {
    const s = fmtStamp(new Date(2026, 8, 15, 14, 7, 32).getTime())
    assert.equal(s, '2026-09-15 14:07:32')
  })
  test('无参数时用当前时间（可被 Date 解析且长度一致）', () => {
    const s = fmtStamp()
    assert.equal(s.length, 19)
    assert.equal(s[4], '-')
    assert.equal(s[10], ' ')
    assert.equal(s[13], ':')
  })
})

/* ---------------- text.js ---------------- */

describe('textToSparse() / sparseToText() 往返', () => {
  test('字符串 → 稀疏 map：键是格子序号', () => {
    assert.deepEqual(textToSparse('一二三'), { '0': '一', '1': '二', '2': '三' })
  })
  test('空格也存（Enter 垫出来的留空格子要保得住）', () => {
    const m = textToSparse('一 二')
    assert.equal(m['1'], ' ')
  })
  test('稀疏 map → 字符串按键的数值顺序拼接（10 在 2 后面）', () => {
    assert.equal(sparseToText({ 2: '丙', 10: '乙', 0: '甲' }), '甲丙乙')
  })
  test('往返一致（含空格）', () => {
    const s = '一二三    六七八'
    assert.equal(sparseToText(textToSparse(s)), s)
  })
  test('空数据返回空串', () => {
    assert.equal(sparseToText(null), '')
    assert.equal(sparseToText({}), '')
    assert.deepEqual(textToSparse(''), {})
  })
})

describe('countChars()', () => {
  test('不含空白：空格是留空的格子，不算字', () => {
    assert.equal(countChars('一二  三'), 3)
  })
  test('全角空格也不算', () => {
    assert.equal(countChars('一\u3000二'), 2)
  })
  test('空串为 0', () => {
    assert.equal(countChars(''), 0)
  })
})

describe('paperText()', () => {
  test('拼接存档的稀疏 map', () => {
    assert.equal(paperText({ data: { 0: '一', 5: '二' } }), '一二')
  })
  test('无 data / 空记录返回空串', () => {
    assert.equal(paperText(null), '')
    assert.equal(paperText({}), '')
  })
})

describe('diffTexts()', () => {
  test('纯插入', () => {
    assert.deepEqual(diffTexts('登山之乐', '登高山之乐'), {
      pos: 1,
      removed: 0,
      inserted: '高',
    })
  })
  test('纯删除', () => {
    assert.deepEqual(diffTexts('一X二', '一二'), { pos: 1, removed: 1, inserted: '' })
  })
  test('替换', () => {
    assert.deepEqual(diffTexts('一二三四五', '一X四五'), {
      pos: 1,
      removed: 2,
      inserted: 'X',
    })
  })
  test('尾部追加', () => {
    assert.deepEqual(diffTexts('一二', '一二三'), { pos: 2, removed: 0, inserted: '三' })
  })
  test('清空', () => {
    assert.deepEqual(diffTexts('一二三', ''), { pos: 0, removed: 3, inserted: '' })
  })
  test('相同文本：零变化', () => {
    assert.deepEqual(diffTexts('一二', '一二'), { pos: 2, removed: 0, inserted: '' })
  })
})
