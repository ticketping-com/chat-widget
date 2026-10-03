import { expect, test } from '@playwright/test'

const message = 'Hello from Playwright'

test('opens the launcher and sends a message against the mock', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#log')).toContainText('ready')

  await page.getByRole('button', { name: 'Open chat' }).click()
  await expect(page.getByText('Hi, how can I help you today?')).toBeVisible()
  await page.getByPlaceholder('Type a message...').fill(message)
  await page.getByRole('button', { name: 'Send', exact: true }).click()

  await expect(page.getByText(message, { exact: true })).toBeVisible()
  await expect(page.getByText('Thanks, the playground mock received that.')).toBeVisible()
  await expect(page.getByText('Not delivered')).toHaveCount(0)
})

test('pastes a screenshot into the composer', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#log')).toContainText('ready')
  await page.getByRole('button', { name: 'Open chat' }).click()
  const composer = page.getByPlaceholder('Type a message...')
  await expect(composer).toBeVisible()

  await composer.evaluate((el) => {
    const data = new DataTransfer()
    data.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'shot.png', { type: 'image/png' }))
    const event = new Event('paste', { bubbles: true })
    Object.defineProperty(event, 'clipboardData', { value: data })
    el.dispatchEvent(event)
  })

  // The playground mock rejects storage, which is enough to prove the file left the clipboard.
  await expect(page.getByText("Couldn't upload shot.png")).toBeVisible()
})

test('fills the phone screen above the keyboard inset', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/')
  await expect(page.locator('#log')).toContainText('ready')
  await page.getByRole('button', { name: 'Open chat' }).click()

  const frame = await page.locator('ticketping-widget').evaluate((host) => {
    const launcher = host.shadowRoot?.querySelector('.launcher')
    const panel = host.shadowRoot?.querySelector('.panel')
    return {
      mobile: host.dataset.mobile ?? '',
      height: host.style.getPropertyValue('--tp-vv-height'),
      inner: `${window.innerHeight}px`,
      launcher: launcher ? getComputedStyle(launcher).display : '',
      panel: panel ? getComputedStyle(panel).position : ''
    }
  })
  expect(frame.mobile).toBe('true')
  expect(frame.height).toBe(frame.inner)
  expect(frame.launcher).toBe('none')
  expect(frame.panel).toBe('absolute')

  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect
    .poll(() => page.locator('ticketping-widget').evaluate((host) => host.dataset.mobile ?? ''))
    .toBe('')
})
