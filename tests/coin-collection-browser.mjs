import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_GAME_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.worldDiagnostics);
 const result=await page.evaluate(async()=>{
  const {useSettingsStore:S,useGameStore:G,useResourceStore:R}=await import('/src/stores/index.ts');const {collect}=await import('/src/game/actions.ts');const {useTownStore:T}=await import('/src/stores/useTownStore.ts');const {initialTown}=await import('/src/data/town.ts');
  S.setState({speed:1});G.setState({collected:0,forestGifts:0,resonance:0,totalEarned:0});R.setState({currency:1000});T.setState(initialTown());const wood=R.getState().bag.wood;
  for(let i=0;i<19;i++)collect();const before={coins:R.getState().currency,gifts:G.getState().forestGifts};collect();const boundary={coins:R.getState().currency,gifts:G.getState().forestGifts};collect();const after=R.getState().currency;
  for(let i=0;i<20;i++)collect();S.setState({speed:0});const final=R.getState().currency;collect();
  return {before,boundary,after,final,paused:R.getState().currency,gifts:G.getState().forestGifts,woodDelta:R.getState().bag.wood-wood,ledger:T.getState().ledger.revenue,earned:G.getState().totalEarned};
 });
 assert.deepEqual(result,{before:{coins:1019,gifts:0},boundary:{coins:1020,gifts:1},after:1022,final:1063,paused:1063,gifts:2,woodDelta:0,ledger:63,earned:63});
 await page.getByRole('button',{name:/获取金币.*\+3 金币/}).waitFor();
 const legacy=await page.evaluate(async()=>{const {snapshot,validate,save}=await import('/src/systems/persistence.ts');const data=JSON.parse(JSON.stringify(snapshot()));delete data.game.forestGifts;data.game.collected=60;const restored=validate(data);save(true);return restored.game.forestGifts;});assert.equal(legacy,3);
 await page.reload();await page.getByRole('button',{name:/获取金币.*\+3 金币/}).waitFor();assert.deepEqual(errors,[]);console.log('PASS coin rewards, gift thresholds, no wood rewards, ledger, pause, legacy migration and reload');
}finally{await browser.close();}
