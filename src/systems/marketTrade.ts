import type { Bag, Resource } from "../types/index.ts";
import type { TownState } from "../types/town.ts";
import { spendableBag } from "./logistics.ts";
export const marketPrice = (resource: Resource, tick: number) =>
  ({
    wood: 3,
    stone: 4,
    iron: 12,
    redstone: 24,
    food: 3,
    wheat: 2,
    flour: 4,
    bread: 7,
    furniture: 15,
    pottery: 12,
    tools: 18,
  })[resource] *
  (1 +
    0.15 *
      Math.sin(
        tick / 30 +
          ["wood", "stone", "iron", "redstone", "food"].indexOf(resource),
      ));
export function tradeGoods(
  t: TownState,
  bag: Bag,
  currency: number,
  resource: Resource,
  buy: boolean,
  tick: number,
) {
  const price = Math.ceil(marketPrice(resource, tick) * 10 * (buy ? 1.15 : 1));
  if (buy && currency < price) return null;
  if (!buy && spendableBag(t, bag)[resource] < 10) return null;
  return {
    bag: { ...bag, [resource]: bag[resource] + (buy ? 10 : -10) },
    currency: currency + (buy ? -price : price),
  };
}
