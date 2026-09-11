import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/?model-review=1');await page.locator('canvas').waitFor();
 for(const type of ['tree','warehouse','orchard','lumber']){
  await page.locator('select').selectOption(type);await page.waitForTimeout(1000);await page.screenshot({path:`test-results/detail-${type}.png`});
  await page.getByRole('button',{name:'旋转 90°'}).click();await page.waitForTimeout(300);await page.screenshot({path:`test-results/detail-${type}-side.png`});
 }
 await page.locator('select').selectOption('tree');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'下载 GLB 模型'}).click();const download=await pending;await download.saveAs('test-results/detailed-tree.glb');assert.equal(download.suggestedFilename(),'tree.glb');
 assert.deepEqual(errors,[]);console.log('PASS tree/crate/orchard/lumber previews, rotated views and tree GLB export');
}finally{await browser.close();}
