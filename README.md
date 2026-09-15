# Essay Writing Paper · 申论答题纸

> A web version of the Chinese civil service exam (申论 / *shenlun*) answer sheet
> — a 25-cell grid per line that mimics the real answer booklet, with local
> autosave, a paper library sidebar, sorting and full-text search.

**🔗 Live demo: <https://gxio168.github.io/EssayWritingPaper/>**

No installation, no sign-up, no backend. Just open the page and start writing.

---

## Why

申论 answers must be written inside a fixed grid (25 characters per line on most real
answer sheets), and every character occupies exactly one cell. Practising on a plain
text editor gives you no sense of line breaks, character counts or how much space is
left. This page reproduces that grid in the browser, so you can practise, count and
review anytime.

## Features

### Writing grid
- **25 cells per line**, adjustable from 1 to 200 lines; the total cell count and the
  live character count are always shown.
- **Insert mode** — typing inserts a character and pushes the rest of the answer back,
  exactly like editing on paper; no characters are silently overwritten.
- **Delete at the cursor, never behind it** — `Backspace` deletes the cell the cursor is
  on: if it holds a character, that character goes and the rest shifts forward; if it is
  blank, the following text is pulled forward to fill the gap. The cell *before* the
  cursor is never touched.
- **Blank-cell typing** — when the cursor sits on a blank cell and there is nothing after
  it (i.e. you are simply writing on), the character lands in that cell and nothing else
  moves. If text does follow, a normal insert is performed so you never punch a hole in
  the middle of an answer.
- **Paste** a whole paragraph and it fills the grid cell by cell, pushing existing
  content back.
- **IME-friendly** — Chinese/Japanese/Korean input methods are handled, so composing a
  character does not mangle the grid.
- **Undo / redo** per paper, with a session boundary: undo never rewinds past the state
  you opened, so a stray `Ctrl+Z` cannot wipe a document you just loaded.

### Local storage & paper library
- **Name it, then write** — every new paper asks for a name first and is written to
  storage immediately, so nothing can be lost by refreshing.
- **Autosave** roughly 1.2 s after you stop typing, plus on tab switch and page close.
- **Sidebar library** of every paper you have saved, showing name, character count and
  last-modified time; the paper you are editing is highlighted.
- **Search by name or by answer text**, with the matching fragment highlighted in the
  result list.
- **Sort** by last modified (newest / oldest), by name (A→Z / Z→A) or by creation date.
  Your search term and sort order are remembered.
- **Rename** at any time, **delete** with a confirmation dialog that tells you exactly
  what is about to be removed.
- **Export / import a JSON backup** of the whole library, so you can move between
  browsers or machines.

### Interface
- Custom animated dialogs instead of the browser's native `confirm` / `prompt`.
- Responsive: the sidebar collapses into a slide-in drawer on narrow screens.
- Print-friendly — printing hides all UI and outputs only the answer paper.
- Single file, zero dependencies, works from `file://` as well as over HTTP.

## Getting started

### Use the hosted version

<https://gxio168.github.io/EssayWritingPaper/>

### Run it locally

```bash
git clone https://github.com/Gxio168/EssayWritingPaper.git
cd EssayWritingPaper
```

Then open `index.html` in any modern browser — double-clicking the file is enough.
Optionally serve it over HTTP:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Usage

1. On first visit, the naming dialog appears — accept the suggested name
   (`申论练习 2026-09-15 18:52:15`) or type your own, then click **开始作答**.
2. Write in the grid. Everything is saved automatically.
3. Click **＋ 新建** in the sidebar to start another paper; it will ask for a name again.
4. Use the search box and the sort dropdown to find past papers.
5. Use **导出备份 / 导入** at the bottom of the sidebar to back up or restore everything.

The toolbar is in Chinese to match the exam context, but the layout is
self-explanatory:

| Control | Meaning |
| --- | --- |
| 行数 | Number of lines (1–200) |
| 答题纸名称 | Name of the current paper |
| 保存 | Save now (autosave is already on) |
| 撤销 / 重做 | Undo / redo |
| 清空全部 | Clear the current paper (undoable) |

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Ctrl + S` | Save |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Redo |
| `Ctrl + Shift + N` | New paper |
| `Arrow keys` | Move between cells |
| `Home` / `End` | Jump to start / end of the line |
| `Tab` / `Shift + Tab` | Next / previous cell |
| `Enter` | Next line |
| `Backspace` / `Delete` | Delete at the cursor |
| `Esc` | Close a dialog or the sidebar drawer |

## Data & privacy

All content is stored locally in your browser's `localStorage` under the
`shenlun.answerSheets.v1` key. Nothing is ever uploaded — there is no server, no account
and no analytics. Note that `localStorage` is scoped per browser and per origin, so:

- opening the page from `file://` and from the hosted URL gives you **two separate
  libraries**;
- clearing your browser data, or using private/incognito mode, will lose the papers.

For anything you care about, use **导出备份** to keep a JSON copy.

## Project structure

```
EssayWritingPaper/
├── index.html   # the entire application: markup, styles and logic
└── README.md
```

There is no build step. Edit `index.html` and refresh.

## Deployment

The site is published with GitHub Pages from the `master` branch:

```text
Settings → Pages → Build and deployment → Source: Deploy from a branch
                                          Branch: master / (root)
```

Any commit pushed to `master` goes live at
<https://gxio168.github.io/EssayWritingPaper/> within a minute or so.

## Browser support

Any modern browser with `localStorage` and CSS Grid — Chrome, Edge, Firefox and Safari
(current versions). Clipboard paste, IME composition and `backdrop-filter` (the dialog
blur) degrade gracefully on older browsers.

## Contributing

Issues and pull requests are welcome. Since the whole app lives in one file, please keep
it dependency-free and open `index.html` directly to verify a change before submitting.

## License

No license file is included yet. If you intend to reuse this project, please open an
issue to ask about licensing.
