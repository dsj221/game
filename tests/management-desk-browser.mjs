import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5190');await page.waitForFunction(()=>window.worldDiagnostics);
 await page.evaluate(async()=>{
  const s=await import('/src/stores/index.ts'),{useTownStore:t}=await import('/src/stores/useTownStore.ts'),{emptyFacility,emptyLedger}=await import('/src/data/town.ts');
  s.useSettingsStore.setState({speed:0});s.useBuildingStore.setState({buildings:[...s.useBuildingStore.getState().buildings,{id:'mill-issue',type:'windmill',x:1,z:0,footprint:[2,2],rotation:1,level:1,born:0,world:'overworld'}]});
  t.setState({day:8,facilities:{'mill-issue':{...emptyFacility(),status:'缺少原料'}},reports:Array.from({length:7},(_,i)=>({...emptyLedger(),day:7-i,profit:i%2?-12:25,revenue:i%2?0:25,wages:i%2?12:0,population:2,happiness:78}))});
  s.useUIStore.setState({panel:'village'});
 });
 await page.getByRole('region',{name:'经营诊断'}).waitFor();assert.equal(await page.getByRole('region',{name:'实时产业链'}).count(),1);
 await page.screenshot({path:'test-results/management-desk.png'});
 await page.locator('.desk-advice').filter({hasText:'缺少原料'}).click();await page.waitForFunction(()=>window.worldDiagnostics.state().b.selected==='mill-issue');
 const focus=await page.evaluate(()=>window.worldDiagnostics.state().ui.cameraFocus);assert.equal(focus.x,1.5);assert.equal(focus.z,.5);
 await page.getByRole('button',{name:'查看经营日报'}).click();await page.getByRole('button',{name:'第 3 天',exact:true}).click();await page.getByRole('heading',{name:'第 3 天 · 块间日报'}).waitFor();
 assert.equal(await page.locator('.report-trend button').count(),7);await page.screenshot({path:'test-results/management-history.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'test-results/management-history-mobile.png'});assert.deepEqual(errors,[]);console.log('PASS diagnostic action, chain, footprint camera focus, seven day history, mobile, no runtime errors');
}finally{await browser.close();}
