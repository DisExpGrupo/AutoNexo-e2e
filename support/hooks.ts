import { After, Before, setDefaultTimeout } from '@cucumber/cucumber';
import type { CustomWorld } from './world';
import { config } from './config.ts';

setDefaultTimeout(60 * 1000);

const debug = config.debug;

Before(async function (this: CustomWorld) {
  await this.init();

  if (this.page && debug) {
    this.page.on('response', (resp) => {
      if (resp.status() >= 400) {
        const url = resp.url();
        console.log(`[e2e:debug] HTTP ${resp.status()} ${resp.request().method()} ${url}`);
      }
    });
    this.page.on('pageerror', (err) => {
      console.log(`[e2e:debug] Page JS error: ${err.message}`);
    });
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page?.mainFrame()) {
        console.log(`[e2e:debug] Navigated to ${frame.url()}`);
      }
    });
  }
});

After(async function (this: CustomWorld, scenario) {
  if (this.page && (scenario.result?.status === 'FAILED' || debug)) {
    try {
      const path = `artifacts/screenshot-${scenario.pickle.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
      await this.page.screenshot({ path });
      console.log(`[e2e:debug] Screenshot saved: ${path}`);
    } catch {
      // page may already be closed
    }
  }
  await this.close();
});
