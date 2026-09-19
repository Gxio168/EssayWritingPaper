# 架构说明 · ARCHITECTURE

> 本文件记录「申论答题纸」的目录规划、分层规则与不可破坏的行为约束。
> 面向接手这个仓库的前端工程师。用法与功能介绍见 [README.md](./README.md)。
>
> 本文对应 **路线 B 已落地之后** 的架构：文档是字符串、输入宿主是一个隐藏
> textarea、#grid 是纯渲染层。旧版「一格一个 `<input>`」的模型及其历史包袱
> （删除语义偏右一格、Tab 被吞、撤销后光标乱跳等）已全部移除。

---

## 一、运行方式

```bash
python -m http.server 8000     # 或任意静态服务器
npm test                       # 69 条单测（node:test，零依赖，Node 18+）
```

**必须通过 HTTP 访问**：`index.html` 用 `<script type="module">` 加载 `js/main.js`，
浏览器对 ES Module 的相对路径导入施加 CORS 同源策略，`file://` 源会被拦掉。
CSS 用 `<link>` 加载，不受此限制。

本地开发时建议用一个发 `Cache-Control: no-store` 的静态服务器（仓库根目录的
`python -m http.server` 不发缓存头，浏览器启发式缓存会让你改完代码刷新却看到
旧 JS/CSS，非常迷惑）。

---

## 二、目录树

```
申论答题纸/
├── index.html                    纯骨架：DOM 结构 + 样式链接 + PWA 引用 + 防闪烁主题脚本
├── manifest.webmanifest          PWA 清单（相对路径，兼容 GitHub Pages 子路径）
├── sw.js                         Service Worker：预缓存 + stale-while-revalidate
├── icons/                        PWA 图标（192 / 512 / maskable-512）
├── package.json                  仅 "type": "module" 与 npm test 入口，零依赖
├── css/                          按界面区块切分，加载顺序 = 级联优先级
│   ├── base.css                  设计变量（浅色 :root + 深色 html[data-theme='dark']）、重置
│   ├── sidebar.css               左侧记录列表
│   ├── toolbar.css               工具栏、通用 .btn 体系
│   ├── paper.css                 答题纸容器、格子、光标竖线、隐藏输入框
│   ├── overlays.css              遮罩、toast、对话框
│   └── responsive.css            窄屏抽屉 + 触摸设备 + @media print（含深色回退浅色）
├── js/
│   ├── main.js                   入口：initDom → initTheme → 绑定事件 → init() → 注册 SW
│   ├── config.js                 只读常量（COLS / MAX_UNDO / LS 键 / DRAFT_KEY）
│   ├── state.js                  全部共享可变状态（单一 app 对象）
│   ├── dom.js                    DOM 引用，启动时一次性解析
│   ├── lib/                      无状态纯函数，不碰 DOM、不读 app
│   │   ├── format.js             uid / esc / fmtTime / fmtDate / fmtStamp
│   │   └── text.js               textToSparse / sparseToText / countChars / paperText / diffTexts
│   ├── ui/                       通用交互原语
│   │   ├── toast.js              轻提示
│   │   ├── drawer.js             窄屏抽屉开关
│   │   ├── dialog.js             自定义 confirm/prompt
│   │   ├── clipboard.js          全文复制（clipboard API + execCommand 兜底）
│   │   └── theme.js              深浅切换（ui → storage 的 savePrefs 是唯一的 L1 横向依赖）
│   ├── storage/
│   │   └── store.js              localStorage 读写、清洗、偏好（排序+主题）、容量/失败防护
│   ├── grid/                     网格与编辑引擎（应用的心脏）
│   │   ├── build.js              buildDOM：整表重建（格子 + 光标竖线）
│   │   ├── render.js             renderText / renderCaret / syncTextarea（程序性写 textarea 唯一入口）
│   │   ├── engine.js             capacity / pushUndo / commit / replaceRange / setText / clearAll
│   │   ├── caret.js              clampCaret / setCaret / focusCaret
│   │   ├── undo.js               快照栈 undo/redo + 按 id 归档
│   │   ├── stat.js               字数统计（不含空白）
│   │   └── resize.js             setRows（缩行确认 + 截断可撤销）
│   ├── paper/                    答题纸这一实体的领域逻辑
│   │   ├── model.js              记录结构与只读查询
│   │   ├── header.js             标题区与保存按钮三态同步
│   │   ├── autosave.js           markDirty / autosave
│   │   ├── library.js            列表排序、搜索、渲染、角标刷新
│   │   └── crud.js               保存 / 打开（含自愈扩行）/ 新建 / 删除 / 未保存拦截
│   ├── backup/
│   │   └── transfer.js           导出 / 导入 JSON 备份
│   └── events/                   所有 addEventListener 的唯一归属地
│       ├── grid.js               隐藏 textarea 的 input/beforeinput/keydown/paste/selectionchange
│       │                         + #grid 鼠标（点格定位 / 拖选 / 双击选段）
│       ├── toolbar.js            工具栏各按钮与输入框
│       ├── sidebar.js            记录列表、搜索、排序、新建、主题、导入导出、抽屉
│       └── global.js             全局快捷键、visibilitychange、beforeunload
└── tests/
    ├── helpers/env.js            Node 桩：dom 对象、假 cellDivs、假 textarea、localStorage
    ├── lib.test.js               format + text（含 diffTexts）
    ├── grid-engine.test.js       engine / render 的语义锁定
    ├── undo.test.js              快照撤销 / baseline / 归档 / 缩行撤销
    └── storage.test.js           persist 失败路径 / 限流 / 容量告警 / 存档清洗
```

---

## 三、文档模型（读懂这一节才能动 grid/）

文档 = 一个字符串 `app.text`；第 i 个字符渲染在第 i 格。光标 `caret` 是
`[0, len]` 里的**零宽位置**（下一个字符落在第 caret 格，其后内容整体后移）；
选区 = `{anchor, head=caret}`，`anchor === caret` 即无选区。

输入宿主 = `#hiddenInput`（一个隐藏 textarea）。**打字、退格/Delete 方向语义、
左右方向键、拖选、双击选词、IME 组合窗口全部交还浏览器原生处理**——旧版手工
模拟这些行为的代码（composing 闸门、caret-color 补丁等）已不存在。

数据流只有三条，全部收敛到 `grid/engine.js`：

| 入口 | 谁调用 | 行为 |
| --- | --- | --- |
| `commit(pos, removed, inserted)` | events/grid 的 input diff | 不碰 `.value`（浏览器已写好），应用 diff 到 `app.text`，从 textarea 读回选区 |
| `replaceRange(a, b, str)` | 粘贴 / Enter 垫空格 / 缩行截断 | 程序性替换；**装不下整次拒绝**返回 false，并 `syncTextarea` 全量同步 |
| `setText(text, caret, anchor)` | 载入存档 / 清空 / 撤销恢复 | 整篇替换 + 全量同步；不做快照（调用方决定是否 pushUndo） |

`#grid` 是纯渲染：`renderText` 按字符串铺字（`app.rendered` 记增量，只改变化的格子），
`renderCaret` 画光标竖线与选区跨格高亮（`app.selRange` / `app.curCell` 记增量）。
光标竖线 `dom.caretEl` 由 `buildDOM` 动态创建，是 `dom.js`「一次性解析」约定的
**唯一例外**。

Enter 的语义：目标 = 下一行行首。行首在正文内 → 纯导航；在正文末尾之外 →
`replaceRange` 垫空格把光标送过去（空格 = 留空的格子，`countChars` 不计）。

---

## 四、分层与依赖方向

依赖只允许**自上而下**：

```
L4  入口      main.js
                │
L3  绑定      events/*          ← 只做「读事件 → 调领域函数」，不写业务规则
                │
L2  领域      grid/*   paper/*   backup/*
                │
L1  原语      ui/*    storage/*
                │
L0  地基      config.js  state.js  dom.js  lib/*
```

两处需要说明的边：

1. **`grid/*` → `paper/autosave.js`**（L2 内部横向，唯一出口）。任何改 `app.text`
   的操作都必须标脏并触发自动保存，这个回调边是功能本身要求的。
2. **`paper/crud.js` → `grid/*`**（唯一被允许反向调用网格的 paper 模块）。
   打开/新建答题纸必然要重建网格、恢复撤销历史。不要让 `paper/library.js` 或
   `paper/header.js` 去 import `grid/*`，否则成环。

grid/ 内部的依赖（非环）：`engine → render/stat/undo`；`undo → render/build`；
`resize → engine/render/build`；`caret → render`。`render.js` 只依赖 L0，是
渲染事实的唯一来源。

---

## 五、三条全局约定

### 1. 状态只在 `state.js` 声明，跨文件靠 `app` 单例

核心字段（完整清单见文件内注释）：

```js
app.text        // 文档字符串（空格 = 故意留空的格子，合法内容）
app.caret       // 光标（选区头部），零宽位置
app.anchor      // 选区锚点；=== caret 即无选区
app.cellDivs    // .cell 元素数组
app.rendered    // 每格当前渲染的字符（增量渲染）
app.selRange / app.curCell   // 上次画过的高亮（避免全表遍历）
app.undoStack / redoStack    // 快照 { text, caret, anchor, rows }
app.undoHistory              // 按答题纸 id 归档；未存档草稿用 DRAFT_KEY
app.undoBaseline             // 本次打开的栈深：撤销不越过它
app.theme                    // 'light' | 'dark' | ''（空 = 跟随系统）
app.usageKB                  // 最近一次成功落盘的体积估算
```

硬性规则：不在模块顶层缓存 `app.xxx`；不要拆 getter/setter；textarea 的选区
以 `app.caret/anchor` 为准（方向语义见 `readSelFromTa`）。

### 2. DOM 引用只在 `dom.js` 解析，由 `initDom()` 填充

所有 `dom.*` 读取必须发生在函数调用期。例外：`dom.caretEl` 由 `buildDOM`
动态创建并重新赋值（因为 `#grid.innerHTML = ''` 会清掉它），别在别处缓存它。

### 3. `addEventListener` 全部收在 `events/` 里

领域模块只导出可独立调用的函数。例外是 `document` 级的 `selectionchange` /
`mousemove` / `mouseup`，它们与 `#grid` 的鼠标委托同属 `events/grid.js`。

---

## 六、CSS 的组织

加载顺序即级联优先级，`index.html` 中的 6 行 `<link>` 顺序**不可调整**：
`base → sidebar → toolbar → paper → overlays → responsive`。

- **所有颜色走 `base.css` 的语义变量**（`--surface`、`--heading`、`--sel-bg`、
  `--warn-bg` 等）。深色主题 = `html[data-theme='dark']` 覆盖变量值，组件样式
  只有一套。新增界面元素时**不要写死颜色**。
- 列数不写死：`#grid` 用 `repeat(var(--cols, 25), var(--cell))`，`main.js` 启动时
  把 `config.js` 的 `COLS` 写进 `:root`。改列数只动 `config.js`。
- `html[data-theme='dark']` 特异性高于 `:root`；打印（`responsive.css` 的
  `@media print`）对深色主题做了一组浅色变量回退，省墨。
- `index.html` 头部有一段内联脚本在 CSS 解析前把 `data-theme` 挂到 `<html>`，
  深色用户刷新不闪白屏。改偏好键名时记得同步它。

---

## 七、必须保持的行为不变量

| 不变量 | 所在文件 | 破坏后果 |
| --- | --- | --- |
| `app.text` 的所有变更必须走 engine 三入口之一，它们负责同步 textarea、渲染、撤销栈 | `grid/engine.js` | 画面与状态分叉，下一次 diff 基准错乱 |
| 程序性写 textarea 必须经 `syncTextarea`（直接赋 `.value` 会把选区重置到末尾） | `grid/render.js` | 打一个字光标飞到文末 |
| 打字路径（commit）**不写** `.value`，只读回选区；只有拒绝/撤销/载入才全量同步 | `grid/engine.js` | 输入法组词被打断、选区抖动 |
| 容量装不下时**整次拒绝**：input 路径 revert 输入框，replaceRange 返回 false | `events/grid.js` + `grid/engine.js` | 尾部文字被静默挤出去 |
| textarea 出现 `\n\r\t` 一律 revert（换行不进文档，Enter 走垫空格） | `events/grid.js` | 25 字/行的折行错乱 |
| 撤销快照 `{text, caret, anchor, rows}`；`pushUndo` 必须在变更**之前**调用（含改 rows） | `grid/engine.js` + `grid/resize.js` | 缩行撤销恢复出 28 字挤 25 格 |
| `applySnap` 遇快照 rows 与当前不同 → 恢复行数并 buildDOM | `grid/undo.js` | 截断的撤销/重做行数错位 |
| `undoBaseline` 拦截撤销到打开之前；`stashHistory/restoreHistory` 成对调用，草稿用 `DRAFT_KEY` | `grid/undo.js` + `paper/crud.js` | 误触 Ctrl+Z 清空刚打开的纸；切纸丢历史 |
| `loadPaper` 自愈：文字超出容量时扩行，绝不截断 | `paper/crud.js` | 旧数据永远打不开 |
| `countChars` 不含空白；`textToSparse` 空格照存（Enter 垫的空行要保得住） | `lib/text.js` | 字数口径漂移、换行丢失 |
| 未存档草稿**永不**自动落盘，只有用户点保存才建档 | `paper/autosave.js` | 空白草稿污染列表 |
| 任何用户数据进 `innerHTML` 前必须过 `esc()` | `paper/library.js` | XSS（列表与弹窗消息都在拼 HTML） |
| 事件只绑在 `#grid` / `#hiddenInput` / document 容器上做委托 | `events/*.js` | 重建网格后监听丢失 |
| `dialog.js` 的 `app.dlgOpen` 互斥锁，以及「只还原仍 isConnected 的焦点元素」 | `ui/dialog.js` | 弹窗叠加；焦点落到已销毁的格子 |
| persist 失败 toast 30s 限流（autosave 1.2s 重试一次） | `storage/store.js` | 保存失败时弹窗轰炸 |
| 新增/删除静态文件必须同步 `sw.js` 的 `PRECACHE` 并递增 `CACHE_NAME` | `sw.js` | 新资源离线加载不到 |

数据契约：`localStorage` 键 `shenlun.answerSheets.v1`
（`{ version: 1, papers: [{ id, name, rows, data(稀疏 map), wordCount, createdAt, updatedAt }] }`）
与 `shenlun.prefs.v1`（`{ sort, theme }`）。`data` 允许含空格字符；
`wordCount` 不含空白。旧数据无需迁移，`loadPaper` 的自愈逻辑兜底。

---

## 八、测试

`npm test`（node:test，零依赖）。测试与实现共享同一批 ESM 模块——不 copy 一份
逻辑，测的就是跑在浏览器里的代码。浏览器 API 靠 `tests/helpers/env.js` 的桩：
假 `dom.*`、假 textarea（值 + 选区行为对齐）、假 `cellDivs`（textContent +
classList）、可注入故障的 `localStorage`。引擎函数在 Node 里跑，全是数据变换。

覆盖范围与刻意不覆盖的范围：

- ✅ 覆盖：lib 纯函数、engine 三入口（含写满整次拒绝）、快照撤销/重做/baseline/
  归档/缩行撤销、渲染增量更新、存储失败路径与限流、存档清洗。
- ❌ 不覆盖（依赖浏览器手测）：`events/` 的真实键鼠行为、IME 组合、`ui/dialog.js`、
  SW 离线、`prefers-color-scheme`。
- 约定：改 `grid/`、`lib/text.js`、`storage/` 的行为前先改/加测试再改实现；
  测试故意锁住「当前行为」时（如 MAX_UNDO 丢最旧），注释里要写明这是有意锁的。

---

## 九、PWA 与部署

- 部署：GitHub Pages，`master` 分支根目录。所有 PWA 引用（manifest、sw.js、
  `start_url`、`scope`、图标）都是**相对路径**，子路径部署兼容。
- SW 策略：install 预缓存全部静态文件；fetch 对同源 GET 做 cache-first +
  后台更新；activate 清旧缓存。改任何被缓存的文件后**必须递增 `CACHE_NAME`**，
  否则线上用户永远拿旧版。
- localStorage 不经过 SW，用户数据与缓存生命周期无关。

## 十、已知遗留

- `dom.caretEl` 是唯一的动态 DOM 引用（`buildDOM` 重建），约定层面已记录，但
  结构上确实破了「一次性解析」的纯粹性。
- 键盘监听仍是两套：`#hiddenInput` 的 keydown（格子语义键）与 document 的
  keydown（Ctrl+S / Ctrl+Alt+N），靠「handled 的键 stopPropagation + 全局侧
  `if (mod)` 白名单」互让。再加全局键时优先考虑合并成一个路由。
- `MAX_UNDO` 溢出丢最旧快照——快照模型下这是无害的标准行为，无需提示，但
  别在不知情时把它当成增量记录栈来改。
- paste 只在 `#hiddenInput` 上拦截；向 textarea 拖放文本会触发 input diff，
  因含 `\n` 被安全 revert，但没有用户提示（低频路径，暂不处理）。
- `events/`、`ui/dialog.js`、SW 行为没有单测，靠浏览器手测兜底（见第八节）。
- README 与本文件在行为变更时必须同步更新（历史教训：路线 B 落地时 README
  的 "Delete at the cursor" 承诺一度与实现矛盾）。
