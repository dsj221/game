import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=swiftshader"],
});
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
p.on("console", (msg) => console.log(msg.type(), msg.text().slice(0, 500)));
p.on("pageerror", (e) => console.log(e));
await p.goto("http://127.0.0.1:5173");
await p.waitForTimeout(3000);
console.log("BEFORE", await p.locator("body").innerText());
console.log(
  "STATE",
  await p.evaluate(async () => {
    const s = await import("/src/stores/index.ts");
    return { g: s.useGameStore.getState(), r: s.useResourceStore.getState() };
  }),
);
await p.waitForTimeout(3000);
console.log("AFTER", await p.locator("body").innerText());
console.log("HTML", await p.locator("#root").innerHTML());
await p.screenshot({ path: "test-results/inspect.png" });
await browser.close();
