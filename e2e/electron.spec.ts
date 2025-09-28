import { test, expect } from '@playwright/test';

test('smoke: app window opens and shows hello', async ({ page }) => {
  // 这里简单使用静态 index.html 作为冒烟占位（非真实 Electron 驱动）
  await page.goto('file://' + process.cwd() + '/src/index.html');
  const h1 = page.locator('h1');
  await expect(h1).toHaveText(/你好，Electron！/);
});

