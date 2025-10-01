import { chromium, Browser, Page } from 'playwright';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

/**
 * Validates that a bundled HTML file renders without errors using Playwright
 */
export async function shouldRenderProperly(
  indexHtmlPath: string, 
  options: {
    timeout?: number;
    expectedText?: string;
    headless?: boolean;
  } = {}
): Promise<boolean> {
  const resolvedPath = resolve(indexHtmlPath);
  const { timeout = 10000, expectedText, headless = true } = options;
  
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    const htmlContent = await readFile(resolvedPath, 'utf-8');
    if (!htmlContent.trim()) {
      throw new Error('HTML file is empty');
    }
    
    browser = await chromium.launch({ headless });
    page = await browser.newPage();
    
    let hasError = false;
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      hasError = true;
      errors.push(`Page error: ${error.message}`);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        hasError = true;
        errors.push(`Console error: ${msg.text()}`);
      }
    });
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle',
      timeout
    });
    
    await page.waitForTimeout(2000);
    
    if (hasError) {
      console.error('Errors detected during rendering:', errors);
      return false;
    }
    
    if (expectedText) {
      try {
        await page.waitForSelector(`text=${expectedText}`, { timeout: 5000 });
      } catch (error) {
        console.error(`Expected text "${expectedText}" not found on page`);
        return false;
      }
    }
    
    // Check if #root exists and has content (for React apps)
    const rootElement = await page.locator('#root').count();
    if (rootElement > 0) {
      const rootContent = await page.locator('#root').textContent();
      if (rootContent && rootContent.trim().length === 0) {
        console.error('Root element is empty - component may not have rendered');
        return false;
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('Failed to validate rendering:', error);
    return false;
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}
