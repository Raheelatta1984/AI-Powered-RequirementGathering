import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 120000, expect: { timeout: 10000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/report.json' }]], outputDir: 'test-results',
  use: { baseURL: 'http://127.0.0.1:3001', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, args: ['--no-sandbox'] } : {} },
  webServer: { command: 'node tests/e2e-server.mjs', url: 'http://127.0.0.1:3001/api/health', reuseExistingServer: false, timeout: 30000 },
});
