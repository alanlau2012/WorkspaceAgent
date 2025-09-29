import { test, expect } from '@playwright/test';

test.describe('滚动约束测试', () => {
  test('大文件预览时应该仅在预览面板内滚动，页面整体不应出现超长滚动', async ({ page }) => {
    // 启动应用
    await page.goto('http://localhost:5173');
    
    // 等待应用加载完成
    await page.waitForSelector('.main-content');
    
    // 创建一个测试大文件内容（模拟长文本）
    const longContent = 'Line 1\n'.repeat(1000) + 'This is a very long line that should cause horizontal scrolling if not handled properly\n'.repeat(100);
    
    // 模拟打开一个大文件（这里需要根据实际的IPC调用方式来模拟）
    // 由于我们无法直接调用主进程，我们通过修改DOM来模拟大文件预览
    await page.evaluate((content) => {
      // 查找预览内容区域
      const previewContent = document.querySelector('.preview-content');
      if (previewContent) {
        // 创建一个大文件预览内容
        const filePreview = document.createElement('div');
        filePreview.className = 'file-preview';
        filePreview.innerHTML = `
          <div class="file-preview-header">
            <h3>test-large-file.txt</h3>
            <div class="file-path">/path/to/test-large-file.txt</div>
          </div>
          <div class="file-preview-content">
            <div class="file-preview-code">
              <pre><code>${content}</code></pre>
            </div>
          </div>
        `;
        previewContent.appendChild(filePreview);
      }
    }, longContent);
    
    // 等待内容渲染
    await page.waitForTimeout(1000);
    
    // 检查页面整体滚动
    const bodyScrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const windowHeight = await page.evaluate(() => window.innerHeight);
    
    // 页面整体不应该出现超长滚动
    // 允许一些合理的边距（比如200px）
    expect(bodyScrollHeight).toBeLessThanOrEqual(windowHeight + 200);
    
    // 检查预览面板内部是否有滚动
    const previewScrollHeight = await page.evaluate(() => {
      const previewContent = document.querySelector('.preview-content');
      return previewContent ? previewContent.scrollHeight : 0;
    });
    
    // 预览面板应该有滚动内容
    expect(previewScrollHeight).toBeGreaterThan(windowHeight);
    
    // 验证预览面板可以滚动
    const canScroll = await page.evaluate(() => {
      const previewContent = document.querySelector('.preview-content');
      return previewContent && previewContent.scrollHeight > previewContent.clientHeight;
    });
    
    expect(canScroll).toBe(true);
  });
  
  test('预览面板应该正确约束滚动区域', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.main-content');
    
    // 检查预览面板的CSS属性
    const previewPanelStyles = await page.evaluate(() => {
      const previewPanel = document.querySelector('.preview-panel');
      const previewContent = document.querySelector('.preview-content');
      
      if (!previewPanel || !previewContent) return null;
      
      const panelStyles = window.getComputedStyle(previewPanel);
      const contentStyles = window.getComputedStyle(previewContent);
      
      return {
        panelDisplay: panelStyles.display,
        panelFlexDirection: panelStyles.flexDirection,
        panelMinHeight: panelStyles.minHeight,
        contentDisplay: contentStyles.display,
        contentFlex: contentStyles.flex,
        contentMinHeight: contentStyles.minHeight,
        contentOverflow: contentStyles.overflow
      };
    });
    
    expect(previewPanelStyles).not.toBeNull();
    expect(previewPanelStyles.panelDisplay).toBe('flex');
    expect(previewPanelStyles.panelFlexDirection).toBe('column');
    expect(previewPanelStyles.contentOverflow).toBe('auto');
  });
});
