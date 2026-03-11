import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.goto('http://127.0.0.1:5173/editor');
await page.waitForTimeout(1200);

const tileByText = (text) => page.locator('.editor-palette__tile').filter({ hasText: text }).first();
const root = page.locator('.editor-canvas__root');

async function dragAndDropToRoot(text) {
  const src = await tileByText(text).boundingBox();
  const dst = await root.boundingBox();
  if (!src || !dst) throw new Error('bbox missing');
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  await page.mouse.move(src.x + src.width / 2 + 20, src.y + src.height / 2 + 20, { steps: 8 });
  await page.mouse.move(dst.x + dst.width / 2, dst.y + 60, { steps: 24 });
  await page.mouse.up();
  await page.waitForTimeout(250);
}

await dragAndDropToRoot('单行文本');
await dragAndDropToRoot('数字');
await dragAndDropToRoot('日期');

const cards = page.locator('.editor-node-card');
console.log('count', await cards.count());
for (let i = 0; i < await cards.count(); i++) {
  const box = await cards.nth(i).boundingBox();
  const text = await cards.nth(i).innerText();
  console.log('card', i, text.replace(/\s+/g,' '), box);
}

const src = await tileByText('多行文本').boundingBox();
const target = await cards.nth(1).boundingBox();
if (!src || !target) throw new Error('drag target missing');
await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
await page.mouse.down();
await page.mouse.move(src.x + src.width / 2 + 20, src.y + src.height / 2 + 20, { steps: 8 });
await page.mouse.move(target.x + target.width / 2, target.y + 10, { steps: 30 });
await page.waitForTimeout(500);

const toolbarTexts = await page.locator('.editor-shell__toolbar-actions').innerText();
const classes = [];
for (let i = 0; i < await cards.count(); i++) {
  classes.push(await cards.nth(i).getAttribute('class'));
}
console.log('toolbar', toolbarTexts.replace(/\s+/g,' '));
console.log('classes', JSON.stringify(classes, null, 2));
await page.screenshot({ path: 'artifacts/palette-over-node-debug.png', fullPage: true });
await page.mouse.up();
await browser.close();
