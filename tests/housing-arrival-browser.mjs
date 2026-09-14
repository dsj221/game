import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});
const context = await browser.newContext();
await context.addInitScript(() => localStorage.clear());
const page = await context.newPage();

try {
  await page.goto("http://127.0.0.1:5173");
  await page.waitForFunction(() => window.worldDiagnostics);
  const result = await page.evaluate(async () => {
    const stores = await import("/src/stores/index.ts");
    const actions = await import("/src/game/actions.ts");
    stores.useSettingsStore.setState({ speed: 0 });
    const before = stores.useNpcStore.getState().npcs.length;
    actions.beginBuild("house");
    actions.buildAt(-3, -2);
    const buildings = stores.useBuildingStore.getState().buildings;
    const home = buildings.at(-1);
    const npcs = stores.useNpcStore.getState().npcs;
    const town = (await import("/src/stores/useTownStore.ts")).useTownStore.getState();
    return {
      before,
      after: npcs.length,
      homeType: home?.type,
      residentHome: npcs.at(-1)?.home,
      homeId: home?.id,
      arrivals: town.ledger.arrivals,
      toast: stores.useUIStore.getState().toast,
    };
  });
  assert.equal(result.homeType, "house");
  assert.equal(result.after, result.before + 1);
  assert.equal(result.residentHome, result.homeId);
  assert.equal(result.arrivals, 1);
  assert.match(result.toast, /搬进来了/);
  console.log("PASS new house immediately welcomes one resident", result);
} finally {
  await browser.close();
}
