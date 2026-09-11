import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.MODEL_TEST_URL ?? "http://127.0.0.1:5176");
  await page.waitForFunction(() => window.worldDiagnostics);
  await page.waitForTimeout(900);
  await page.evaluate(async () => {
    const s = await import("/src/stores/index.ts");
    s.useSettingsStore.setState({ speed: 0, hour: 12 });
  });
  await page.screenshot({ path: "test-results/models-initial.png" });
  const count = await page.evaluate(async () => {
    const { definitions } = await import("/src/data/definitions.ts");
    const { getModelGeometry } =
      await import("/src/buildings/modelGeometry.ts");
    return definitions.filter(
      (d) => getModelGeometry(d.id).solid.getAttribute("position").count > 0,
    ).length;
  });
  assert.equal(count, 60);
  // Render every model in the real scene, in manageable groups at its real footprint.
  for (let batch = 0; batch < 5; batch++) {
    await page.evaluate(async (batch) => {
      const s = await import("/src/stores/index.ts");
      const { definitions } = await import("/src/data/definitions.ts");
      s.useNpcStore.setState({ npcs: [] });
      s.useUIStore.setState({ panel: null, placement: null });
      s.useWorldStore.setState({
        current: "overworld",
        tiles: {
          overworld: Array.from({ length: 42 }, (_, i) => ({
            x: (i % 7) - 3,
            z: Math.floor(i / 7) - 3,
            born: 0,
          })),
          nether: [],
          end: [],
        },
      });
      s.useBuildingStore.setState({
        selected: null,
        buildings: definitions
          .slice(batch * 12, batch * 12 + 12)
          .map((d, i) => ({
            id: d.id,
            type: d.id,
            x: (i % 4) * 4 - 6,
            z: Math.floor(i / 4) * 4 - 5,
            world: "overworld",
            rotation: 0,
            level: 1,
            born: 0,
            footprint: d.size,
          })),
      });
    }, batch);
    await page.waitForTimeout(650);
    await page.screenshot({
      path: `test-results/models-catalog-${batch + 1}.png`,
    });
  }
  await page.evaluate(async () => {
    const s = await import("/src/stores/index.ts");
    s.useBuildingStore.setState({
      buildings: [
        {
          id: "rotation-test",
          type: "bakery",
          x: 0,
          z: 0,
          world: "overworld",
          rotation: 0,
          level: 1,
          born: 0,
          footprint: [2, 1],
        },
      ],
    });
  });
  await page.waitForFunction(
    () =>
      window.worldDiagnostics.models().some((m) => m.type === "bakery") &&
      !window.worldDiagnostics.models().some((m) => m.type === "school"),
  );
  await page.waitForTimeout(1000);
  const p = await page.evaluate(() =>
    window.worldDiagnostics.project(0.5, 0.35, 0.1),
  );
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(
    () => window.worldDiagnostics.state().b.selected === "rotation-test",
  );
  assert.equal(
    await page.evaluate(() => window.worldDiagnostics.state().b.selected),
    "rotation-test",
    "3D mesh selection",
  );
  const size = await page.evaluate(
    () =>
      window.worldDiagnostics.models().find((m) => m.type === "bakery").size,
  );
  await page.evaluate(async () => {
    const a = await import("/src/game/actions.ts");
    a.rotateBuilding("rotation-test");
  });
  await page.waitForFunction(
    () => window.worldDiagnostics.state().b.buildings[0].rotation === 1,
  );
  await page.waitForTimeout(500);
  const turned = await page.evaluate(
    () =>
      window.worldDiagnostics.models().find((m) => m.type === "bakery").size,
  );
  assert.ok(
    Math.abs(size[0] - turned[2]) < 0.01 &&
      Math.abs(size[2] - turned[0]) < 0.01,
    "rotation swaps real mesh bounds",
  );
  await page.evaluate(async () => {
    const a = await import("/src/game/actions.ts");
    const s = await import("/src/stores/index.ts");
    const {useTownStore} = await import("/src/stores/useTownStore.ts");
    useTownStore.setState({level:5});
    s.useResourceStore.setState({currency:10000});
    a.beginBuild("bakery");
    s.useUIStore.setState({ hover: [-2, 0], rotation: 1 });
  });
  await page.getByRole("toolbar", { name: "建造操作" }).waitFor();
  await page.screenshot({ path: "test-results/models-placement.png" });
  assert.equal(
    await page.getByRole("toolbar", { name: "建造操作" }).count(),
    1,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/models-mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS 60 real geometry models, all catalog batches rendered, mesh picking, rotated placement, mobile, no runtime errors",
  );
} finally {
  await browser.close();
}
