// Applied to the shadow root before any component styles. Host-page selectors such as
// `* { font-family: x !important }` still match the host element itself and would be inherited,
// so inheritable properties are reset again on `.tp-root`, which only shadow styles can reach.
export const baseStyles = `
:host {
  all: initial;
  position: fixed;
  z-index: 2147483000;
  inset: auto max(20px, env(safe-area-inset-right, 0px)) max(20px, env(safe-area-inset-bottom, 0px)) auto;
  color-scheme: light;

  /* Neutral black and white. The starter accent is #171717 in light and white in dark. */
  --tp-accent: #171717;
  --tp-on-accent: #fff;
  --tp-surface: #fff;
  --tp-text: #171717;
  --tp-muted: #666;
  --tp-border: #ebebeb;
  --tp-fill: #fafafa;
  --tp-bubble: #f5f5f5;
  --tp-segment: #ececec;
  --tp-segment-on: #fff;
  --tp-focus: #171717;
  --tp-danger: oklch(57.7% 0.245 27.325); /* red-600 */
  --tp-image-outline: rgb(0 0 0 / 0.08);
  --tp-shadow: 0 6px 24px rgb(0 0 0 / 0.12);
  --tp-radius-launcher: 9999px;
  --tp-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --tp-ease-icon: cubic-bezier(0.2, 0, 0, 1);
  --tp-nav: 1;
  --tp-radius: 12px;
}
:host([data-position='bottom-left']) {
  inset: auto auto max(20px, env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px));
}
:host([data-mobile='true']) {
  top: var(--tp-vv-top, 0px);
  right: auto;
  bottom: auto;
  left: var(--tp-vv-left, 0px);
  width: var(--tp-vv-width, 100%);
  height: var(--tp-vv-height, 100dvh);
}
:host([data-mobile='true']) .tp-root {
  position: relative;
  width: 100%;
  height: 100%;
}
:host([data-mobile='true']) .launcher {
  display: none;
}
/* Launcher stays out of the corner while the panel is open (appearance.launcher.hideWhenOpen). */
@media (min-width: 481px) {
  :host([data-hide-launcher='true']) .launcher {
    display: none;
  }
  :host([data-hide-launcher='true']) .panel {
    height: min(640px, calc(100vh - 40px));
    margin-block-end: 0;
  }
}
:host([data-color-mode='dark']) {
  color-scheme: dark;
  --tp-accent: #fff;
  --tp-on-accent: #171717;
  --tp-surface: #0a0a0a;
  --tp-text: #ededed;
  --tp-muted: #a1a1a1;
  --tp-border: #2e2e2e;
  --tp-fill: #171717;
  --tp-bubble: #1f1f1f;
  --tp-segment: #171717;
  --tp-segment-on: #2e2e2e;
  --tp-focus: #ededed;
  --tp-image-outline: rgb(255 255 255 / 0.12);
  --tp-shadow: 0 6px 24px rgb(0 0 0 / 0.45);
}
:host([hidden]) {
  display: none;
}
.tp-root {
  all: initial;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overscroll-behavior: contain;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.4;
  color: var(--tp-text);
  text-align: start;
}
/* The cross axis follows dir, but the position is physical. */
:host(:not([data-position='bottom-left'])) .tp-root[dir='ltr'],
:host([data-position='bottom-left']) .tp-root[dir='rtl'] {
  align-items: flex-end;
}
*, *::before, *::after {
  box-sizing: border-box;
}
.tp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`
