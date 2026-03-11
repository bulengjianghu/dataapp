import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.goto('http://127.0.0.1:5173/editor');
await page.waitForTimeout(1000);

const tileByText = (text) => page.locator('.editor-palette__tile').filter({ hasText: text }).first();

async function dragToPoint(srcLocator, x, y) {
  const s = await srcLocator.boundingBox();
  if (!s) throw new Error('missing source bbox');
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width / 2 + 20, s.y + s.height / 2 + 20, { steps: 8 });
  await page.mouse.move(x, y, { steps: 24 });
}

async function dragToCenter(srcLocator, targetLocator) {
  const t = await targetLocator.boundingBox();
  if (!t) throw new Error('missing target bbox');
  await dragToPoint(srcLocator, t.x + t.width / 2, t.y + Math.min(40, t.height / 2));
  await page.mouse.up();
}

const root = page.locator('.editor-canvas__root');
await dragToCenter(tileByText('单行文本'), root);
await page.waitForTimeout(200);
await dragToCenter(tileByText('数字'), root);
await page.waitForTimeout(300);

const cards = page.locator('.editor-node-card');
console.log('cardCount', await cards.count());
const first = cards.nth(0);
const second = cards.nth(1);
const a = await first.boundingBox();
const b = await second.boundingBox();
console.log('bbox1', a);
console.log('bbox2', b);
if (!a || !b) throw new Error('missing card bbox');

await dragToPoint(first, b.x + b.width / 2, b.y + 8);
await page.waitForTimeout(500);

const className = await second.getAttribute('class');
const styles = await second.evaluate((el) => {
  const before = getComputedStyle(el, '::before');
  return {
    className: el.className,
    beforeContent: before.content,
    beforeTop: before.top,
    beforeHeight: before.height,
    beforeBg: before.backgroundColor,
    beforeBoxShadow: before.boxShadow,
    beforeLeft: before.left,
    beforeRight: before.right,
  };
});
console.log(JSON.stringify({ className, styles }, null, 2));
await page.screenshot({ path: 'artifacts/insert-line-debug.png', fullPage: true });
await page.mouse.up();
await browser.close();
