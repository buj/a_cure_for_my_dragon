import { AlchemicalResource, Dialect, InventoryOpt } from "../game";

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
      return "?";
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
      return "?";
  }
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
  const tmp: Record<string, string> = {};
  if (x.rubies !== undefined) {
    tmp["💎"] = unaryStr(x.rubies);
  }
  if (x.alchemy !== undefined) {
    for (const key in x.alchemy) {
      tmp[alchemyStr(key)] = unaryStr(x.alchemy[key as AlchemicalResource]!);
    }
  }
  for (const d in Dialect) {
    if (d in (x.rawPages ?? {}) || d in (x.translatedPages ?? {})) {
      tmp[dialectStr(d)] = progressBarStr(
        (x.rawPages ?? {})[d as Dialect] ?? 0,
        (x.translatedPages ?? {})[d as Dialect] ?? 0
      );
    }
  }
  return JSON.stringify(tmp);
}
