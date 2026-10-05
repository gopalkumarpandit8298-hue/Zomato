/**
 * Order-flow test: browse -> restaurant menu -> add to cart -> cart -> auth gate.
 *
 * Google sign-in needs a real account, so the test stops at the auth gate and
 * verifies the redirect instead of completing OAuth.
 *
 *   playwright-cli open --headed --browser=msedge https://zomato-3e2f4.web.app
 *   playwright-cli --raw run-code --filename=tests/order-flow-test.js
 *
 * Must stay a single function expression — playwright-cli wraps it in parens.
 */
async (page) => {
  const results = [];
  const failures = [];
  const check = (name, passed, detail = '') => {
    results.push({ name, passed, detail });
    if (!passed) failures.push(detail ? `${name} — ${detail}` : name);
  };

  /** Waits for a client-side route change (React Router uses pushState). */
  const waitForPath = async (p, pattern, label) => {
    try {
      await p.waitForFunction(
        (source) => new RegExp(source).test(location.pathname),
        pattern.source,
        { timeout: 15000 },
      );
    } catch {
      check(`navigates to ${label}`, false, p.url());
    }
  };

  // Cache-bust every full page load: a long-lived browser profile would
  // otherwise assert against the previously deployed bundle.
  const bust = Date.now();
  const APP = `https://zomato-3e2f4.web.app/?cb=${bust}`;

  // The badge also contains a screen-reader label, so read the leading digits.
  const readCartBadge = async (p) => {
    const text = await p.locator('header a[href="/cart"] span').first().textContent().catch(() => null);
    return (text ?? '').match(/^\d+/)?.[0] ?? '0';
  };

  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));

  // Testing a deployed SPA against a long-lived browser profile will happily
  // assert against a cached bundle. Disable the HTTP cache for the whole run.
  try {
    const session = await page.context().newCDPSession(page);
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  } catch {
    // Not Chromium — the assertions below still work, just less hermetic.
  }

  // Start from a clean cart so the run is repeatable.
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('zomato-clone:cart'));

  // --- 1. Home -> restaurant ----------------------------------------------
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article', { timeout: 20000 });

  const firstRestaurant = await page.locator('article h3').first().innerText();
  await page.locator('article a').first().click();
  // React Router navigates with pushState, so wait on the URL rather than on
  // Playwright's waitForURL, which also waits for a load event that never fires.
  await waitForPath(page, /^\/restaurant\/.+/, 'restaurant page');
  // The route chunk is lazy: the URL changes before the page paints.
  await page.locator('h1').filter({ hasText: firstRestaurant }).first().waitFor({ timeout: 15000 });

  const heading = await page.locator('h1').first().innerText();
  check('restaurant page opens from a card', heading.trim() === firstRestaurant.trim(), `${heading} vs ${firstRestaurant}`);

  // --- 2. Menu loads -------------------------------------------------------
  await page.waitForSelector('article:has(button:text-is("Add"))', { timeout: 20000 });
  const dishNames = await page.locator('article h3').allInnerTexts();
  check('menu items render', dishNames.length >= 5, `${dishNames.length} dishes`);

  const vegMarkers = await page.locator('article span[title="Vegetarian"], article span[title="Non-vegetarian"]').count();
  check('every dish has a veg / non-veg marker', vegMarkers === dishNames.length, `${vegMarkers}/${dishNames.length}`);

  // --- 3. Add to cart ------------------------------------------------------
  const addButton = page.locator('article button:text-is("Add")').first();
  const dishToAdd = await addButton.locator('xpath=..').locator('xpath=../..').locator('h3').innerText().catch(() => dishNames[0]);
  await addButton.click();
  await page.waitForTimeout(300);

  const badge = await readCartBadge(page);
  check('cart badge shows 1 after adding a dish', badge === '1', `badge=${badge}`);

  const stepperVisible = await page.getByRole('group').first().isVisible().catch(() => false);
  check('add button becomes a quantity stepper', stepperVisible);

  // --- 4. Sticky "go to cart" bar -----------------------------------------
  const goToCart = page.locator('a:has-text("Go to cart")').first();
  check('sticky go-to-cart bar appears', await goToCart.isVisible());
  const barText = await goToCart.innerText();
  check('sticky bar shows the amount', /₹\s?\d/.test(barText), barText);

  // --- 5. Cart page --------------------------------------------------------
  await goToCart.click();
  await waitForPath(page, /^\/cart$/, 'cart page');

  // `count()` does not auto-wait, so make sure the totals are on screen first.
  const billList = page.locator('aside dl').first();
  await billList.waitFor({ timeout: 15000 });
  const cartLines = await billList.locator('> div').count();
  check('cart bill details render', cartLines >= 4, `${cartLines} rows`);
  const billText = (await page.locator('aside').first().innerText()).replace(/\s+/g, ' ');
  check('cart total is a rupee amount', /To pay ₹[\d,]+/.test(billText), billText.slice(0, 140));

  // Increase quantity and confirm the total moves.
  const totalBefore = Number((billText.match(/To pay ₹([\d,]+)/) ?? [])[1]?.replace(/,/g, '') ?? 0);
  await page.getByRole('group').first().getByRole('button', { name: /Increase/ }).click();
  await page.waitForTimeout(300);
  const billAfter = (await page.locator('aside').first().innerText()).replace(/\s+/g, ' ');
  const totalAfter = Number((billAfter.match(/To pay ₹([\d,]+)/) ?? [])[1]?.replace(/,/g, '') ?? 0);
  check('increasing quantity raises the total', totalAfter > totalBefore, `${totalBefore} -> ${totalAfter}`);

  // --- 6. Cart survives a reload ------------------------------------------
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const badgeAfterReload = await readCartBadge(page);
  check('cart persists across reload (localStorage)', badgeAfterReload === '2', `badge=${badgeAfterReload}`);

  // --- 7. Auth gate --------------------------------------------------------
  await page.getByRole('link', { name: /Proceed to checkout/ }).click();
  await waitForPath(page, /^\/login$/, 'login (auth gate)');
  check('checkout redirects anonymous users to /login', new URL(page.url()).pathname === '/login', page.url());

  const googleButton = page.locator('button', { hasText: 'Continue with Google' }).first();
  await googleButton.waitFor({ timeout: 10000 }).catch(() => {});
  check('login page offers Google sign-in', await googleButton.isVisible().catch(() => false));

  // Coming back to /login should return the user to the checkout they wanted.
  await page.getByRole('link', { name: /Continue browsing/ }).click();
  await page.waitForTimeout(400);
  await page.goto('https://zomato-3e2f4.web.app/orders', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('my orders is also behind the auth gate', new URL(page.url()).pathname === '/login', page.url());

  // --- 8. 404 route --------------------------------------------------------
  await page.goto('https://zomato-3e2f4.web.app/does-not-exist', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const notFound = await page.locator('h1').first().innerText().catch(() => '');
  check('unknown routes render the 404 page', /could not find/i.test(notFound), notFound);

  const ignorable = /favicon|ERR_FAILED|storage\.googleapis|firebasestorage|firebasedatabase/i;
  const realErrors = consoleErrors.filter((t) => !ignorable.test(t));
  check('no unexpected console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article', { timeout: 20000 });
  await page.evaluate(() => localStorage.removeItem('zomato-clone:cart'));

  return JSON.stringify(
    { passed: results.filter((r) => r.passed).length, failed: failures.length, results, failures, consoleErrors: consoleErrors.slice(0, 5) },
    null,
    2,
  );
}
