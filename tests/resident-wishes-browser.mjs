import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
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
    const stores = await import(storeUrl);
    const npc = stores.useNpcStore.getState().npcs[0];
    stores.useSettingsStore.setState({ speed: 0 });
    stores.useNpcStore.setState({
      selected: npc.id,
      npcs: stores.useNpcStore.getState().npcs.map((resident, index) =>
        index
          ? resident
          : {
              ...resident,
              wish: {
                id: "browser-wish",
                cause: "neighbor",
                title: "想让家门口更像一个街坊",
                story: "推开门有些空荡，我想认识隔壁的人。",
                createdDay: 1,
                deadlineDay: 4,
                solutions: [
                  "让另一座住宅与家直接相邻",
                  "让树木、花坛或公园与家直接相邻",
                ],
              },
              memories: [
                {
                  id: "memory",
                  title: "街角的面包香",
                  text: "小镇回应了我的想法。",
                  day: 1,
                  outcome: "resolved",
                  happiness: 1.25,
                },
              ],
            },
      ),
    });
    stores.useUIStore.setState({ panel: "npc" });
  });
  await page.getByRole("heading", { name: "想让家门口更像一个街坊" }).waitFor();
  assert.equal(await page.locator(".resident-wish-card li").count(), 2);
  assert.ok(
    (await page.locator(".resident-memories").innerText()).includes(
      "幸福长期影响 +1.25",
    ),
  );
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "test-results/resident-wish.png" });
  console.log(
    "PASS resident wish, alternatives and permanent memory render without browser errors",
  );
} finally {
  await browser.close();
}
