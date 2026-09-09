import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl'],
});
const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:5173');
  await page.waitForFunction(() => window.worldDiagnostics);
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  await page.locator('.build-categories button').filter({ hasText: '住宅' }).click();
  await page.locator('.facility img.building-icon').first().waitFor();
  await page.locator('.filters button').filter({ hasText: '全部' }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.facility img')].every(img => img.complete && img.naturalWidth >= 256));
  assert.ok(await page.locator('.facility img.building-icon').count() >= 20);
  const catalog = await (await page.request.get('/assets/building-icons/manifest.json')).json();
  assert.equal(catalog.icons.length, 36);
  for (const icon of catalog.icons) {
    for (const file of [icon.file_256, icon.file_512]) {
      const response = await page.request.get(`/assets/building-icons/${file}`);
      assert.equal(response.status(), 200, file);
      assert.match(response.headers()['content-type'], /image\/png/, file);
    }
  }
  mkdirSync('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/building-icons-desktop.png' });
  const bench = page.locator('.facility').filter({ has: page.getByRole('heading', { name: '林荫长椅', exact: true }) });
  await bench.scrollIntoViewIfNeeded();
  assert.match(await bench.locator('img').getAttribute('src'), /park-bench\.png/);
  await bench.screenshot({ path: 'test-results/bench-card.png' });
  const house = page.locator('.facility').filter({ has: page.getByRole('heading', { name: '小木屋', exact: true }) });
  await house.getByRole('button', { name: /查看设施/ }).click();
  await page.waitForFunction(() => document.querySelector('.detail-art img')?.naturalWidth === 512);
  await page.getByRole('button', { name: '查看 3D 模型', exact: true }).click();
  await page.locator('.detail-art canvas').waitFor();
  await page.getByRole('button', { name: '查看建筑图标', exact: true }).click();
  await page.locator('.detail-art img').waitFor();
  await page.screenshot({ path: 'test-results/building-icons-detail.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/building-icons-mobile.png' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const { useSettingsStore } = await import('/src/stores/index.ts');
    useSettingsStore.setState({ hour: 22, weather: ['dusk'] });
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/grass-tree-night.png' });
  console.log('PASS: 72 PNG assets, building list, 512px details, 3D toggle, mobile layout, no browser errors');
} finally {
  await browser.close();
}
