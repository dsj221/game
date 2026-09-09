import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader']});
try {
 const page = await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://127.0.0.1:5173');
 await page.waitForFunction(()=>window.worldDiagnostics);
 await page.evaluate(async()=>{
  const stores=await import('/src/stores/index.ts');
  const {useTownStore}=await import('/src/stores/useTownStore.ts');
  stores.useSettingsStore.setState({speed:0});
  stores.useResourceStore.setState({currency:10000});
  useTownStore.setState({level:4});
 });
 await page.locator('.build-categories button').filter({hasText:'道路'}).click();
 const bridge=page.locator('.facility').filter({has:page.getByRole('heading',{name:'木栈桥',exact:true})});
 await bridge.getByRole('button',{name:/建造/}).click();
 await page.waitForTimeout(1200);
 const point=await page.evaluate(()=>window.worldDiagnostics.project(-3,.045,-2));
 await page.mouse.move(point.x,point.y);
 await page.waitForTimeout(800);
 await page.screenshot({path:'test-results/bridge-preview.png'});
 await page.mouse.click(point.x,point.y);
 await page.keyboard.press('Escape');
 await page.waitForTimeout(1200);
 assert.ok(await page.evaluate(()=>window.worldDiagnostics.state().b.buildings.some(b=>b.type==='bridge'&&b.x===-3&&b.z===-2)));
 await page.screenshot({path:'test-results/bridge-placed.png'});
 console.log('PASS bridge built with correct saved type; preview and placed screenshots captured');
} finally {await browser.close();}
