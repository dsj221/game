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
  await page.evaluate(() =>
    window.freightStores.useUIStore.setState({ logisticsOverlay: true }),
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/logistics-routes.png" });
  await page.evaluate(() =>
    window.freightStores.useUIStore.setState({ logisticsOverlay: false }),
  );
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
  await page.evaluate(() =>
    window.freightStores.useUIStore.setState({ panel: "daily" }),
  );
  await page.getByRole("button", { name: "显示物流地图", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => window.freightStores.useUIStore.getState().logisticsOverlay,
    ),
    true,
  );
  await page
    .locator(".logistics-panel article")
    .filter({ has: page.getByLabel("仓库 high 收货优先级") })
    .getByText("逐项仓储规则", { exact: true })
    .click();
  await page.getByLabel("highwheat最低储备", { exact: true }).fill("12");
  await page.getByLabel("highwheat目标库存", { exact: true }).fill("20");
  await page.getByLabel("highwheat允许储存", { exact: true }).uncheck();
  assert.ok(
    await page.evaluate(async () => {
      const s = window.freightStores,
        p = await import("/src/systems/persistence.ts"),
        before = JSON.stringify(s.T.getState().logistics);
      p.save(true);
      s.T.setState({ logistics: undefined });
      p.load();
      return JSON.stringify(s.T.getState().logistics) === before;
    }),
  );
  assert.ok(
    await page.evaluate(async () => {
      const s = window.freightStores,
        { trade } = await import("/src/game/actions.ts");
      const before = s.useResourceStore.getState().bag.wheat;
      trade("wheat", false);
      return s.useResourceStore.getState().bag.wheat === before;
    }),
  );
  await page
    .locator(".logistics-panel article")
    .filter({ has: page.getByLabel("仓库 high 收货优先级") })
    .getByText("运力与班次", { exact: true })
    .click();
  await page.getByLabel("highporters", { exact: true }).fill("3");
  await page.getByLabel("highcarts", { exact: true }).fill("2");
  await page.getByLabel("high运输上班", { exact: true }).fill("22");
  await page.getByLabel("high运输下班", { exact: true }).fill("6");
  await page
    .getByLabel("highporters", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/transport-policy.png" });
  assert.ok(
    await page.evaluate(async () => {
      const s = window.freightStores,
        p = await import("/src/systems/persistence.ts");
      const before = JSON.stringify(
        s.T.getState().logistics.stores.high.transport,
      );
      p.save(true);
      s.T.setState({ logistics: undefined });
      p.load();
      const same =
        before ===
        JSON.stringify(s.T.getState().logistics.stores.high.transport);
      const bad = p.snapshot();
      bad.town = structuredClone(bad.town);
      bad.town.logistics.stores.high.transport.carts = 7;
      let rejected = false;
      try {
        p.validate(bad);
      } catch {
        rejected = true;
      }
      return same && rejected;
    }),
  );
  await page.locator(".chain-diagnosis").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/logistics-diagnosis.png" });
  await page.locator(".chain-diagnosis button").first().click();
  assert.equal(
    await page.evaluate(
      () => window.freightStores.useBuildingStore.getState().selected,
    ),
    "farm",
  );
  await page.evaluate(async () => {
    const s = window.freightStores,
      { initialTown } = await import("/src/data/town.ts"),
      { climateStep } = await import("/src/systems/climate.ts");
    const b = (id, type, x, z) => ({
      id,
      type,
      x,
      z,
      world: "overworld",
      level: 1,
      rotation: 0,
      born: 0,
    });
    const sites = [
      b("forecast-farm", "farm", -4, 0),
      b("forecast-wheel", "watermill", -6, 0),
    ];
    const t = initialTown();
    t.day = 21;
    t.minute = 0;
    climateStep(t, sites, s.useWorldStore.getState().tiles.overworld);
    s.useBuildingStore.setState({ buildings: sites, selected: null });
    s.T.setState(t, true);
    s.useUIStore.setState({ panel: "daily", weatherRiskOverlay: false });
  });
  await page.getByRole("button", { name: "更新影响估算", exact: true }).click();
  await page
    .getByRole("button", { name: "显示天气风险地图", exact: true })
    .click();
  const forecast = await page.evaluate(
    () => window.freightStores.useUIStore.getState().weatherImpact,
  );
  assert.equal(forecast.event, "夏季缺水");
  assert.ok(forecast.powerMin < forecast.powerNow);
  assert.ok(forecast.risks.some((r) => r.id === "forecast-farm"));
  await page.locator(".weather-impact").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/weather-impact.png" });
  await page
    .locator(".weather-impact button")
    .filter({ hasText: "缺水 ·" })
    .first()
    .click();
  assert.equal(
    await page.evaluate(
      () => window.freightStores.useBuildingStore.getState().selected,
    ),
    "forecast-farm",
  );
  await page.waitForTimeout(500);
  await page.screenshot({path:"test-results/weather-risk-map.png"});
  assert.deepEqual(errors, []);
  console.log(
    "Warehouse priority UI, visible piles, road repair, moving loaded haulers, in-flight save/load and physical delivery passed.",
  );
} finally {
  await browser.close();
}
