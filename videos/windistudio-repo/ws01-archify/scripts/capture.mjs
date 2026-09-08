import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire('/Users/win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const base=new URL('../public/',import.meta.url);
const checks=[];
for(const name of ['workflow','workflow-revised']){
 await page.goto(new URL(`${name}.html`,base).href);
 await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 await page.waitForTimeout(500);
 for(const [width,height] of [[1440,900],[1600,1000],[1920,1080]]){await page.setViewportSize({width,height});checks.push({name,width,height,...await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}))});}
 await page.setViewportSize({width:1440,height:900});
 await page.screenshot({path:new URL(`${name}-full.png`,base).pathname});
 await page.locator('svg').first().screenshot({path:new URL(`${name}.png`,base).pathname});
 if(name==='workflow'){
 console.log((await page.locator('button').allTextContents()).slice(0,25));
 await page.locator('[data-node-id="script"]').first().click();
 await page.screenshot({path:new URL('workflow-selected.png',base).pathname});
 console.log((await page.locator('body').innerText()).slice(-2500));
 }
}
try{await page.goto('https://windistudio.app',{timeout:30000});await page.screenshot({path:new URL('website.png',base).pathname});checks.push({website:page.url(),title:await page.title()});}catch(e){checks.push({websiteError:String(e)});}
writeFileSync(new URL('../evidence/browser-checks.json',import.meta.url),JSON.stringify(checks,null,2));await browser.close();
