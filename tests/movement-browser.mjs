import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:5173");
  await page.waitForFunction(() => window.worldDiagnostics?.movement);
  await page.evaluate(async () => {
    const urls = performance.getEntriesByType("resource").map((e) => e.name);
    const stores = await import(
      urls.find((url) => new URL(url).pathname === "/src/stores/index.ts")
    );
    const { useTownStore: T } = await import(
      urls.find(
        (url) => new URL(url).pathname === "/src/stores/useTownStore.ts",
      )
    );
    stores.useSettingsStore.setState({ speed: 0 });
    stores.useBuildingStore.setState({
      buildings: [],
      selected: null,
      offline: [],
      connected: [],
    });
    stores.useNpcStore.setState({
      selected: null,
      npcs: [
        {
          id: "smooth",
          name: "测试居民",
          world: "overworld",
          modelType: "villager",
          phase: 0,
          level: 1,
          efficiency: 1,
          position: { x: 0, z: 0 },
          movementStep: 0,
          movementTrail: [],
          state: "正在前往目的地",
        },
      ],
    });
    T.setState({
      climate: {
        day: T.getState().day,
        cells: [{ x: 0, z: 0, water: 82, scar: "mud", canal: false }],
      },
    });
    window.movementStores = stores;
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const store = window.movementStores.useNpcStore;
    const npc = store.getState().npcs[0];
    store.setState({
      npcs: [
        {
          ...npc,
          position: { x: 2, z: 1 },
          movementStep: 3,
          movementTrail: [
            { x: 1, z: 0, step: 1 },
            { x: 1, z: 1, step: 2 },
            { x: 2, z: 1, step: 3 },
          ],
          arrivedAt: "destination",
        },
      ],
    });
    window.movementStores.useSettingsStore.setState({ speed: 4 });
  });
  const samples = [];
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(60);
    samples.push(
      await page.evaluate(
        () => window.worldDiagnostics.movement().citizens[0].position,
      ),
    );
  }
  assert.ok(samples.some(([x, , z]) => x > 0 && x < 1 && z === 0));
  assert.ok(samples.some(([x, , z]) => Math.abs(x - 1) < 0.12 && z > 0));
  assert.ok(
    samples.slice(1).every((point, i) => {
      const previous = samples[i];
      return Math.hypot(point[0] - previous[0], point[2] - previous[2]) < 0.4;
    }),
  );
  const view = await page.evaluate(() => window.worldDiagnostics.movement());
  assert.equal(view.citizens[0].visible, true);
  assert.ok(view.scars.some((scar) => scar.id.endsWith(":mud")));
  assert.ok(view.scars.every((scar) => scar.size[1] < 0.02));
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "test-results/smooth-movement-mud.png" });
  console.log("PASS smooth resident movement and flat mud marks");
} finally {
  await browser.close();
}
