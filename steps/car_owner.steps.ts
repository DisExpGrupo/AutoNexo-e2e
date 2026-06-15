import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';
import { config } from '../support/config.ts';

const vehicleData = {
  year: '2022',
  color: 'Silver',
  licensePlate: `E2E-${Math.floor(Math.random() * 9000 + 1000)}`,
  vin: `E2EVIN${Math.floor(Math.random() * 10000000000).toString().padStart(11, '0')}`,
  initialMileage: '12000',
};

const requestDescription = `E2E brake pad request ${Date.now()}`;

When('I register a new vehicle', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.goto(`${config.baseUrl}/vehicles/register`, { waitUntil: 'domcontentloaded' });

  await this.page.waitForSelector('#brand');
  await this.page.locator('#brand').selectOption({ index: 1 });
  await this.page.locator('#model').selectOption({ index: 1 });
  await this.page.locator('#year').fill(vehicleData.year);
  await this.page.locator('#color').fill(vehicleData.color);
  await this.page.locator('#licensePlate').fill(vehicleData.licensePlate);
  await this.page.locator('#vin').fill(vehicleData.vin);
  await this.page.locator('#initialMileage').fill(vehicleData.initialMileage);

  await this.page.getByRole('button', { name: /register vehicle/i }).click();
  await expect(this.page.getByRole('heading', { name: 'Vehicle Registered' })).toBeVisible({ timeout: 10000 });
});

When('I create a service request with service {string} at {string}', async function (this: CustomWorld, serviceCode: string, coords: string) {
  if (!this.page) throw new Error('Page not initialized');
  const [lat, lng] = coords.split(',').map((value) => Number(value));

  await this.page.goto(`${config.baseUrl}/service-requests/new`, { waitUntil: 'domcontentloaded' });
  await this.page.waitForSelector('#service-request-map');
  await this.page.locator('#vehicle').selectOption({ index: 1 });
  
  // Click the visible label for the service (checkbox is visually hidden)
  // UI shows display names (e.g., "Cambio de pastillas de freno"), not codes
  const serviceLabel = this.page.locator('.service-checkbox-item').filter({ hasText: /freno|brake|pastilla/i }).first();
  await serviceLabel.waitFor({ state: 'visible', timeout: 5000 });
  await serviceLabel.scrollIntoViewIfNeeded();
  await serviceLabel.click();
  
  await this.page.locator('#description').fill(requestDescription);

  await this.page.locator('#latitude').fill(String(lat));
  await this.page.locator('#longitude').fill(String(lng));
  await this.page.locator('#searchRadius').fill('5');

  await this.page.getByRole('button', { name: 'Send Request' }).click();
  await expect(this.page.getByText('Request Sent')).toBeVisible();

  this.lastRequestDescription = requestDescription;
});

When('I open "My Service Requests"', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.goto(`${config.baseUrl}/service-requests`, { waitUntil: 'domcontentloaded' });
  await expect(this.page.getByRole('heading', { name: /service requests/i })).toBeVisible();
});

When('I view the latest pending request', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  if (!this.lastRequestDescription) {
    const state = this.loadState();
    this.lastRequestDescription = state?.lastRequestDescription ?? null;
  }
  const card = this.lastRequestDescription
    ? this.page.locator('.request-card').filter({ hasText: this.lastRequestDescription }).first()
    : this.page.locator('.request-card').first();
  await card.scrollIntoViewIfNeeded();
  await card.getByRole('button', { name: 'View Details' }).click();
});

When('I accept the offer', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  // Wait for offers to load
  await this.page.waitForSelector('.offer-card', { timeout: 10000 }).catch(() => {});
  const acceptBtn = this.page.getByRole('button', { name: /accept offer/i }).first();
  await acceptBtn.waitFor({ state: 'visible', timeout: 10000 });
  await acceptBtn.click();
});

Then('I see the request in "My Service Requests"', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.goto(`${config.baseUrl}/service-requests`);
  await expect(this.page.getByText(requestDescription)).toBeVisible();
});

Then('I see the booking receipt', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await expect(this.page.getByText('Booking Summary')).toBeVisible();
  await expect(this.page.getByText('Service Scheduled')).toBeVisible();
});
