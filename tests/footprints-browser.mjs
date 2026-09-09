import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.worldDiagnostics.state());
async function ground(x,z){const p=await page.evaluate(([x,z])=>window.worldDiagnostics.project(x,.045,z),[x,z]);await page.mouse.move(p.x,p.y);await page.waitForTimeout(300);await page.mouse.click(p.x,p.y);await page.waitForTimeout(400);}
try{
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.worldDiagnostics);await page.waitForTimeout(1500);
 await page.getByRole('button',{name:'暂停游戏',exact:true}).click();
 await page.evaluate(async()=>{const s=await import('/src/stores/index.ts');s.useResourceStore.setState({currency:10000});});
 await page.locator('.build-categories button').filter({hasText:'生产'}).click();
 const farm=page.locator('.facility').filter({has:page.getByRole('heading',{name:'麦穗农田',exact:true})});
 assert.match(await farm.innerText(),/占地 2×2/);
 await farm.getByRole('button',{name:/建造/}).click();await page.waitForTimeout(1000);await ground(1,1);
 let b=(await state()).b.buildings.find(b=>b.type==='farm');assert.deepEqual(b.footprint,[2,2]);
 await page.evaluate(async()=>{const a=await import('/src/game/actions.ts');a.beginBuild('house');});
 const before=(await state()).r.currency;await ground(2,2);assert.equal((await state()).r.currency,before);await page.keyboard.press('Escape');
 await page.evaluate(async id=>{const a=await import('/src/game/actions.ts');a.selectBuilding(id);},b.id);
 await page.getByRole('button',{name:/换个位置/}).click();await page.waitForTimeout(1000);await page.keyboard.press('r');await ground(-3,1);
 b=(await state()).b.buildings.find(v=>v.id===b.id);assert.equal(b.x,-3);assert.equal(b.rotation,1);
 await page.getByRole('button',{name:'保存世界',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.worldDiagnostics);await page.waitForTimeout(1800);
 const restored=(await state()).b.buildings.find(v=>v.id===b.id);assert.deepEqual(restored.footprint,[2,2]);assert.equal(restored.rotation,1);
 await page.screenshot({path:'test-results/meadow-footprints.png'});
 await page.evaluate(async()=>{const s=await import('/src/stores/index.ts');s.useSettingsStore.setState({hour:22,weather:['dusk']});});await page.waitForTimeout(500);
 await page.screenshot({path:'test-results/meadow-footprints-night.png'});
 assert.deepEqual(errors,[]);console.log('PASS large build, overlap rejection, relocation, save/reload, day/night screenshots');
}finally{await browser.close();}
