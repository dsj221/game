import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173");
await page.waitForTimeout(3500);
console.log(
  JSON.stringify({ canvas: await page.locator("canvas").count(), errors }),
);
await page.screenshot({ path: "test-results/phase.png" });
await browser.close();
if (errors.length) process.exit(1);
