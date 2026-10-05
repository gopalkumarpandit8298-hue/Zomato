async (page) => {
  const results = [];
  const failures = [];
  const check = (name, passed, detail = '') => {
    results.push({ name, passed, detail });
    if (!passed) failures.push(detail ? `${name} — ${detail}` : name);
  };

  try {
    const session = await page.context().newCDPSession(page);
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  } catch {}

  await page.goto(`https://zomato-3e2f4.web.app/?cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article', { timeout: 20000 });

  const footer = page.locator('footer');
  await footer.waitFor({ timeout: 15000 });

  const adminLink = footer.getByRole('link', { name: 'Admin' });
  check('footer has an Admin link', (await adminLink.count()) === 1, `${await adminLink.count()} links`);
  check('Admin link points at /admin', (await adminLink.getAttribute('href')) === '/admin', (await adminLink.getAttribute('href')) ?? '');

  // Follow it and confirm the guard still holds.
  await adminLink.click();
  await page.waitForTimeout(3000);
  check('clicking it lands on the admin login', new URL(page.url()).pathname === '/admin/login', page.url());
  check('admin login offers a password field', await page.locator('#admin-password').isVisible().catch(() => false));

  // Back to the customer site, still fine.
  await page.goto(`https://zomato-3e2f4.web.app/?cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article', { timeout: 20000 });
  check('customer site still renders after visiting admin', (await page.locator('article').count()) > 0);

  await page.screenshot({ path: 'tests/footer-admin-link.png', fullPage: false });

  return JSON.stringify({ passed: results.filter((r) => r.passed).length, failed: failures.length, results, failures }, null, 2);
}
