/**
 * Headed smoke test for the deployed Zomato clone.
 *
 *   playwright-cli open --headed --browser=msedge https://zomato-3e2f4.web.app
 *   playwright-cli run-code --filename=tests/smoke-test.js
 *
 * Must be a single function expression (playwright-cli wraps it in parens and
 * evaluates it). Returns a JSON report; failing checks are collected in
 * `failures` rather than thrown, so one run surfaces every problem.
 */
async (page) => {
  const results = [];
  const failures = [];

  const check = (name, passed, detail = '') => {
    results.push({ name, passed, detail });
    if (!passed) failures.push(detail ? `${name} — ${detail}` : name);
  };

  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 160));
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message.slice(0, 160)}`));

  // A long-lived browser profile will otherwise assert against a cached bundle.
  try {
    const session = await page.context().newCDPSession(page);
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  } catch {
    // Not Chromium — assertions still work, just less hermetic.
  }

  // --- 1. Load -------------------------------------------------------------
  // Tests share a browser profile, so start from a clean slate.
  await page.goto(`https://zomato-3e2f4.web.app/?cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('zomato-clone:filters');
    localStorage.removeItem('zomato-clone:cart');
  });

  await page.goto(`https://zomato-3e2f4.web.app/?cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article', { timeout: 20000 });

  const heading = await page.locator('h1').first().innerText();
  check('hero heading renders', heading.length > 0, heading);

  const totalCards = await page.locator('article').count();
  check('restaurant grid populated', totalCards > 0, `${totalCards} cards`);

  const chipCount = await page.locator('ul[aria-label="Food categories"] button').count();
  check('category rail rendered', chipCount >= 5, `${chipCount} chips`);

  const badge = await page.evaluate(() =>
    [...document.querySelectorAll('span')].map((s) => s.textContent).find((t) => t === 'Demo data' || t === 'Firestore live'),
  );
  // Expects a seeded project: the deployed catalogue is read from Firestore.
  check('reads from Firestore, not demo fallback', badge === 'Firestore live', badge ?? 'missing');

  // --- 2. Images -----------------------------------------------------------
  // Cloud Storage has no bucket on the Spark plan, so images must resolve from
  // the local /img/ copies. A broken image is not acceptable either way.
  // Cards use loading="lazy", so scroll the page first: below-the-fold images
  // have an empty currentSrc until they enter the viewport.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    window.scrollTo(0, 0);
  });

  // Do not sample while images are still decoding — that makes the check flaky.
  let allImagesSettled = true;
  try {
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('article img')].length > 0 &&
        [...document.querySelectorAll('article img')].every((img) => img.complete && img.naturalWidth > 0),
      { timeout: 15000 },
    );
  } catch {
    allImagesSettled = false;
  }

  const images = await page.locator('article img').evaluateAll((nodes) =>
    nodes.map((node) => ({
      ok: node.complete && node.naturalWidth > 0,
      src: (node.currentSrc || node.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, ''),
    })),
  );
  const broken = images.filter((image) => !image.ok);
  check('all card images decode', allImagesSettled && broken.length === 0, `${broken.length}/${images.length} broken`);
  check(
    'images served from /img/',
    images.length > 0 && images.every((image) => image.src.startsWith('/img/')),
    images.filter((i) => !i.src.startsWith('/img/')).map((i) => i.src).slice(0, 3).join(', '),
  );

  // --- 3. Search -----------------------------------------------------------
  const search = page.locator('input[type="search"]').first();
  await search.fill('pizza');
  await page.waitForTimeout(600); // search input is debounced (250ms)

  const searchNames = await page.locator('article h3').allInnerTexts();
  check(
    'search "pizza" narrows the grid',
    searchNames.length > 0 && searchNames.every((name) => /pizza/i.test(name)),
    searchNames.join(', '),
  );

  // --- 4. Filters ----------------------------------------------------------
  await search.fill('');
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: /pure veg/i }).click();
  await page.locator('select[aria-label="Filter by rating"]').selectOption('4.5');
  await page.waitForTimeout(400);

  const filtered = await page.locator('article').evaluateAll((nodes) =>
    nodes.map((node) => {
      const text = node.innerText;
      return {
        name: node.querySelector('h3')?.textContent ?? '',
        rating: Number(text.match(/([\d.]+)\s*\(/)?.[1] ?? 0),
        pureVeg: /Pure vegetarian/.test(text),
      };
    }),
  );

  check(
    'pure veg + 4.5 star filter is honoured',
    filtered.length > 0 && filtered.every((item) => item.pureVeg && item.rating >= 4.5),
    filtered.map((item) => `${item.name} ${item.rating}${item.pureVeg ? ' veg' : ''}`).join(' | '),
  );

  // --- 5. Sort -------------------------------------------------------------
  await page.locator('select[aria-label="Sort restaurants"]').selectOption('delivery');
  await page.waitForTimeout(400);

  const minutes = await page.locator('article').evaluateAll((nodes) =>
    nodes.map((node) => Number(node.innerText.match(/(\d+)\s*min/)?.[1] ?? 0)),
  );
  const ascending = minutes.every((value, index) => index === 0 || minutes[index - 1] <= value);
  check('sort by delivery time is ascending', ascending, minutes.join(', '));

  // --- 6. Category chip syncs to the cuisine facet -------------------------
  await page.locator('ul[aria-label="Food categories"] button', { hasText: 'Pizza' }).first().click();
  await page.waitForTimeout(400);
  const selectedCuisines = await page.locator('ul[aria-label="Selected cuisines"] button').allInnerTexts();
  check(
    'category chip adds a cuisine filter',
    selectedCuisines.some((text) => text.includes('Pizza')),
    selectedCuisines.join(', '),
  );

  // --- 7. Reset ------------------------------------------------------------
  await page.getByRole('button', { name: /clear all/i }).click();
  await page.waitForTimeout(500);
  const afterReset = await page.locator('article').count();
  check('clear all restores the full grid', afterReset === totalCards, `${afterReset} vs ${totalCards}`);

  // --- 8. Empty state ------------------------------------------------------
  await search.fill('zzzz-no-such-place');
  await page.waitForTimeout(600);
  const emptyHeading = await page.locator('h2').first().innerText().catch(() => '');
  check('empty state shows for no matches', /no restaurants found/i.test(emptyHeading), emptyHeading);

  await page.getByRole('button', { name: /show all restaurants/i }).click();
  await page.waitForTimeout(500);

  // --- 9. Responsive -------------------------------------------------------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('no horizontal overflow at 390px', overflow <= 1, `${overflow}px`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);

  // --- 10. Accessibility spot checks --------------------------------------
  const a11y = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('article img')];
    return {
      imgsWithAlt: imgs.filter((i) => (i.getAttribute('alt') ?? '').length > 0).length,
      imgsTotal: imgs.length,
      unlabelledButtons: [...document.querySelectorAll('button')].filter((b) => {
        const label = (b.textContent ?? '') + (b.getAttribute('aria-label') ?? '');
        return label.trim().length === 0;
      }).length,
      h1Count: document.querySelectorAll('h1').length,
    };
  });
  check('card images have alt text', a11y.imgsWithAlt === a11y.imgsTotal, `${a11y.imgsWithAlt}/${a11y.imgsTotal}`);
  check('all buttons are labelled', a11y.unlabelledButtons === 0, `${a11y.unlabelledButtons} unlabelled`);
  check('exactly one h1', a11y.h1Count === 1, `${a11y.h1Count}`);

  // --- 11. Console ---------------------------------------------------------
  // Storage CORS failures are expected until the bucket exists; ignore them.
  const ignorable = /favicon|ERR_FAILED|storage\.googleapis|firebasestorage|firebasedatabase/i;
  const realErrors = consoleErrors.filter((text) => !ignorable.test(text));
  check('no unexpected console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  await page.screenshot({ path: 'tests/zomato-clone-home.png' });

  return JSON.stringify(
    {
      passed: results.filter((r) => r.passed).length,
      failed: failures.length,
      results,
      failures,
      consoleErrors: consoleErrors.slice(0, 5),
    },
    null,
    2,
  );
}
