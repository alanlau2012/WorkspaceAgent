/**
 * @jest-environment node
 */

describe('windowOptions', () => {
  it('默认窗口尺寸应满足 >=1280x860，且设置最小尺寸 >=1024x700', () => {
    const { getWindowOptions } = require('../windowOptions')
    const opts = getWindowOptions()

    expect(opts.width).toBeGreaterThanOrEqual(1280)
    expect(opts.height).toBeGreaterThanOrEqual(860)
    expect(opts.minWidth).toBeGreaterThanOrEqual(1024)
    expect(opts.minHeight).toBeGreaterThanOrEqual(700)

    expect(opts.webPreferences).toBeDefined()
    expect(opts.webPreferences.contextIsolation).toBe(true)
    expect(opts.webPreferences.nodeIntegration).toBe(false)
  })
})

