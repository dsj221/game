import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.worldDiagnostics);await page.waitForTimeout(1500);
 await page.getByLabel('地图信息模式').selectOption('happiness');await page.waitForTimeout(500);
 await page.getByLabel('地图信息模式').selectOption('commerce');await page.waitForTimeout(300);
 await page.evaluate(async()=>{const {useUIStore}=await import('/src/stores/index.ts');useUIStore.setState({placement:'park',hover:[0,0]});});
 await page.waitForTimeout(500);assert.ok((await page.locator('.placement-info').innerText()).includes('土地已占用'));
 await page.keyboard.press('r');assert.equal(await page.evaluate(async()=>(await import('/src/stores/index.ts')).useUIStore.getState().rotation),1);
 await page.screenshot({path:'test-results/v2-placement.png'});
 await page.evaluate(async()=>{const {useUIStore}=await import('/src/stores/index.ts');useUIStore.setState({placement:'expand'});});
 assert.equal(await page.locator('.land-regions button').count(),4);assert.ok(await page.locator('.land-regions button').first().isDisabled());
 await page.evaluate(async()=>{const {useTownStore}=await import('/src/stores/useTownStore.ts');const {useResourceStore,useSettingsStore}=await import('/src/stores/index.ts');useSettingsStore.setState({speed:0});useTownStore.setState(s=>({level:2,metrics:{...s.metrics,population:6}}));useResourceStore.setState({currency:2000});});
 await page.locator('.land-regions button').first().click();
 const tiles=await page.evaluate(()=>window.worldDiagnostics.state().w.tiles.overworld.length);assert.equal(tiles,18);
 await page.getByLabel('保存世界').click();await page.reload();await page.waitForFunction(()=>window.worldDiagnostics);assert.equal(await page.evaluate(()=>window.worldDiagnostics.state().w.tiles.overworld.length),tiles);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('PASS heatmaps, invalid preview, rotation, gated region purchase, save reload, mobile overflow, browser errors');
} catch(e){console.log('BROWSER ERRORS',errors);await page.screenshot({path:'test-results/v2-failure.png'});throw e;} finally {await browser.close();}
