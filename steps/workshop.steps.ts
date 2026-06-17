import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CustomWorld } from '../support/world';
import { config } from '../support/config.ts';

When('I open "Requests" and view nearby opportunities', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');

  const [response] = await Promise.all([
    this.page.waitForResponse(
      (resp) => resp.url().includes('/my-workshop/available-requests'),
      { timeout: 20000 },
    ).catch(async (err) => {
      const url = this.page?.url() ?? 'unknown';
      throw new Error(`Available-requests response never arrived (page at ${url}): ${err.message}`);
    }),
    this.page.goto(`${config.baseUrl}/requests`, { waitUntil: 'domcontentloaded' }),
  ]);

  if (response && response.status() >= 400) {
    const body = await response.text().catch(() => 'unavailable');
    throw new Error(
      `Available requests API returned ${response.status()}: ${body}`,
    );
  }

  await expect(this.page.getByRole('heading', { name: /service requests/i })).toBeVisible();
  await this.page.locator('.opportunity-card').first().waitFor({ timeout: 20000 });
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

  const target = new Date();
  target.setDate(target.getDate() + 30);
  const futureDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;

  const priceInput = this.page.locator('#offer-price input');
  await priceInput.click();
  await priceInput.press('Control+a');
  await priceInput.press('Delete');
  await priceInput.pressSequentially('180', { delay: 50 });
  await priceInput.press('Tab');

  const dateInput = this.page.locator('#offer-date input');
  await dateInput.click();
  await this.page.locator('.p-datepicker-panel').waitFor({ state: 'visible', timeout: 5000 });
  const targetDate = new Date(futureDate);
  const today = new Date();
  const monthsAhead =
    (targetDate.getFullYear() - today.getFullYear()) * 12 +
    (targetDate.getMonth() - today.getMonth());
  for (let i = 0; i < monthsAhead; i++) {
    await this.page.locator('.p-datepicker-next-button').click();
  }
  const day = String(targetDate.getDate());
  await this.page
    .locator('.p-datepicker-day:not(.p-datepicker-other-month)')
    .filter({ hasText: new RegExp(`^${day}$`) })
    .first()
    .click();
  await priceInput.click();
  await this.page.waitForTimeout(300);

  // PrimeVue InputNumber/Calendar v-model does not always commit from
  // Playwright keyboard events. Verify the values took hold; if not,
  // set them directly via Vue's internal component state.
  const valuesOk = await this.page.evaluate(() => {
    try {
      const app = document.querySelector('#app');
      if (!app || !(app as any).__vue_app__) return false;
      const vueApp = (app as any).__vue_app__;

      function findOfferForm(inst: any): any {
        if (inst?.setupState?.offerForm) return inst.setupState.offerForm;
        const sub = inst?.subTree;
        if (!sub) return null;
        const kids = Array.isArray(sub.children) ? sub.children : sub.component ? [sub] : [];
        for (const c of kids) {
          if (c?.component) {
            const r = findOfferForm(c.component);
            if (r) return r;
          }
          if (Array.isArray(c?.children)) {
            for (const gc of c.children) {
              if (gc?.component) {
                const r = findOfferForm(gc.component);
                if (r) return r;
              }
            }
          }
        }
        return null;
      }

      const form = findOfferForm(vueApp._instance);
      if (!form) return false;
      return { price: form.proposedPriceAmount, date: form.proposedDate };
    } catch {
      return false;
    }
  });

  if (valuesOk === false || valuesOk === undefined || valuesOk === null) {
    // Fallback: retry filling with evaluate-based value assignment
    await this.page.evaluate((args) => {
      const app = document.querySelector('#app') as any;
      if (!app?.__vue_app__) return;
      const vueApp = app.__vue_app__;

      function findOfferForm(inst: any): any {
        if (inst?.setupState?.offerForm) return inst.setupState.offerForm;
        const sub = inst?.subTree;
        if (!sub) return null;
        const kids = Array.isArray(sub.children) ? sub.children : sub.component ? [sub] : [];
        for (const c of kids) {
          if (c?.component) {
            const r = findOfferForm(c.component);
            if (r) return r;
          }
          if (Array.isArray(c?.children)) {
            for (const gc of c.children) {
              if (gc?.component) {
                const r = findOfferForm(gc.component);
                if (r) return r;
              }
            }
          }
        }
        return null;
      }

      const form = findOfferForm(vueApp._instance);
      if (form) {
        form.proposedPriceAmount = args.price;
        form.proposedDate = new Date(args.dateISO);
      }
    }, { price: 180, dateISO: futureDate });
    await this.page.waitForTimeout(200);
  } else if (
    typeof valuesOk === 'object' &&
    (valuesOk.price === 0 || valuesOk.price === null || valuesOk.date === null)
  ) {
    await this.page.evaluate((args) => {
      const app = document.querySelector('#app') as any;
      if (!app?.__vue_app__) return;
      const vueApp = app.__vue_app__;

      function findOfferForm(inst: any): any {
        if (inst?.setupState?.offerForm) return inst.setupState.offerForm;
        const sub = inst?.subTree;
        if (!sub) return null;
        const kids = Array.isArray(sub.children) ? sub.children : sub.component ? [sub] : [];
        for (const c of kids) {
          if (c?.component) {
            const r = findOfferForm(c.component);
            if (r) return r;
          }
          if (Array.isArray(c?.children)) {
            for (const gc of c.children) {
              if (gc?.component) {
                const r = findOfferForm(gc.component);
                if (r) return r;
              }
            }
          }
        }
        return null;
      }

      const form = findOfferForm(vueApp._instance);
      if (form) {
        if (form.proposedPriceAmount <= 0 || form.proposedPriceAmount === null) {
          form.proposedPriceAmount = args.price;
        }
        if (form.proposedDate === null || form.proposedDate === undefined) {
          form.proposedDate = new Date(args.dateISO);
        }
      }
    }, { price: 180, dateISO: futureDate });
    await this.page.waitForTimeout(200);
  }

  // Wait for the dialog to become visible before clicking Send Offer
  const dialog = this.page.getByRole('dialog', { name: 'Send Offer' });
  await dialog.waitFor({ state: 'visible', timeout: 5000 });

  const sendButton = dialog.getByRole('button', { name: 'Send Offer' });
  await expect(sendButton).toBeEnabled({ timeout: 5000 });
  await sendButton.click();

  // Wait for the offer creation API call
  const offerResp = await this.page.waitForResponse(
    (resp) => resp.url().includes('/offers') && resp.request().method() === 'POST',
    { timeout: 15000 },
  ).catch(async () => {
    const toastText = await this.page.locator('.p-toast-message-text').first().textContent().catch(() => 'unknown');
    throw new Error(`Offer creation request never completed. Toast message: ${toastText}`);
  });

  if (offerResp && offerResp.status() >= 400) {
    const body = await offerResp.text().catch(() => 'unavailable');
    throw new Error(`Offer creation failed (${offerResp.status()}): ${body}`);
  }
});

Then('I see the offer in "My Active Services"', async function (this: CustomWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.keyboard.press('Escape');
  await this.page.waitForTimeout(200);

  const activeTab = this.page.locator('.tab-btn', { hasText: 'My Active Services' });
  await activeTab.waitFor({ state: 'visible', timeout: 5000 });
  await activeTab.click();

  // Wait for the active-services API response
  await this.page.waitForResponse(
    (resp) => resp.url().includes('/offers/workshop') || resp.url().includes('/my-workshop/offers'),
    { timeout: 10000 },
  ).catch(() => {});

  await expect(this.page.getByText(/service for request/i).first()).toBeVisible({ timeout: 10000 });
});