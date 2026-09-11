import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5192/');await page.waitForFunction(()=>window.worldDiagnostics);
 await page.evaluate(async()=>{
  const s=await import('/src/stores/index.ts'),{useTownStore:t}=await import('/src/stores/useTownStore.ts'),{tick}=await import('/src/game/actions.ts');
  s.useSettingsStore.setState({speed:1});
  const building=(type,x,id=type)=>({id,type,x,z:0,world:'overworld',rotation:0,level:1,born:0});
  s.useBuildingStore.setState({buildings:[building('house',-2),building('furnace',0),building('icon_stone_well',2)]});
  s.useNpcStore.setState({npcs:[]});s.useResourceStore.setState({energy:0});t.setState({minute:500});tick();s.useSettingsStore.setState({speed:0});
  s.useBuildingStore.setState({selected:'furnace'});s.useUIStore.setState({panel:'detail'});
 });
 await page.getByText('实际经营效果',{exact:true}).waitFor();assert.ok((await page.locator('.status-ribbon').innerText()).includes('缺少电力'));
 await page.screenshot({path:'test-results/operations-power.png'});
 await page.evaluate(async()=>{const s=await import('/src/stores/index.ts');s.useBuildingStore.setState({selected:'icon_stone_well'});});
 await page.getByText('覆盖 0 处农业',{exact:false}).waitFor();await page.screenshot({path:'test-results/operations-well.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/operations-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS live tick power gating, building operation details, mobile overflow, no runtime errors');
}finally{await browser.close();}
