import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.worldDiagnostics);
 await page.evaluate(async()=>{
 const entries=performance.getEntriesByType('resource').map(e=>e.name);
 const stores=await import(entries.find(u=>new URL(u).pathname==='/src/stores/index.ts'));
 const {useTownStore:T}=await import(entries.find(u=>new URL(u).pathname==='/src/stores/useTownStore.ts'));
 const {climateStep}=await import('/src/systems/climate.ts');
 stores.useSettingsStore.setState({speed:0});
 stores.useResourceStore.setState({bag:{...stores.useResourceStore.getState().bag,wood:30,stone:30}});
 let t={...T.getState(),day:7};climateStep(t,stores.useBuildingStore.getState().buildings);T.setState(t);
 stores.useUIStore.setState({panel:'daily'});
 });
 await page.getByText('地块与水渠工程',{exact:false}).click();
 const button=page.getByRole('button',{name:'修水渠 · 5 木材 + 5 石材'}).first();await button.click();
 assert.ok(await page.getByRole('button',{name:'水渠已建'}).count());
 const persisted=await page.evaluate(async()=>{
 const p=await import('/src/systems/persistence.ts');const saved=JSON.parse(JSON.stringify(p.snapshot()));
 const checked=p.validate(saved);return checked.town.climate.cells.some(c=>c.canal)&&checked.resources.bag.wood===25;
 });assert.ok(persisted);
 await page.screenshot({path:'test-results/climate-panel.png'});
 assert.deepEqual(errors,[]);console.log('Calendar UI, canal purchase, save validation and rendering passed.');
}finally{await browser.close();}
