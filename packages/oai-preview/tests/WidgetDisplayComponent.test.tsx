import { describe, test, expect } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WidgetPreviewComponent } from '../src/WidgetDisplayComponent';

/**
 * Render the actual WidgetDisplayComponent in a browser using Playwright
 */
async function renderComponentInBrowser(props: {
  htmlSnippet: string;
  toolInput?: Record<string, any>;
  toolOutput?: any;
  toolResponseMetadata?: any;
  toolId?: string;
}): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(3000);

  // Render the actual React component to static HTML
  const componentElement = createElement(WidgetPreviewComponent, props);
  const componentHtml = renderToStaticMarkup(componentElement);

  // Create a full HTML page with React loaded and our component rendered
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <style>
        body { margin: 0; padding: 20px; font-family: sans-serif; }
      </style>
    </head>
    <body>
      <div id="root">${componentHtml}</div>
      <script>
        // Set up message capture for testing
        window.testResults = {
          toolCalls: [],
          followups: [],
          stateUpdates: []
        };

        window.addEventListener('message', (event) => {
          const { type } = event.data;
          
          if (type === 'openai:callTool') {
            window.testResults.toolCalls.push({
              toolName: event.data.toolName,
              params: event.data.params
            });
            // Send back mock response
            const iframe = document.querySelector('iframe');
            if (iframe) {
              iframe.contentWindow.postMessage({
                type: 'openai:callTool:response',
                requestId: event.data.requestId,
                result: { success: true, toolName: event.data.toolName, params: event.data.params }
              }, '*');
            }
          } else if (type === 'openai:sendFollowup') {
            window.testResults.followups.push(event.data.message);
          } else if (type === 'openai:setWidgetState') {
            window.testResults.stateUpdates.push(event.data.state);
          }
        });
      </script>
    </body>
    </html>
  `;

  await page.setContent(fullHtml, { waitUntil: 'load' });
  await page.waitForTimeout(1000); // Wait for iframe to initialize

  return { browser, page };
}

describe('WidgetDisplayComponent', () => {
  test('1. renders simple hello world HTML in iframe', async () => {
    const simpleHtml = `
      <div id="widget">
        <h1>Hello World</h1>
        <p>This is a simple widget</p>
      </div>
    `;

    const { browser, page } = await renderComponentInBrowser({
      htmlSnippet: simpleHtml
    });

    try {
      // Find the iframe created by WidgetDisplayComponent
      const iframe = await page.waitForSelector('iframe', { timeout: 3000 });
      expect(iframe).not.toBeNull();

      // Access iframe content
      const iframeLocator = page.frameLocator('iframe');
      
      // Wait for and verify the text is visible in the iframe
      await iframeLocator.locator('text=Hello World').waitFor({ timeout: 3000 });
      const headerText = await iframeLocator.locator('h1').textContent();
      const paragraphText = await iframeLocator.locator('p').textContent();

      expect(headerText).toBe('Hello World');
      expect(paragraphText).toBe('This is a simple widget');

    } finally {
      await page.close();
      await browser.close();
    }
  }, 10000);

  test('2. messaging capabilities - triggers all callbacks', async () => {
    const messagingHtml = `
      <div id="widget">
        <button id="btn-tool" onclick="testToolCall()">Call Tool</button>
        <button id="btn-followup" onclick="testFollowup()">Send Followup</button>
        <button id="btn-state" onclick="testSetState()">Set State</button>
        <div id="output"></div>
        <script>
          async function testToolCall() {
            try {
              const result = await window.openai.callTool('test_tool', { param: 'value' });
              document.getElementById('output').textContent = 'Tool result: ' + JSON.stringify(result);
            } catch (err) {
              document.getElementById('output').textContent = 'Tool error: ' + err.message;
            }
          }

          function testFollowup() {
            window.openai.sendFollowupTurn('Test followup message');
            document.getElementById('output').textContent = 'Followup sent';
          }

          function testSetState() {
            window.openai.setWidgetState({ count: 42, data: 'test' });
            document.getElementById('output').textContent = 'State set';
          }
        </script>
      </div>
    `;

    const { browser, page } = await renderComponentInBrowser({
      htmlSnippet: messagingHtml,
      toolId: 'test-widget'
    });

    try {
      const iframe = page.frameLocator('iframe');

      // Test 1: Tool call
      await iframe.locator('#btn-tool').click();
      await page.waitForTimeout(500);
      
      const toolCalls = await page.evaluate(() => window.testResults.toolCalls);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]).toEqual({
        toolName: 'test_tool',
        params: { param: 'value' }
      });

      // Verify tool result appears in iframe
      const outputAfterTool = await iframe.locator('#output').textContent();
      expect(outputAfterTool).toContain('Tool result');
      expect(outputAfterTool).toContain('test_tool');

      // Test 2: Send followup
      await iframe.locator('#btn-followup').click();
      await page.waitForTimeout(300);

      const followups = await page.evaluate(() => window.testResults.followups);
      expect(followups).toHaveLength(1);
      expect(followups[0]).toBe('Test followup message');

      const outputAfterFollowup = await iframe.locator('#output').textContent();
      expect(outputAfterFollowup).toBe('Followup sent');

      // Test 3: Set widget state
      await iframe.locator('#btn-state').click();
      await page.waitForTimeout(300);

      const stateUpdates = await page.evaluate(() => window.testResults.stateUpdates);
      expect(stateUpdates).toHaveLength(1);
      expect(stateUpdates[0]).toEqual({ count: 42, data: 'test' });

      const outputAfterState = await iframe.locator('#output').textContent();
      expect(outputAfterState).toBe('State set');

    } finally {
      await page.close();
      await browser.close();
    }
  }, 10000);

  test('3. widget can access toolInput, toolOutput, and other data', async () => {
    const dataAccessHtml = `
      <div id="widget">
        <h2>Data Access Test</h2>
        <div id="tool-input"></div>
        <div id="tool-output"></div>
        <div id="tool-response-metadata"></div>
        <div id="display-mode"></div>
        <div id="theme"></div>
        <div id="max-height"></div>
        <div id="locale"></div>
        <div id="safe-area"></div>
        <div id="user-agent"></div>
        <div id="widget-state"></div>
        <script>
          // Access and render the data
          const toolInput = window.openai.toolInput;
          const toolOutput = window.openai.toolOutput;
          const toolResponseMetadata = window.openai.toolResponseMetadata;
          const displayMode = window.openai.displayMode;
          const theme = window.openai.theme;
          const maxHeight = window.openai.maxHeight;
          const locale = window.openai.locale;
          const safeArea = window.openai.safeArea;
          const userAgent = window.openai.userAgent;
          const widgetState = window.openai.widgetState;

          document.getElementById('tool-input').textContent = 
            'Tool Input: ' + JSON.stringify(toolInput);
          document.getElementById('tool-output').textContent = 
            'Tool Output: ' + JSON.stringify(toolOutput);
          document.getElementById('tool-response-metadata').textContent = 
            'Tool Response Metadata: ' + JSON.stringify(toolResponseMetadata);
          document.getElementById('display-mode').textContent = 
            'Display Mode: ' + displayMode;
          document.getElementById('theme').textContent = 
            'Theme: ' + theme;
          document.getElementById('max-height').textContent = 
            'Max Height: ' + maxHeight;
          document.getElementById('locale').textContent = 
            'Locale: ' + locale;
          document.getElementById('safe-area').textContent = 
            'Safe Area: ' + JSON.stringify(safeArea);
          document.getElementById('user-agent').textContent = 
            'User Agent: ' + JSON.stringify(userAgent);
          document.getElementById('widget-state').textContent = 
            'Widget State: ' + JSON.stringify(widgetState);
        </script>
      </div>
    `;

    const testToolInput = {
      query: 'weather',
      location: 'San Francisco',
      units: 'fahrenheit'
    };

    const testToolOutput = {
      temperature: 72,
      condition: 'Sunny',
      forecast: ['Clear', 'Cloudy', 'Sunny']
    };

    const testToolResponseMetadata = {
      executionTime: 250,
      source: 'weather-api',
      cached: false
    };

    const { browser, page } = await renderComponentInBrowser({
      htmlSnippet: dataAccessHtml,
      toolInput: testToolInput,
      toolOutput: testToolOutput,
      toolResponseMetadata: testToolResponseMetadata,
      toolId: 'data-test-widget'
    });

    try {
      const iframe = page.frameLocator('iframe');

      // Wait for content to render
      await iframe.locator('text=Data Access Test').waitFor({ timeout: 3000 });

      // Verify toolInput is accessible and rendered
      const toolInputText = await iframe.locator('#tool-input').textContent();
      expect(toolInputText).toContain('Tool Input:');
      expect(toolInputText).toContain('weather');
      expect(toolInputText).toContain('San Francisco');
      expect(toolInputText).toContain('fahrenheit');

      // Verify toolOutput is accessible and rendered
      const toolOutputText = await iframe.locator('#tool-output').textContent();
      expect(toolOutputText).toContain('Tool Output:');
      expect(toolOutputText).toContain('72');
      expect(toolOutputText).toContain('Sunny');

      // Verify toolResponseMetadata is accessible and rendered
      const toolResponseMetadataText = await iframe.locator('#tool-response-metadata').textContent();
      expect(toolResponseMetadataText).toContain('Tool Response Metadata:');
      expect(toolResponseMetadataText).toContain('250');
      expect(toolResponseMetadataText).toContain('weather-api');
      expect(toolResponseMetadataText).toContain('false');

      // Verify global properties
      const displayModeText = await iframe.locator('#display-mode').textContent();
      expect(displayModeText).toBe('Display Mode: inline');

      const themeText = await iframe.locator('#theme').textContent();
      expect(themeText).toBe('Theme: light');

      const maxHeightText = await iframe.locator('#max-height').textContent();
      expect(maxHeightText).toBe('Max Height: 600');

      // Verify additional global properties
      const localeText = await iframe.locator('#locale').textContent();
      expect(localeText).toBe('Locale: en-US');

      const safeAreaText = await iframe.locator('#safe-area').textContent();
      expect(safeAreaText).toContain('Safe Area:');
      expect(safeAreaText).toContain('top');
      expect(safeAreaText).toContain('bottom');
      expect(safeAreaText).toContain('left');
      expect(safeAreaText).toContain('right');

      const userAgentText = await iframe.locator('#user-agent').textContent();
      expect(userAgentText).toContain('User Agent:');
      expect(userAgentText).toContain('desktop');
      expect(userAgentText).toContain('hover');
      expect(userAgentText).toContain('touch');

      const widgetStateText = await iframe.locator('#widget-state').textContent();
      expect(widgetStateText).toBe('Widget State: null');

    } finally {
      await page.close();
      await browser.close();
    }
  }, 10000);
});

// Type augmentation for test results
declare global {
  interface Window {
    testResults: {
      toolCalls: Array<{ toolName: string; params: any }>;
      followups: string[];
      stateUpdates: any[];
    };
  }
}
