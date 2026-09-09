import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.worldDiagnostics.state());
try{
 await page.goto('http://127.0.0.1:5174');await page.waitForFunction(()=>window.worldDiagnostics);await page.waitForTimeout(1000);
 await page.getByRole('button',{name:'暂停游戏',exact:true}).click();assert.equal((await state()).w.tiles.overworld.length,12);
 const before=(await state()).r.currency;await page.locator('.wish-direct').click();assert.equal((await state()).ui.placement,'house');assert.ok((await state()).ui.hover);assert.equal((await state()).r.currency,before);await page.getByRole('button',{name:'详情',exact:true}).click();await page.locator('.placement-guide summary').click();assert.ok((await page.locator('.active-guide').innerText()).includes('绿色'));
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'邻里愿望',exact:true}).click();
 assert.equal(await page.locator('.quest-chapters button').count(),5);
 const farm=page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'把希望种进田野',exact:true})});await farm.getByRole('button',{name:'前往完成'}).click();assert.equal((await state()).ui.placement,'farm');assert.equal((await state()).ui.panel,null);
 await page.evaluate(async()=>{const a=await import('/src/game/actions.ts');a.buildAt(1,1);});await page.waitForTimeout(1000);let f=(await state()).b.buildings.find(b=>b.type==='farm');assert.ok(f);
 await page.evaluate(async id=>{(await import('/src/game/actions.ts')).selectBuilding(id);},f.id);await page.waitForTimeout(500);await page.screenshot({path:'test-results/guidance-farm.png'});await page.keyboard.press('Escape');
 await page.evaluate(async()=>{const s=await import('/src/stores/index.ts'),{useTownStore:T}=await import('/src/stores/useTownStore.ts'),{makeCitizen}=await import('/src/data/settlement.ts');const houses=[[-3,-2],[-3,0]].map(([x,z],i)=>({id:'guide-home-'+i,type:'house',x,z,rotation:0,level:1,born:0,world:'overworld'}));s.useBuildingStore.setState(b=>({buildings:[...b.buildings,...houses]}));s.useNpcStore.setState(n=>({npcs:[...n.npcs,...Array.from({length:4},(_,i)=>makeCitizen('guide-person-'+i,i+2,houses[Math.floor(i/2)].id))]}));s.useSettingsStore.setState({speed:1});(await import('/src/game/actions.ts')).tick();s.useSettingsStore.setState({speed:0});});
 await page.getByRole('dialog',{name:'小镇可以升级了'}).waitFor();assert.equal((await state()).town.level,1);await page.screenshot({path:'test-results/guidance-promotion.png'});await page.getByRole('button',{name:'确认小镇升级',exact:true}).click();assert.equal((await state()).town.level,2);
 await page.getByRole('button',{name:'邻里愿望',exact:true}).click();await page.locator('.quest-chapters button').filter({hasText:'Lv.2'}).click();assert.ok((await page.locator('.drawer').innerText()).includes('面包'));
 await page.locator('.quest-chapters button').filter({hasText:'Lv.5'}).click();assert.ok(await page.getByRole('button',{name:/Lv.5解锁/}).isDisabled());await page.screenshot({path:'test-results/guidance-quests.png'});
 await page.keyboard.press('Escape');await page.evaluate(async()=>{const s=await import('/src/stores/index.ts'),a=await import('/src/game/actions.ts');s.useResourceStore.setState({currency:2000});a.beginBuild('bakery');a.buildAt(-3,2);const b=s.useBuildingStore.getState().buildings.find(b=>b.type==='bakery');a.goToQuest('first-bread');});await page.waitForTimeout(1000);await page.screenshot({path:'test-results/guidance-bakery.png'});
 await page.getByRole('button',{name:'保存世界',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.worldDiagnostics);assert.equal((await state()).town.level,2);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'邻里愿望',exact:true}).click();await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log('PASS 12x9 land, direct task navigation, guide text, 5 quest chapters, real level-ready dialog and confirmation, persistence, mobile, no runtime errors');
}catch(e){console.log(errors);await page.screenshot({path:'test-results/guidance-failure.png'});throw e;}finally{await browser.close();}
