/* 共享可变状态：原本单文件 IIFE 的闭包变量，集中到这一个对象上。
 *
 * 约定（改代码前必读）：
 * 1. 只有本模块可以声明这些状态；其它模块 `import { app }` 后读写 `app.xxx`。
 * 2. 数组/Map（cells、inputs、cellDivs、undoStack、redoStack、undoHistory）
 *    优先原地修改（push / length = 0 / set），与原实现保持一致；
 *    需要整体替换时（cells、papers）直接给属性赋新值，不要重新解构导出。
 * 3. 不要把这里的字段拆成 getter/setter，也不要在模块顶层缓存 `app.xxx` 的值
 *    （顶层缓存等于快照，会丢掉后续赋值）。 */

export const app = {
  /* ---------------- 网格与编辑 ---------------- */
  rows: 40,
  cells: [], // 每格一个字符，''表示空
  inputs: [], // 与 cells 同索引的 <input>
  cellDivs: [], // 与 cells 同索引的 <div class="cell">
  activeIdx: -1, // 当前高亮格
  composing: false, // 输入法组词中

  /* ---------------- 撤销 / 重做 ---------------- */
  undoStack: [],
  redoStack: [],
  undoHistory: new Map(), // 按答题纸归档，来回切换不丢；未存档草稿用 DRAFT_KEY
  undoBaseline: 0, // 本次打开时的撤销栈深度：撤销不会退到载入之前

  /* ---------------- 存储与答题纸库 ---------------- */
  storageOK: true,
  papers: [], // 已保存的答题纸记录（不含当前未保存草稿）
  activeId: null, // 当前答题纸 id（未保存时为 null，不出现在 papers 里）
  dirty: false, // 有未保存的改动
  saveTimer: null, // 自动保存防抖定时器
  skipNameDirty: false, // 程序性回填名称输入框时不触发脏标记

  /* ---------------- 侧边栏偏好 ---------------- */
  searchTerm: '',
  sortMode: 'time-desc',

  /* ---------------- 浮层 ---------------- */
  dlgOpen: false, // 同一时刻只允许一个对话框
}
