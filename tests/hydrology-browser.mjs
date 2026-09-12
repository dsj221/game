import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:5173");
  await page.waitForFunction(() => window.worldDiagnostics);
  await page.evaluate(async () => {
    const urls = performance.getEntriesByType("resource").map((e) => e.name);
    const stores = await import(
      urls.find((u) => new URL(u).pathname === "/src/stores/index.ts")
    );
    const { useTownStore: T } = await import(
      urls.find((u) => new URL(u).pathname === "/src/stores/useTownStore.ts")
    );
    const { initialTown, emptyBag } = await import("/src/data/town.ts");
    const { climateStep } = await import("/src/systems/climate.ts");
    stores.useSettingsStore.setState({ speed: 0 });
    stores.useBuildingStore.setState({
      buildings: [],
      selected: null,
      offline: [],
    });
    stores.useNpcStore.setState({ npcs: [] });
    stores.useResourceStore.setState({
      currency: 5000,
      energy: 0,
      bag: { ...emptyBag(), wood: 100, stone: 100 },
    });
    let t = initialTown();
    t.level = 2;
    t.day = 3;
    climateStep(t, [], stores.useWorldStore.getState().tiles.overworld);
    T.setState(t, true);
    stores.useUIStore.setState({ panel: "daily" });
    window.hydroStores = { ...stores, T };
  });
  await page
    .getByRole("button", { name: "建蓄水闸 · 20 木材 + 30 石材" })
    .click();
  await page.getByRole("button", { name: "关闭蓄水", exact: true }).click();
  assert.equal(
    await page.evaluate(() => window.hydroStores.T.getState().hydrology.gate),
    0,
  );
  await page.getByRole("button", { name: "节水放流", exact: true }).click();
  for (const x of [-5, -4]) {
    await page
      .getByRole("button", { name: `地块 ${x},0`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "挖水渠 · 5 木材 + 5 石材" })
      .click();
  }
  assert.equal(
    await page.evaluate(
      () => window.hydroStores.useResourceStore.getState().bag.wood,
    ),
    70,
  );
  await page.getByRole("button", { name: "建造河畔水轮机 · Lv.2" }).click();
  const constructed = await page.evaluate(async () => {
    const { buildAt } = await import("/src/game/actions.ts");
    const s = window.hydroStores;
    buildAt(0, 0);
    const invalid = s.useBuildingStore.getState().buildings.length;
    buildAt(-6, 0);
    return {
      invalid,
      buildings: s.useBuildingStore.getState().buildings,
      bag: s.useResourceStore.getState().bag,
    };
  });
  assert.equal(constructed.invalid, 0);
  assert.equal(constructed.buildings[0].type, "watermill");
  assert.equal(constructed.bag.wood, 55);
  await page.evaluate(async () => {
    const { tick } = await import("/src/game/actions.ts");
    const s = window.hydroStores;
    s.useSettingsStore.setState({ speed: 1 });
    for (let i = 0; i < 100; i++) tick();
    s.useSettingsStore.setState({ speed: 0 });
    s.useUIStore.setState({ panel: "daily" });
  });
  const state = await page.evaluate(() => ({
    t: window.hydroStores.T.getState(),
    r: window.hydroStores.useResourceStore.getState(),
  }));
  assert.ok(state.r.generation > 0);
  assert.ok(state.t.climate.cells.some((c) => c.channelWater > 0));
  const persisted = await page.evaluate(async () => {
    const p = await import("/src/systems/persistence.ts");
    const save = JSON.parse(JSON.stringify(p.snapshot()));
    const valid = p.validate(save);
    p.save(true);
    window.hydroStores.T.setState({ hydrology: undefined, climate: undefined });
    p.load();
    const restored = window.hydroStores.T.getState();
    if (
      JSON.stringify(restored.hydrology) !==
        JSON.stringify(save.town.hydrology) ||
      JSON.stringify(restored.climate) !== JSON.stringify(save.town.climate)
    )
      throw new Error("Hydraulic state did not survive save/load");
    const bad = structuredClone(save);
    bad.town.hydrology.reaches[0].volume = -1;
    let rejected = false;
    try {
      p.validate(bad);
    } catch {
      rejected = true;
    }
    return {
      same:
        JSON.stringify(valid.town.hydrology) ===
        JSON.stringify(save.town.hydrology),
      rejected,
    };
  });
  assert.ok(persisted.same && persisted.rejected);
  await page
    .getByText("河道 · 蓄水与水力", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/hydrology-panel.png" });
  await page.evaluate(() => {
    window.hydroStores.useUIStore.setState({
      panel: null,
      cameraFocus: { x: -4, z: 0, nonce: Date.now() },
    });
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "test-results/hydrology-river.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Water engineering UI, gate controls, canal costs, watermill siting, live power, irrigation, save validation and scene rendering passed.",
  );
} finally {
  await browser.close();
}
