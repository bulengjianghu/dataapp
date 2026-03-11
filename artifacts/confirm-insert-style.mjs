import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.goto('http://127.0.0.1:5173/editor');
await page.waitForTimeout(1000);

const tile = page.locator('.editor-palette__tile').filter({ hasText: '单行文本' }).first();
const root = page.locator('.editor-canvas__root');
const s = await tile.boundingBox();
const t = await root.boundingBox();
if (!s || !t) throw new Error('bbox missing');
await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
await page.mouse.down();
await page.mouse.move(s.x + s.width / 2 + 20, s.y + s.height / 2 + 20, { steps: 10 });
await page.mouse.move(t.x + t.width / 2, t.y + 40, { steps: 24 });
await page.mouse.up();
await page.waitForTimeout(300);

const card = page.locator('.editor-node-card').first();
await card.evaluate((el) => el.classList.add('is-insert-before'));
const styles = await card.evaluate((el) => {
  const cs = getComputedStyle(el);
  return {
    className: el.className,
    backgroundImage: cs.backgroundImage,
    boxShadow: cs.boxShadow,
    borderTopColor: cs.borderTopColor,
  };
});
console.log(JSON.stringify(styles, null, 2));
await page.screenshot({ path: 'artifacts/insert-style-confirm.png', fullPage: true });
await browser.close();
