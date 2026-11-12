import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = process.env.LARUTICA_QA_URL ?? 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const publication = {
  id: '77777777-7777-4777-8777-777777777777', agencyId: 'qa-agency', status: 'APPROVED',
  title: 'Excursión Tamarindo', description: 'Una experiencia de la agencia.', serviceType: 'EXCURSION',
  destination: 'Tamarindo', pricePerPerson: 20, durationMinutes: 120, defaultCapacity: 15,
  included: 'Agua', notIncluded: 'Almuerzo', meetingPoint: 'Parque central', mainImageUrl: null,
  languageIds: [1], journey: null, journeyRequired: false,
  createdAt: '2026-10-22T15:00:00Z', updatedAt: '2026-10-22T15:00:00Z',
};
const departure = { id: 'qa-departure', publicationId: publication.id, status: 'ACTIVE', capacity: 15, startAt: '2099-11-12T14:00:00Z', endAt: null };

try {
  for (const role of ['Admin', 'Agencia']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    let requests = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(baseURL).origin) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      requests++;
      const user = { id: 'qa-user', role, status: 'Activo', name: 'Usuario QA', email: 'qa@example.invalid' };
      const session = { userId: user.id, expiresAt: new Date(Date.now() + 86400000).toISOString(), idleExpiresAt: new Date(Date.now() + 3600000).toISOString() };
      if (url.pathname === '/api/auth/session') return route.fulfill({ json: { data: { user, session } } });
      if (url.pathname === '/api/agencies/me') return route.fulfill({ json: { data: { id: 'qa-agency', status: 'APPROVED' } } });
      if (url.pathname === '/api/publications/me') return route.fulfill({ json: { data: [publication, { ...publication, id: 'qa-review', status: 'PENDING' }] } });
      if (url.pathname === '/api/publications/departures' || url.pathname === `/api/publications/${publication.id}/departures`) return route.fulfill({ json: { data: [departure] } });
      if (url.pathname === `/api/publications/${publication.id}`) return route.fulfill({ json: { data: publication } });
      return route.fulfill({ json: { data: [], total: 0 } });
    });

    await page.goto(`${baseURL}/dashboard`);
    const spanishHeading = role === 'Admin' ? 'Resumen general' : 'Panel de Control';
    const englishHeading = role === 'Admin' ? 'Overview' : 'Dashboard';
    await page.getByRole('heading', { name: spanishHeading, exact: true }).waitFor();
    if (role === 'Agencia') await page.getByText('Están siendo evaluadas por el administrador.', { exact: true }).waitFor();
    await page.waitForLoadState('networkidle');
    const before = requests;
    await page.getByRole('button', { name: 'Selecciona tu idioma', exact: true }).click();
    await page.getByRole('radio', { name: 'English' }).locator('..').click();
    await page.getByRole('heading', { name: englishHeading, exact: true }).waitFor();
    await page.getByRole('link', { name: 'View website', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(requests, before, 'Changing language sends no API requests');
    if (role === 'Admin') {
      await page.goto(`${baseURL}/dashboard/users`);
      await page.getByRole('heading', { name: 'User management', exact: true }).waitFor();
      await page.getByPlaceholder('Search by name, email or phone…').waitFor();
    } else {
      await page.getByRole('heading', { name: 'Travelers booked', exact: true }).waitFor();
      await page.getByRole('heading', { name: 'Bookings received', exact: true }).waitFor();
      await page.getByText('An administrator is reviewing them.', { exact: true }).waitFor();
      await page.getByRole('columnheader', { name: 'Booked', exact: true }).waitFor();
      await page.getByText('Active', { exact: true }).first().waitFor();
      await page.getByRole('link', { name: publication.title, exact: true }).waitFor();
      await page.goto(`${baseURL}/dashboard/publications/${publication.id}/edit`);
      await page.getByRole('heading', { name: 'Manage listing', exact: true }).waitFor();
      await page.getByText('Basic information', { exact: true }).first().waitFor();
      await page.getByRole('tab', { name: 'Departures and capacity', exact: true }).click();
      await page.getByText('Manage future departures and their availability.', { exact: true }).waitFor();
    }
    await page.goto(`${baseURL}/dashboard/publications`);
    await page.getByRole('heading', { name: 'Listings', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Listings', exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    const trigger = page.getByRole('button', { name: 'Choose your language', exact: true });
    await trigger.click();
    const box = await page.getByRole('dialog').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 391, 'Mobile language dialog fits');
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true, 'Escape restores focus');
    await trigger.click();
    await page.getByRole('radio', { name: 'Español' }).locator('..').click();
    await page.getByRole('heading', { name: 'Publicaciones', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'es');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${role}: idioma, persistencia, menú móvil y foco`);
  }
} finally {
  await browser.close();
}
