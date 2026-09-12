import { useState } from "react";
import {
  TownOverview,
  FacilityInfo,
  CitizenInfo,
  QuestPanel,
  DailySummary,
  ProductionPanel,
} from "./TownPanels";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Coins,
  Flame,
  Package,
  Plus,
  Radio,
  Route,
  TreePine,
  Users,
  X,
  Zap,
  Lock,
  Move,
  ArrowRight,
  Pickaxe,
} from "lucide-react";
import {
  useBuildingStore as B,
  useGameStore as G,
  useNpcStore as N,
  useResourceStore as R,
  useUIStore as U,
  useWorldStore as W,
} from "../stores";
import {
  playableDefinitions as definitions,
  defs,
  resourceNames,
  worlds,
  achievementDefs,
} from "../data/definitions";
import {
  beginBuild,
  panel,
  recruit,
  selectBuilding,
  studioAction,
  setProgram,
  trade,
  upgrade,
  rotateBuilding,
  priceOf,
  unlocked,
} from "../game/actions";
import { expansionPrice, upgradePrice } from "../systems/economy";
import { format } from "../utils/format";
import { Thumbnail } from "./Thumbnail";
import { ModelPreview } from "./ModelPreview";
import { getBuildingIcon } from "../data/buildingIcons";
import { npcRuntime } from "../npcs/People";
import type { BuildingDefinition, Resource } from "../types";
const labels = {
  shop: ["MAKE ROOM FOR EVERYDAY LIFE", "建造小镇"],
  village: ["MEET YOUR NEIGHBORS", "村庄"],
  industry: ["BUILT TO WORK", "工业"],
  book: ["STORIES BETWEEN BLOCKS", "街区手记"],
  detail: ["A LITTLE PART OF YOUR WORLD", "设施详情"],
  npc: ["A FAMILIAR FACE", "世界居民"],
  studio: ["YOUR LITTLE STUDIO", "频道控制台"],
  quests: ["LITTLE WISHES", "邻里愿望"],
  daily: ["A DAY IN OUR TOWN", "小镇日报"],
};
function Tabs({ items }: { items: string[] }) {
  const tab = U((s) => s.tab);
  return (
    <div className="tabs" role="tablist">
      {items.map((t, i) => (
        <button
          role="tab"
          aria-selected={tab === t || (!tab && i === 0)}
          className={tab === t || (!tab && i === 0) ? "active" : ""}
          key={t}
          onClick={() => U.setState({ tab: t })}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
function Card({
  d,
  owned = false,
  instanceId,
}: {
  d: BuildingDefinition;
  owned?: boolean;
  instanceId?: string;
}) {
  const { buildings, offline, connected } = B(),
    world = W((s) => s.current),
    currency = R((s) => s.currency),
    furnitureStock = R((s) => s.bag.furniture);
  const found = buildings.filter((b) => b.world === world && b.type === d.id),
    b = instanceId ? found.find((v) => v.id === instanceId) : found[0];
  const price = owned && b ? upgradePrice(b) : d.cost,
    furniture =
      owned && b && d.town?.capacity && b.level >= 2 ? b.level * 2 : 0;
  return (
    <article className="facility">
      <div className="facility-top">
        <div className="thumb-wrap">
          <Thumbnail type={d.id} modelType={d.modelType} />
        </div>
        <div>
          <span className="eyebrow">
            {d.category} · 占地 {d.size[0]}×{d.size[1]}{" "}
            {found.length > 0 && `· 已有 ${found.length}`}
          </span>
          <h3>{d.name}</h3>
          <span className="subtle">
            {owned && b
              ? `${b.level} / ${d.maxLevel} 级 · 坐标 ${b.x},${b.z} · ${offline.includes(b.id) ? "等待能源" : connected.includes(b.id) ? "道路已连接" : "未连接物流网络"}`
              : d.town?.capacity
                ? `可住 ${d.town.capacity} 人 · Lv.${d.town.unlock}`
                : d.town?.jobs
                  ? `${d.town.jobs} 个岗位 · Lv.${d.town.unlock} 解锁`
                  : d.power
                    ? `${d.id === "watermill" ? "水力最高" : "发电 +"}${d.power} E / 秒`
                    : d.energyCost
                      ? `用电 ${d.energyCost} E / 秒`
                      : `Lv.${d.town?.unlock || 1} · 美好日常`}
          </span>
        </div>
      </div>
      <p>{d.description}</p>
      {d.town &&
        (() => {
          const cfg = d.town;
          const chips = [];
          if (cfg.capacity) chips.push(`可住${cfg.capacity}人`);
          if (cfg.rent) chips.push(`租金${cfg.rent}/日`);
          if (cfg.happiness) chips.push(`幸福+${cfg.happiness}`);
          if (cfg.environment) chips.push(`环境+${cfg.environment}`);
          if (cfg.upkeep) chips.push(`维护${cfg.upkeep}/日`);
          if (cfg.jobs) chips.push(`${cfg.jobs}岗位·工资${cfg.wage}/日`);
          if (cfg.cycle) chips.push(`周期${cfg.cycle}s`);
          if (cfg.output)
            Object.entries(cfg.output).forEach(([r, n]) =>
              chips.push(
                `产出${n}${resourceNames[r as keyof typeof resourceNames]}`,
              ),
            );
          if (cfg.recipe)
            Object.entries(cfg.recipe).forEach(([r, n]) =>
              chips.push(
                `消耗${n}${resourceNames[r as keyof typeof resourceNames]}`,
              ),
            );
          if (cfg.sells) chips.push(`售价${cfg.price}`);
          if (cfg.wholesale) chips.push(`进货${cfg.wholesale}`);
          if (cfg.health) chips.push("提供医疗");
          return chips.length ? (
            <div className="town-chips">{chips.join(" · ")}</div>
          ) : null;
        })()}
      <div className="card-action">
        {b ? (
          <button className="text-button" onClick={() => selectBuilding(b.id)}>
            查看设施 <ArrowUpRight size={14} />
          </button>
        ) : (
          <span className="subtle">
            {d.materials
              ? Object.entries(d.materials)
                  .map(([r, n]) => `${n} ${resourceNames[r as Resource]}`)
                  .join(" · ")
              : "让大陆多一种可能"}
          </span>
        )}
        <button
          disabled={
            currency < price ||
            furnitureStock < furniture ||
            !unlocked(d.id) ||
            (owned && !!b && b.level >= d.maxLevel)
          }
          className="buy-button"
          onClick={() => (owned && b ? upgrade(b.id) : beginBuild(d.id))}
        >
          {!unlocked(d.id) ? <Lock size={13} /> : <Plus size={14} />}{" "}
          {owned && b && b.level >= d.maxLevel
            ? "已满级"
            : `${format(price)} ${owned ? "升级" : "建造"}${furniture ? ` · 家具${furniture}` : ""}`}
        </button>
      </div>
    </article>
  );
}
function Shop() {
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState("默认"),
    [upgradeOnly, setUpgradeOnly] = useState(false);
  const category = U((s) => s.category),
    setCategory = (category: string) => U.setState({ category });
  const tab = U((s) => s.tab) || "发现",
    world = W((s) => s.current),
    tiles = W((s) => s.tiles),
    buildings = B((s) => s.buildings);
  const local = buildings.filter((b) => b.world === world);
  const catalog = definitions.filter(
    (d) =>
      (d.world === "all" || d.world === world) &&
      (category === "全部" || d.category === category) &&
      `${d.name}${d.description}`.includes(query.trim()),
  );
  const ordered = [...catalog].sort((a, b) =>
    sort === "价格从低到高"
      ? a.cost - b.cost
      : sort === "名称"
        ? a.name.localeCompare(b.name, "zh-CN")
        : 0,
  );
  return (
    <>
      <Tabs items={["发现", "已购买", "扩地+"]} />
      <p className="note">
        当前世界已有 {local.length} 座设施 ·{" "}
        {local.filter((b) => b.level < defs[b.type].maxLevel).length} 座未满级
      </p>
      {tab === "扩地+" ? (
        <>
          <div className="panel-intro">
            <span className="stamp">
              <Plus size={26} />
            </span>
            <h2>给世界，多一点空间。</h2>
            <p>每一块新的土地，都是一个故事的开始。</p>
          </div>
          <div className="metric-row">
            <div>
              <b>{tiles[world].length}</b>
              <span>已开垦地块</span>
            </div>
            <div>
              <b>{tiles[world].length * 9}</b>
              <span>可用网格</span>
            </div>
          </div>
          <p className="note">
            选择大陆边缘的黄色地块，确认后新土地会缓缓升起，生成道路与树木。
          </p>
          <button
            className="primary wide"
            onClick={() => {
              U.setState({ placement: "expand", panel: null, expand: null });
            }}
          >
            开垦大陆 · {format(expansionPrice(tiles[world].length))}{" "}
            <ArrowRight size={16} />
          </button>
        </>
      ) : (
        <>
          <div className="filters">
            {[
              "全部",
              "住宅",
              "生产",
              "商业",
              "公共",
              "道路",
              "装饰",
              "进阶",
            ].map((c) => (
              <button
                className={category === c ? "active" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="list-caption">
            慢慢建造，让世界成为你的模样。<span>{worlds[world].name}</span>
          </div>
          <div className="catalog-tools">
            <input
              aria-label="搜索设施"
              placeholder="搜索名称或用途…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="商城排序"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {["默认", "价格从低到高", "名称"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {tab === "已购买" && (
            <label className="note">
              <input
                type="checkbox"
                checked={upgradeOnly}
                onChange={(e) => setUpgradeOnly(e.target.checked)}
              />{" "}
              仅看未满级设施
            </label>
          )}
          {tab === "已购买"
            ? ordered.flatMap((d) =>
                local
                  .filter(
                    (b) =>
                      b.type === d.id && (!upgradeOnly || b.level < d.maxLevel),
                  )
                  .map((b) => (
                    <Card key={b.id} d={d} owned instanceId={b.id} />
                  )),
              )
            : ordered.map((d) => <Card key={d.id} d={d} />)}
          {(!ordered.length ||
            (tab === "已购买" &&
              !local.some(
                (b) =>
                  ordered.some((d) => d.id === b.type) &&
                  (!upgradeOnly || b.level < defs[b.type].maxLevel),
              ))) && (
            <p className="note">没有符合条件的设施，请调整搜索或分类。</p>
          )}
        </>
      )}
    </>
  );
}
function Village() {
  const tab = U((s) => s.tab) || "生产",
    world = W((s) => s.current),
    npcs = N((s) => s.npcs).filter((n) => n.world === world),
    resources = R();
  return (
    <>
      <Tabs items={["生产", "建设", "居民", "帮手", "集市"]} />
      {tab === "生产" ? (
        <>
          <div className="panel-intro">
            <h2>日常，也在悄悄生长。</h2>
            <p>田野里的收获，街巷里的烟火。</p>
          </div>
          {["farm", "lumber", "mine", "shop"].map((id) => (
            <Card key={id} d={defs[id]} owned />
          ))}
        </>
      ) : tab === "建设" ? (
        ["house", "road", "bridge", "clock", "market"].map((id) => (
          <Card key={id} d={defs[id]} />
        ))
      ) : tab === "居民" || tab === "帮手" ? (
        <>
          <div className="panel-intro">
            <h2>
              {tab === "帮手" ? "小帮手，大忙碌。" : "每一个名字，都是邻居。"}
            </h2>
            <p>沿着道路来来往往，让每一份货物抵达目的地。</p>
          </div>
          <div className="metric-row">
            <div>
              <b>{npcs.length}</b>
              <span>常住居民</span>
            </div>
            <div>
              <b>{resources.bag.food > 10 ? "98" : "65"}%</b>
              <span>居民幸福度</span>
            </div>
          </div>
          {npcs
            .filter((n) => tab === "居民" || n.modelType !== "villager")
            .map((n) => (
              <button
                className="resident"
                key={n.id}
                onClick={() => {
                  N.setState({ selected: n.id });
                  panel("npc");
                }}
              >
                <span className={`portrait ${n.modelType}`}>
                  <Users size={24} />
                </span>
                <span>
                  <b>{n.name}</b>
                  <small>
                    {n.profession} · 等级 {n.level}
                  </small>
                </span>
                <span className="resident-state">
                  {npcRuntime.get(n.id)?.status || "等待出发"}
                  <ChevronRight size={16} />
                </span>
              </button>
            ))}
          <div className="facility">
            <h3>铜傀儡</h3>
            <p>巡回抱箱、分拣与代收礼物。每位帮手增加 2.5% 区域效率。</p>
            <button className="primary" onClick={() => recruit()}>
              招募 · 650
            </button>
          </div>
          <div className="facility">
            <h3>铁傀儡</h3>
            <p>可靠的重型搬运伙伴。需要 2 级时光钟楼。</p>
            <button className="primary" onClick={() => recruit("iron")}>
              招募 · 1,800
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="panel-intro">
            <h2>好东西，互通有无。</h2>
            <p>市场行情会随时间浮动，买入含 15% 交易费用。</p>
          </div>
          {(Object.keys(resourceNames) as Resource[]).map((r) => (
            <div className="trade" key={r}>
              <div>
                <b>{resourceNames[r]}</b>
                <small>
                  库存 {format(resources.bag[r])} · 单价 {priceOf(r).toFixed(1)}
                </small>
              </div>
              <button onClick={() => trade(r, false)}>出售 10</button>
              <button className="primary" onClick={() => trade(r, true)}>
                买入 10
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
}
function Industry() {
  const tab = U((s) => s.tab) || "生产",
    r = R(),
    b = B(),
    world = W((s) => s.current),
    local = b.buildings.filter((v) => v.world === world);
  return (
    <>
      <Tabs items={["生产", "电力", "自动化", "物流"]} />
      <div className="panel-intro">
        <h2>
          {tab === "电力"
            ? "风与红石，让世界转动。"
            : tab === "物流"
              ? "每一条路，都有意义。"
              : tab === "自动化"
                ? "放下双手，世界继续。"
                : "从第一台机器开始。"}
        </h2>
        <p>
          {tab === "物流"
            ? "生产建筑 → 连通道路 → 集市或仓库"
            : "机器在运转，可能性也在不断累积。"}
        </p>
      </div>
      {tab === "电力" ? (
        <>
          <div className="metric-row">
            <div>
              <b>{format(r.energy)} E</b>
              <span>储备 / 480 E</span>
            </div>
            <div>
              <b>
                +{r.generation} / −{r.consumption}
              </b>
              <span>每秒供给 / 需求</span>
            </div>
          </div>
          {b.offline.length > 0 && (
            <p className="warning">
              能源不足 · {b.offline.length} 台机器暂停运行
            </p>
          )}
          {["windmill", "generator", "torch", "core"]
            .filter(
              (id) => defs[id].world === "all" || defs[id].world === world,
            )
            .map((id) => (
              <Card key={id} d={defs[id]} />
            ))}
        </>
      ) : tab === "物流" ? (
        <>
          <div className="metric-row">
            <div>
              <b>{local.filter((v) => b.connected.includes(v.id)).length}</b>
              <span>已连接设施</span>
            </div>
            <div>
              <b>50% → 100%</b>
              <span>道路连通效率</span>
            </div>
          </div>
          <p className="note">
            道路必须通过相邻格子连到集市或仓库。孤立道路不会提高效率；未连接设施保持一半产出。
          </p>
          {["road", "bridge", "warehouse"].map((id) => (
            <Card key={id} d={defs[id]} />
          ))}
        </>
      ) : (
        <>
          {(tab === "自动化"
            ? ["slime", "drill", "generator"]
            : ["mine", "furnace", "drill", "slime"]
          ).map((id) => (
            <Card key={id} d={defs[id]} owned />
          ))}
          <button className="primary wide" onClick={() => recruit()}>
            招募自动搬运帮手 · 650
          </button>
        </>
      )}
    </>
  );
}
function Detail() {
  const [modelFor, setModelFor] = useState<string | null>(null);
  const furnitureStock = R((s) => s.bag.furniture);
  const state = B(),
    world = W((s) => s.current),
    b = state.buildings.find((v) => v.id === state.selected);
  if (!b) return <p className="note">点击世界中的建筑，查看它的故事。</p>;
  const d = defs[b.type];
  return (
    <>
      <div className="detail-art">
        {getBuildingIcon(d.id) && modelFor === b.id ? (
          <Thumbnail type={d.id} modelType={d.modelType} size={512} />
        ) : (
          <ModelPreview key={b.id} type={d.id} world={world} />
        )}
        <span>LV. {String(b.level).padStart(2, "0")}</span>
      </div>
      {getBuildingIcon(d.id) && (
        <button
          className="text-button"
          onClick={() => setModelFor(modelFor === b.id ? null : b.id)}
        >
          {modelFor === b.id ? "查看 3D 模型" : "查看原画图标"}
        </button>
      )}
      <span className="eyebrow">
        {d.category} · {worlds[world].name} · 占地{" "}
        {(b.footprint ?? [1, 1])[b.rotation % 2 ? 1 : 0]}×
        {(b.footprint ?? [1, 1])[b.rotation % 2 ? 0 : 1]}
      </span>
      <h2>{d.name}</h2>
      {!b.footprint && d.size.some((size) => size > 1) && (
        <p className="subtle">
          旧建筑保留原占地；新建同类建筑使用 {d.size[0]}×{d.size[1]} 占地。
        </p>
      )}
      <p className="description">{d.description}</p>
      <FacilityInfo key={b.id} b={b} />
      <button className="secondary wide" onClick={() => rotateBuilding(b.id)}>
        旋转建筑 · {b.rotation * 90}°
      </button>
      <button
        className="move-button"
        onClick={() =>
          U.setState({
            placement: b.type,
            moving: b.id,
            rotation: b.rotation,
            panel: null,
          })
        }
      >
        <Move size={16} /> 换个位置 <ArrowRight size={16} />
      </button>
      <button
        className="primary wide"
        disabled={
          b.level >= d.maxLevel ||
          (!!d.town?.capacity && b.level >= 2 && furnitureStock < b.level * 2)
        }
        onClick={() => upgrade(b.id)}
      >
        {b.level >= d.maxLevel
          ? "已达最高等级"
          : `${format(upgradePrice(b))} 金币${d.town?.capacity && b.level >= 2 ? `＋家具 ${b.level * 2}` : ""} · 升级`}
      </button>
      {b.type === "studio" && (
        <button
          className="secondary wide"
          onClick={() => selectBuilding(b.id, true)}
        >
          <Radio size={16} /> 进入我的直播间
        </button>
      )}
      <div className="section-title">它让这些成为可能</div>
      {(d.id === "market"
        ? ["资源交易", "我的直播间", "观众订单"]
        : d.id === "clock"
          ? ["铁傀儡 · 需要 2 级"]
          : d.id === "furnace"
            ? ["红石钻机", "史莱姆机械组"]
            : ["更高产出", "更忙碌的小世界"]
      ).map((v) => (
        <div className="unlock" key={v}>
          <span className="small-dot" />
          {v}
          <ChevronRight size={15} />
        </div>
      ))}
    </>
  );
}
function NpcDetail() {
  const n = N((s) => s.npcs.find((n) => n.id === s.selected));
  return n ? <CitizenInfo n={n} /> : null;
}
function Book() {
  const tab = U((s) => s.tab) || "全部",
    g = G(),
    buildings = B((s) => s.buildings);
  const ids = new Set(buildings.map((b) => b.type));
  return (
    <>
      <Tabs
        items={["全部", "住宅", "生产", "商业", "公共", "道路", "装饰", "进阶"]}
      />
      <div className="panel-intro">
        <h2>每一段街巷，都有自己的故事。</h2>
        <p>发现建筑、形成块间反应，并记录小镇真正发生过的改变。</p>
      </div>
      <div className="list-caption">
        已发现设施
        <span>
          {ids.size} / {definitions.length}
        </span>
      </div>
      {definitions
        .filter((d) => tab === "全部" || d.category === tab)
        .map((d) => (
          <button
            className="blueprint"
            key={d.id}
            onClick={() => {
              U.setState({ panel: "shop", tab: "发现", category: d.category });
            }}
          >
            <span className={ids.has(d.id) ? "discovered" : "undiscovered"}>
              {ids.has(d.id) ? <Check size={15} /> : <Lock size={14} />}
            </span>
            <span>
              {d.name}
              <small>
                {ids.has(d.id)
                  ? "已经成为世界的一部分"
                  : d.unlockRequirements
                    ? `建造${defs[d.unlockRequirements].name}后可解锁`
                    : "在商城建造后发现"}
              </small>
            </span>
            <ChevronRight size={15} />
          </button>
        ))}
      <div className="section-title">
        小镇印记{" "}
        <span>
          {g.achievements.length} / {achievementDefs.length}
        </span>
      </div>
      <div className="achievement-grid">
        {achievementDefs.map(([id, name, hint]) => (
          <div className={g.achievements.includes(id) ? "earned" : ""} key={id}>
            <span>
              {g.achievements.includes(id) ? (
                <Check size={17} />
              ) : (
                <Lock size={15} />
              )}
            </span>
            <b>{name}</b>
            <small>{hint}</small>
          </div>
        ))}
      </div>
    </>
  );
}
function StudioPanel() {
  const tab = U((s) => s.tab) || "节目",
    g = G();
  return (
    <>
      <Tabs items={["节目", "观众", "订单"]} />
      <div className="broadcast">
        <span>
          <i />{" "}
          {g.studioIncome > 0 ? "正在直播的世界" : "直播待机 · 等待员工到岗"}
        </span>
        <h2>{format(g.viewers)}</h2>
        <small>正在观看 · {worlds[W.getState().current].name}</small>
        <div>
          频道收入 <b>+{format(g.studioIncome)} / 秒</b>
        </div>
      </div>
      {tab === "节目" ? (
        <>
          <div className="section-title">选择节目</div>
          {["田园时光", "工厂实录"].map((p, i) => (
            <button
              className={`program ${g.program === p ? "active" : ""}`}
              key={p}
              onClick={() => setProgram(p)}
            >
              {i === 0 ? (
                <TreePine size={21} />
              ) : i === 1 ? (
                <Flame size={21} />
              ) : (
                <Radio size={21} />
              )}
              <span>
                <b>{p}</b>
                <small>
                  {["主世界观众增长加成", "频道直播收入提高 10%"][i]}
                </small>
              </span>
              {g.program === p && <Check size={17} />}
            </button>
          ))}
          <div className="section-title">拍摄机位</div>
          <div className="camera-grid">
            {[
              "演播室现场",
              "麦田的风",
              "工厂实景",
              "矿车追踪",
              "动物上班日记",
              "烈焰工业",
            ].map((c) => (
              <button
                className={g.camera === c ? "active" : ""}
                key={c}
                onClick={() => G.setState({ camera: c })}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="note">
            外景机位增加 250 观众上限；提升频道设备可增加收入和观众容量。
          </p>
        </>
      ) : tab === "观众" ? (
        <>
          <div className="metric-row">
            <div>
              <b>{g.equipment}</b>
              <span>设备等级</span>
            </div>
            <div>
              <b>{g.gifts}</b>
              <span>待领取礼物</span>
            </div>
          </div>
          <button className="primary wide" onClick={() => studioAction("收礼")}>
            收礼 · {g.gifts * 40} 金币
          </button>
          <p className="note">
            员工到岗、工作时段开播，每15个经营Tick收到一份礼物。节目适合直播间所在世界时观众增长更快。
          </p>
        </>
      ) : (
        <div className="facility">
          <span className="eyebrow">观众的委托 · 已完成 {g.orders} 单</span>
          <h3>一份田园伴手礼</h3>
          <p>准备 30 份食物、20 份木材，寄给屏幕另一端的朋友。</p>
          <button className="primary wide" onClick={() => studioAction("订单")}>
            交付订单 · 获得 500 金币
          </button>
        </div>
      )}
    </>
  );
}
export default function Drawer() {
  const { panel: active } = U();
  return (
    <AnimatePresence>
      {active && (
        <motion.aside
          className="drawer"
          initial={{ opacity: 0, x: 35 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 35 }}
          transition={{ duration: 0.28 }}
        >
          <header className="drawer-header">
            <div>
              <h1>{labels[active][1]}</h1>
            </div>
            <button
              className="icon-button"
              aria-label="关闭面板"
              onClick={() => panel(null)}
            >
              <X size={20} />
            </button>
          </header>
          <div className="drawer-body" key={active}>
            {active === "shop" ? (
              <Shop />
            ) : active === "village" ? (
              <TownOverview />
            ) : active === "industry" ? (
              <ProductionPanel />
            ) : active === "detail" ? (
              <Detail />
            ) : active === "book" ? (
              <Book />
            ) : active === "npc" ? (
              <NpcDetail />
            ) : active === "quests" ? (
              <QuestPanel />
            ) : active === "daily" ? (
              <DailySummary />
            ) : (
              <StudioPanel />
            )}
          </div>
          <footer className="drawer-footer">
            <span className="small-dot" /> 世界正在生长{" "}
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
