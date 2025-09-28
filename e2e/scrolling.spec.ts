import { test, expect } from '@playwright/test'

test.describe('预览面板滚动测试', () => {
  test.beforeEach(async ({ page }) => {
    // 启动应用
    await page.goto('http://localhost:3001')
  })

  test('大文件预览时应该只在预览面板内滚动', async ({ page }) => {
    // 模拟一个大文件内容
    await page.evaluate(() => {
      // 模拟选择一个大文件
      const mockFile = {
        name: 'large-file.txt',
        path: '/test/large-file.txt',
        type: 'file'
      }

      // 触发文件选择事件
      window.dispatchEvent(new CustomEvent('fileSelected', { detail: mockFile }))

      // 模拟加载大文件内容
      setTimeout(() => {
        const previewContent = document.querySelector('.file-preview-content')
        if (previewContent) {
          previewContent.innerHTML = `
            <div class="file-preview-code">
              <pre><code>${'This is a very long line that should cause horizontal scrolling. '.repeat(20)}
${'Another long line with lots of content that should make the preview scrollable. '.repeat(50)}</code></pre>
            </div>
          `
        }
      }, 100)
    })

    // 等待内容加载
    await page.waitForTimeout(200)

    // 检查页面整体是否有滚动条
    const bodyScrollHeight = await page.evaluate(() => document.body.scrollHeight)
    const bodyClientHeight = await page.evaluate(() => document.body.clientHeight)

    // 页面整体应该没有额外的滚动（或者滚动很小）
    expect(bodyScrollHeight - bodyClientHeight).toBeLessThan(100)

    // 检查预览面板内是否有滚动条
    const previewScrollHeight = await page.evaluate(() => {
      const previewContent = document.querySelector('.file-preview-content')
      return previewContent ? previewContent.scrollHeight : 0
    })

    const previewClientHeight = await page.evaluate(() => {
      const previewContent = document.querySelector('.file-preview-content')
      return previewContent ? previewContent.clientHeight : 0
    })

    // 预览面板内应该有滚动条（内容超过容器高度）
    expect(previewScrollHeight).toBeGreaterThan(previewClientHeight)
  })

  test('预览面板应该正确约束滚动', async ({ page }) => {
    // 测试预览面板的滚动约束
    const previewPanel = await page.locator('.preview-panel')

    // 预览面板应该有确定的高度
    const boundingBox = await previewPanel.boundingBox()
    expect(boundingBox?.height).toBeGreaterThan(0)

    // 预览面板内部应该可以滚动
    const previewContent = await page.locator('.file-preview-content')
    await previewContent.evaluate((element) => {
      element.scrollTop = 100
    })

    const scrollTop = await previewContent.evaluate((element) => element.scrollTop)
    expect(scrollTop).toBe(100)
  })
})