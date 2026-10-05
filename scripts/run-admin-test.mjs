/**
 * Generates a gitignored admin E2E script with credentials injected from the
 * environment, then runs it against the deployed site.
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/run-admin-test.mjs
 *
 * The credentials never touch a committed file. The generated script lives in
 * `.playwright-cli/`, which is git-ignored.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = resolve(ROOT, '.playwright-cli');
const OUT_FILE = resolve(OUT_DIR, 'admin-panel-test.js');

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const APP = process.env.ADMIN_APP_URL ?? 'https://zomato-3e2f4.web.app';

if (!EMAIL || !PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.');
  process.exit(1);
}

const template = `/* GENERATED FILE - git-ignored, contains live admin credentials. */
async (page) => {
  const EMAIL = ${JSON.stringify(EMAIL)};
  const PASSWORD = ${JSON.stringify(PASSWORD)};
  const APP = ${JSON.stringify(APP)};

  const results = [];
  const failures = [];
  const check = (name, passed, detail = '') => {
    results.push({ name, passed, detail });
    if (!passed) failures.push(detail ? \`\${name} — \${detail}\` : name);
  };

  try {
    const session = await page.context().newCDPSession(page);
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  } catch {}

  // ---- 0. Start from a signed-out browser ---------------------------------
  // Firebase Auth persists the session in IndexedDB, so a re-run would otherwise
  // start already signed in and skip the login screen entirely.
  await page.goto(APP + '/admin/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await new Promise((resolveDone) => {
      const request = indexedDB.deleteDatabase('firebaseLocalStorageDb');
      request.onsuccess = request.onerror = request.onblocked = () => resolveDone(undefined);
    });
  });

  // ---- 1. The admin area is closed to anonymous visitors ------------------
  await page.goto(APP + '/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check('anonymous visitor is sent to the admin login', new URL(page.url()).pathname === '/admin/login', page.url());

  const emailBox = page.locator('#admin-email');
  await emailBox.waitFor({ timeout: 15000 });
  check('login form is rendered', await emailBox.isVisible());

  // ---- 2. Wrong password is rejected --------------------------------------
  await emailBox.fill(EMAIL);
  await page.locator('#admin-password').fill('definitely-not-the-password');
  await page.getByRole('button', { name: /sign in to admin/i }).click();
  await page.waitForTimeout(2500);
  const errorText = await page.locator('[role="alert"]').first().innerText().catch(() => '');
  check('wrong password shows an error', /incorrect email or password/i.test(errorText), errorText || 'no error shown');
  check('wrong password does not sign in', new URL(page.url()).pathname === '/admin/login', page.url());

  // ---- 3. Real credentials work -------------------------------------------
  await emailBox.fill(EMAIL);
  await page.locator('#admin-password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in to admin/i }).click();
  await page.waitForFunction(() => location.pathname.startsWith('/admin'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  check('valid credentials sign in', new URL(page.url()).pathname === '/admin', page.url());

  const shell = (await page.locator('body').innerText()).replace(/\\s+/g, ' ');
  check('admin shell shows the signed-in email', shell.includes(EMAIL), shell.slice(0, 120));

  // ---- 4. Dashboard -------------------------------------------------------
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 20000 });
  // Wait for the numbers to actually land, not for a fixed delay.
  await page
    .locator('main')
    .getByText(/^Revenue$/)
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  await page.waitForFunction(
    () => /Revenue ₹[\\d,]+/.test(document.body.innerText.replace(/\\s+/g, ' ')),
    { timeout: 20000 },
  ).catch(() => {});
  await page.waitForTimeout(1500);

  // Stat-card labels are uppercased with CSS, and innerText reflects the
  // rendered text-transform, so these matches must be case-insensitive.
  const statsText = (await page.locator('body').innerText()).replace(/\\s+/g, ' ');
  check('dashboard renders stat cards', /revenue/i.test(statsText) && /restaurants/i.test(statsText));
  const restaurantCount = statsText.match(/restaurants (\\d+)/i);
  check('dashboard reads the catalogue from Firestore', restaurantCount !== null && Number(restaurantCount[1]) >= 14, restaurantCount?.[0] ?? 'no count');
  check('revenue starts at zero with no orders', /revenue ₹0\\b/i.test(statsText), statsText.match(/revenue ₹[\\d,]+/i)?.[0] ?? '');
  check('orders today is zero', /orders 0\\b[\\s\\S]{0,12}0 today/i.test(statsText), statsText.match(/orders 0[^)]*\\)/i)?.[0] ?? '');
  check('pending orders is zero', /pending\\s+0/i.test(statsText), statsText.match(/pending\\s+\\d+/i)?.[0] ?? '');

  // ---- 5. Restaurants CRUD ------------------------------------------------
  await page.getByRole('link', { name: 'Restaurants' }).first().click();
  await page.waitForFunction(() => location.pathname === '/admin/restaurants', { timeout: 15000 }).catch(() => {});
  await page.getByRole('heading', { name: 'Restaurants', exact: true }).waitFor({ timeout: 20000 });
  await page.locator('tbody tr').first().waitFor({ timeout: 20000 });
  const rowCount = await page.locator('tbody tr').count();
  check('restaurant table lists the catalogue', rowCount >= 14, \`\${rowCount} rows\`);

  // Create
  const NAME = 'ZZ Admin Test Cafe';
  await page.getByRole('button', { name: /add restaurant/i }).click();
  await page.locator('#rf-name').waitFor({ timeout: 10000 });
  await page.locator('#rf-name').fill(NAME);
  await page.locator('#rf-cuisines').fill('Test Cuisine, Fusion');
  await page.locator('#rf-city').fill('Testville');
  await page.locator('#rf-state').fill('Teststate');
  await page.getByRole('button', { name: /create restaurant/i }).click();
  await page.waitForTimeout(3000);
  const afterCreate = (await page.locator('body').innerText()).replace(/\\s+/g, ' ');
  check('creating a restaurant succeeds', afterCreate.includes('created with id'), afterCreate.match(/ZZ Admin Test Cafe[^.]*\\./)?.[0] ?? '');
  check('new restaurant appears in the table', (await page.locator('tbody tr').count()) === rowCount + 1);

  // It must be visible on the customer site too.
  const publicCheck = await page.request.get(APP + '/');
  check('customer site still responds after the write', publicCheck.ok(), String(publicCheck.status()));

  // Edit
  await page.getByRole('button', { name: new RegExp('Edit ' + NAME) }).click();
  await page.locator('#rf-name').waitFor({ timeout: 10000 });
  await page.locator('#rf-name').fill(NAME + ' Updated');
  await page.getByRole('button', { name: /save changes/i }).click();
  await page.waitForTimeout(3000);
  check('editing a restaurant succeeds', (await page.locator('body').innerText()).includes('Updated'));

  // Validation
  await page.getByRole('button', { name: /add restaurant/i }).click();
  await page.locator('#rf-name').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /create restaurant/i }).click();
  await page.waitForTimeout(800);
  const validation = await page.locator('[role="alert"]').first().innerText().catch(() => '');
  check('empty form is rejected client-side', /name is required/i.test(validation), validation || 'no validation error');
  await page.getByRole('button', { name: /^Close$/ }).click();
  await page.waitForTimeout(500);

  // Delete
  await page.getByRole('button', { name: new RegExp('Delete ' + NAME) }).click();
  await page.getByRole('alertdialog').waitFor({ timeout: 10000 });
  await page.getByRole('alertdialog').getByRole('button', { name: /^Delete$/ }).click();
  await page.getByText(NAME + ' deleted').waitFor({ timeout: 20000 }).catch(() => {});
  await page.locator('tbody tr').first().waitFor({ timeout: 20000 });
  const afterDeleteCount = await page.locator('tbody tr').count();
  const afterDelete = (await page.locator('body').innerText()).replace(/\\s+/g, ' ');
  check('deleting a restaurant succeeds', afterDelete.includes('deleted'), afterDelete.slice(0, 140));
  check('row count returns to the original', afterDeleteCount === rowCount, \`\${afterDeleteCount} vs \${rowCount}\`);

  // ---- 6. Orders ----------------------------------------------------------
  await page.getByRole('link', { name: 'Orders' }).first().click();
  await page.waitForFunction(() => location.pathname === '/admin/orders', { timeout: 15000 }).catch(() => {});
  await page.getByRole('heading', { name: 'Orders', exact: true }).waitFor({ timeout: 20000 });
  await page.getByText(/No orders yet/).waitFor({ timeout: 20000 }).catch(() => {});
  const ordersText = (await page.locator('body').innerText()).replace(/\\s+/g, ' ');
  check('orders page loads for an admin', /All orders/.test(ordersText), ordersText.slice(0, 120));
  check('orders page explains an empty catalogue', /No orders yet/.test(ordersText), ordersText.match(/No orders yet[^.]*\\./)?.[0] ?? '');
  check('orders page reports zero revenue', /0 orders · ₹0/.test(ordersText), ordersText.match(/\\d+ orders · ₹[\\d,]+/)?.[0] ?? '');

  // ---- 7. Customers -------------------------------------------------------
  await page.getByRole('link', { name: 'Customers' }).first().click();
  await page.waitForFunction(() => location.pathname === '/admin/customers', { timeout: 15000 }).catch(() => {});
  await page.getByRole('heading', { name: 'Customers', exact: true }).waitFor({ timeout: 20000 });
  await page.getByText(/No customers yet/).waitFor({ timeout: 20000 }).catch(() => {});
  const customersText = (await page.locator('body').innerText()).replace(/\\s+/g, ' ');
  check('customers page loads for an admin', /Ordering customers/.test(customersText));
  check('customers page explains the empty list', /No customers yet/.test(customersText));

  await page.screenshot({ path: 'tests/admin-customers.png' });

  await page.getByRole('link', { name: 'Dashboard' }).first().click();
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 20000 });
  await page.screenshot({ path: 'tests/admin-dashboard.png' });

  // ---- 8. Sign out --------------------------------------------------------
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForTimeout(2500);
  await page.goto(APP + '/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check('signing out re-locks the admin area', new URL(page.url()).pathname === '/admin/login', page.url());

  return JSON.stringify({ passed: results.filter((r) => r.passed).length, failed: failures.length, results, failures }, null, 2);
}
`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_FILE, template, 'utf8');
console.log(`Generated ${OUT_FILE}`);

// Invoke the CLI's JS entry directly through Node: no shell, so no quoting or
// escaping concerns on Windows (spawning a .cmd shim requires a shell).
const CLI_ENTRY = resolve(ROOT, 'node_modules', '@playwright', 'cli', 'playwright-cli.js');

const cli = (args) =>
  new Promise((resolveRun) => {
    const child = spawn(process.execPath, [CLI_ENTRY, ...args], { cwd: ROOT, stdio: 'inherit' });
    child.on('exit', (code) => resolveRun(code ?? 1));
  });

// A run-code failure tears the session down, so make this script self-contained:
// open the browser if it is not already up, then run, then leave it open so the
// screenshots can be inspected.
const isOpen = await new Promise((resolveRun) => {
  const child = spawn(process.execPath, [CLI_ENTRY, 'list'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.on('exit', () => resolveRun(output.includes('status: open')));
});

if (!isOpen) {
  console.log('Opening a headed browser...');
  await cli(['open', '--headed', '--browser=msedge', `${APP}/admin`]);
  await cli(['resize', '1440', '950']);
}

const exitCode = await cli(['--raw', 'run-code', `--filename=${OUT_FILE}`]);
process.exitCode = exitCode;
