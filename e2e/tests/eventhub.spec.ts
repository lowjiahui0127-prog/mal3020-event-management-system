import { expect, test, type Page } from '@playwright/test';

// These tests expect the demo data: run "npm run seed:demo" first (it resets the state).
const ORGANISER = { email: 'organiser@eventhub.test', password: 'Organiser123!' };
const ATTENDEE = { email: 'attendee@eventhub.test', password: 'Attendee123!' };
const TALK = 'Practical Cybersecurity & Ethical Hacking Talk';

async function login(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

async function openTalk(page: Page) {
  await page.goto('/events');
  await page
    .locator('article', { hasText: 'Practical Cybersecurity' })
    .getByRole('link', { name: /View details/ })
    .click();
  await expect(page.getByRole('heading', { name: TALK })).toBeVisible();
}

test('a visitor can browse and search events, and must log in to register', async ({ page }) => {
  await page.goto('/events');
  await expect(page.locator('article')).toHaveCount(9);

  await page.getByPlaceholder('Search events by title or location').fill('futsal');
  await expect(page.locator('article')).toHaveCount(1);

  await page.getByPlaceholder('Search events by title or location').fill('');
  await openTalk(page);

  await page.getByRole('link', { name: 'Log in to register' }).click();
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
});

test('an attendee can register for an event and cancel the registration', async ({ page }) => {
  await login(page, ATTENDEE);
  await expect(page).toHaveURL(/\/events$/);

  await openTalk(page);
  await page.getByRole('button', { name: 'Register for this event' }).click();
  await expect(page.getByText("You're registered")).toBeVisible();

  await page.getByRole('link', { name: 'My Registrations' }).click();
  await page
    .locator('li.card', { hasText: 'Practical Cybersecurity' })
    .getByRole('link', { name: /View details/ })
    .click();

  await page.getByRole('button', { name: 'Cancel registration', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, cancel registration' }).click();
  await expect(page.getByText(/You cancelled this registration/)).toBeVisible();
});

test('an organiser can create, find and delete an event', async ({ page }) => {
  const title = `E2E Test Event ${Date.now()}`;

  await login(page, ORGANISER);
  await expect(page).toHaveURL(/\/organiser\/dashboard/);

  await page.goto('/organiser/events/create');
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Starts').fill('2031-03-10T10:00');
  await page.getByLabel('Ends').fill('2031-03-10T12:00');
  await page.getByLabel('Location').fill('Hall B');
  await page.getByLabel('Capacity').fill('25');
  await page.getByRole('button', { name: 'Create event' }).click();

  await expect(page).toHaveURL(/\/organiser\/events$/);
  await expect(page.getByText(`"${title}" is published.`)).toBeVisible();

  const row = page.locator('li.row', { hasText: title });
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Delete' }).click();
  await row.getByRole('button', { name: 'Yes, delete' }).click();
  await expect(row).toHaveCount(0);
});

// The scenario from the assignment brief: two browsers, no page refresh
test('the organiser dashboard updates live when an attendee registers', async ({ browser }) => {
  const organiserPage = await (await browser.newContext()).newPage();
  const attendeePage = await (await browser.newContext()).newPage();

  await login(organiserPage, ORGANISER);
  await expect(organiserPage).toHaveURL(/\/organiser\/dashboard/);
  await expect(organiserPage.locator('app-live-indicator')).toContainText('Live');

  const row = organiserPage.locator('.event-row', { hasText: 'Practical Cybersecurity' });
  await expect(row).toContainText('38 / 120');

  // The attendee registers in a different browser
  await login(attendeePage, ATTENDEE);
  await expect(attendeePage).toHaveURL(/\/events$/);
  await openTalk(attendeePage);
  await attendeePage.getByRole('button', { name: 'Register for this event' }).click();
  await expect(attendeePage.getByText("You're registered")).toBeVisible();

  // The organiser sees the change without reloading
  await expect(row).toContainText('39 / 120');
  await expect(organiserPage.locator('.feed')).toContainText('Demo Attendee');

  // Clean up so the test can run again: cancelling updates the dashboard live too
  await attendeePage.getByRole('button', { name: 'Cancel registration' }).click();
  await attendeePage.getByRole('button', { name: 'Yes, cancel registration' }).click();
  await expect(row).toContainText('38 / 120');
});