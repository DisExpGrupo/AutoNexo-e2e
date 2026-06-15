import { When } from '@cucumber/cucumber';
import type { CustomWorld } from '../support/world';

When('I wait for {int} seconds', async function (this: CustomWorld, seconds: number) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.waitForTimeout(seconds * 1000);
});
