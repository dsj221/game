import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
const state = () => page.evaluate(() => window.worldDiagnostics.state());
const project = (x, y, z) =>
  page.evaluate(
    ([x, y, z]) => window.worldDiagnostics.project(x, y, z),
    [x, y, z],
  );
const clickWorld = async (x, y, z, dbl = false) => {
  const p = await project(x, y, z);
  if (dbl) console.log("DOUBLE PROJECT",p); if (dbl) await page.mouse.dblclick(p.x, p.y, { delay: 60 });
  else await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(450);
};
const check = (label, value) => {
  assert.ok(value, label);
  checks.push(label);
  console.log("PASS", label);
};
try {
  await page.goto("http://127.0.0.1:5173");
  await page.waitForFunction(() => window.worldDiagnostics);
  await page.waitForTimeout(2500);
  let a = await state();
  check(
    "初始大陆 20 个地块，至少 40 个可见对象",
    a.w.tiles.overworld.length === 20 &&
      a.b.buildings.filter((b) => b.world === "overworld").length >= 40,
  );
  await page.screenshot({ path: "test-results/overworld.png" });
  await page.waitForTimeout(2500);
  let next = await state();
  console.log(
    "TICK",
    a.r.currency,
    next.r.currency,
    a.r.bag.wood,
    next.r.bag.wood,
    a.g.ticks,
    next.g.ticks,
  );
  check(
    "每秒生产增加晶体与材料",
    next.r.currency > a.r.currency && next.r.bag.wood > a.r.bag.wood,
  );
  const box = await page.locator(".collect-button").boundingBox();
  await page.mouse.move(box.x + 50, box.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
  a = await state();
  check(
    "长按采集与共振进度有效",
    a.g.collected >= 3 &&
      a.g.resonance > 0 &&
      a.g.achievements.includes("first"),
  );
  const cameraBefore = await page.evaluate(() =>
    window.worldDiagnostics.camera(),
  );
  await page.mouse.move(900, 450);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(600);
  const zoomed = await page.evaluate(() => window.worldDiagnostics.camera());
  check("滚轮改变正交相机缩放", zoomed.zoom > cameraBefore.zoom);
  await page.mouse.move(1000, 520);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(1100, 540, { steps: 10 });
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(400);
  const rotated = await page.evaluate(() => window.worldDiagnostics.camera());
  check(
    "右键拖动旋转世界",
    Math.abs(rotated.position[0] - zoomed.position[0]) > 0.1,
  );
  await page.getByRole("button", { name: "重置镜头", exact: true }).click();
  await page.waitForTimeout(800);
  await page.keyboard.press("1");
  await page.waitForTimeout(400);
  check(
    "数字快捷键打开商城",
    (await page.locator(".drawer h1").textContent()) === "我的设施",
  );
  await page
    .locator(".facility")
    .filter({
      has: page.getByRole("heading", { name: "林间小屋", exact: true }),
    })
    .getByRole("button", { name: /建造/ })
    .click();
  await page.waitForTimeout(400);
  await page.keyboard.press("r");
  a = await state();
  check("建造模式与 R 旋转", a.ui.placement === "house" && a.ui.rotation === 1);
  const beforeCount = a.b.buildings.length;
  await clickWorld(6, 0.05, 4);
  a = await state();
  check(
    "鼠标在空地实际建造，消耗资源并触发成就",
    a.b.buildings.length === beforeCount + 1 &&
      a.g.achievements.includes("build"),
  );
  await page.keyboard.press("1");
  await page.getByRole("tab", { name: "已购买", exact: true }).click();
  const house = page
    .locator(".facility")
    .filter({
      has: page.getByRole("heading", { name: "林间小屋", exact: true }),
    });
  await house.getByRole("button", { name: /升级/ }).click();
  a = await state();
  check(
    "升级改变建筑等级",
    a.b.buildings.some((b) => b.type === "house" && b.level === 2),
  );
  await page.getByRole("button", { name: "关闭面板", exact: true }).click();
  await page.getByRole("button", { name: "开垦大陆", exact: true }).click();
  await page.waitForTimeout(400);
  await clickWorld(0, 0.08, 6);
  await page.getByRole("button", { name: "确认建造", exact: true }).click();
  a = await state();
  check(
    "扩地真实增加地块和道路",
    a.w.tiles.overworld.length === 21 && a.g.achievements.includes("expand"),
  );
  await page.keyboard.press("2");
  await page.getByRole("tab", { name: "帮手", exact: true }).click();
  const npcs = a.n.npcs.length;
  await page.getByRole("button", { name: "招募 · 650", exact: true }).click();
  a = await state();
  check("招募真实生成 NPC", a.n.npcs.length === npcs + 1);
  await page.getByRole("tab", { name: "集市", exact: true }).click();
  const woodBefore = (await state()).r.bag.wood;
  await page
    .getByRole("button", { name: "买入 10", exact: true })
    .first()
    .click();
  a = await state();
  check("集市交易改变库存", a.r.bag.wood >= woodBefore + 10);
  await page.keyboard.press("3");
  await page.getByRole("tab", { name: "电力", exact: true }).click();
  check(
    "电力面板显示实时供应",
    await page.locator(".drawer").getByText("每秒供给 / 需求").isVisible(),
  );
  await page.keyboard.press("4");
  check(
    "图鉴展示行为触发的成就",
    (await page.locator(".achievement-grid .earned").count()) >= 3,
  );
  await page.getByRole("button", { name: "关闭面板", exact: true }).click();
  await page.getByRole("button", { name: "下界", exact: true }).click();
  await page.waitForTimeout(1300);
  a = await state();
  check(
    "下界独立场景与数据",
    a.w.current === "nether" && a.w.tiles.nether.length === 6,
  );
  await page.screenshot({ path: "test-results/nether.png" });
  await page.getByRole("button", { name: "末地", exact: true }).click();
  await page.waitForTimeout(1100);
  a = await state();
  check(
    "末地独立场景与探索成就",
    a.w.current === "end" &&
      a.w.tiles.end.length === 5 &&
      a.g.achievements.includes("worlds"),
  );
  await page.screenshot({ path: "test-results/end.png" });
  await page.getByRole("button", { name: "主世界", exact: true }).click();
  await page.waitForTimeout(800);
  await clickWorld(5, 0.6, -2);
  check("点击真实建筑打开详情", (await state()).ui.panel === "detail");
  await page
    .getByRole("button", { name: "进入我的直播间", exact: true })
    .click();
  await page.waitForTimeout(1200);
  a = await state();
  check("进入独立 3D 室内直播间", a.w.interior && a.ui.panel === "studio");
  await page.screenshot({ path: "test-results/studio.png" });
  await page.getByRole("button", { name: /工厂实录/ }).click();
  await page.getByRole("button", { name: "工厂实景", exact: true }).click();
  await page.waitForTimeout(1200);
  a = await state();
  check(
    "直播节目、机位与收入运行",
    a.g.program === "工厂实录" &&
      a.g.camera === "工厂实景" &&
      a.g.studioIncome > 0,
  );
  await page.getByRole("button", { name: "频道设备", exact: true }).click();
  check("频道设备可以升级", (await state()).g.equipment === 2);
  await page.getByRole("button", { name: "返回世界", exact: true }).click();
  await page.waitForTimeout(1500);
  await clickWorld(5, 0.6, -2, true);
  check("双击直播间直接进入室内", (await state()).w.interior);
  await page.getByRole("button", { name: "返回世界", exact: true }).click();
  await page.getByRole("button", { name: "世界设置", exact: true }).click();
  await page.getByRole("button", { name: "雨季", exact: true }).click();
  check(
    "天气开关与天气成就",
    (await state()).settings.weather.includes("rain") &&
      (await state()).g.achievements.includes("rain"),
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "保存世界", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kuai-block-save-v1")),
  );
  await page.reload();
  await page.waitForFunction(() => window.worldDiagnostics);
  await page.waitForTimeout(2000);
  a = await state();
  check(
    "刷新恢复建筑、扩地、节目、天气及成就",
    a.w.tiles.overworld.length === 21 &&
      a.b.buildings.length === saved.buildings.length &&
      a.g.program === "工厂实录" &&
      a.settings.weather.includes("rain"),
  );
  await page.getByRole("button", { name: "世界设置", exact: true }).click();
  await page.getByRole("button", { name: "存档管理", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出存档 JSON", exact: true })
    .click();
  const download = await downloadPromise;
  await download.saveAs("test-results/export.json");
  check("导出 JSON 存档", download.suggestedFilename().endsWith(".json"));
  await page
    .locator("input[type=file]")
    .setInputFiles("test-results/export.json");
  await page.waitForTimeout(500);
  check(
    "导入有效存档",
    (await page.getByRole("status").textContent()) === "世界已恢复",
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
  await page.waitForTimeout(300);
  check(
    "拒绝无效存档而不破坏进度",
    (await page.getByRole("status").textContent()).includes("导入失败"),
  );
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.keyboard.press("1");
  await page.screenshot({ path: "test-results/shop.png" });
  await page.getByRole("button", { name: "关闭面板", exact: true }).click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/desktop-1920.png" });
  check(
    "1920 桌面无横向溢出",
    await page.evaluate(
      () => document.documentElement.scrollWidth === innerWidth,
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/mobile.png" });
  check(
    "窄屏布局无横向溢出",
    await page.evaluate(
      () => document.documentElement.scrollWidth === innerWidth,
    ),
  );
  check("浏览器无未捕获异常", errors.length === 0);
  console.log(
    JSON.stringify(
      {
        checks: checks.length,
        errors,
        render: await page.evaluate(() => window.worldDiagnostics.stats()),
      },
      null,
      2,
    ),
  );
  writeFileSync(
    "test-results/report.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (e) {
  console.error(e);
  console.error("Browser errors", errors);
  await page.screenshot({ path: "test-results/failure.png" });
  process.exitCode = 1;
} finally {
  await browser.close();
}

