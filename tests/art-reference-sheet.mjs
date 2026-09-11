import {chromium} from 'playwright';
import manifest from '../public/assets/building-icons/manifest.json' with {type:'json'};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1320,height:1560}});
 await page.setContent(`<body style="margin:0;background:#e9e3d5;display:grid;grid-template-columns:repeat(6,220px);font:13px sans-serif">${manifest.icons.map(i=>`<div style="height:250px;text-align:center"><img src="http://127.0.0.1:5173/assets/building-icons/${i.file_512}" style="width:216px;height:216px;object-fit:contain"><div>${i.key}</div></div>`).join('')}</body>`);
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete));
 await page.screenshot({path:'test-results/art-reference-sheet.png',fullPage:true});
}finally{await browser.close();}
