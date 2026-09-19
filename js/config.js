/* 全局常量：只放不可变配置，任何可变状态一律进 state.js */

export const COLS = 25
export const MAX_UNDO = 500 // 快照栈上限；超出丢最旧（快照独立，不产生错位）
export const LS_KEY = 'shenlun.answerSheets.v1'
export const LS_PREFS = 'shenlun.prefs.v1'
export const AUTOSAVE_DELAY = 1200

// undoHistory 的键：当前草稿（尚未存档的答题纸）用这个哨兵值
export const DRAFT_KEY = '__draft__'
