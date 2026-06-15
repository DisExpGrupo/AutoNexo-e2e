import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';
import { config } from '../support/config.ts';

When('I open "Requests" and view nearby opportunities', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.goto(`${config.baseUrl}/requests`, { waitUntil: 'domcontentloaded' });
  await expect(this.page.getByRole('heading', { name: /service requests/i })).toBeVisible();
});

When('I send an offer for the latest request', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');

  if (!this.lastRequestDescription) {
    const state = this.loadState();
    this.lastRequestDescription = state?.lastRequestDescription ?? null;
  }

  const requestCard = this.lastRequestDescription
    ? this.page.locator('.opportunity-card').filter({ hasText: this.lastRequestDescription }).first()
    : this.page.locator('.opportunity-card').first();

  await requestCard.scrollIntoViewIfNeeded();
  await requestCard.getByRole('button', { name: /send offer/i }).click();

  // PrimeVue InputNumber uses a wrapper, target the actual input
  await this.page.locator('#offer-price input').fill('180');
  await this.page.locator('#offer-date input').fill('2026-05-15');
  
  // Click Send Offer inside the dialog (avoids strict mode violation from card buttons)
  await this.page.getByRole('dialog', { name: 'Send Offer' }).getByRole('button', { name: 'Send Offer' }).click();
});

Then('I see the offer in "My Active Services"', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  // Click the tab to switch view
  const activeTab = this.page.locator('.tab-btn', { hasText: 'My Active Services' });
  await activeTab.waitFor({ state: 'visible', timeout: 5000 });
  await activeTab.click();
  await expect(this.page.getByText(/service for request/i).first()).toBeVisible();
});
