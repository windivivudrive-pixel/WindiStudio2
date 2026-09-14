import {chromium} from '/Users/win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
  const page=await browser.newPage();
  const origin=process.env.WINDI_CHECK_URL||'http://localhost:3000';
  await page.route('**/api/video-kits/account',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Đăng nhập để tiếp tục.'})}));
  await mkdir('visual-checks/kit-sale',{recursive:true});
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(`${origin}/video-kits`);
    const panel=page.locator('.kit-price-box');
    await panel.waitFor();
    await panel.scrollIntoViewIfNeeded();
    assert.match(await panel.innerText(),/89\.000đ/);
    assert.match(await panel.innerText(),/369\.000đ/);
    assert.doesNotMatch(await page.locator('body').innerText(),/cartesia/i);
    await page.screenshot({path:`visual-checks/kit-sale/kit-${width}.png`});
  }
  console.log('PASS: new trial/original prices and public branding at mobile/desktop widths. No order created.');
} finally {await browser.close();}
