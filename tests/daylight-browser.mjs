import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.worldDiagnostics?.lighting);
 await page.evaluate(async()=>{const {useSettingsStore:S}=await import('/src/stores/index.ts');S.setState({hour:12,cycle:false,speed:0,weather:[]});});
 await page.waitForFunction(()=>window.worldDiagnostics.lighting().intensity>2.19);
 await page.screenshot({path:'test-results/daylight-noon.png'});
 const transition=await page.evaluate(async()=>{const {useSettingsStore:S}=await import('/src/stores/index.ts');const before=window.worldDiagnostics.lighting();S.setState({hour:0});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return {before,after:window.worldDiagnostics.lighting()};});
 assert.ok(transition.after.intensity>1.3,'manual time change must not snap directly to night');
 await page.waitForFunction(()=>window.worldDiagnostics.lighting().intensity<.92);
 await page.screenshot({path:'test-results/daylight-night.png'});
 await page.evaluate(async()=>{const {useSettingsStore:S}=await import('/src/stores/index.ts');S.setState({hour:6.25});});
 await page.waitForFunction(()=>{const n=window.worldDiagnostics.lighting().intensity;return n>1.50&&n<1.60;});
 await page.screenshot({path:'test-results/daylight-dawn.png'});
 await page.evaluate(async()=>{const {useSettingsStore:S}=await import('/src/stores/index.ts');S.setState({hour:18.75,weather:['dusk']});});
 await page.waitForFunction(()=>{const n=window.worldDiagnostics.lighting().intensity;return n>1.20&&n<1.25;});
 assert.deepEqual(errors,[]);console.log('PASS continuous live lighting, manual time easing, dawn, dusk and screenshots');
}finally{await browser.close();}
