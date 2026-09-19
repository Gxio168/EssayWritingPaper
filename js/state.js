/* 共享可变状态：集中到这一个对象上，其它模块 `import { app }` 后读写。
 *
 * 约定（改代码前必读）：
 * 1. 只有本模块可以声明这些状态；不要在模块顶层缓存 `app.xxx` 的值
 *    （顶层缓存等于快照，会丢掉后续赋值）。
 * 2. 数组/Map（undoStack、undoHistory、cellDivs）优先原地修改；
 *    text / papers 等整体替换的字段直接赋新值。
 * 3. 不要把字段拆成 getter/setter。
 *
 * 路线 B 文档模型：整张答题纸就是一个字符串 app.text，
 * 第 i 个字符渲染在第 i 格；光标 caret 是 [0, len] 里的零宽位置。
 * 选区 = {anchor, head=caret}，anchor === caret 表示无选区。 */

export const app = {
  /* ---------------- 网格与编辑 ---------------- */
  rows: 40, // 行数；容量 = rows × COLS
  text: '', // 文档字符串（可含空格 = 故意留空的格子）
  caret: 0, // 光标（选区头部），零宽位置
  anchor: 0, // 选区锚点；等于 caret 即无选区
  cellDivs: [], // .cell 元素，按格子序
  rendered: [], // 每格当前渲染的字符（增量渲染用）
  selRange: [-1, -1], // 上次画过选区高亮的格子范围
  curCell: -1, // 上次画过「当前格」软高亮的格子

  /* ---------------- 撤销 / 重做 ---------------- */
  // 快照栈：元素 { text, caret, anchor }。快照彼此独立，
  // 裁掉最旧的一条不影响正确性（与旧版增量记录不同）。
  undoStack: [],
  redoStack: [],
  undoHistory: new Map(), // 按答题纸归档，来回切换不丢；未存档草稿用 DRAFT_KEY
  undoBaseline: 0, // 本次打开时的栈深度：撤销不会退到载入之前

  /* ---------------- 存储与答题纸库 ---------------- */
  storageOK: true,
  usageKB: 0, // 最近一次成功落盘的库体积估算（KB），超阈值时侧边栏告警
  papers: [], // 已保存的答题纸记录（不含当前未保存草稿）
  activeId: null, // 当前答题纸 id（未保存时为 null，不出现在 papers 里）
  dirty: false, // 有未保存的改动
  saveTimer: null, // 自动保存防抖定时器
  skipNameDirty: false, // 程序性回填名称输入框时不触发脏标记

  /* ---------------- 偏好 ---------------- */
  searchTerm: '',
  sortMode: 'time-desc',
  theme: '', // 'light' | 'dark' | ''（空 = 跟随系统）

  /* ---------------- 浮层 ---------------- */
  dlgOpen: false, // 同一时刻只允许一个对话框
}
