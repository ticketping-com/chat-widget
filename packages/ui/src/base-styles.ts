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

  /* Tailwind gray (v4), plus red-600 for danger. Accent is gray-900 until appearance overrides it. */
  --tp-accent: #101828;
  --tp-on-accent: #fff;
  --tp-surface: #fff;
  --tp-text: oklch(21% 0.034 264.665); /* gray-900 */
  --tp-muted: oklch(55.1% 0.027 264.364); /* gray-500 */
  --tp-border: oklch(92.8% 0.006 264.531); /* gray-200 */
  --tp-fill: oklch(98.5% 0.002 247.839); /* gray-50 */
  --tp-bubble: oklch(96.7% 0.003 264.542); /* gray-100 */
  --tp-segment: oklch(96.7% 0.003 264.542); /* gray-100 track */
  --tp-segment-on: #fff;
  --tp-focus: oklch(21% 0.034 264.665); /* gray-900 */
  --tp-danger: oklch(57.7% 0.245 27.325); /* red-600 */
  --tp-image-outline: oklch(21% 0.034 264.665 / 0.1);
  --tp-shadow: 0 6px 24px oklch(13% 0.028 261.692 / 0.16); /* gray-950 */
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
:host([data-color-mode='dark']) {
  color-scheme: dark;
  --tp-surface: oklch(13% 0.028 261.692); /* gray-950 */
  --tp-text: oklch(96.7% 0.003 264.542); /* gray-100 */
  --tp-muted: oklch(70.7% 0.022 261.325); /* gray-400 */
  --tp-border: oklch(37.3% 0.034 259.733); /* gray-700 */
  --tp-fill: oklch(21% 0.034 264.665); /* gray-900 */
  --tp-bubble: oklch(27.8% 0.033 256.848); /* gray-800 */
  --tp-segment: oklch(21% 0.034 264.665); /* gray-900 track */
  --tp-segment-on: oklch(37.3% 0.034 259.733); /* gray-700 selection */
  --tp-focus: oklch(87.2% 0.01 258.338); /* gray-300 */
  --tp-image-outline: oklch(96.7% 0.003 264.542 / 0.12);
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
