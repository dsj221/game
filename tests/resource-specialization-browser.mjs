import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:5173");
  await page.waitForFunction(() => window.worldDiagnostics);
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const storeUrl = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .find((url) => new URL(url).pathname === "/src/stores/index.ts");
    if (!storeUrl) throw new Error("active store module was not loaded");
    const stores = await import(storeUrl);
    const { emptyBag } = await import("/src/data/town.ts");
    stores.useSettingsStore.setState({ speed: 0 });
    stores.useBuildingStore.setState({
      selected: null,
      offline: [],
      connected: [],
      buildings: [
        {
          id: "upgrade-home",
          type: "house",
          x: -2,
          z: -2,
          world: "overworld",
          rotation: 0,
          level: 2,
          born: 0,
          footprint: [1, 1],
        },
      ],
    });
    stores.useResourceStore.setState({
      currency: 10000,
      bag: { ...emptyBag(), furniture: 4 },
    });
    stores.useBuildingStore.setState({ selected: "upgrade-home" });
    stores.useUIStore.setState({ panel: "detail" });
  });
  await page.waitForFunction(
    () =>
      window.worldDiagnostics.state().b.selected === "upgrade-home" &&
      window.worldDiagnostics.state().ui.panel === "detail",
  );
  const upgrade = page.getByRole("button", { name: /家具 4.*升级/ });
  await upgrade.click();
  const state = await page.evaluate(() => window.worldDiagnostics.state());
  assert.equal(state.b.buildings[0].level, 3);
  assert.equal(state.r.bag.furniture, 0);
  const migrated = await page.evaluate(async () => {
    const persistence = await import("/src/systems/persistence.ts");
    const save = persistence.snapshot();
    delete save.resources.bag.pottery;
    delete save.resources.bag.tools;
    return persistence.validate(save).resources.bag;
  });
  assert.equal(migrated.pottery, 0);
  assert.equal(migrated.tools, 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS furniture upgrade sink and pre-specialization v2 save migration",
  );
} finally {
  await browser.close();
}
