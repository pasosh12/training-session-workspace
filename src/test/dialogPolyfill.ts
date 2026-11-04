// jsdom 30 implements HTMLDialogElement without showModal() or close(). This minimal polyfill
// only toggles `open` and dispatches `close`; it has no focus trap, no inert background, and no
// automatic Escape → cancel. Tests that need a `cancel` event dispatch it explicitly.
const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
  showModal?: () => void
  close?: (returnValue?: string) => void
}

if (typeof proto.showModal !== 'function') {
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
}

if (typeof proto.close !== 'function') {
  proto.close = function close(this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

export {}
