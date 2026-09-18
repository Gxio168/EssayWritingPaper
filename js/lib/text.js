/* 无状态文本工具：纯函数。
 * cells 数组 → 稀疏 map（存档格式）、字数统计、把稀疏 map 还原成整段文本。
 * 注意这几个函数都接收显式参数，不读 app，方便单独测试。 */

export function toSparse(stateArr) {
  const map = {}
  for (let i = 0; i < stateArr.length; i++) {
    if (stateArr[i]) map[i] = stateArr[i]
  }
  return map
}

export function countChars(stateArr) {
  let n = 0
  for (let i = 0; i < stateArr.length; i++) if (stateArr[i]) n++
  return n
}

// 一张已存档答题纸的全文（按格子索引顺序拼接，空格跳过）
export function paperText(p) {
  const d = p && p.data ? p.data : {}
  const keys = Object.keys(d)
    .map(Number)
    .sort(function (a, b) {
      return a - b
    })
  let s = ''
  for (const k of keys) s += d[k]
  return s
}
