import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

// Optional browser tooling; not part of the site's runtime dependencies.
const { chromium } = await import(process.env.PALISSAGE_PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PALISSAGE_CHROMIUM_PATH || undefined,
});
const base = process.env.PALISSAGE_PREVIEW_URL || 'http://127.0.0.1:5173';
const output = process.env.PALISSAGE_SCREENSHOTS || join(tmpdir(), 'palissage-harvest-check');
await mkdir(output, { recursive: true });
const errors = [];
const open = async (options = {}) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', ...options });
  page.on('pageerror', (error) => errors.push(error.message));
  return page;
};
const settle = async (page) => {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => {
    const root = document.querySelector('.harvest-story');
    return root?.dataset.motion === 'scroll' && root.dataset.frame === root.dataset.targetFrame;
  });
};
const scroll = async (page, progress) => {
  await page.locator('.harvest-story').evaluate((root, progress) => {
    const top = root.getBoundingClientRect().top + scrollY;
    const height = root.querySelector('canvas').getBoundingClientRect().height;
    window.scrollTo({ top: top - 56 + (root.offsetHeight - height) * progress, behavior: 'instant' });
  }, progress);
  await settle(page);
};
const pixels = async (page) => createHash('sha256').update(await page.locator('.harvest-canvas').evaluate((canvas) => canvas.toDataURL())).digest('hex');

try {
  const page = await open();
  await page.goto(base);
  await page.locator('.harvest-story').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.harvest-story video').count(), 0);
  await scroll(page, .2);
  assert(Number(await page.locator('.harvest-story').getAttribute('data-frame')) < 66,
    'Chapter 01 must show the vineyard before the harvest crossfade');
  const before = await pixels(page);
  await page.waitForTimeout(1000);
  assert.equal(await pixels(page), before, 'The scene must stay still without scrolling');
  await scroll(page, .7);
  assert(Number(await page.locator('.harvest-story').getAttribute('data-frame')) > 71,
    'Later chapters must show the trimmed harvest');
  assert.notEqual(await pixels(page), before, 'Scrolling must change actual canvas pixels');
  await scroll(page, .2);
  assert.equal(await pixels(page), before, 'Reverse scrolling must restore the exact same frame');

  // Real paced scroll: ensure intermediate frames are drawn, not just the endpoints.
  const frames = await page.evaluate(async () => {
    const root = document.querySelector('.harvest-story');
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      window.scrollBy({ top: 12, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 20));
      seen.add(root.dataset.frame);
    }
    return [...seen];
  });
  assert(frames.length > 25, `Expected intermediate motion, saw ${frames.length} frames`);
  console.log(`Forward/reverse/stationary pixels passed; ${frames.length} intermediate frames drawn.`);

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    for (const id of ['journey', 'closer', 'better']) {
      await page.locator(`#${id} .harvest-copy`).evaluate((element) => {
        window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - 190, behavior: 'instant' });
      });
      await settle(page);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
      const box = await page.locator(`#${id} .harvest-copy`).boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width, `Copy clipped at ${width}`);
      if (id === 'journey' && width > 600) {
        assert(box.x > width * .4, `Chapter 01 belongs on the right at ${width}`);
      }
      if (id === 'better') {
        const viewportCenter = await page.locator('.harvest-story').evaluate((root) => {
          const rect = root.getBoundingClientRect();
          return rect.x + rect.width / 2; // Excludes the reserved scrollbar gutter.
        });
        assert(Math.abs(box.x + box.width / 2 - viewportCenter) < 2, `Chapter 03 must be centered at ${width}`);
      }
      await page.screenshot({ path: join(output, `${width}-${id}.png`) });
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#closer .harvest-copy').evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await settle(page);
  const position = await page.evaluate(() => scrollY);
  await page.locator('#closer a').first().click();
  await page.waitForURL('**/for-wineries');
  await page.goBack();
  await page.locator('.harvest-story').waitFor();
  await settle(page);
  assert(Math.abs(await page.evaluate(() => scrollY) - position) < 5, 'Back restores story position');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('.harvest-story')?.dataset.motion === 'poster');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await settle(page);
  await page.close();

  for (const mode of ['reduce', 'save-data', 'failure', 'french-dark', 'mobile']) {
    const current = await open({ reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference',
      viewport: { width: mode === 'mobile' || mode === 'french-dark' ? 390 : 1440, height: 844 } });
    const requests = [];
    current.on('request', (request) => { if (/\/harvest\/.*\.webp/.test(request.url())) requests.push(request.url()); });
    if (mode === 'save-data') await current.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    if (mode === 'failure') await current.route('**/harvest/**/*.webp*', (route) => route.abort());
    if (mode === 'french-dark') await current.addInitScript(() => {
      document.cookie = 'palissage-language=fr; path=/';
      document.cookie = 'palissage-theme=dark; path=/';
    });
    await current.goto(base);
    await current.locator('#closer').scrollIntoViewIfNeeded();
    if (mode === 'mobile' || mode === 'french-dark') {
      await scroll(current, .5);
      assert(requests.every((url) => url.includes('/small/')), 'Mobile uses the smaller frame sequence');
      if (mode === 'french-dark') {
        assert.equal(await current.locator('html').getAttribute('lang'), 'fr');
        assert.equal(await current.locator('html').getAttribute('data-theme'), 'dark');
        assert.match(await current.locator('#closer h2').innerText(), /Plus près du vin/);
      }
    } else {
      await current.waitForTimeout(700);
      assert.equal(await current.locator('.harvest-story').getAttribute('data-motion'), 'poster');
      if (mode !== 'failure') assert.equal(requests.length, 0, 'Reduced motion/data must not download the sequence');
    }
    assert(await current.locator('#closer h2').isVisible());
    assert(await current.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await current.screenshot({ path: join(output, `${mode}.png`) });
    await current.close();
  }
  assert.deepEqual(errors, [], 'No browser exceptions');
  console.log(`PASS: responsive, history, motion preferences, small assets, French, data saving and failed-frame fallback. Screenshots: ${output}`);
} finally {
  await browser.close();
}
