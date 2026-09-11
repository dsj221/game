import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5194/');await page.waitForFunction(()=>window.worldDiagnostics);
 await page.evaluate(async()=>{const s=await import('/src/stores/index.ts'),{useTownStore:t}=await import('/src/stores/useTownStore.ts'),{initialTown}=await import('/src/data/town.ts');s.useSettingsStore.setState({speed:0});t.setState(initialTown());s.useResourceStore.setState({currency:10000,bag:Object.fromEntries(Object.keys(s.useResourceStore.getState().bag).map(k=>[k,100]))});s.useUIStore.setState({panel:'village'});});
 await page.getByRole('button',{name:'发展',exact:true}).click();await page.getByRole('region',{name:'城镇发展'}).waitFor();assert.equal(await page.locator('.dev-card').count(),3);
 await page.screenshot({path:'test-results/development-orders.png'});
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'交付委托',exact:true}).first().click();
 assert.equal(await page.getByRole('button',{name:'已送达 · 谢谢你'}).count(),3);
 await page.getByRole('button',{name:'公共工程',exact:true}).click();assert.equal(await page.locator('.dev-card').count(),5);
 await page.getByRole('button',{name:'投入材料并完成工程',exact:true}).click();assert.equal(await page.getByRole('button',{name:'已竣工 · 奖励永久生效'}).count(),1);
 await page.screenshot({path:'test-results/development-projects.png'});
 const persistence=await page.evaluate(async()=>{const {snapshot,validate,save}=await import('/src/systems/persistence.ts');const data=JSON.parse(JSON.stringify(snapshot()));const restored=validate(data);const project=restored.town.development.projects[0];delete data.town.development;const legacy=validate(data);const fresh=legacy.town.development.total;data.town.development.reputation=-1;let rejected=false;try{validate(data);}catch{rejected=true;}save(true);return{project,fresh,rejected};});assert.deepEqual(persistence,{project:'granary',fresh:0,rejected:true});
 await page.reload();await page.waitForFunction(()=>window.worldDiagnostics);const saved=await page.evaluate(async()=>{const {useTownStore:t}=await import('/src/stores/useTownStore.ts');return t.getState().development;});assert.equal(saved.total,3);assert.deepEqual(saved.projects,['granary']);
 await page.evaluate(async()=>{const s=await import('/src/stores/index.ts');s.useUIStore.setState({panel:'village'});});await page.getByRole('button',{name:'发展',exact:true}).click();await page.getByRole('button',{name:'经营方针',exact:true}).click();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/development-mobile.png'});assert.deepEqual(errors,[]);console.log('PASS orders, civic project, reload persistence, legacy migration, invalid save rejection, mobile and runtime');
}finally{await browser.close();}
