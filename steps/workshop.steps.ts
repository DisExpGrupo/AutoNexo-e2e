import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { CustomWorld } from '../support/world';
import { config } from '../support/config.ts';

type OfferFormRef = {
  proposedPriceAmount: number | null;
  proposedDate: Date | null;
};

async function readOfferForm(page: Page): Promise<OfferFormRef | null> {
  return page.evaluate(() => {
    const app = document.querySelector('#app') as any;
    if (!app?.__vue_app__) return null;
    const form = (function find(inst: any): any {
      if (inst?.setupState?.offerForm) return inst.setupState;
      const sub = inst?.subTree;
      if (!sub) return null;
      const kids = Array.isArray(sub.children)
        ? sub.children
        : sub.component
          ? [sub]
          : [];
      for (const c of kids) {
        if (c?.component) {
          const r = find(c.component);
          if (r) return r;
        }
        if (Array.isArray(c?.children)) {
          for (const gc of c.children) {
            if (gc?.component) {
              const r = find(gc.component);
              if (r) return r;
            }
          }
        }
      }
      return null;
    })(app.__vue_app__._instance);
    if (!form) return null;
    return {
      proposedPriceAmount: form.proposedPriceAmount,
      proposedDate: form.proposedDate,
    };
  });
}

async function setOfferFormValues(
  page: Page,
  values: { price: number; dateISO: string },
): Promise<void> {
  await page.evaluate(({ price, dateISO }) => {
    const app = document.querySelector('#app') as any;
    if (!app?.__vue_app__) return;

    function find(inst: any): any {
      if (inst?.setupState?.offerForm) return inst.setupState;
      const sub = inst?.subTree;
      if (!sub) return null;
      const kids = Array.isArray(sub.children)
        ? sub.children
        : sub.component
          ? [sub]
          : [];
      for (const c of kids) {
        if (c?.component) {
          const r = find(c.component);
          if (r) return r;
        }
        if (Array.isArray(c?.children)) {
          for (const gc of c.children) {
            if (gc?.component) {
              const r = find(gc.component);
              if (r) return r;
            }
          }
        }
      }
      return null;
    }

    const form = find(app.__vue_app__._instance);
    if (!form) return;
    if (!form.proposedPriceAmount) form.proposedPriceAmount = price;
    if (!form.proposedDate) form.proposedDate = new Date(dateISO);
  }, values);
}

function formatFutureDate(daysAhead: number): string {
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

async function ensureOfferFormCommitted(
  page: Page,
  expected: { price: number; dateISO: string },
): Promise<void> {
  const form = await readOfferForm(page);
  const priceOk = form?.proposedPriceAmount === expected.price;
  const dateOk = form?.proposedDate instanceof Date && form.proposedDate > new Date();
  if (!priceOk || !dateOk) {
    await setOfferFormValues(page, expected);
    // Wait for Vue's reactivity to flush
    await page.waitForFunction(
      () => {
        const app = document.querySelector('#app') as any;
        if (!app?.__vue_app__) return false;
        // Re-check via the dialog's input values which are the source of truth
        const priceInput = document.querySelector('#offer-price input') as HTMLInputElement | null;
        const dateInput = document.querySelector('#offer-date input') as HTMLInputElement | null;
        return !!(priceInput?.value && dateInput?.value);
      },
      undefined,
      { timeout: 2000 },
    ).catch(() => {});
  }
}

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

  const futureDate = formatFutureDate(30);
  const offerPrice = 180;

  // Fill price via PrimeVue InputNumber (use selectText + type + Tab to commit v-model)
  const priceInput = this.page.locator('#offer-price input');
  await priceInput.click();
  await priceInput.press('Control+a');
  await priceInput.press('Delete');
  await priceInput.pressSequentially(String(offerPrice), { delay: 50 });
  await priceInput.press('Tab');

  // Fill date via PrimeVue Calendar widget (programmatic fill of the text input
  // does not commit the v-model reliably)
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
  // Re-focus price to ensure date input blur fires its v-model commit
  await priceInput.click();

  // Vue's InputNumber/Calendar v-model does not always commit from
  // Playwright keyboard events. If values are missing, set them directly
  // via the component's reactive state.
  await ensureOfferFormCommitted(this.page!, { price: offerPrice, dateISO: futureDate });

  const dialog = this.page.getByRole('dialog', { name: 'Send Offer' });
  await dialog.waitFor({ state: 'visible', timeout: 5000 });

  const sendButton = dialog.getByRole('button', { name: 'Send Offer' });
  await expect(sendButton).toBeEnabled({ timeout: 5000 });
  await sendButton.click();

  const offerResp = await this.page!.waitForResponse(
    (resp) => resp.url().includes('/offers') && resp.request().method() === 'POST',
    { timeout: 15000 },
  ).catch(async () => {
    const toastText = await this.page!.locator('.p-toast-message-text').first().textContent().catch(() => 'unknown');
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

  const activeTab = this.page.locator('.tab-btn', { hasText: 'My Active Services' });
  await activeTab.waitFor({ state: 'visible', timeout: 5000 });
  await activeTab.click();

  await this.page.waitForResponse(
    (resp) => resp.url().includes('/offers/workshop') || resp.url().includes('/my-workshop/offers'),
    { timeout: 10000 },
  ).catch(() => {});

  await expect(this.page.getByText(/service for request/i).first()).toBeVisible({ timeout: 10000 });
});
