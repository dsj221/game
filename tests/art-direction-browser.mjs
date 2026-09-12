import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(process.env.TEST_GAME_URL||'http://127.0.0.1:5173/');
  await page.waitForFunction(()=>window.worldDiagnostics);
  await page.evaluate(async()=>{
    const s=await import('/src/stores/index.ts'),{useTownStore:T}=await import('/src/stores/useTownStore.ts');
    const {emptyFacility}=await import('/src/data/town.ts');
    const types=['house','warehouse','farm','windmill','bakery','shop','icon_workshop_stall','library','park','icon_village_gate'];
    s.useSettingsStore.setState({speed:0,hour:12});s.useUIStore.setState({panel:null});
    s.useBuildingStore.setState({buildings:types.map((type,i)=>({id:type,type,x:(i%5)*2-5,z:Math.floor(i/5)*3-2,world:'overworld',rotation:0,level:1,born:0})),selected:'bakery'});
    T.setState({day:1,facilities:Object.fromEntries(types.map(type=>[type,{...emptyFacility(),status:type==='shop'?'营业中':'生产中'}])),development:{boardDay:1,delivered:[],total:10,reputation:70,projects:['granary','craft','civic','garden','fair'],policy:'balanced',policyDay:0}});
  });
  for(const [day,name] of [[1,'spring'],[8,'summer'],[15,'autumn'],[22,'winter']]) {
    await page.evaluate(async day=>{(await import('/src/stores/useTownStore.ts')).useTownStore.setState({day});},day);
    await page.waitForTimeout(500);
    await page.screenshot({path:`test-results/art-${name}.png`});
  }
  assert.equal(await page.locator('.world-tooltip').count(),1);
  assert.match(await page.locator('.world-tooltip').innerText(),/生产中.*今日净额/s);
  const completed=await page.evaluate(()=>window.worldDiagnostics.art());
  assert.equal(completed.landmarks.length,5);
  assert.equal(completed.smoke,1);
  await page.evaluate(async()=>{
    const {useTownStore:T}=await import('/src/stores/useTownStore.ts');
    T.setState(s=>({facilities:Object.fromEntries(Object.entries(s.facilities).map(([id,f])=>[id,{...f,status:'休息中'}]))}));
  });
  await page.waitForFunction(()=>window.worldDiagnostics.art().awnings.every(s=>s<.15));
  assert.equal((await page.evaluate(()=>window.worldDiagnostics.art())).smoke,0);
  await page.evaluate(async()=>{
    const {useTownStore:T}=await import('/src/stores/useTownStore.ts');
    T.setState({development:{boardDay:1,delivered:[],total:0,reputation:0,projects:[],policy:'balanced',policyDay:0}});
  });
  await page.waitForFunction(()=>window.worldDiagnostics.art().landmarks.length===0);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/art-mobile.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS four seasons, five civic landmarks, idle smoke/awning transitions, production label, shader compilation, mobile layout');
} finally {await browser.close();}
