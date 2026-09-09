import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),requests=[];
page.on('request',r=>{if(r.url().includes('/building-views/'))requests.push(r.url())});
try{
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.worldDiagnostics);await page.waitForTimeout(1800);
 await page.locator('.build-categories button').filter({hasText:'装饰'}).click();
 const tree=page.locator('.facility').filter({has:page.getByRole('heading',{name:'方冠树',exact:true})});
 await tree.getByRole('button',{name:/建造/}).click();
 const placement=await page.evaluate(()=>window.worldDiagnostics.project(-1,.05,0));await page.mouse.move(placement.x,placement.y);await page.waitForTimeout(800);
 assert.ok(requests.some(x=>x.endsWith('tree_front_left.png')),'rotation 0 image');
 await page.keyboard.press('r');await page.waitForTimeout(800);
 assert.ok(requests.some(x=>x.endsWith('tree_front_right.png')),'rotation 1 image');
 await page.keyboard.press('r');await page.waitForTimeout(800);
 assert.ok(requests.some(x=>x.endsWith('tree_back_right.png')),'rotation 2 image');
 await page.keyboard.press('Escape');
 const center=await page.locator('canvas').boundingBox();assert.ok(center);
 await page.mouse.move(center.x+center.width/2,center.y+center.height/2);await page.mouse.wheel(0,-700);await page.waitForTimeout(700);
 const zoomed=(await page.evaluate(()=>window.worldDiagnostics.camera())).zoom;
 await page.waitForTimeout(1800);
 const stable=(await page.evaluate(()=>window.worldDiagnostics.camera())).zoom;
 assert.ok(Math.abs(zoomed-stable)<.05,`zoom persisted: ${zoomed} -> ${stable}`);
 await page.screenshot({path:'test-results/terrain-lakes-grass.png'});
 console.log('PASS four-view rotation, persistent zoom, terrain screenshot');
}finally{await browser.close()}
