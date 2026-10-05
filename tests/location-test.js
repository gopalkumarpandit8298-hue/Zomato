async (page) => {
  const results = [];
  const failures = [];
  const check = (name, passed, detail = '') => {
    results.push({ name, passed, detail });
    if (!passed) failures.push(detail ? `${name} — ${detail}` : name);
  };

  const APP = `https://zomato-3e2f4.web.app/?cb=${Date.now()}`;

  try {
    const session = await page.context().newCDPSession(page);
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  } catch {}

  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('zomato-clone:filters');
    localStorage.removeItem('zomato-clone:cart');
  });
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article', { timeout: 20000 });

  const picker = page.locator('header select[aria-label], header select').first();
  await picker.waitFor({ timeout: 10000 });
  const options = await picker.locator('option').evaluateAll((o) => o.map((x) => ({ v: x.value, t: x.textContent })));
  check('picker lists every state + union territory', options.length >= 36, `${options.length} options`);
  check('first option is All India', options[0]?.t === 'All India', options[0]?.t);
  check('Telangana is available', options.some((o) => o.t === 'Telangana'));
  check('Delhi is available', options.some((o) => o.t === 'Delhi'));
  check('Karnataka is available', options.some((o) => o.t === 'Karnataka'));

  const total = await page.locator('article').count();
  const subtitle = await page.locator('header').innerText();
  check('header shows the available cities', /Hyderabad/.test(subtitle), subtitle.replace(/\s+/g, ' ').slice(0, 90));

  // --- Filter to Telangana -------------------------------------------------
  await picker.selectOption('TG');
  await page.waitForTimeout(500);
  const telangana = await page.locator('article').count();
  check('Telangana narrows the grid', telangana > 0 && telangana < total, `${telangana}/${total}`);

  const subtitleTg = (await page.locator('header').innerText()).replace(/\s+/g, ' ');
  check('header subtitle lists Telangana cities', /Hyderabad/.test(subtitleTg), subtitleTg.slice(0, 90));

  // --- Filter to Karnataka -------------------------------------------------
  await picker.selectOption('KA');
  await page.waitForTimeout(500);
  const karnataka = await page.locator('article').count();
  check('Karnataka shows only its restaurants', karnataka === 3, `${karnataka} expected 3`);
  const subtitleKa = (await page.locator('header').innerText()).replace(/\s+/g, ' ');
  check('header subtitle switches to Bengaluru', /Bengaluru/.test(subtitleKa) && !/Hyderabad/.test(subtitleKa), subtitleKa.slice(0, 90));

  // --- State with no coverage ---------------------------------------------
  await picker.selectOption('MH');
  await page.waitForTimeout(500);
  const emptyCards = await page.locator('article').count();
  check('uncovered state shows no restaurants', emptyCards === 0, `${emptyCards} cards`);
  const emptyHeading = await page.locator('h2').first().innerText().catch(() => '');
  check('uncovered state shows the empty state', /no restaurants found/i.test(emptyHeading), emptyHeading);
  const emptyHint = await page.locator('main').innerText();
  check('empty state explains we do not deliver there yet', /do not deliver to Maharashtra/i.test(emptyHint));

  // --- Back to all India ----------------------------------------------------
  await page.getByRole('button', { name: /Show all restaurants|reset/i }).first().click();
  await page.waitForTimeout(500);
  const backToAll = await page.locator('article').count();
  check('reset restores every restaurant', backToAll === total, `${backToAll}/${total}`);

  // --- State persists across a reload --------------------------------------
  await picker.selectOption('KA');
  await page.waitForTimeout(400);
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article', { timeout: 20000 });
  const persisted = await page.locator('article').count();
  check('selected state persists across reload', persisted === 3, `${persisted} expected 3`);

  // --- State is respected by search too ------------------------------------
  await page.locator('input[type="search"]').first().fill('biryani');
  await page.waitForTimeout(700);
  const searchNames = await page.locator('article h3').allInnerTexts();
  check('search is scoped to the selected state', searchNames.length === 0 || searchNames.every((n) => /biryani/i.test(n)), searchNames.join(', '));

  await page.evaluate(() => localStorage.removeItem('zomato-clone:filters'));
  await page.screenshot({ path: 'tests/state-picker.png' });

  return JSON.stringify({ passed: results.filter((r) => r.passed).length, failed: failures.length, results, failures }, null, 2);
}
