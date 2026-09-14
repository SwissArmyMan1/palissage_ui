import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Playwright is optional tooling, kept outside the application's dependencies.
const { chromium } = await import(
  process.env.PALISSAGE_PLAYWRIGHT_PATH || 'playwright'
);
const output =
  process.env.PALISSAGE_SCREENSHOTS || join(tmpdir(), 'palissage-motion-check');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PALISSAGE_CHROMIUM_PATH || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'no-preference',
  });
  if (process.env.PALISSAGE_FORCE_SCROLL_FALLBACK === '1') {
    await page.addInitScript(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = (...args) => {
        if (/animation-(timeline|range)/.test(args[0])) return false;
        return supports(...args);
      };
    });
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const base = process.env.PALISSAGE_PREVIEW_URL || 'http://127.0.0.1:5173';
  const settle = async () => {
    await page.waitForTimeout(800);
  };
  const scroll = async (y) => {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      y,
    );
    await page.waitForTimeout(140);
  };
  await page.goto(base);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await settle();
  assert(await page.locator('.reveal-ready:not(.vine-animated)').count() > 0,
    'Offscreen sections must still be armed after StrictMode effect replay');
  const armedOpacity = await page.locator('.reveal-ready:not(.vine-animated)').first()
    .evaluate((e) => getComputedStyle(e).opacity);
  assert.equal(armedOpacity, '0', 'Armed sections must actually have an entrance state');
  assert.equal(await page.locator('.hero-photo img').evaluate((e) => getComputedStyle(e).filter),
    'none', 'Retouched hero retains the user-supplied colours');
  assert.match(await page.locator('.hero-photo img').getAttribute('src'), /retouched-960/);
  if (process.env.PALISSAGE_FORCE_SCROLL_FALLBACK === '1') {
    assert.equal(await page.locator('.public-site').getAttribute('data-scroll-motion'), 'fallback');
  }
  const companionSelectors = ['.origin-tag', '.hero-photo img', '.reading-progress'];
  const companionsBefore = await Promise.all(companionSelectors.map((selector) =>
    page.locator(selector).evaluate((e) => getComputedStyle(e).transform)));
  const before = await page
    .locator('.bottle-study')
    .evaluate((e) => getComputedStyle(e).transform);
  await scroll(450);
  const after = await page
    .locator('.bottle-study')
    .evaluate((e) => getComputedStyle(e).transform);
  assert.notEqual(before, after, 'Bottle must actually move with scroll');
  for (const [index, selector] of companionSelectors.entries()) {
    assert.notEqual(await page.locator(selector).evaluate((e) => getComputedStyle(e).transform),
      companionsBefore[index], `${selector} must actually move with scroll`);
  }
  console.log('Parallax', { before, after });

  const checkScene = async (sceneSelector, targetSelectors) => {
    const scene = page.locator(sceneSelector);
    const top = await scene.evaluate((e) => e.getBoundingClientRect().top + scrollY);
    await scroll(Math.max(0, top - 900));
    const initial = await Promise.all(targetSelectors.map((selector) =>
      page.locator(selector).evaluate((e) => getComputedStyle(e).transform)));
    await scroll(top - 200);
    for (const [index, selector] of targetSelectors.entries()) {
      assert.notEqual(await page.locator(selector).evaluate((e) => getComputedStyle(e).transform),
        initial[index], `${selector} must follow the page, not a clipped container`);
    }
  };
  await checkScene('.audience-card-0', ['.audience-card-0 .audience-symbol', '.audience-card-1 .audience-symbol']);
  await checkScene('.terroir-interlude', ['.terroir-image', '.terroir-word']);
  console.log('Audience illustrations and landscape motion PASS');
  await scroll(0);
  await settle();
  await page.screenshot({ path: join(output, 'after-desktop.png') });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await settle();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, `horizontal overflow at ${width}`);
    for (const selector of [
      '.hero-title',
      '.hero-actions',
      '.hero-composition',
    ]) {
      const box = await page.locator(selector).boundingBox();
      assert(
        box.x >= 0 && box.x + box.width <= width + 1,
        `${selector} out of bounds at ${width}`,
      );
    }
  }
  console.log('Responsive widths PASS');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await scroll(1200);
  await settle();
  const returnPosition = await page.evaluate(() => scrollY);
  await page
    .getByRole('navigation', { name: 'Main', exact: true })
    .getByRole('link', { name: 'For buyers' })
    .click();
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Buy closer to the source, on terms you can see.',
    })
    .waitFor();
  await settle();
  assert.equal(
    await page.evaluate(() => scrollY),
    0,
    'Forward navigation starts at top',
  );
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    'main',
    'Route change moves focus to main',
  );
  await page.goBack();
  await page.getByRole('heading', { level: 1 }).waitFor();
  await settle();
  assert(
    Math.abs((await page.evaluate(() => scrollY)) - returnPosition) < 15,
    'Back navigation restores scroll',
  );
  console.log('Navigation and history PASS');
  await page.setViewportSize({ width: 390, height: 844 });
  await scroll(0);
  await settle();
  const menu = page.getByRole('button', { name: 'Open the menu' });
  await menu.click();
  await page
    .getByRole('navigation', { name: 'Main, expanded' })
    .getByRole('link', { name: 'For wineries' })
    .focus();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#public-menu').count(), 0);
  assert.equal(await menu.evaluate((e) => e === document.activeElement), true);
  await menu.click();
  await page
    .getByRole('navigation', { name: 'Main, expanded' })
    .getByRole('link', { name: 'For wineries' })
    .click();
  await page
    .getByRole('heading', {
      level: 1,
      name: 'Get paid before the wine leaves the cellar.',
    })
    .waitFor();
  await settle();
  assert.equal(await page.locator('#public-menu').count(), 0);
  assert.equal(
    await page
      .locator('main img')
      .first()
      .evaluate((e) => e.complete && e.naturalWidth > 0),
    true,
  );
  console.log('Mobile menu and lazy page PASS');
  await page.goto(base);
  await settle();
  for (
    let y = 0;
    y < (await page.evaluate(() => document.body.scrollHeight));
    y += 550
  ) {
    await scroll(y);
  }
  await settle();
  assert.equal(
    await page.locator('.reveal-ready').count(),
    0,
    'All visited sections reveal',
  );
  await scroll(0);
  await settle();
  await page.screenshot({
    path: join(output, 'after-mobile.png'),
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto(base);
  await settle();
  const hidden = await page
    .locator('.reveal,.reveal-stagger>*')
    .evaluateAll(
      (es) => es.filter((e) => getComputedStyle(e).opacity === '0').length,
    );
  assert.equal(hidden, 0, 'Reduced motion content immediately visible');
  const stationary = await page
    .locator('.bottle-study')
    .evaluate((e) => getComputedStyle(e).transform);
  await scroll(400);
  assert.equal(
    await page
      .locator('.bottle-study')
      .evaluate((e) => getComputedStyle(e).transform),
    stationary,
    'Reduced motion bottle stays still',
  );
  assert.equal(await page.locator('.public-site').getAttribute('data-scroll-motion'), null,
    'Reduced motion stops the fallback listener');
  assert.equal(
    (
      await page
        .locator('.margin-stat .t-num > [aria-hidden]')
        .first()
        .innerText()
    ).replace(/\s/g, ' '),
    '€13 700',
    'Reduced motion figures immediately final',
  );
  await scroll(0);
  await page.screenshot({ path: join(output, 'dark-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await settle();
  await page.screenshot({ path: join(output, 'dark-desktop.png') });
  console.log('Dark and reduced motion PASS');
  assert.deepEqual(errors, []);
  console.log('Browser errors: none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await settle();
  if (process.env.PALISSAGE_FORCE_SCROLL_FALLBACK === '1') {
    assert.equal(await page.locator('.public-site').getAttribute('data-scroll-motion'), 'fallback',
      'Motion preference change restarts the fallback');
  }
  assert.equal(
    (
      await page
        .locator('.margin-stat .t-num > [aria-hidden]')
        .first()
        .innerText()
    ).replace(/\s/g, ' '),
    '€13 700',
    'Motion preference changes retain final metrics',
  );
  await page.getByRole('link', { name: 'Follow the journey' }).click();
  await page.waitForTimeout(1000);
  const heading = await page.locator('#lifecycle-heading').boundingBox();
  assert(heading.y > 50 && heading.y < 240, 'Anchor arrives below the header');
  await page.addInitScript(() => {
    window.IntersectionObserver = undefined;
  });
  await page.goto(base);
  await settle();
  assert.equal(
    await page.locator('.reveal-ready').count(),
    0,
    'No observer leaves content visible',
  );
  assert.equal(
    (
      await page
        .locator('.margin-stat .t-num > [aria-hidden]')
        .first()
        .innerText()
    ).replace(/\s/g, ' '),
    '€13 700',
  );
  console.log('Anchor, live motion preference and observer fallback PASS');
  console.log('Screenshots:', output);
} finally {
  await browser.close();
}
