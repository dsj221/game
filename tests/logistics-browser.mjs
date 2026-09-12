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
  await page.waitForFunction(() => window.worldDiagnostics?.freight);
  await page.evaluate(async () => {
    const urls = performance.getEntriesByType("resource").map((e) => e.name),
      s = await import(
        urls.find((u) => new URL(u).pathname === "/src/stores/index.ts")
      );
    const { useTownStore: T } = await import(
      urls.find((u) => new URL(u).pathname === "/src/stores/useTownStore.ts")
    );
    const { initialTown, emptyBag } = await import("/src/data/town.ts");
    const { prepareLogistics, deposit } =
      await import("/src/systems/logistics.ts");
    const b = (id, type, x, z) => ({
      id,
      type,
      x,
      z,
      world: "overworld",
      rotation: 0,
      level: 1,
      born: 0,
    });
    const buildings = [
      b("low", "warehouse", -3, -1),
      b("high", "warehouse", -3, 1),
      b("farm", "farm", 3, -1),
      ...Array.from({ length: 6 }, (_, i) => b("road" + i, "road", i - 3, 0)),
    ];
    s.useSettingsStore.setState({ speed: 0 });
    s.useBuildingStore.setState({ buildings, selected: null, offline: [] });
    s.useNpcStore.setState({ npcs: [] });
    s.useResourceStore.setState({ bag: emptyBag(), currency: 2000 });
    const t = initialTown();
    t.minute = 500;
    prepareLogistics(
      t,
      buildings,
      emptyBag(),
      s.useWorldStore.getState().tiles,
    );
    deposit(t.logistics.stores.farm, "wheat", 16);
    T.setState(t, true);
    s.useUIStore.setState({ panel: "daily" });
    window.freightStores = { ...s, T };
  });
  const ticks = async (count) =>
    page.evaluate(async (count) => {
      const { tick } = await import("/src/game/actions.ts"),
        s = window.freightStores;
      s.useSettingsStore.setState({ speed: 1 });
      for (let i = 0; i < count; i++) tick();
      s.useSettingsStore.setState({ speed: 0 });
    }, count);
  await ticks(2);
  await page
    .getByRole("combobox", { name: "仓库 high 收货优先级" })
    .selectOption("2");
  await page
    .getByRole("combobox", { name: "仓库 low 收货优先级" })
    .selectOption("0");
  await page
    .getByText("可见货运 · 面包 / 家具 / 工具", { exact: true })
    .scrollIntoViewIfNeeded();
  assert.ok(
    (
      await page.evaluate(() => window.worldDiagnostics.freight())
    ).piles.includes("cargo-pile:farm"),
  );
  assert.equal(
    await page.evaluate(
      () => window.freightStores.useResourceStore.getState().bag.wheat,
    ),
    0,
  );
  await page.screenshot({ path: "test-results/logistics-blocked.png" });
  await page.evaluate(async () => {
    const { beginBuild, buildAt } = await import("/src/game/actions.ts");
    beginBuild("road");
    buildAt(3, 0);
  });
  let loaded = false;
  for (let i = 0; i < 20; i++) {
    await ticks(1);
    loaded = await page.evaluate(() =>
      window.freightStores.T.getState().logistics.haulers.some((h) => h.loaded),
    );
    if (loaded) break;
  }
  assert.ok(loaded);
  await page.waitForTimeout(250);
  const view = await page.evaluate(() => window.worldDiagnostics.freight());
  assert.ok(view.carriers.length > 0);
  const persisted = await page.evaluate(async () => {
    const p = await import("/src/systems/persistence.ts"),
      s = window.freightStores;
    const before = JSON.stringify(s.T.getState().logistics);
    p.save(true);
    s.T.setState({ logistics: undefined });
    p.load();
    const same = before === JSON.stringify(s.T.getState().logistics);
    const bad = p.snapshot();
    bad.town = structuredClone(bad.town);
    bad.town.logistics.haulers.find((h) => h.loaded).amount = -1;
    let rejected = false;
    try {
      p.validate(bad);
    } catch {
      rejected = true;
    }
    return same && rejected;
  });
  assert.ok(persisted);
  await ticks(3);
  await page.waitForTimeout(450);
  const moved = await page.evaluate(() => window.worldDiagnostics.freight());
  assert.ok(
    moved.carriers.some((c) => {
      const previous = view.carriers.find((p) => p.id === c.id);
      return (
        previous &&
        JSON.stringify(c.position) !== JSON.stringify(previous.position)
      );
    }),
  );
  await page.screenshot({ path: "test-results/logistics-moving.png" });
  await ticks(70);
  const stocks = await page.evaluate(
    () => window.freightStores.T.getState().logistics.stores,
  );
  assert.equal(
    (stocks.high.inside.wheat || 0) + (stocks.high.outside.wheat || 0),
    16,
  );
  assert.equal(
    (stocks.low.inside.wheat || 0) + (stocks.low.outside.wheat || 0),
    0,
  );
  assert.equal(
    await page.evaluate(
      () => window.freightStores.useResourceStore.getState().bag.wheat,
    ),
    16,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Warehouse priority UI, visible piles, road repair, moving loaded haulers, in-flight save/load and physical delivery passed.",
  );
} finally {
  await browser.close();
}
