import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader']});
const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));
const pass=(name)=>{checks.push(name);console.log('PASS',name)};
try{
await p.goto('http://127.0.0.1:5173');await p.waitForFunction(()=>window.worldDiagnostics);await p.waitForTimeout(900);
for(const width of [1920,390,1440]){await p.setViewportSize({width,height:width===390?844:900});await p.waitForTimeout(1000);const limits=await p.evaluate(()=>{const d=window.worldDiagnostics;return[d.project(-7.5,0,4.5).x,d.project(7.5,0,-7.5).x]});assert.ok(Math.min(...limits)>0&&Math.max(...limits)<width,JSON.stringify({width,limits}));pass(`${width}px 宽度下大陆自动完整取景`);await p.screenshot({path:`test-results/final-${width}.png`});}
await p.keyboard.press('1');await p.waitForTimeout(800);assert.ok(await p.locator('.drawer').isVisible());const width=await p.locator('.world-area').evaluate(e=>e.getBoundingClientRect().width);assert.ok(width<1000);pass('侧栏打开后世界可视区域缩小');await p.screenshot({path:'test-results/final-shop.png'});
await p.getByRole('button',{name:'关闭面板',exact:true}).click();await p.waitForTimeout(900);await p.mouse.move(1150,520);const camera=await p.evaluate(()=>window.worldDiagnostics.camera().position);await p.mouse.down();await p.mouse.move(1200,550,{steps:8});await p.mouse.up();await p.waitForTimeout(300);const moved=await p.evaluate(()=>window.worldDiagnostics.camera().position);assert.notDeepEqual(camera,moved);pass('左键平移改变镜头');await p.getByRole('button',{name:'重置镜头',exact:true}).click();await p.waitForTimeout(800);
await p.goto('http://127.0.0.1:4173');await p.waitForTimeout(2000);assert.equal(await p.locator('canvas').count(),1);const initial=await p.locator('[data-testid=currency]').innerText();await p.waitForTimeout(1300);assert.notEqual(await p.locator('[data-testid=currency]').innerText(),initial);assert.equal(await p.evaluate(()=>typeof window.worldDiagnostics),'undefined');pass('生产构建运行正常，收入增长且不暴露调试接口');await p.getByRole('button',{name:'下界',exact:true}).click();await p.waitForTimeout(700);assert.ok(await p.locator('.dark-world').isVisible());await p.keyboard.press('1');assert.ok(await p.locator('.drawer').isVisible());pass('生产构建世界切换与商城正常');assert.equal(errors.length,0);pass('开发与生产环境均无浏览器异常');writeFileSync('test-results/release-report.json',JSON.stringify({checks,errors},null,2));
}catch(e){await p.screenshot({path:'test-results/release-failure.png'});throw e}finally{await browser.close()}
