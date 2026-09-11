import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5191');await page.waitForFunction(()=>window.worldDiagnostics);
 await page.evaluate(async()=>{const s=await import('/src/stores/index.ts'),{useTownStore:t}=await import('/src/stores/useTownStore.ts');s.useSettingsStore.setState({speed:0});t.setState({level:5});s.useResourceStore.setState({currency:20000});s.useBuildingStore.setState({buildings:[{id:'a',type:'house',world:'overworld',x:0,z:0,rotation:0,level:3,born:0},{id:'b',type:'house',world:'overworld',x:2,z:0,rotation:0,level:1,born:0}]});s.useUIStore.setState({panel:'shop',tab:'已购买',category:'全部'});});
 await page.getByRole('textbox',{name:'搜索设施'}).fill('小木屋');assert.equal(await page.locator('article.facility').count(),2);
 await page.getByRole('checkbox',{name:'仅看未满级设施'}).check();assert.equal(await page.locator('article.facility').count(),1);await page.locator('article.facility .buy-button').click();
 assert.equal(await page.evaluate(()=>window.worldDiagnostics.state().b.buildings.find(b=>b.id==='b').level),2);
 await page.getByRole('tab',{name:'发现',exact:true}).click();await page.getByRole('textbox',{name:'搜索设施'}).fill('道路');await page.screenshot({path:'test-results/catalog-roads.png'});
 await page.evaluate(async()=>{const s=await import('/src/stores/index.ts');s.useUIStore.setState({panel:null});const types=['road','dirt_path','cobble_road','brick_road','boardwalk'];s.useBuildingStore.setState({buildings:types.flatMap((type,i)=>[{x:i*2-4,z:0},{x:i*2-4,z:1},{x:i*2-3,z:1}].map((p,j)=>({id:type+j,type,...p,rotation:0,level:1,born:0,world:'overworld'})))});});
 await page.waitForTimeout(500);await page.screenshot({path:'test-results/road-shapes.png'});
 await page.evaluate(async()=>{const s=await import('/src/stores/index.ts');s.useBuildingStore.setState({buildings:['orchard','tea_house','library','pottery'].map((type,i)=>({id:type,type,x:i%2*3-2,z:Math.floor(i/2)*3-2,rotation:0,level:1,born:0,footprint:[2,2],world:'overworld'}))});});await page.waitForTimeout(500);await page.screenshot({path:'test-results/catalog-new-buildings.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log('PASS individual upgrades, search, five road styles and four new models, mobile, no errors');
}finally{await browser.close();}
