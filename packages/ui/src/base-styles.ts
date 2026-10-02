// Applied to the shadow root before any component styles. Host-page selectors such as
// `* { font-family: x !important }` still match the host element itself and would be inherited,
// so inheritable properties are reset again on `.tp-root`, which only shadow styles can reach.
export const baseStyles = `
:host {
  all: initial;
  position: fixed;
  z-index: 2147483000;
  inset: auto 20px 20px auto;
  color-scheme: light;

  --tp-accent: oklch(0.784 0.162 130.769);
  --tp-on-accent: oklch(0.227 0.009 234.191);
  --tp-surface: #fff;
  --tp-text: oklch(0.227 0.009 234.191);
  --tp-focus: oklch(0.55 0.15 250);
  --tp-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
  --tp-radius-launcher: 9999px;
}
:host([data-position='bottom-left']) {
  inset: auto auto 20px 20px;
}
:host([data-color-mode='dark']) {
  color-scheme: dark;
  --tp-surface: oklch(0.227 0.009 234.191);
  --tp-text: oklch(0.962 0.004 75);
}
:host([hidden]) {
  display: none;
}
.tp-root {
  all: initial;
  display: block;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.4;
  color: var(--tp-text);
  text-align: start;
}
*, *::before, *::after {
  box-sizing: border-box;
}
`
