import { test, expect } from '@playwright/test'

test.describe('Preview Panel Scrolling', () => {
  test('should constrain scrolling to preview panel only', async ({ page }) => {
    await page.goto('http://localhost:3001')
    
    // Wait for the app to load
    await page.waitForSelector('.file-tree')
    
    // Create a long content file for testing
    const longContent = 'Line 1\n'.repeat(1000) + 'This is a very long file with many lines to test scrolling behavior.'
    
    // Mock a file with long content
    await page.evaluate((content) => {
      // Create a mock file object
      const mockFile = {
        name: 'long-file.txt',
        path: '/test/long-file.txt',
        type: 'file'
      }
      
      // Mock the electronAPI
      window.electronAPI = {
        readFile: () => Promise.resolve(content)
      }
      
      // Trigger file selection
      const event = new CustomEvent('fileSelect', { detail: mockFile })
      window.dispatchEvent(event)
    }, longContent)
    
    // Wait for content to load
    await page.waitForSelector('.file-preview-content')
    
    // Check that the body doesn't have a scrollbar
    const bodyScrollHeight = await page.evaluate(() => document.body.scrollHeight)
    const bodyClientHeight = await page.evaluate(() => document.body.clientHeight)
    
    // The body should not be scrollable
    expect(bodyScrollHeight).toBeLessThanOrEqual(bodyClientHeight + 10) // Allow small margin for rounding
    
    // Check that the preview content is scrollable
    const previewContent = page.locator('.file-preview-content')
    const previewScrollHeight = await previewContent.evaluate(el => el.scrollHeight)
    const previewClientHeight = await previewContent.evaluate(el => el.clientHeight)
    
    // The preview content should be scrollable
    expect(previewScrollHeight).toBeGreaterThan(previewClientHeight)
    
    // Test scrolling within the preview panel
    await previewContent.evaluate(el => el.scrollTop = 100)
    const scrollTop = await previewContent.evaluate(el => el.scrollTop)
    expect(scrollTop).toBe(100)
  })
  
  test('should handle very long lines without breaking layout', async ({ page }) => {
    await page.goto('http://localhost:3001')
    
    // Wait for the app to load
    await page.waitForSelector('.file-tree')
    
    // Create content with very long lines
    const longLineContent = 'This is a very long line that should wrap properly and not cause horizontal scrolling issues. '.repeat(50)
    
    await page.evaluate((content) => {
      const mockFile = {
        name: 'long-lines.txt',
        path: '/test/long-lines.txt',
        type: 'file'
      }
      
      window.electronAPI = {
        readFile: () => Promise.resolve(content)
      }
      
      const event = new CustomEvent('fileSelect', { detail: mockFile })
      window.dispatchEvent(event)
    }, longLineContent)
    
    await page.waitForSelector('.file-preview-content')
    
    // Check that the preview content handles long lines properly
    const previewContent = page.locator('.file-preview-content')
    const previewWidth = await previewContent.evaluate(el => el.clientWidth)
    const codeElement = page.locator('.file-preview-code code')
    const codeWidth = await codeElement.evaluate(el => el.scrollWidth)
    
    // The code should not exceed the preview width
    expect(codeWidth).toBeLessThanOrEqual(previewWidth + 10) // Allow small margin
  })
})