import { Given } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';
import { config } from '../support/config.ts';

async function login(world: CustomWorld, email: string, password: string) {
  if (!world.page) throw new Error('Page not initialized');
  await world.page.goto(`${config.baseUrl}/login`);
  const emailInput = world.page.locator('#email');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(email);

  const passwordInput = world.page.locator('#password input, input#password, input[type="password"]');
  await passwordInput.first().waitFor({ state: 'visible' });
  await passwordInput.first().fill(password);
  await world.page.getByRole('button', { name: 'Authenticate' }).click();
  await expect(world.page.locator('.an-dashboard-title')).toBeVisible();
}

Given('I am logged in as a car owner', async function (this: CustomWorld) {
  await login(this, config.carOwnerEmail, config.carOwnerPassword);
});

Given('I am logged in as a workshop owner', async function (this: CustomWorld) {
  await login(this, config.workshopEmail, config.workshopPassword);
});
