import {
  AlchemicalResource,
  Dialect,
  GameAction,
  InventoryOpt,
  LostPage,
  Position,
  zAlchemicalResource,
  zDialect,
  zInventoryOpt,
  zLostPage,
  zTrade,
} from "../game";
import { isPositionalQuestion } from "../protocol";
import { Question } from "./player";

export function dialectStr(d: string): string {
  switch (d) {
    case Dialect.Bird:
      return "🐤";
    case Dialect.Dragonfly:
      return "🦋";
    case Dialect.Fish:
      return "🐟";
    case Dialect.Mouse:
      return "🐭";
    default:
      return `<unknown: ${d}>`;
  }
}

export function alchemyStr(a: string): string {
  switch (a) {
    case AlchemicalResource.Honey:
      return "🍯";
    case AlchemicalResource.Mushroom:
      return "🍄";
    case AlchemicalResource.Waterlily:
      return "🌺";
    default:
      return `<unknown: ${a}>`;
  }
}

export function lostPageStr(page: LostPage): string {
  return `[${alchemyStr(page.cost)}→${dialectStr(page.dialect)}]`;
}

export function unaryStr(n: number, unit: string = "☐"): string {
  return Array(n).fill(unit).flat().join("");
}

export function progressBarStr(numerator: number, denominator: number): string {
  const numRemaining = denominator - numerator;
  if (numRemaining < 0) {
    throw new Error("progressBar: numerator greater than denominator");
  }
  const fulfilledStr = unaryStr(numerator, "☑");
  const remainingStr = unaryStr(numRemaining);
  return `${fulfilledStr}${remainingStr}`;
}

export function inventoryOptToString(x: InventoryOpt): string {
  const parts: string[] = [];
  if (x.rubies !== undefined) {
    parts.push(unaryStr(x.rubies, "💎"));
  }
  if (x.alchemy !== undefined) {
    for (const key in x.alchemy) {
      parts.push(
        unaryStr(x.alchemy[key as AlchemicalResource]!, alchemyStr(key))
      );
    }
  }
  for (const d in Dialect) {
    if (d in (x.rawPages ?? {}) || d in (x.translatedPages ?? {})) {
      const rhs = progressBarStr(
        (x.rawPages ?? {})[d as Dialect] ?? 0,
        (x.translatedPages ?? {})[d as Dialect] ?? 0
      );
      parts.push(`${dialectStr(d)}: ${rhs}`);
    }
  }
  return `{${parts.join(", ")}}`;
}

export function visualizeUnknown(u: any): string {
  {
    const r = zAlchemicalResource.safeParse(u);
    if (r.success) {
      return alchemyStr(r.data);
    }
  }
  {
    const r = zDialect.safeParse(u);
    if (r.success) {
      return dialectStr(r.data);
    }
  }
  {
    const r = zLostPage.safeParse(u);
    if (r.success) {
      return lostPageStr(r.data);
    }
  }
  {
    const r = zInventoryOpt.safeParse(u);
    if (r.success && Object.keys(r.data).length > 0) {
      return inventoryOptToString(r.data);
    }
  }
  {
    const r = zTrade.safeParse(u);
    if (r.success) {
      return `${inventoryOptToString(r.data.cost)} → ${inventoryOptToString(
        r.data.gain
      )}`;
    }
  }
  if (Array.isArray(u)) {
    return `[${u.map(visualizeUnknown).join(", ")}]`;
  }
  if (u === null) {
    return "null";
  }
  switch (typeof u) {
    case "object": {
      const parts: string[] = [];
      for (const [key, value] of Object.entries(u)) {
        parts.push(`${visualizeUnknown(key)}: ${visualizeUnknown(value)}`);
      }
      return `{${parts.join(", ")}}`;
    }
    case "string": {
      return u;
    }
    case "number": {
      return `${u}`;
    }
  }
  return JSON.stringify(u);
}

export function extractPositionChoicesFromQuestion(q: Question): Position[] {
  if (!isPositionalQuestion(q.prompt.context)) {
    return [];
  }
  if (q.query.type !== "chooseFromList") {
    throw new Error("positional question but query is not a list");
  }
  if (q.prompt.context === "chooseAction") {
    const posListDuplicates = q.query.ls.map((x) => (x as GameAction).target);
    const dedupDict: Record<string, Position> = {};
    for (const pos of posListDuplicates) {
      const key = JSON.stringify([pos.x, pos.y]);
      if (key in dedupDict) {
        continue;
      }
      dedupDict[key] = pos;
    }
    return Object.values(dedupDict);
  }
  return q.query.ls.map((x) => x as Position);
}
