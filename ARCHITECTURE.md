# 架构说明 · ARCHITECTURE

> 本文件记录 `index.html` 单文件拆分为模块化结构后的目录规划、分层规则与不可破坏的行为约束。
> 面向接手这个仓库的前端工程师。用法与功能介绍见 [README.md](./README.md)。

拆分是一次**纯结构重构**：所有逻辑逐行搬运，函数签名、调用顺序、判定分支均未改动，
行为与原单文件版本一致（已通过浏览器实测，见「九、验证记录」）。

---

## 一、运行方式（拆分后唯一的行为变化）

```bash
python -m http.server 8000     # 或任意静态服务器
# → http://localhost:8000
```

**必须通过 HTTP 访问，双击 `index.html` 不再可用。**

原因：`index.html` 用 `<script type="module">` 加载 `js/main.js`，浏览器对 ES Module
的相对路径导入施加 CORS 同源策略，而 `file://` 源是 opaque origin，跨"文件"请求会被直接拦掉。
CSS 用 `<link>` 加载，不受此限制——所以只有 JS 这一条约束。

代价与收益：
- 失去 `file://` 直开；GitHub Pages 部署路径不受影响。
- 换来真正的模块边界、静态可解析的依赖图、每个文件可独立阅读。

---

## 二、目录树

```
申论答题纸/
├── index.html                    99  纯骨架：只有 DOM 结构 + 样式链接 + 入口脚本
├── ARCHITECTURE.md               本文件
├── README.md                     面向使用者
├── css/                          按界面区块切分，加载顺序 = 级联优先级
│   ├── base.css                  25  设计变量(:root)、重置、body
│   ├── sidebar.css              215  左侧记录列表（.sidebar / .sb-* / .paper-item / .pi-*）
│   ├── toolbar.css              114  .main 布局、工具栏、通用 .btn 体系、.stat/.hint/.divider
│   ├── paper.css                 63  纸张容器与 25 格网格（.paper / #grid / .cell）
│   ├── overlays.css             201  遮罩、#toast、对话框（.modal-layer / .dialog / .dg-*）
│   └── responsive.css            70  @media 窄屏抽屉 + 触摸设备 + @media print（含 --cell 缩放）
└── js/
    ├── main.js                   62  入口：initDom → 绑定事件 → init()
    ├── config.js                 10  只读常量
    ├── state.js                  40  全部共享可变状态（单一 app 对象）
    ├── dom.js                    34  DOM 引用，启动时一次性解析
    ├── lib/                          无状态纯函数，不碰 DOM、不读 app
    │   ├── format.js             53  uid / esc / fmtTime / fmtDate / fmtStamp
    │   └── text.js               30  toSparse / countChars / paperText
    ├── ui/                           通用交互原语
    │   ├── toast.js              14  轻提示
    │   ├── drawer.js              5  窄屏抽屉开关
    │   ├── dialog.js            146  自定义 confirm/prompt（替代原生弹窗）
    │   └── clipboard.js          72  全文复制（clipboard API + execCommand 兜底）
    ├── storage/
    │   └── store.js              84  localStorage 读写、清洗、偏好（只存排序）、可用性自检
    ├── grid/                         网格与编辑引擎（应用的心脏）
    │   ├── build.js              47  buildDOM：整表重建
    │   ├── focus.js              29  setActive / focusCell
    │   ├── edit.js              121  applyChanges + 插入/填充/删除引擎
    │   ├── input.js              65  processValue / handleBackspace / handleDelete
    │   ├── undo.js               81  undo / redo / 历史归档与恢复
    │   ├── stat.js               10  字数统计
    │   └── resize.js             68  setRows（行数变更 + 缩行丢字确认 + 撤销栈作废）
    ├── paper/                        答题纸这一实体的领域逻辑
    │   ├── model.js              30  记录结构与只读查询
    │   ├── header.js             24  标题区与保存按钮三态同步
    │   ├── autosave.js           42  markDirty / autosave
    │   ├── library.js           145  列表排序、搜索、渲染、角标刷新
    │   └── crud.js              231  保存 / 打开 / 新建 / 删除 / 未保存拦截
    ├── backup/
    │   └── transfer.js          131  导出 / 导入 JSON 备份
    └── events/                       所有 addEventListener 的唯一归属地
        ├── grid.js              134  #grid 事件委托（含 IME 与键盘导航）
        ├── toolbar.js            92  工具栏各按钮与输入框
        ├── sidebar.js            66  记录列表、搜索、排序、导入导出、抽屉
        └── global.js             46  全局快捷键、visibilitychange、beforeunload
```

依赖层数最深 4 层，最大的文件 231 行（`paper/crud.js`），原 1600 行 JS 单块已不存在。

---

## 三、分层与依赖方向

依赖只允许**自上而下**，方向固定：

```
L4  入口      main.js
                │
L3  绑定      events/*          ← 只做「读事件 → 调领域函数」，不写业务规则
                │
L2  领域      grid/*   paper/*   backup/*
                │
L1  原语      ui/*     storage/*
                │
L0  地基      config.js  state.js  dom.js  lib/*
```

用脚本对 28 个模块建图并跑 DFS，结论：**无循环依赖**，L0 五个文件入度最高
（`state.js` 被 21 个模块引用、`dom.js` 15、`config.js` 10），符合预期的沙漏结构。

两处需要说明的"跨层"，都是有意为之：

1. **`grid/*` → `paper/autosave.js`**（L2 内部横向）。任何改格子的操作都必须标脏并触发
   自动保存，这个回调边是功能本身要求的。
2. **`paper/crud.js` → `grid/*`**（唯一被允许反向调用网格的 paper 模块）。
   打开/新建答题纸必然要重建网格、恢复撤销历史。
   之所以没形成环，是因为 `grid` 侧的回调出口**只有 `paper/autosave` 一个**，
   而 `autosave` 不依赖任何 grid 模块。新增功能时请守住这条：
   若让 `paper/header.js` 或 `paper/library.js` 去 import `grid/*`，环立刻出现。

---

## 四、三条全局约定

### 1. 状态只在 `state.js` 声明，跨文件靠 `app` 单例

原实现的 20 多个闭包变量集中在一个导出对象上：

```js
import { app } from './state.js'
app.rows          // 行数
app.cells         // 每格字符，'' 表示空
app.inputs        // 与 cells 同索引的 <input>
app.cellDivs      // 与 cells 同索引的 <div class="cell">
app.undoStack     // 撤销栈，元素是 [{idx, prev, next}]
app.papers        // 已存档的答题纸记录
app.activeId      // 当前答题纸 id；未存档为 null
app.dirty         // 有未保存改动
```

硬性规则：
- **不要在模块顶层缓存 `app.xxx` 的值**——顶层求值只跑一次，拿到的是快照，之后赋值看不见。
- 数组/Map（`cells`、`inputs`、`undoStack`、`undoHistory`）**优先原地修改**
  （`push` / `length = 0` / `set`），与原闭包写法保持一致；只有 `cells` 和 `papers`
  在原代码里就是整体替换的，继续 `app.cells = ...`。
- 不要为字段加 getter/setter 包装，也不要把它拆成多个 state 模块。

### 2. DOM 引用只在 `dom.js` 解析，由 `initDom()` 填充

```js
import { dom } from './dom.js'
dom.gridEl.appendChild(frag)   // 只能在函数体内访问
```

保留原实现"启动时一次性 `getElementById`、之后不再查询"的语义。安全的前提是
**所有 `dom.*` 读取都发生在函数调用期**——重建网格只替换 `#grid` 的子节点，被缓存的
容器元素始终有效，因此无需二次解析。别把 `dom.*` 写到任何模块顶层。

### 3. `addEventListener` 全部收在 `events/` 里

领域模块（`grid/`、`paper/`、`ui/`）**一律不绑定事件**，只导出可独立调用的函数。
于是"某个行为由哪个键触发"和"这个行为本身"分离，改快捷键只碰 `events/`，
改编辑逻辑只碰 `grid/`。

`events/` 里的每个模块导出一个 `bindXxx()`，由 `main.js` 在 `init()` **之前**依次调用
（顺序与原实现一致：`init()` 会弹出首启动命名对话框，依赖监听器已就位）。

---

## 五、CSS 的切分依据

按**界面区块**切，不按属性或组件框架思路切，保持"看一眼类名就知道去哪个文件改"。

加载顺序即级联优先级，`index.html` 中的 6 行 `<link>` 顺序**不可调整**：

```
base → sidebar → toolbar → paper → overlays → responsive
```

两个必须知道的具体后果：

- `.sb-foot .btn`（sidebar.css）与 `.btn.tiny`（toolbar.css）**特异性完全相同**（0,0,2,0），
  谁赢取决于文件顺序。toolbar 在后，所以侧边栏底部按钮实际吃的是 `.btn.tiny` 的
  `padding: 5px 10px`。这是原单文件的既有结果，拆分刻意保留了它——把 sidebar 挪到
  toolbar 之后会改变按钮尺寸。
- `responsive.css` 必须最后：里面的 `@media (max-width: 900px)` 要靠后置才能盖过前面
  各文件的默认规则（`.menu-btn { display: inline-block }` 等）。

`.btn.danger` 留在 `overlays.css` 末尾（对话框动作按钮），位置也沿用原文件的相对顺序。

---

## 六、必须保持的行为不变量

这些是原实现里非显而易见的设定，改动前请逐条确认，它们不会有任何报错提示你：

| 不变量 | 所在文件 | 破坏后果 |
| --- | --- | --- |
| 所有格子写入必须走 `applyChanges`，它是唯一同时维护 `cells` 和撤销栈的入口 | `grid/edit.js` | 撤销后画面与数据不一致 |
| `app.undoBaseline` 记录"本次打开"的栈深度，`undo()` 不许退到它之前 | `grid/undo.js` | 误触 Ctrl+Z 清空刚打开的答题纸 |
| 切换答题纸必须成对调用 `stashHistory(id)` / `restoreHistory(id)`，未存档草稿用 `DRAFT_KEY` 归档 | `grid/undo.js` + `paper/crud.js` | 来回切换丢历史 |
| `setRows` 必须整栈作废撤销记录并 `undoHistory.delete()` | `grid/resize.js` | 索引错位，撤销写出乱码 |
| 正因为上一条让缩行**不可撤销**，`setRows` 在会砍掉文字时必须先弹窗确认，取消则把 `rowsInput` 还原成 `app.rows` | `grid/resize.js` | 静默永久删掉尾部文字（曾是本仓库最严重的数据缺陷） |
| 未存档（`isSaved()` 为 false）的草稿**永不**自动落盘，只有用户点保存才建档 | `paper/autosave.js` | 空白草稿污染列表 |
| `processValue` 的三分支顺序：变空 → 删除前移；空格+单字+后面无内容 → 直接填格；其余 → 插入后移 | `grid/input.js` | 书写时推动无关文字，或在文中打洞 |
| `insertChars` 装不下时**整次拒绝并返回 false**，调用方必须还原输入框（`inp.value = prev`） | `grid/edit.js` + `grid/input.js` | 尾部文字被静默挤出去；或画面与 `cells` 分叉，下次按键比对基准出错 |
| `Enter` 落到**下一行行首**（`idx - idx % COLS + COLS`），不是下一行同一列 | `events/grid.js` | 行中回车落在半腰，要手动 Home |
| 输入法组词期间（`app.composing` 或 `e.isComposing`）的 `input` 事件必须丢弃，由 `compositionend` 结算 | `events/grid.js` | 一个汉字被拆成多次输入 |
| `skipNameDirty` 包裹所有程序性回填 `nameInput.value` 的地方 | `paper/crud.js` | 只是打开一张纸就被标成未保存 |
| 任何用户数据进 `innerHTML` 前必须过 `esc()` | `paper/library.js` | XSS（列表与弹窗消息都在拼 HTML 字符串） |
| 事件只绑在 `#grid` / `.paper-list` 容器上做委托 | `events/*.js` | 重绘后监听丢失 |
| `dialog.js` 的 `app.dlgOpen` 互斥锁，以及"只还原仍 `isConnected` 的焦点元素" | `ui/dialog.js` | 弹窗叠加；焦点落到已销毁的格子 |

数据契约同样未变：`localStorage` 键 `shenlun.answerSheets.v1`
（`{ version: 1, papers: [{ id, name, rows, data(稀疏 map), wordCount, createdAt, updatedAt }] }`）
与 `shenlun.prefs.v1`（`{ sort, search }`），旧数据无需迁移。

---

## 七、加一个功能该碰哪些文件

| 需求 | 改动点 |
| --- | --- |
| 新增一个编辑快捷键 | `events/grid.js`（格子里）或 `events/global.js`（全局），行为本身放 `grid/input.js` |
| 换一种字数统计口径 | `grid/stat.js` + `lib/text.js` 的 `countChars`，两处需同步 |
| 列表里多显示一个字段 | `paper/library.js` 的 `paperHTML`；样式在 `css/sidebar.css` |
| 新增一种排序 | `paper/library.js` 的 `sortedPapers` 加 case + `index.html` 的 `<option>` |
| 改存档结构 | `storage/store.js`（清洗 + `version`）与 `backup/transfer.js`（`normalizeImported`）必须一起改 |
| 加一个工具栏按钮 | `index.html` 结构 + `css/toolbar.css` + `dom.js` 取引用 + `events/toolbar.js` 绑定 + 领域函数放对应目录 |
| 新的弹窗类交互 | 复用 `ui/dialog.js` 的 `openDialog`，不要再造第三套 confirm |

---

## 八、已知遗留

- **`dom.sidebar` 是死引用。** 原代码里 `const sidebar = document.getElementById('sidebar')`
  声明后从未使用，为保持 1:1 搬运而保留。可以直接删除。
- **`copyBtn` 的 tooltip 曾写着 `Ctrl + Shift + C`，但代码里没有该绑定** —— 文案已删掉快捷键。
  若真要补一个复制快捷键，别用 `Ctrl + Shift + C`（Chrome 保留给 DevTools 元素选取，
  页面 `preventDefault` 不可靠）；`Ctrl + Shift + N` 同理，它会被 Chrome 抢去开无痕窗口，
  现在 `events/global.js` 里那条绑定在非无痕窗口下多半不生效。可用组合：`Ctrl + Alt + C`。
- **插入/删除的手感仍不符合主流编辑器**：根因是"一格 = 一个焦点位"，删当前格还是删左格
  无法由界面表达。已决定按**路线 B**（换输入层）解决，见第十节。这条不再当作"遗留"处理。
- **以下四条已知缺陷刻意留给路线 B 一并修**，因为在当前模型里修完还要在 B 里重写一遍：
  1. `Tab` 被无条件 `preventDefault`（`events/grid.js`），键盘无法从网格 Tab 到工具栏/侧边栏；
  2. `undo()` 固定 `focusCell(records[0].idx)`，插入操作撤销后光标跳到离编辑点很远的位置；
  3. `MAX_UNDO = 500` 溢出时 `shift()` 静默丢最早的历史，无任何提示；
  4. `25` 写死在 `css/paper.css` 的 `repeat(25, …)` 与 `config.js` 的 `COLS` 两处，
     改列数时 CSS 静默错位不报错。
- `events/global.js` 的 `Ctrl + S` / `Ctrl + Shift + N` 与格子里的 `Ctrl + Z/Y` 分属两个
  监听器，靠 `if (mod) return` 和 `app.dlgOpen` 互相让位。将来若要加更多全局键，
  考虑把两套合并成一个按键路由，否则容易互相抢。
- 没有 lint、没有测试、没有构建步骤。`lib/` 与 `grid/edit.js` 是纯函数，最容易先补上单测。
  **路线 B 动手前必须先补**（见下节第一步）。

---

## 九、验证记录

拆分后在 `http://127.0.0.1:8123/` 用真实浏览器逐项跑通，控制台零报错零警告：

- 首屏：1000 格（40 行 × 25 列）构建、`0 / 1000 字`、空列表提示、首启动命名弹窗
- 建档链：弹窗确认 → `startFresh` → `doSave` → `localStorage` 落盘 → 列表 1 项 → 标题与 `document.title` 同步
- 空格直填连续 3 字；在中间格插字，后文整体后移（`登山之` → `登高山之`）
- 撤销 / 重做（含按钮 disabled 态）；退格删光标格并前移、焦点回退一格
- 行数 40 → 3：重建 75 格、`3 / 75 字`、撤销栈按设计作废
- 切答题纸：内容正确恢复、`rows` 跟随、toast 提示
- 搜索 `登山` 命中正文（名称不含）、片段高亮 `<b>登山</b>之`、无匹配空态
- 清空弹窗（清空后名称保留、可撤销）、删除弹窗（取消后记录数不变）
- 窄屏抽屉开合与遮罩点击关闭

**未能完全验证的一项**：复制到剪贴板。自动化浏览器的视口处于 hidden 状态，缺少用户激活，
`navigator.clipboard.writeText` 与 `execCommand('copy')` 两层都被浏览器拒绝，最终走到了
"复制失败"的 toast 分支。可确认的是 `stateText()` 正确拼出了 3 个字（否则会命中"还是空的"
分支），即 `ui/clipboard.js` 的接线是通的；真正确认写入成功需要在可见窗口里手测一次。

### 层 2 改动（写满拒绝 + 回车落行首）之后的复测

同样零控制台报错：

- 1 行 × 25 格写满后，在第 0 格打字 → 整次拒绝，25 字顺序完全不变，输入框还原成原字，
  `25 / 25 字` 不变，toast「答题纸已写满（25 字）…」
- 同一张满表在第 24 格（末格）打字 → 同样整次拒绝，无字符丢失
- 改成 2 行腾出空间后重做同一次插入 → 成功：`一丁丂…` → `插一丁丂…`，焦点落到被推走的那个字
- 粘贴 40 字到 50 格 / 已占 26 字的表 → 整次拒绝；改粘 5 字 → 成功并把后文后移；`Ctrl+Z` 正确回滚
- `Enter` 从第 0 行第 3 列 → 落到 `idx 25`（下一行行首），改前会落在 `idx 28`（下一行第 3 列）
- 从行尾 `idx 24` 按 `Enter` → `idx 25`，不越界

### 小问题修复批次（缩行确认 / 触摸删除 / 打印缩放 / 搜索词不再持久化）

同样零控制台报错：

- 2 行写 30 字后改成 1 行 → 弹窗「当前内容需要 **2** 行，改成 **1** 行会丢掉最后 **5** 个字」，
  且弹窗时网格仍是 50 格、`30 / 50 字`（未提前截断）
- 点取消 → `rowsInput` 回到 2、50 格、30 字完好；重新确认 → 25 格 / `25 / 25 字`，
  首格 `一`、末格 `丘`（丢字只在用户明确批准后发生）
- 内容恰好 25 字时 2 → 1 行：**不弹窗**，直接生效（无字可丢就不该打扰）
- 搜索"第二"筛到 1 条后刷新 → 搜索框为空、2 条记录全部列出；`shenlun.prefs.v1` 现在只有
  `{"sort":"time-desc"}`，排序偏好照常保留
- CSS：`(hover: none) { .pi-del { display: block } }` 与 `print { :root { --cell: 26px } }`
  都已从 CSSOM 读回，确认被解析器接受而非静默丢弃。
  **桌面行为已验证未受影响**（该窗口报 `hover: hover`，非选中记录的删除按钮仍为 `display: none`）；
  触摸设备的常显效果与打印实际不裁列，这个环境验证不了，需要你在真机 / Ctrl+P 里各看一眼。

---

## 十、已定方向：路线 B —— 换掉输入层

### 诊断（为什么必须换，而不是补）

现在文档本质上一直是"字符串 + 一个操作点"，但那个操作点被实现成**当前格 `c`**，
而程序在不同环节对 `c` 用了两套互斥的解释：

| 环节 | 采用的解释 |
| --- | --- |
| 视觉（`setSelectionRange(0, len)` 整格选中） | "这一格的字是**选区**，打字会覆盖它" |
| 打字（`insertChars(idx, …)`） | "**零宽光标**停在 `idx` 之前，插进去" |
| 退格（`deleteAt(idx)`） | "删掉选中的那个" —— 实际是 Delete 键的语义 |
| Delete（`deleteAt(idx)`） | "删掉光标之后的那个" —— 与退格做了同一件事 |

每个操作各自自洽，合起来互相打脸，用户无法形成稳定预期。打字是**侥幸正确**的
（内部一直是 `p = c` 这套），删除则系统性偏右一格。
根因不是某行代码写错，而是**缺少 `caret` 与 `selection` 这两个概念**：
一格只有一个焦点位，"字的左边"和"字的右边"是同一个位置，删除方向无从表达。

### 目标模型

借鉴 Monaco / CodeMirror / ProseMirror 与任何 `<textarea>` 的共同做法：

- 文档 = 一个字符串 `S`；操作位置 = 零宽 `caret p ∈ [0, len]`；选区 = `{anchor, head}`。
- **删除一律表达成"先算出一个选区，再删它"**：退格删 `[p-1, p)`，Delete 删 `[p, p+1)`，
  有选区时两个键都删选区。引擎只留一个 `deleteRange(a, b)`。
- `#grid` 降级为**纯渲染**：按 `S` 逐格铺字、按 `p` 画插入符、按选区跨格高亮。
- 输入与光标宿主 = **一个隐藏的 textarea**（CodeMirror 5 与各字帖工具的标准套路）。
  零宽 caret、跨字符选区、鼠标拖选、双击选词、`Backspace`/`Delete`/方向键语义、
  IME 组合窗口、`selectionStart/End` 全部交还浏览器——现在的 1000 个单字符 `<input>`
  等于把这些放弃后手工重写，而且只重写了一半（`composing` 闸门、`caret-color: transparent`
  这些补丁散落在三个文件里）。

### 实施顺序

1. **先补单测**锁住 `grid/input.js` + `grid/edit.js` 的现有行为（插入后移、空格直填、
   删除前移、写满整次拒绝）。B 会重写这两个文件，没有测试就是盲改。
2. 引入 textarea 输入层与 `S` / `caret` / `anchor` 状态，`state.js` 里
   `cells / inputs / cellDivs / activeIdx / composing` 相应退场。
3. 渲染层：按 25 字折行铺格 + 插入符绘制 + 选区跨格高亮 + 只重绘变化的格子。
4. 鼠标命中测试（点第几格 → `p` 是多少）与键盘导航，顺带修掉第八节点名留给 B 的四条。
5. 撤销简化为 `{text, caret}` 快照栈 —— 比手写 `[{idx, prev, next}]` 更难写错，
   且"缩行作废撤销栈"那条约束可以一并取消（快照与行列结构无关）。

### 兼容性

存档格式**不需要迁移**：`data` 稀疏 map ↔ 字符串双向转换即可，`rows` 字段继续有效。

### 必须同步的对外承诺

README 的 Features 一节现在把"**Delete at the cursor, never behind it**"当成卖点写着，
`Esc` 之外的键盘表也写了 `Backspace / Delete → Delete at the cursor`。
B 落地即推翻这条承诺，README、`ARCHITECTURE.md` 第六节的不变量表都要同步改，
别留着自相矛盾。
