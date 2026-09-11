import { useState } from "react";
import {
  ArrowRight,
  Check,
  Coins,
  Heart,
  Home,
  Leaf,
  Lock,
  Pause,
  Play,
  Smile,
  Users,
  Wheat,
  Trash2,
  ShoppingBag,
} from "lucide-react";
import { useTownStore as T } from "../stores/useTownStore";
import {
  useBuildingStore as B,
  useNpcStore as N,
  useResourceStore as R,
  useUIStore as U,
  useWorldStore as W,
} from "../stores";
import { defs, resourceNames, definitions } from "../data/definitions";
import { quests, townLevels, emptyFacility } from "../data/town";
import { questProgress, capacity, slots } from "../game/TownSimulation";
import {
  beginBuild,
  goToQuest,
  claimQuest,
  panel,
  removeBuilding,
  selectBuilding,
  setPrice,
  toggleBusiness,
  unlocked,
  trade,
  priceOf,
} from "../game/actions";
import { format } from "../utils/format";
import {TownProgress} from './TownPromotion';
import {ManagementDesk,LiveChains} from './ManagementDesk';
import {DevelopmentPanel} from './DevelopmentPanel';
import {developmentBonuses} from '../systems/development';
import type { Building, Npc, Resource } from "../types";
export const coreResources: Resource[] = [
  "wood",
  "food",
  "wheat",
  "flour",
  "bread",
  "furniture",
  "stone",
];
export function TownOverview() {
  const t = T(),
    n = N((s) => s.npcs),
    b = B((s) => s.buildings),
    [tab, setTab] = useState("经营");
  const m = t.metrics;
  return (
    <>
      <div className="tabs">
        {["经营", "发展", "居民", "供需", "就业", "集市"].map((v) => (
          <button
            className={tab === v ? "active" : ""}
            key={v}
            onClick={() => setTab(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="town-postcard" hidden={tab==='发展'}>
        <span className="eyebrow">A PLACE TO CALL HOME</span>
        <h2>{townLevels[t.level - 1].name}</h2>
        <p>{m.growthReason}</p>
        <div className="town-stat-grid">
          <div>
            <b>
              {m.population} / {m.capacity}
            </b>
            <small>邻居 / 住房容量</small>
          </div>
          <div>
            <b>{Math.round(m.happiness)}%</b>
            <small>居民幸福度</small>
          </div>
          <div>
            <b>+{m.expected}</b>
            <small>预计入住</small>
          </div>
          <div>
            <b>
              {m.employed} / {m.jobs}
            </b>
            <small>在岗 / 工作岗位</small>
          </div>
        </div>
      </div>
      {tab === "发展" ? <DevelopmentPanel onMarket={()=>setTab('集市')}/> : tab === "经营" ? <><button className="dev-entry" onClick={()=>setTab('发展')}><span>小镇来信 · 城镇发展<small>每日3份委托 · 五章公共工程 · 经营方针</small></span><ArrowRight size={18}/></button><ManagementDesk onNavigate={setTab}/><LiveChains/></> : tab === "居民" ? (
        <>
          {n
            .filter((p) => p.modelType === "villager" && p.world === 'overworld')
            .map((p) => (
              <button
                className="resident"
                key={p.id}
                onClick={() => {
                  N.setState({ selected: p.id });
                  panel("npc");
                }}
              >
                <span className="portrait">
                  <Users size={24} />
                </span>
                <span>
                  <b>
                    {p.name} · {p.age} 岁
                  </b>
                  <small>
                    {p.profession} · {p.family}
                  </small>
                </span>
                <span className="resident-state">
                  {p.state}
                  <Heart size={13} />
                  {Math.round(p.happiness || 0)}
                </span>
              </button>
            ))}
          <button className="primary wide" onClick={() => beginBuild("house")}>
            <Home size={16} /> 为新邻居建一个家
          </button>
        </>
      ) : tab === "供需" ? (
        <>
          <div className="metric-row">
            <div>
              <b>{m.foodSupply.toFixed(1)}</b>
              <span>估算食品 / 天</span>
            </div>
            <div>
              <b>{m.foodDemand}</b>
              <span>居民需求 / 天</span>
            </div>
          </div>
          <div className={`supply-note ${m.foodDays < 0.5 ? "shortage" : ""}`}>
            <Wheat size={22} />
            <span>
              <b>{m.foodDays < 0.5 ? "食品供应不足" : "餐桌上的安心"}</b>
              <small>
                仓库与店铺食品可支持约 {m.foodDays.toFixed(1)} 天。
              </small>
            </span>
          </div>
          <p className="note">
            供应估算考虑员工与工作时段。缺原料、道路不通和暴雨会进一步降低实际产量。
          </p>
          <div className="chain-diagram">
            <button onClick={() => beginBuild("farm")}>
              农田<small>小麦 + 食物</small>
            </button>
            <ArrowRight size={15} />
            <button onClick={() => beginBuild("windmill")}>
              磨坊<small>小麦 → 面粉</small>
            </button>
            <ArrowRight size={15} />
            <button onClick={() => beginBuild("bakery")}>
              面包房<small>面粉 → 面包</small>
            </button>
          </div>
          <button className="secondary wide" onClick={() => setTab("集市")}>
            临时购买食物
          </button>
        </>
      ) : tab === "就业" ? (
        <>
          <div className="metric-row">
            <div>
              <b>{m.unemployment.toFixed(0)}%</b>
              <span>失业率</span>
            </div>
            <div>
              <b>{Math.round(m.attraction)}</b>
              <span>人口吸引力 / 100</span>
            </div>
          </div>
          <p className="note">
            居民自动寻找空缺岗位。员工不足会降低效率；暂停营业会释放岗位，并停止工资和维护支出。
          </p>
          {b
            .filter((v) => slots(v) > 0 && v.world === 'overworld')
            .map((v) => (
              <button
                className="resident"
                key={v.id}
                onClick={() => selectBuilding(v.id)}
              >
                <span>
                  <b>{defs[v.type].name}</b>
                  <small>{t.facilities[v.id]?.status || "等待上班"}</small>
                </span>
                <span className="resident-state">
                  {t.facilities[v.id]?.staff || 0} / {slots(v)} 位员工{" "}
                  <ArrowRight size={14} />
                </span>
              </button>
            ))}
        </>
      ) : (
        <TradeList />
      )}
    </>
  );
}
export function TradeList() {
  const r = R();
  T((s) => s.minute);
  return (
    <>
      {coreResources.map((key) => (
        <div className="trade" key={key}>
          <div>
            <b>{resourceNames[key]}</b>
            <small>
              库存 {format(r.bag[key])} · 单价 {priceOf(key).toFixed(1)}
            </small>
          </div>
          <button disabled={r.bag[key] < 10} onClick={() => trade(key, false)}>
            出售 10
          </button>
          <button onClick={() => trade(key, true)}>买入 10</button>
        </div>
      ))}
      <p className="note">
        集市是应急进货渠道。店铺自动采购使用更低的本地批发价；居民消费创造日常营业额。
      </p>
    </>
  );
}
export function CitizenInfo({ n }: { n: Npc }) {
  const development=T(s=>s.development),bonuses=developmentBonuses(development);
  const npcs=N(s=>s.npcs),offline=B(s=>s.offline);
  const buildings = B((s) => s.buildings),
    home = buildings.find((b) => b.id === n.home),
    work = buildings.find((b) => b.id === n.workplace);
  return (
    <>
      <div className="citizen-header">
        <span className="portrait large">
          <Users size={38} />
        </span>
        <div>
          <h2>{n.name}</h2>
          <p>
            {n.age || 24} 岁 · {n.family || "新居民"}
          </p>
        </div>
      </div>
      <blockquote>“{n.recent || "很高兴来到这里。"}”</blockquote>
      <div className="production-lines">{Object.entries(happinessFactors(n,buildings,defs,operationalIds(buildings,npcs,defs,offline),bonuses.happiness)).map(([name,value])=><span key={name}>{name}<b>{value>=0?'+':''}{value.toFixed(1)}</b></span>)}</div>
      <div className="town-stat-grid">
        <div>
          <b>{Math.round(n.happiness || 0)}%</b>
          <small>幸福度</small>
        </div>
        <div>
          <b>{Math.round(n.health || 0)}%</b>
          <small>健康</small>
        </div>
      </div>
      <div className="production-lines">
        {[
          ["职业", n.profession],
          ["住所", home ? defs[home.type].name : "正在寻找住所"],
          ["工作", work ? defs[work.type].name : "暂未就业"],
          ["岗位工资", `${((n.income || 0)*bonuses.wages).toFixed(1)} 金币 / 天`],
          ["家庭汇款", "24 金币 / 天（居民钱包）"],
          ["随身钱包", `${(n.wallet || 0).toFixed(1)} 金币`],
          ["现在", n.state || "邻里散步"],
          ["喜欢", (n.likes || ["散步"]).join("、")],
        ].map(([a, v]) => (
          <span key={a}>
            {a}
            <b>{v}</b>
          </span>
        ))}
      </div>
      <div className="section-title">
        生活需求 <span>越满，越希望被满足</span>
      </div>
      {Object.entries(n.needs || {}).map(([key, value]) => (
        <div className="need-row" key={key}>
          <span>{{ food: "食品", fun: "休闲", shopping: "购物" }[key]}</span>
          <div>
            <i
              style={{
                width: `${value}%`,
                background: value > 65 ? "#bd9173" : "#91ad80",
              }}
            />
          </div>
          <b>{Math.round(value)}</b>
        </div>
      ))}
      {home && (
        <button
          className="secondary wide"
          onClick={() => selectBuilding(home.id)}
        >
          去看看这位邻居的家 <ArrowRight size={14} />
        </button>
      )}
    </>
  );
}
export function FacilityInfo({ b }: { b: Building }) {
  const allBuildings=B(s=>s.buildings);
  const offline=B(s=>s.offline);
  const t = T(),
    n = N((s) => s.npcs),
    resources = R(),
    [confirm, setConfirm] = useState(false),
    c = defs[b.type].town,
    f = t.facilities[b.id] || emptyFacility();
  if (!c) return null;
  const bonuses=developmentBonuses(t.development);
  const residents = n.filter((n) => n.home === b.id),
    workers = n.filter((n) => n.workplace === b.id);
  return (
    <>
      <div
        className={`status-ribbon ${["缺少原料", "员工不足", "等待补货", "缺少电力"].includes(f.status) ? "shortage" : ""}`}
      >
        <span className="small-dot" />
        {b.paused ? "已暂停营业" : f.status}
        {c.jobs > 0 && (
          <span>
            {workers.length} / {slots(b)} 已分配 · {workers.filter(n=>n.arrivedAt===b.id).length} 人到岗
          </span>
        )}
      </div>
      <OperatingEffects building={b} />
      {c.jobs>0&&<WorkSchedule id={b.id} facility={f} shop={!!c.sells}/>}
      {c.capacity ? (
        <>
          <div className="production-lines">{residents[0]&&Object.entries(happinessFactors(residents[0],allBuildings,defs,operationalIds(allBuildings,n,defs,offline),bonuses.happiness)).map(([name,value])=><span key={name}>{name}<b>{value>=0?'+':''}{value.toFixed(1)}</b></span>)}</div>
          <div className="town-stat-grid">
            <div>
              <b>
                {residents.length} / {capacity(b)}
              </b>
              <small>入住 / 可住人数</small>
            </div>
            <div>
              <b>{f.dailyRevenue.toFixed(1)}</b>
              <small>今日实收租金</small>
            </div>
          </div>
          <p className="note">
            租金只向已经入住、钱包有余额的居民收取。升级住宅会增加人口容量。
          </p>
          {residents.map((p) => (
            <button
              className="resident"
              key={p.id}
              onClick={() => {
                N.setState({ selected: p.id });
                panel("npc");
              }}
            >
              <span>{p.name}</span>
              <span className="resident-state">
                <Heart size={13} />
                {Math.round(p.happiness || 0)}% <ArrowRight size={13} />
              </span>
            </button>
          ))}
        </>
      ) : c.sells ? (
        <>
          <div className="town-stat-grid">
            <div>
              <b>{f.stock.toFixed(0)}</b>
              <small>
                店内{resourceNames[c.sells]} / {12 * b.level}
              </small>
            </div>
            <div>
              <b>{f.dailyCustomers}</b>
              <small>今日客流</small>
            </div>
            <div>
              <b>{f.dailyRevenue.toFixed(1)}</b>
              <small>今日营业额</small>
            </div>
            <div>
              <b>{f.dailyCosts.toFixed(1)}</b>
              <small>进货、工资与维护</small>
            </div>
          </div>
          <div className="profit-line">
            今日净利润{" "}
            <b className={f.dailyRevenue < f.dailyCosts ? "loss" : ""}>
              {(f.dailyRevenue - f.dailyCosts).toFixed(1)} 金币
            </b>
          </div>
          <label className="setting-row">
            售价系数 <b>{Math.round(f.priceFactor * 100)}%</b>
          </label>
          <input
            aria-label="售价系数"
            type="range"
            className="wide"
            min=".7"
            max="1.8"
            step=".1"
            value={f.priceFactor}
            onChange={(e) => setPrice(b.id, Number(e.target.value))}
          />
          <p className="note">
            基础售价 {c.price} 金币，批发采购 {c.wholesale} 金币 / 份。超过 150%
            的售价会让居民望而却步。评分 {(f.satisfaction / 20).toFixed(1)} /
            5。
          </p>
        </>
      ) : c.output ? (
        <>
          <div className="recipe-card">
            <span className="eyebrow">FROM THE FIELD TO YOUR TABLE</span>
            <h3>
              {c.recipe
                ? Object.entries(c.recipe)
                    .map(([r, v]) => `${resourceNames[r as Resource]} ×${v}`)
                    .join(" + ")
                : "自然资源"}{" "}
              <ArrowRight size={16} />{" "}
              {Object.entries(c.output)
                .map(
                  ([r, v]) => `${resourceNames[r as Resource]} ×${Number((v * b.level * (['food','wheat'].includes(r)?bonuses.food:1)).toFixed(1))}`,
                )
                .join(" + ")}
            </h3>
            <div className="production-progress">
              <i style={{ width: `${f.progress * 100}%` }} />
            </div>
            <small>
              {Math.round(f.progress * 100)}% · 基础周期 {c.cycle} 秒 · 当前效率{" "}
              {Math.round(f.efficiency * 100)}%
            </small>
          </div>
          {Object.entries(c.recipe || {}).map(([r, v]) => (
            <div className="production-lines" key={r}>
              <span>
                {resourceNames[r as Resource]}
                <b>
                  {resources.bag[r as Resource].toFixed(0)} / 需要 {v}
                </b>
              </span>
            </div>
          ))}
          <p className="note">
            工作时间
            以员工排班为准。缺原料时进度暂停，补货后继续；下班后员工自由活动。
          </p>
        </>
      ) : (
        <div className="town-stat-grid">
          <div>
            <b>{f.dailyCosts.toFixed(1)}</b>
            <small>今日实际经营成本</small>
          </div>
          <div>
            <b>+{b.paused?0:(c.environment || 0)*b.level}</b>
            <small>环境评分（主世界统计）</small>
          </div>
        </div>
      )}
      {c.jobs > 0 && (
        <>
          <div className="section-title">在这里工作的人</div>
          {workers.map((p) => (
            <button
              key={p.id}
              className="resident"
              onClick={() => {
                N.setState({ selected: p.id });
                panel("npc");
              }}
            >
              <span>
                {p.name} · {p.profession}
              </span>
              <span className="resident-state">{((p.income||0)*bonuses.wages).toFixed(1)} / 天</span>
            </button>
          ))}
          {!workers.length && (
            <p className="note">还没有员工，提供住宅和食品可吸引新邻居。</p>
          )}
        </>
      )}
      <div className="management-actions">
        {!c.capacity && (
          <button className="secondary" onClick={() => toggleBusiness(b.id)}>
            {b.paused ? <Play size={14} /> : <Pause size={14} />}{" "}
            {b.paused ? "恢复营业" : "暂停营业"}
          </button>
        )}
        <button className="danger" onClick={() => setConfirm(true)}>
          <Trash2 size={14} /> 拆除
        </button>
      </div>
      {confirm && (
        <div className="confirm-reset">
          <p>
            拆除返还 {Math.round(defs[b.type].cost * 0.5)}{" "}
            金币。居民会重新寻找住所和工作，店铺剩余商品回到仓库。
          </p>
          <button className="danger" onClick={() => removeBuilding(b.id)}>
            确认拆除
          </button>
          <button onClick={() => setConfirm(false)}>保留建筑</button>
        </div>
      )}
    </>
  );
}
export function QuestPanel() {
 const t=T(),buildings=B(s=>s.buildings),[chapter,setChapter]=useState(0),[showDone,setShowDone]=useState(true);
 const active=U(s=>s.activeGuide);
 const chapterQuests=quests.filter(q=>chapter===0||q.stage===chapter);
 const visible=chapterQuests.filter(q=>showDone||!t.claimed.includes(q.id));
 return <>
  <div className="panel-intro"><span className="eyebrow">GROW TOGETHER</span><h2>一步一步，住进理想生活。</h2><p>从第一间住宅到梦想之城。先完成当前阶段，建设、生产与居民生活会逐渐展开。</p></div>
  <TownProgress />
  <button className="text-button" onClick={()=>setChapter(0)}>全部邻里愿望（{quests.length}）</button>
  <div className="quest-chapters">{townLevels.map(l=><button key={l.level} className={chapter===l.level?'active':''} onClick={()=>setChapter(l.level)}>Lv.{l.level}<small>{l.name}</small></button>)}</div>
  <p className="note">{chapter>t.level?'这是未来的愿望。晋级后解锁这一章的行动。':'建议从第一项未完成愿望开始。点击按钮直接进入操作或定位建筑，无需翻找菜单。'}</p>
  <label className="quest-history"><input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)}/>显示已领取愿望（{chapterQuests.filter(q=>t.claimed.includes(q.id)).length}）</label>
  {!visible.length&&<p>这一章的心愿都已实现。继续满足上方小镇晋级条件吧。</p>}
  {visible.map(q=>{const progress=Math.min(q.count,questProgress(t,buildings,q.id)),ready=t.completed.includes(q.id),claimed=t.claimed.includes(q.id);return <article key={q.id} className={`quest-card ${active===q.id?'current':''} ${claimed?'claimed':''}`}>
   <span className="quest-icon">{ready?<Check size={20}/>:<Heart size={20}/>}</span>
   <div><h3>{q.title}</h3><p>{q.text}</p><p className="quest-hint">{q.hint}</p>
    <div className="quest-progress"><i style={{width:`${progress/q.count*100}%`}}/></div>
    <small>{Math.floor(progress)} / {q.count} · 奖励 {q.reward} 金币</small>
    <button disabled={claimed||q.stage>t.level} className={ready?'primary':'text-button'} onClick={()=>ready?claimQuest(q.id):goToQuest(q.id)}>{claimed?'心愿已实现':q.stage>t.level?`Lv.${q.stage}解锁`:ready?'领取奖励':'前往完成'} <ArrowRight size={13}/></button>
   </div>
  </article>})}
 </>;
}
export function DailySummary() {
  const t = T(),
    [selectedDay, setSelectedDay] = useState<number|null>(null),
    previous = selectedDay !== null,
    report = t.reports.find(r=>r.day===selectedDay),
    l = report || t.ledger;
  return (
    <>
      <div className="tabs">
        <button
          className={!previous ? "active" : ""}
          onClick={() => setSelectedDay(null)}
        >
          今天的日常
        </button>
        <button
          className={previous ? "active" : ""}
          disabled={!t.reports.length}
          onClick={() => setSelectedDay(t.reports[0]?.day??null)}
        >
          历史结算
        </button>
      </div>
      {t.reports.length>0&&<><div className="report-history" aria-label="历史日报">{t.reports.slice(0,7).map(r=><button key={r.day} className={selectedDay===r.day?'active':''} onClick={()=>setSelectedDay(r.day)}>第 {r.day} 天</button>)}</div><div className="report-trend" aria-label="最近七天经营利润">{t.reports.slice(0,7).reverse().map(r=><button key={r.day} className={r.profit<0?'loss':''} style={{height:`${Math.max(8,Math.abs(r.profit)/Math.max(1,...t.reports.slice(0,7).map(v=>Math.abs(v.profit)))*80)}px`}} title={`第${r.day}天：${r.profit.toFixed(1)}金币`} aria-label={`第${r.day}天经营利润${r.profit.toFixed(1)}金币`} onClick={()=>setSelectedDay(r.day)}><small>第{r.day}天</small></button>)}</div><p className="note">绿色为盈利，棕色为亏损；柱高表示金额绝对值。点击查看当天明细。</p></>}
      <div className="town-postcard">
        <span className="eyebrow">A DAY WORTH REMEMBERING</span>
        <h2>第 {report?.day || t.day} 天 · 块间日报</h2>
        <p>
          {report
            ? "一天结束了，小镇又长大了一点。"
            : "营业、相遇、收获，正在发生。"}
        </p>
        <div className="profit-line">
          经营净利润{" "}
          <b
            className={
              l.revenue - l.wages - l.maintenance - l.purchases < 0
                ? "loss"
                : ""
            }
          >
            {(l.revenue - l.wages - l.maintenance - l.purchases).toFixed(1)}{" "}
            金币
          </b>
        </div>
      </div>
      <div className="production-lines">
        {[
          ["店铺销售", l.sales],
          ["住宅租金", l.rent],
          ["员工工资", -l.wages],
          ["设施维护", -l.maintenance],
          ["采购成本", -l.purchases],
          ["新邻居", l.arrivals],
          ["搬离居民", -l.departures],
        ].map(([name, num]) => (
          <span key={name}>
            {name}
            <b>
              {Number(num) > 0 ? "+" : ""}
              {Number(num).toFixed(1)}
            </b>
          </span>
        ))}
      </div>
      <p className="note">
        日报只统计经营收入和成本；建造、拆除、手动交易与愿望奖励不计入营业利润。
      </p>
      <div className="section-title">今天的收获与餐桌</div>
      {coreResources
        .filter((r) => (l.produced[r] || 0) + (l.consumed[r] || 0) > 0)
        .map((r) => (
          <div className="production-lines" key={r}>
            <span>
              {resourceNames[r]}
              <b>
                产出 {(l.produced[r] || 0).toFixed(1)} · 消费{" "}
                {(l.consumed[r] || 0).toFixed(0)}
              </b>
            </span>
          </div>
        ))}
      <div className="section-title">街巷消息</div>
      {t.events.map((e) => (
        <article className="event-card" key={e.id}>
          <b>{e.title}</b>
          <p>{e.description}</p>
          <small>
            剩余 {e.remaining} / {e.duration} 秒
          </small>
          <div className="quest-progress">
            <i style={{ width: `${e.remaining / e.duration * 100}%` }} />
          </div>
        </article>
      ))}
      {t.notices.slice(0, 8).map((n) => (
        <p className="news-line" key={n.id}>
          <span className="small-dot" />
          {n.text}
        </p>
      ))}
    </>
  );
}
export function ProductionPanel() {
  const t = T(),
    b = B((s) => s.buildings);
  return (
    <>
      <div className="panel-intro">
        <h2>从一粒麦子，到一餐日常。</h2>
        <p>原料、员工和营业时间共同决定产出。</p>
      </div>
      <LiveChains />
      {b
        .filter((v) => defs[v.type].town?.output)
        .map((v) => {
          const f = t.facilities[v.id] || emptyFacility();
          return (
            <button
              className="production-item"
              key={v.id}
              onClick={() => selectBuilding(v.id)}
            >
              <span>
                <b>{defs[v.type].name}</b>
                <small>
                  {f.staff} / {slots(v)} 员工 · {f.status}
                </small>
              </span>
              <span>
                <b>{Math.round(f.progress * 100)}%</b>
                <small>效率 {Math.round(f.efficiency * 100)}%</small>
              </span>
            </button>
          );
        })}
      <button className="primary wide" onClick={() => U.setState({panel: "shop", tab: "发现", category: "生产"})}>
        建造生产设施
      </button>
      <div className="section-title">仓库</div>
      <TradeList />
    </>
  );
}
import {happinessFactors,operationalIds} from '../systems/buildingInfluence';
import {WorkSchedule} from './WorkSchedule';
import {OperatingEffects} from './OperatingEffects';
