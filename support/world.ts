import type { Browser, BrowserContext, Page } from '@playwright/test';
import { setWorldConstructor } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class CustomWorld {
  browser: Browser | null = null;
  context: BrowserContext | null = null;
  page: Page | null = null;
  lastRequestDescription: string | null = null;
  stateFile = path.resolve(__dirname, '../.e2e-state.json');

  async init() {
    this.browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.slowMo || 0,
    });
    this.context = await this.browser.newContext({
      recordVideo: config.recordVideo ? { dir: config.videoDir } : undefined,
    });
    this.page = await this.context.newPage();
  }

  async close() {
    if (this.lastRequestDescription) {
      fs.writeFileSync(
        this.stateFile,
        JSON.stringify({ lastRequestDescription: this.lastRequestDescription }, null, 2),
        'utf-8'
      );
    }
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  loadState() {
    if (!fs.existsSync(this.stateFile)) return null;
    const data = fs.readFileSync(this.stateFile, 'utf-8');
    return JSON.parse(data) as { lastRequestDescription?: string };
  }
}

setWorldConstructor(CustomWorld);
