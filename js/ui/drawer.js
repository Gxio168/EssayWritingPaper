/* 窄屏侧边抽屉：状态挂在 body.drawer-open 上，CSS 负责位移与遮罩显隐。 */

export function setDrawer(open) {
  document.body.classList.toggle('drawer-open', !!open)
}
