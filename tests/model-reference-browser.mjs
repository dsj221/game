import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/?model-review=1');await page.locator('canvas').waitFor();await page.waitForTimeout(1500);
 const sections=page.locator('.model-review-pair section');const left=await sections.nth(0).boundingBox(),right=await sections.nth(1).boundingBox();assert.ok(left.width>450&&right.x>left.x+left.width,'side by side layout');
 for(const type of ['house','bakery','warehouse','generator','farm','shop']){
   await page.locator('select').selectOption(type);await page.waitForTimeout(600);await page.screenshot({path:`test-results/reference-${type}.png`});
 }
 await page.locator('select').selectOption('house');await page.waitForTimeout(500);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'下载 GLB 模型'}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'house.glb');await download.saveAs('test-results/reference-house.glb');
 const glb=await readFile('test-results/reference-house.glb');assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(8),glb.length);const jsonLength=glb.readUInt32LE(12);const content=JSON.parse(glb.toString('utf8',20,20+jsonLength).trim());assert.ok(content.meshes.length>0&&content.accessors.length>0,'real mesh payload');
 await page.getByRole('button',{name:'旋转 90°'}).click();await page.screenshot({path:'test-results/reference-house-side.png'});
 assert.deepEqual(errors,[]);console.log('PASS original/model comparison, six reference views, rotation, GLB download, no runtime errors');
}finally{await browser.close();}
