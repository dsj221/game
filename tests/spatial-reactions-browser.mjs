import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:5173");
  await page.waitForFunction(() => window.worldDiagnostics);
  await page.evaluate(async () => {
    const storeUrl = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .find((url) => new URL(url).pathname === "/src/stores/index.ts");
    if (!storeUrl) throw new Error("active store module was not loaded");
    const {
      useBuildingStore,
      useNpcStore,
      useSettingsStore,
      useUIStore,
    } = await import(storeUrl);
    const { defs } = await import("/src/data/definitions.ts");
    const make = (type, x, z, id, rotation = 0) => ({
      id,
      type,
      x,
      z,
      world: "overworld",
      rotation,
      level: 1,
      born: 0,
      footprint: defs[type].size,
    });
    useSettingsStore.setState({ speed: 0, hour: 19.5 });
    useNpcStore.setState({ npcs: [], selected: null });
    useBuildingStore.setState({
      selected: "mill",
      offline: [],
      connected: [],
      buildings: [
        make("house", -5, -3, "home"),
        make("tree", -4, -3, "tree"),
        make("bakery", -5, 0, "bakery"),
        make("breadshop", -3, 0, "breadshop"),
        make("shop", -5, 2, "shop"),
        make("road", -4, 2, "road"),
        make("farm", 0, -2, "farm"),
        make("windmill", 2, -2, "mill"),
        make("carpenter", 0, 1, "carpenter"),
        make("market", 2, 1, "market"),
      ],
    });
    useUIStore.setState({ panel: "detail" });
  });
  await page.waitForTimeout(1200);
  const labels = await page.locator(".reaction-label").allTextContents();
  assert.ok(labels.includes("风送谷道"));
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "test-results/spatial-reactions.png" });
  await page.getByText("块间反应 · 1", { exact: true }).waitFor();
  assert.ok(
    (await page.locator(".block-reaction-summary").innerText()).includes(
      "生产效率 +12%",
    ),
  );
  console.log(
    "PASS block reactions render, selected label and management effects are visible, no browser errors",
  );
} finally {
  await browser.close();
}
