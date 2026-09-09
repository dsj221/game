import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5175');await page.waitForFunction(()=>window.worldDiagnostics);await page.waitForTimeout(1000);
 await page.getByRole('button',{name:'暂停游戏',exact:true}).click();await page.locator('.wish-direct').click();
 const bar=page.getByRole('toolbar',{name:'建造操作'});await bar.waitFor();assert.ok((await bar.boundingBox()).height<75);assert.equal(await page.locator('.placement-popover').count(),0);assert.equal(await page.locator('.build-toolbar').count(),0);
 await page.screenshot({path:'test-results/placement-dock-compact.png'});
 await bar.getByRole('button',{name:'详情'}).click();assert.ok(await page.locator('.placement-popover').isVisible());assert.ok((await page.locator('.placement-popover').boundingBox()).height<=281);
 assert.ok(!await page.locator('.active-guide').isVisible());await page.locator('.placement-guide summary').click();assert.ok(await page.locator('.active-guide').isVisible());
 const before=await page.evaluate(()=>window.worldDiagnostics.state().ui.rotation);await page.getByRole('button',{name:'旋转建筑90度'}).click();assert.equal(await page.evaluate(()=>window.worldDiagnostics.state().ui.rotation),(before+1)%4);
 await page.getByRole('button',{name:'收起放置详情'}).click();assert.equal(await page.locator('.placement-popover').count(),0);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.ok((await bar.boundingBox()).height<80);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/placement-dock-mobile.png'});
 await page.getByRole('button',{name:'取消建造',exact:true}).click();assert.equal(await bar.count(),0);
 assert.deepEqual(errors,[]);console.log('PASS compact height, no old panel, details and guide toggles, rotation, cancel, mobile overflow, no browser errors');
}catch(e){console.log(errors);await page.screenshot({path:'test-results/placement-dock-failure.png'});throw e;}finally{await browser.close();}
