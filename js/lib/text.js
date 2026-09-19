/* 无状态文本工具：纯函数，不碰 DOM、不读 app。
 *
 * 路线 B 后文档是字符串，但存档格式仍是稀疏 map（旧数据兼容，结构未迁移）：
 * - textToSparse / sparseToText 负责字符串 ↔ 稀疏 map 双向转换；
 * - 空格是合法内容（Enter 另起一行时垫出来的空格子），照存照读。 */

// 文档字符串 → 存档用稀疏 map。每个字符都存（含空格），键是格子序号。
export function textToSparse(text) {
  const map = {}
  for (let i = 0; i < text.length; i++) {
    if (text[i]) map[i] = text[i]
  }
  return map
}

// 稀疏 map → 文档字符串。按键的数值顺序拼接。
export function sparseToText(data) {
  const d = data || {}
  const keys = Object.keys(d)
    .map(Number)
    .sort(function (a, b) {
      return a - b
    })
  let s = ''
  for (const k of keys) s += d[k]
  return s
}

// 字数：不含空白字符（空格是「留空的格子」，不算写出来的字）
export function countChars(text) {
  let n = 0
  for (const ch of String(text)) {
    if (!/\s/u.test(ch)) n++
  }
  return n
}

// 一张已存档答题纸的全文（搜索用）
export function paperText(p) {
  return sparseToText(p && p.data)
}

// 通用文本 diff：返回 { pos, removed, inserted }。
// oldStr 经 pos 处删 removed 个字符、插入 inserted 后等于 newStr。
export function diffTexts(oldStr, newStr) {
  let start = 0
  const minLen = Math.min(oldStr.length, newStr.length)
  while (start < minLen && oldStr[start] === newStr[start]) start++
  let endOld = oldStr.length
  let endNew = newStr.length
  while (endOld > start && endNew > start && oldStr[endOld - 1] === newStr[endNew - 1]) {
    endOld--
    endNew--
  }
  return { pos: start, removed: endOld - start, inserted: newStr.slice(start, endNew) }
}
