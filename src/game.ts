import { ControlledInput, IInput, IPlayer, Prng, Prompt } from "./entities";
import { evalThunk } from "./utils";

export enum AlchemicalResource {
  Mushroom = "Mushroom",
  Honey = "Honey",
  Waterlily = "Waterlily",
}

export enum Dialect {
  Dragonfly = "Dragonfly",
  Mouse = "Mouse",
  Fish = "Fish",
  Bird = "Bird",
}

export type Inventory = {
  rubies: number;
  alchemy: {
    [key in AlchemicalResource]: number;
  };
  rawPages: {
    [key in Dialect]: number;
  };
  translatedPages: {
    [key in Dialect]: number;
  };
};

export type InventoryOpt = {
  rubies?: number;
  alchemy?: {
    [key in AlchemicalResource]?: number;
  };
  rawPages?: {
    [key in Dialect]?: number;
  };
  translatedPages?: {
    [key in Dialect]?: number;
  };
};

export namespace Inventory {
  export function createInitial(): Inventory {
    return {
      rubies: 2,
      alchemy: {
        Mushroom: 0,
        Honey: 0,
        Waterlily: 0,
      },
      rawPages: {
        Bird: 0,
        Dragonfly: 0,
        Fish: 0,
        Mouse: 0,
      },
      translatedPages: {
        Bird: 0,
        Dragonfly: 0,
        Fish: 0,
        Mouse: 0,
      },
    };
  }

  export function createEmpty(): Inventory {
    return {
      rubies: 0,
      alchemy: {
        Mushroom: 0,
        Honey: 0,
        Waterlily: 0,
      },
      rawPages: {
        Bird: 0,
        Dragonfly: 0,
        Fish: 0,
        Mouse: 0,
      },
      translatedPages: {
        Bird: 0,
        Dragonfly: 0,
        Fish: 0,
        Mouse: 0,
      },
    };
  }

  export function clone(a: Inventory): Inventory {
    return {
      rubies: a.rubies,
      alchemy: { ...a.alchemy },
      rawPages: { ...a.rawPages },
      translatedPages: { ...a.translatedPages },
    };
  }

  export function limit(a: Inventory, cap: number): Inventory {
    const result: Inventory = clone(a);
    result.rubies = Math.min(result.rubies, cap);
    for (const key in result.alchemy) {
      result.alchemy[key] = Math.min(result.alchemy[key], cap);
    }
    for (const key in result.rawPages) {
      result.rawPages[key] = Math.min(result.rawPages[key], 4);
    }
    for (const key in result.translatedPages) {
      result.translatedPages[key] = Math.min(result.translatedPages[key], 4);
    }
    return result;
  }

  export function add(a: Inventory, b: InventoryOpt): Inventory {
    const result: Inventory = clone(a);
    result.rubies += b.rubies ?? 0;
    for (const key in b.alchemy ?? {}) {
      result.alchemy[key] += b.alchemy![key];
    }
    for (const key in b.rawPages ?? {}) {
      result.rawPages[key] += b.rawPages![key];
    }
    for (const key in b.translatedPages ?? {}) {
      result.translatedPages[key] += b.translatedPages![key];
    }
    return result;
  }

  export function subtract(
    subtrahend: Inventory,
    minuend: InventoryOpt
  ): Inventory | null {
    const result: Inventory = clone(subtrahend);
    result.rubies -= minuend.rubies ?? 0;
    for (const key in minuend.alchemy ?? {}) {
      result.alchemy[key] -= minuend.alchemy![key];
      if (result.alchemy[key] < 0) {
        return null;
      }
    }
    for (const key in minuend.rawPages ?? {}) {
      result.rawPages[key] -= minuend.rawPages![key];
      if (result.rawPages[key] < 0) {
        return null;
      }
    }
    for (const key in minuend.translatedPages ?? {}) {
      result.translatedPages[key] -= minuend.translatedPages![key];
      if (result.translatedPages[key] < 0) {
        return null;
      }
    }
    return result;
  }
}

export enum Skill {
  HeftyPockets,
  Negotiation,
  WoodlandExplorer,
  SwiftBoots,
  Spelunking,
  Mountaineering,
}

export enum Artifact {
  LeatherBackpack,
  PortalStone,
  GoldenDie,
}

export type LostPage = {
  dialect: Dialect;
  cost: AlchemicalResource;
};

export type LostPagesGenerator = {
  wheel: LostPage[];
  pos: number;
};

export namespace LostPagesGenerator {
  export function create(): LostPagesGenerator {
    return {
      wheel: [
        { dialect: Dialect.Dragonfly, cost: AlchemicalResource.Mushroom },
        { dialect: Dialect.Fish, cost: AlchemicalResource.Waterlily },
        { dialect: Dialect.Mouse, cost: AlchemicalResource.Honey },
        { dialect: Dialect.Bird, cost: AlchemicalResource.Mushroom },
        { dialect: Dialect.Dragonfly, cost: AlchemicalResource.Waterlily },
        { dialect: Dialect.Fish, cost: AlchemicalResource.Honey },
        { dialect: Dialect.Mouse, cost: AlchemicalResource.Mushroom },
        { dialect: Dialect.Bird, cost: AlchemicalResource.Waterlily },
        { dialect: Dialect.Dragonfly, cost: AlchemicalResource.Honey },
        { dialect: Dialect.Fish, cost: AlchemicalResource.Mushroom },
        { dialect: Dialect.Mouse, cost: AlchemicalResource.Waterlily },
        { dialect: Dialect.Bird, cost: AlchemicalResource.Honey },
        { dialect: Dialect.Dragonfly, cost: AlchemicalResource.Mushroom },
        { dialect: Dialect.Fish, cost: AlchemicalResource.Waterlily },
        { dialect: Dialect.Mouse, cost: AlchemicalResource.Honey },
        { dialect: Dialect.Bird, cost: AlchemicalResource.Mushroom },
      ],
      pos: 0,
    };
  }

  export function generate(
    prompt: Prompt,
    rng: IInput,
    generator: LostPagesGenerator
  ): { lostPage: LostPage; generator: LostPagesGenerator } {
    const shift = rng.chooseFromRange(prompt, 0, 5);
    const idx = (generator.pos + shift) % generator.wheel.length;
    return {
      lostPage: generator.wheel[idx],
      generator: {
        wheel: [
          ...generator.wheel.slice(0, idx),
          ...generator.wheel.slice(idx + 1),
        ],
        pos: idx,
      },
    };
  }
}

export type VillagePage = {
  page: LostPage;
  cost: number;
  purchased: boolean;
};

export type Village = {
  pages: VillagePage[];
};

export namespace Village {
  export function create(): Village {
    return { pages: [] };
  }

  export function revealFirstPage(
    prompt: Prompt,
    rng: IInput,
    input: { village: Village; lostPagesGenerator: LostPagesGenerator }
  ): { village: Village; lostPagesGenerator: LostPagesGenerator } | null {
    const { village, lostPagesGenerator } = input;
    if (village.pages.length != 0) {
      return null;
    }
    const { lostPage, generator: newLostPagesGenerator } =
      LostPagesGenerator.generate(prompt, rng, lostPagesGenerator);
    return {
      village: {
        pages: [
          {
            page: lostPage,
            cost: 1,
            purchased: false,
          },
        ],
      },
      lostPagesGenerator: newLostPagesGenerator,
    };
  }

  export function purchasePage(
    prompt: Prompt,
    rng: IInput,
    input: {
      inventory: Inventory;
      village: Village;
      lostPagesGenerator: LostPagesGenerator;
    }
  ): {
    inventory: Inventory;
    village: Village;
    lostPagesGenerator: LostPagesGenerator;
  } | null {
    const { inventory, village, lostPagesGenerator } = input;
    const currPage = village.pages.slice(-1)[0];
    if (currPage.purchased) {
      return null;
    }
    const playerNumResources = inventory.alchemy[currPage.page.cost];
    if (playerNumResources < currPage.cost) {
      return null;
    }
    const newVillage: Village = {
      pages: [
        ...village.pages.slice(0, -1),
        {
          ...currPage,
          purchased: true,
        },
      ],
    };
    var newLostPagesGenerator = lostPagesGenerator;
    if (village.pages.length < 2) {
      const { lostPage, generator } = LostPagesGenerator.generate(
        prompt,
        rng,
        lostPagesGenerator
      );
      newVillage.pages.push({
        page: lostPage,
        cost: village.pages.length + 1,
        purchased: false,
      });
      newLostPagesGenerator = generator;
    }
    return {
      inventory: {
        ...inventory,
        alchemy: {
          ...inventory.alchemy,
          [currPage.page.cost]: playerNumResources - currPage.cost,
        },
      },
      village: newVillage,
      lostPagesGenerator: newLostPagesGenerator,
    };
  }
}

export type Recipe0 = {
  dialect: null;
  numPages: number;
  rubiesCost: number;
};

export type Recipe1 = {
  dialect: Dialect;
  numPages: number;
};

export type Recipe2 = {
  dialect: Dialect;
  numPages: number;
  ingredients: { [key in AlchemicalResource]?: number };
  ingredientsCollected: { [key in AlchemicalResource]?: number };
};

export type Recipe3 = {
  dialect: Dialect;
  numPages: number;
  ingredients: { [key in AlchemicalResource]?: number };
  finished: true;
};

export type Recipe = Recipe0 | Recipe1 | Recipe2 | Recipe3;

export namespace Recipe {
  function isRecipe3WithAllIngredientsCollected(recipe: Recipe): boolean {
    if (!("ingredientsCollected" in recipe)) {
      return false;
    }
    for (const key in recipe.ingredients) {
      if (recipe.ingredientsCollected[key] ?? 0 < recipe.ingredients[key]) {
        return false;
      }
    }
    return true;
  }

  export function contributeIngredients(input: {
    recipe: Recipe;
    inventory: Inventory;
    contribution: { [key in AlchemicalResource]?: number };
  }): {
    recipe: Recipe;
    inventory: Inventory;
  } | null {
    const { recipe, inventory, contribution } = input;
    if (!("ingredientsCollected" in recipe)) {
      return null;
    }
    const newInventory: Inventory = {
      ...inventory,
      alchemy: inventory.alchemy,
    };
    const newRecipe: Recipe = {
      ...recipe,
      ingredientsCollected: { ...recipe.ingredientsCollected },
    };
    for (const key in recipe.ingredients) {
      const ingredientContribution = Math.min(
        contribution[key] ?? 0,
        inventory.alchemy[key],
        recipe.ingredients[key]! - (recipe.ingredientsCollected[key] ?? 0)
      );
      newInventory.alchemy[key] -= ingredientContribution;
      newRecipe.ingredientsCollected[key] += ingredientContribution;
    }
    if (isRecipe3WithAllIngredientsCollected(newRecipe)) {
      return {
        recipe: {
          dialect: newRecipe.dialect,
          numPages: newRecipe.numPages,
          ingredients: newRecipe.ingredients,
          finished: true,
        },
        inventory: newInventory,
      };
    } else {
      return {
        recipe: newRecipe,
        inventory: newInventory,
      };
    }
  }
}

export type RecipeGenerator = {
  remainingDialects: Dialect[];
  ingredientsRemainingCombinations: Array<AlchemicalResource[]>;
  ingredientsRemainingCounts: number[];
};

export namespace RecipeGenerator {
  export function create(): RecipeGenerator {
    return {
      remainingDialects: [
        Dialect.Bird,
        Dialect.Dragonfly,
        Dialect.Fish,
        Dialect.Mouse,
      ],
      ingredientsRemainingCombinations: [
        [AlchemicalResource.Honey, AlchemicalResource.Waterlily],
        [AlchemicalResource.Waterlily, AlchemicalResource.Mushroom],
        [AlchemicalResource.Mushroom, AlchemicalResource.Honey],
      ],
      ingredientsRemainingCounts: [1, 2, 2, 3, 3, 4],
    };
  }

  export function generate(
    promptKey: string,
    rng: IInput,
    input: {
      recipeGenerator: RecipeGenerator;
      recipe: Recipe;
    }
  ): {
    recipeGenerator: RecipeGenerator;
    recipe: Recipe;
  } | null {
    const { recipeGenerator, recipe } = input;
    if (recipe.dialect === null) {
      const { chosen: dialect, rest: remainingDialects } =
        IInput.chooseFromListWithoutReplacement(
          rng,
          {
            context: "RecipeGenerator.generate.dialect",
            key: promptKey,
          },
          recipeGenerator.remainingDialects
        );
      return {
        recipeGenerator: {
          ...recipeGenerator,
          remainingDialects,
        },
        recipe: {
          dialect,
          numPages: recipe.numPages,
        },
      };
    } else if (!("ingredients" in recipe)) {
      const { chosen: ingredientsCombo, rest: remainingIngredientsCombos } =
        IInput.chooseFromListWithoutReplacement(
          rng,
          {
            context: "RecipeGenerator.generate.ingredients",
            key: JSON.stringify([promptKey, 0]),
          },
          recipeGenerator.ingredientsRemainingCombinations
        );
      const [ingredient1, ingredient2] = ingredientsCombo;
      const { chosen: count1, rest: ingredientsRemainingCounts } =
        IInput.chooseFromListWithoutReplacement(
          rng,
          {
            context: "RecipeGenerator.generate.ingredients",
            key: JSON.stringify([promptKey, 1]),
          },
          recipeGenerator.ingredientsRemainingCounts
        );
      const { chosen: count2, rest: ingredientsRemainingCounts2 } =
        IInput.chooseFromListWithoutReplacement(
          rng,
          {
            context: "RecipeGenerator.generate.ingredients",
            key: JSON.stringify([promptKey, 2]),
          },
          ingredientsRemainingCounts
        );
      return {
        recipeGenerator: {
          ...recipeGenerator,
          ingredientsRemainingCombinations: remainingIngredientsCombos,
          ingredientsRemainingCounts: ingredientsRemainingCounts2,
        },
        recipe: {
          dialect: recipe.dialect,
          numPages: recipe.numPages,
          ingredients: {
            [ingredient1]: count1,
            [ingredient2]: count2,
          },
          ingredientsCollected: {},
        },
      };
    } else {
      return null;
    }
  }
}

export enum WorldTerrainType {
  Void = "Void",
  Plains = "Plains",
  Forest = "Forest",
  Mountain = "Mountain",
  Lake = "Lake",
}

export enum WorldObjectType {
  Village = "Village",
  Market = "Market",
  Portal = "Portal",
  Merchant = "Merchant",
  Cave = "Cave",
  Sage = "Sage",
  Marlon = "Marlon",
  PreviouslyVisited = "PreviouslyVisited",
  ProductionBuilding = "ProductionBuilding",
}

export enum WorldInit {
  PlainsVillage = "V",
  ForestVillage = "v",
  Market = "m",
  Portal = "p",
  Merchant = "M",
  Cave = "c",
  SageWithChimney = "1",
  SageWithSharpRoof = "2",
  SageWithSmoothRoof = "3",
  Marlon = "t",
  Forest = "f",
  Mountain = "^",
  Lake = "l",
  Plains = " ",
  Start = "0",
  Void = "X",
}

const defaultWorld: Array<[string, string]> = [
  ["M  0  V ", "p"],
  ["        ", "  "],
  ["     l  ", "   "],
  ["f  V    ", "1  f"],
  ["vf      ", "   fv"],
  ["ff     c", "^   ff"],
  ["     m  ", " ^     "],
  ["        ", "        "],
  ["p  3    ", "t   l   M"],
  ["       ", "      V  "],
  ["V  l  ", "   m     "],
  ["     ", "c       0"],
  ["    ", " ^^      "],
  ["0  ", "     2 l "],
  ["  ", "V        "],
  [" ", "   ff    "],
  ["", "M  fvf  p"],
];

export enum SageId {
  WithChimney,
  SharpRoof,
  SmoothRoof,
}

type WorldObject = {
  [WorldObjectType.Village]: {
    type: WorldObjectType.Village;
    data: Village;
  };
  [WorldObjectType.ProductionBuilding]: {
    type: WorldObjectType.ProductionBuilding;
    data: {
      produces: AlchemicalResource;
    };
  };
  [WorldObjectType.PreviouslyVisited]: {
    type: WorldObjectType.PreviouslyVisited;
    data: {
      turnNumber: number;
    };
  };
  [WorldObjectType.Sage]: {
    type: WorldObjectType.Sage;
    data: {
      id: SageId;
    };
  };
} & {
  [key in WorldObjectType]: {
    type: key;
  };
};

export type Cell = {
  terrain: WorldTerrainType;
  object?: WorldObject[WorldObjectType];
};

export namespace WorldInit {
  export function mapToCell(init: WorldInit): Cell {
    switch (init) {
      case WorldInit.Cave:
        return {
          terrain: WorldTerrainType.Mountain,
          object: {
            type: WorldObjectType.Cave,
          },
        };
      case WorldInit.Plains:
        return {
          terrain: WorldTerrainType.Plains,
        };
      case WorldInit.Forest:
        return {
          terrain: WorldTerrainType.Forest,
        };
      case WorldInit.Lake:
        return {
          terrain: WorldTerrainType.Lake,
        };
      case WorldInit.Market:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Market,
          },
        };
      case WorldInit.Marlon:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Marlon,
          },
        };
      case WorldInit.Merchant:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Merchant,
          },
        };
      case WorldInit.Mountain:
        return {
          terrain: WorldTerrainType.Mountain,
        };
      case WorldInit.Portal:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Portal,
          },
        };
      case WorldInit.SageWithChimney:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Sage,
            data: {
              id: SageId.WithChimney,
            },
          },
        };
      case WorldInit.SageWithSharpRoof:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Sage,
            data: {
              id: SageId.SharpRoof,
            },
          },
        };
      case WorldInit.SageWithSmoothRoof:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Sage,
            data: {
              id: SageId.SmoothRoof,
            },
          },
        };
      case WorldInit.Start:
        return {
          terrain: WorldTerrainType.Plains,
        };
      case WorldInit.PlainsVillage:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Village,
            data: Village.create(),
          },
        };
      case WorldInit.ForestVillage:
        return {
          terrain: WorldTerrainType.Forest,
          object: {
            type: WorldObjectType.Village,
            data: Village.create(),
          },
        };
      case WorldInit.Void:
        return {
          terrain: WorldTerrainType.Void,
        };
    }
  }

  export function tryFromChar(ch: string): WorldInit {
    if (ch in WorldInit) {
      return ch as WorldInit;
    } else {
      return WorldInit.Void;
    }
  }
}

export type Position = { y: number; x: number };

export namespace Position {
  export function getAdjacents(pos: Position): Position[] {
    const { x, y } = pos;
    return [
      { y: y + 1, x: x - 1 },
      { y: y + 1, x: x },
      { y: y, x: x + 1 },
      { y: y - 1, x: x + 1 },
      { y: y - 1, x: x },
      { y: y, x: x - 1 },
    ];
  }

  export function areAdjacent(pos1: Position, pos2: Position): boolean {
    return (
      Position.getAdjacents(pos1).filter(
        (pos) => pos.x === pos2.x && pos.y === pos2.y
      ).length > 0
    );
  }
}

type WorldRow<T> = {
  leftReversed: T[];
  right: T[];
};

export namespace WorldRow {
  export function set<T>(row: WorldRow<T>, x: number, value: T): WorldRow<T> {
    if (x >= 0) {
      const newRight = [...row.right];
      newRight[x] = value;
      return {
        leftReversed: row.leftReversed,
        right: newRight,
      };
    } else {
      const newLeftReversed = [...row.leftReversed];
      newLeftReversed[-x - 1] = value;
      return {
        leftReversed: newLeftReversed,
        right: row.right,
      };
    }
  }
}

export class World<T> {
  public constructor(public rows: WorldRow<T>[]) {}

  public listHexes(): Array<{ pos: Position; value: T }> {
    const result: Array<{ pos: Position; value: T }> = [];
    for (const [y, row] of this.rows.entries()) {
      for (const [x, value] of row.right.entries()) {
        result.push({ pos: { x, y }, value });
      }
      for (const [negx1, value] of row.leftReversed.entries()) {
        result.push({ pos: { x: -negx1 - 1, y }, value });
      }
    }
    return result;
  }

  public map<Y>(f: (x: T) => Y): World<Y> {
    const rowsMapped: WorldRow<Y>[] = this.rows.map((row) => {
      const { leftReversed, right } = row;
      return {
        leftReversed: leftReversed.map(f),
        right: right.map(f),
      };
    });
    return new World(rowsMapped);
  }

  public set(pos: Position, value: T): World<T> {
    const newRows = [...this.rows];
    newRows[pos.y] = WorldRow.set(newRows[pos.y], pos.x, value);
    return new World(newRows);
  }

  getRow(rowNumber: number): WorldRow<T> | null {
    return this.rows[rowNumber] ?? null;
  }

  public get(pos: Position): T | null {
    const { x, y } = pos;
    const row = this.getRow(y);
    if (row === null) {
      return null;
    }
    if (x >= 0) {
      return row.right[x] ?? null;
    } else {
      return row.leftReversed[-x - 1] ?? null;
    }
  }

  public getAdjacents(pos: Position): Array<{ pos: Position; value: T }> {
    const adjacentPositions = Position.getAdjacents(pos);
    return adjacentPositions.flatMap((adj) => {
      const adjValue = this.get(adj);
      if (adjValue === null) {
        return [];
      } else {
        return [{ pos: adj, value: adjValue }];
      }
    });
  }

  public bfs(
    start: Position,
    limit: number,
    passable: (value: T) => boolean
  ): Array<{ pos: Position; value: T }> {
    const startValue = this.get(start);
    if (startValue === null) {
      throw new Error("invalid starting position");
    }
    const visited: Set<string> = new Set();
    const queue: Array<{ pos: Position; value: T; distance: number }> = [
      { pos: start, value: startValue, distance: 0 },
    ];
    const result: Array<{ pos: Position; value: T }> = [];

    while (queue.length > 0) {
      const { pos, value, distance } = queue.pop()!;
      result.push({ pos, value });

      if (distance >= limit) {
        continue;
      }
      const key = JSON.stringify(pos);
      if (key in visited) {
        continue;
      }
      visited.add(key);

      const adjacents = this.getAdjacents(pos);
      for (const adj of adjacents) {
        if (passable(adj.value)) {
          queue.push({
            pos: adj.pos,
            value: adj.value,
            distance: distance + 1,
          });
        }
      }
    }
    return result;
  }
}

export namespace World {
  export function init(rowsInit: Array<[string, string]>): World<WorldInit> {
    const rows = rowsInit.map(([left, right]) => ({
      leftReversed: left.split("").map(WorldInit.tryFromChar).reverse(),
      right: right.split("").map(WorldInit.tryFromChar),
    }));
    return new World(rows);
  }

  export function listCellsCanReachAndCanEndTurnThere(
    world: World<Cell>,
    start: Position,
    limit: number,
    passable: (cell: Cell) => boolean
  ): Array<{ pos: Position; cell: Cell }> {
    const cands = world.bfs(start, limit, passable);
    return cands
      .map((c) => ({ pos: c.pos, cell: c.value }))
      .filter((c) => c.cell.object === undefined);
  }

  export function canReachAndEndTurnThere(
    world: World<Cell>,
    start: Position,
    end: Position,
    limit: number,
    passable: (cell: Cell) => boolean
  ): Cell | null {
    const reachables = listCellsCanReachAndCanEndTurnThere(
      world,
      start,
      limit,
      passable
    );
    const matches = reachables.filter(
      ({ pos }) => pos.x === end.x && pos.y === end.y
    );
    if (matches.length === 0) {
      return null;
    }
    return matches[0].cell;
  }
}

export type CharacterState = {
  inventory: Inventory;
  skills: Skill[];
  artifacts: Artifact[];
};

export class Character {
  public inventory: Inventory;
  public skills: Skill[];
  public artifacts: Artifact[];

  constructor(init?: CharacterState) {
    if (init === undefined) {
      this.inventory = Inventory.createInitial();
      this.skills = [];
      this.artifacts = [];
    } else {
      this.inventory = init.inventory;
      this.skills = init.skills;
      this.artifacts = init.artifacts;
    }
  }

  public withInventory(inventory: Inventory): Character {
    return {
      ...this,
      inventory,
    };
  }

  public withSkill(skill: Skill): Character {
    if (this.skills.includes(skill)) {
      return this;
    }
    return {
      ...this,
      skills: [...this.skills, skill],
    };
  }

  public withArtifact(artifact: Artifact): Character {
    if (this.artifacts.includes(artifact)) {
      return this;
    }
    return {
      ...this,
      artifacts: [...this.artifacts, artifact],
    };
  }

  public storageCapacity(): number {
    return (
      2 +
      (this.skills.includes(Skill.HeftyPockets) ? 1 : 0) +
      (this.artifacts.includes(Artifact.LeatherBackpack) ? 1 : 0)
    );
  }

  public movementSpeed(): number {
    return 2 + (this.skills.includes(Skill.SwiftBoots) ? 1 : 0);
  }

  public canTraverse(cell: Cell): boolean {
    if (cell.object !== undefined) {
      return cell.object.type === WorldObjectType.PreviouslyVisited;
    }
    switch (cell.terrain) {
      case WorldTerrainType.Forest:
        return this.skills.includes(Skill.WoodlandExplorer);
      case WorldTerrainType.Mountain:
        return this.skills.includes(Skill.Mountaineering);
      case WorldTerrainType.Plains:
        return true;
      case WorldTerrainType.Lake:
      case WorldTerrainType.Void:
        return false;
    }
  }

  public gainItems(items: InventoryOpt): Character {
    const newInventory = Inventory.limit(
      Inventory.add(this.inventory, items),
      this.storageCapacity()
    );
    return {
      ...this,
      inventory: newInventory,
    };
  }

  public tradeItems(cost: InventoryOpt, gain: InventoryOpt): Character | null {
    const afterCost = Inventory.subtract(this.inventory, cost);
    if (afterCost === null) {
      return null;
    }
    const newInventory = Inventory.limit(
      Inventory.add(afterCost, gain),
      this.storageCapacity()
    );
    return {
      ...this,
      inventory: newInventory,
    };
  }
}

export type GameState = {
  character: Character;
  world: World<Cell>;
  charPos: Position;
  turnNumber: number;
  lostPagesGenerator: LostPagesGenerator;
  lastVisitedCave?: Position;
  recipes: Recipe[];
  recipeGenerator: RecipeGenerator;
};

export namespace GameState {
  export function initial(
    worldInit: World<WorldInit>,
    startPos: Position
  ): GameState {
    if ((worldInit.get(startPos) ?? WorldInit.Void) !== WorldInit.Start) {
      throw new Error("Invalid starting position");
    }
    return {
      character: new Character(),
      world: worldInit.map(WorldInit.mapToCell),
      charPos: startPos,
      turnNumber: 0,
      lostPagesGenerator: LostPagesGenerator.create(),
      recipes: [
        {
          dialect: null,
          numPages: 4,
          rubiesCost: 1,
        },
        {
          dialect: null,
          numPages: 3,
          rubiesCost: 2,
        },
        {
          dialect: null,
          numPages: 2,
          rubiesCost: 3,
        },
      ],
      recipeGenerator: RecipeGenerator.create(),
    };
  }

  export function moveCharacter(
    target: Position,
    gameState: GameState
  ): GameState | null {
    const targetCell = gameState.world.get(target);
    if (targetCell === null || targetCell.object !== undefined) {
      return null;
    }
    return {
      ...gameState,
      turnNumber: gameState.turnNumber + 1,
      charPos: target,
      world: gameState.world.set(target, {
        terrain: targetCell.terrain,
        object: {
          type: WorldObjectType.PreviouslyVisited,
          data: {
            turnNumber: gameState.turnNumber + 1,
          },
        },
      }),
    };
  }
}

export class BootstrappedGame {
  state: GameState;
  sourceRng: Prng;
  player: IPlayer;
  promptNumber: number;

  public constructor(init: {
    state: GameState;
    sourceRng: Prng;
    player: IPlayer;
    promptNumber: number;
  }) {
    this.state = init.state;
    this.promptNumber = init.promptNumber;
    this.sourceRng = init.sourceRng;
    this.player = init.player;
  }

  public rng(): IInput {
    if (this.state.character.artifacts.includes(Artifact.GoldenDie)) {
      return new ControlledInput(this.sourceRng, this.player);
    } else {
      return this.sourceRng;
    }
  }

  public withState(newState: GameState): BootstrappedGame {
    return new BootstrappedGame({ ...this, state: newState });
  }

  public advancePromptNumber(): BootstrappedGame {
    return new BootstrappedGame({
      ...this,
      promptNumber: this.promptNumber + 1,
    });
  }
}

export namespace BootstrappedGame {
  export function createInitial(
    sourceRng: Prng,
    player: IPlayer
  ): BootstrappedGame {
    const worldInit = World.init(defaultWorld);
    const startPos = player.chooseFromList(
      {
        context: "startGame.startPos",
        key: JSON.stringify([0, 0]),
      },
      worldInit.listHexes().flatMap(({ pos, value }) => {
        if (value === WorldInit.Start) {
          return [pos];
        } else {
          return [];
        }
      })
    );
    var initialState = GameState.initial(worldInit, startPos);
    const whereHoney = player.chooseFromList(
      {
        context: "startGame.honeyBuilding",
        key: JSON.stringify([0, 1]),
      },
      worldInit.listHexes().flatMap(({ pos, value }) => {
        if (value === WorldInit.Mountain) {
          return [pos];
        } else {
          return [];
        }
      })
    );
    const whereWaterlily = player.chooseFromList(
      {
        context: "startGame.waterlilyBuilding",
        key: JSON.stringify([0, 2]),
      },
      worldInit.listHexes().flatMap(({ pos, value }) => {
        if (value === WorldInit.Lake) {
          return [pos];
        } else {
          return [];
        }
      })
    );
    const whereMushroom = player.chooseFromList(
      {
        context: "startGame.mushroomBuilding",
        key: JSON.stringify([0, 3]),
      },
      worldInit.listHexes().flatMap(({ pos, value }) => {
        if (value === WorldInit.Forest) {
          return [pos];
        } else {
          return [];
        }
      })
    );
    return new BootstrappedGame({
      state: {
        ...initialState,
        world: initialState.world
          .set(whereHoney, {
            terrain: WorldTerrainType.Mountain,
            object: {
              type: WorldObjectType.ProductionBuilding,
              data: { produces: AlchemicalResource.Honey },
            },
          })
          .set(whereMushroom, {
            terrain: WorldTerrainType.Forest,
            object: {
              type: WorldObjectType.ProductionBuilding,
              data: { produces: AlchemicalResource.Mushroom },
            },
          })
          .set(whereWaterlily, {
            terrain: WorldTerrainType.Lake,
            object: {
              type: WorldObjectType.ProductionBuilding,
              data: { produces: AlchemicalResource.Waterlily },
            },
          }),
      },
      sourceRng,
      player,
      promptNumber: 1,
    });
  }
}

export enum GameActionType {
  Move,
  Interact,
}

export type GameAction = {
  type: GameActionType;
  target: Position;
};

function moveAction(
  target: Position,
  game: BootstrappedGame
): BootstrappedGame | null {
  const movementSpeed = game.state.character.movementSpeed();
  const targetCell = World.canReachAndEndTurnThere(
    game.state.world,
    game.state.charPos,
    target,
    movementSpeed,
    game.state.character.canTraverse
  );
  if (targetCell === null) {
    return null;
  }
  const newState = GameState.moveCharacter(target, game.state);
  if (newState === null) {
    return null;
  }
  return game.withState(newState);
}

function caveBarrel(prompt: Prompt, rng: IInput): InventoryOpt {
  const options: InventoryOpt[] = [
    {
      rubies: 2,
    },
    { rubies: 3 },
    { rubies: 1, alchemy: { Honey: 1, Mushroom: 1, Waterlily: 1 } },
  ];
  const gain = rng.chooseFromList(prompt, options);
  return gain;
}

function enterCave(
  pos: Position,
  game: BootstrappedGame
): BootstrappedGame | null {
  if (!game.state.character.skills.includes(Skill.Spelunking)) {
    return null;
  }
  if (pos === game.state.lastVisitedCave) {
    return null;
  }
  const cell = game.state.world.get(pos);
  if (
    cell === null ||
    cell.object === undefined ||
    cell.object.type !== WorldObjectType.Cave
  ) {
    return null;
  }

  const possibleExits = World.listCellsCanReachAndCanEndTurnThere(
    game.state.world,
    pos,
    1,
    game.state.character.canTraverse
  ).map(({ pos }) => pos);
  if (possibleExits.length === 0) {
    return null;
  }

  // barrel1

  const ctx1: Prompt = {
    context: "caveBarrel.1",
    key: JSON.stringify([game.promptNumber, 0]),
  };
  const gain1 = caveBarrel(ctx1, game.rng());
  game.player.show(ctx1, gain1);
  const state1 = {
    ...game.state,
    character: game.state.character.gainItems(gain1),
  };

  // choose which way to go inside the cave (treasure or barrel2?)

  const candWays = ["barrel"];
  if (game.state.character.artifacts.length < 3) {
    candWays.push("treasure");
  }
  const whichWay = game.player.chooseFromList(
    {
      context: "cave.whichWay",
      key: JSON.stringify([game.promptNumber, 1]),
    },
    candWays
  );

  var state2: GameState;
  switch (whichWay) {
    case "barrel": {
      const ctx2: Prompt = {
        context: "caveBarrel.2",
        key: JSON.stringify([game.promptNumber, 2]),
      };
      const gain2 = caveBarrel(ctx2, game.rng());
      game.player.show(ctx2, gain2);
      state2 = {
        ...state1,
        character: state1.character.gainItems(gain2),
      };
      break;
    }
    case "treasure": {
      const ctx2: Prompt = {
        context: "caveTreasure",
        key: JSON.stringify([game.promptNumber, 2]),
      };
      const cands = [
        Artifact.GoldenDie,
        Artifact.LeatherBackpack,
        Artifact.PortalStone,
      ].filter((a) => !game.state.character.artifacts.includes(a));
      const gainedArtifact = game.rng().chooseFromList(ctx2, cands);
      game.player.show(ctx2, gainedArtifact);
      state2 = {
        ...state1,
        character: state1.character.withArtifact(gainedArtifact),
      };
      break;
    }
    default:
      throw new Error("unexpected");
  }

  // move out of the cave

  state2.turnNumber += 3;
  state2.lastVisitedCave = pos;
  const exitPos = game.player.chooseFromList(
    {
      context: "caveExit",
      key: JSON.stringify([game.promptNumber, 3]),
    },
    possibleExits
  );
  const state3 = GameState.moveCharacter(exitPos, state2);
  if (state3 === null) {
    return null;
  }

  return game.withState(state3);
}

function interactWithPortal(
  portalPos: Position,
  game: BootstrappedGame
): BootstrappedGame | null {
  if (!game.state.character.artifacts.includes(Artifact.PortalStone)) {
    return null;
  }
  if (!Position.areAdjacent(portalPos, game.state.charPos)) {
    return null;
  }
  const otherPortalsHexes = game.state.world
    .listHexes()
    .filter(
      ({ value }) =>
        value.object !== undefined &&
        value.object.type == WorldObjectType.Portal
    )
    .filter(({ pos }) => pos.x !== portalPos.x || pos.y !== portalPos.y);
  const candExits = otherPortalsHexes.flatMap(({ pos: otherPortalPos }) =>
    World.listCellsCanReachAndCanEndTurnThere(
      game.state.world,
      otherPortalPos,
      1,
      game.state.character.canTraverse
    ).map(({ pos }) => pos)
  );
  const dest = game.player.chooseFromList(
    {
      context: "portalDestination",
      key: JSON.stringify(game.promptNumber),
    },
    candExits
  );
  const newState = GameState.moveCharacter(dest, game.state);
  if (newState === null) {
    return null;
  }
  return game.withState(newState);
}

function buildProductionBuilding(
  pos: Position,
  cell: Cell,
  game: BootstrappedGame
): BootstrappedGame | null {
  var produce: AlchemicalResource;
  switch (cell.terrain) {
    case WorldTerrainType.Mountain: {
      produce = AlchemicalResource.Honey;
      break;
    }
    case WorldTerrainType.Lake: {
      produce = AlchemicalResource.Waterlily;
      break;
    }
    case WorldTerrainType.Forest: {
      produce = AlchemicalResource.Mushroom;
      break;
    }
    default: {
      return null;
    }
  }
  const newWorld = game.state.world.set(pos, {
    ...cell,
    object: {
      type: WorldObjectType.ProductionBuilding,
      data: {
        produces: produce,
      },
    },
  });
  return game.withState({
    ...game.state,
    world: newWorld,
  });
}

function interactWithProductionBuilding(
  produce: AlchemicalResource,
  game: BootstrappedGame
): BootstrappedGame | null {
  const newCharacterState = game.state.character.gainItems({
    [produce]: 10,
  });
  return game.withState({
    ...game.state,
    character: newCharacterState,
  });
}

function interactWithVillage(
  pos: Position,
  cell: Cell,
  game: BootstrappedGame
): BootstrappedGame | null {
  if (
    cell.object === undefined ||
    cell.object.type !== WorldObjectType.Village
  ) {
    return null;
  }
  const village = cell.object.data;
  if (village.pages.length === 0) {
    const afterReveal = Village.revealFirstPage(
      {
        context: "interactWithVillage.revealFirstPage",
        key: JSON.stringify(game.promptNumber),
      },
      game.rng(),
      {
        village,
        lostPagesGenerator: game.state.lostPagesGenerator,
      }
    );
    if (afterReveal === null) {
      return null;
    }
    const newState: GameState = {
      ...game.state,
      lostPagesGenerator: afterReveal.lostPagesGenerator,
      world: game.state.world.set(pos, {
        terrain: cell.terrain,
        object: {
          type: WorldObjectType.Village,
          data: afterReveal.village,
        },
      }),
    };
    return game.withState(newState);
  } else {
    const afterPurchase = Village.purchasePage(
      {
        context: "interactWithVillage.purchasePage",
        key: JSON.stringify(game.promptNumber),
      },
      game.rng(),
      {
        inventory: game.state.character.inventory,
        village,
        lostPagesGenerator: game.state.lostPagesGenerator,
      }
    );
    if (afterPurchase === null) {
      return null;
    }
    const newState: GameState = {
      ...game.state,
      character: game.state.character.withInventory(afterPurchase.inventory),
      lostPagesGenerator: afterPurchase.lostPagesGenerator,
      world: game.state.world.set(pos, {
        terrain: cell.terrain,
        object: {
          type: WorldObjectType.Village,
          data: afterPurchase.village,
        },
      }),
    };
    if (newState === null) {
      return null;
    }
    return game.withState(newState);
  }
}

export enum MarketTradeType {
  GoodForGood,
  RubyForGoods,
  GoodsForRuby,
}

function interactWithMarket(game: BootstrappedGame): BootstrappedGame | null {
  const tradeType = game.player.chooseFromList(
    {
      context: "interactWithMarket.tradeType",
      key: JSON.stringify([game.promptNumber, 0]),
    },
    [
      MarketTradeType.GoodForGood,
      MarketTradeType.RubyForGoods,
      MarketTradeType.GoodsForRuby,
    ]
  );
  const prompt2: Prompt = {
    context: "interactWithMarket.trade",
    key: JSON.stringify([game.promptNumber, 1]),
  };

  var lhs: InventoryOpt;
  var rhs: InventoryOpt;
  switch (tradeType) {
    case MarketTradeType.GoodForGood: {
      [lhs, rhs] = game.player.chooseFromList(prompt2, [
        [{ alchemy: { Mushroom: 1 } }, { alchemy: { Honey: 1 } }],
        [{ alchemy: { Mushroom: 1 } }, { alchemy: { Waterlily: 1 } }],
        [{ alchemy: { Honey: 1 } }, { alchemy: { Mushroom: 1 } }],
        [{ alchemy: { Honey: 1 } }, { alchemy: { Waterlily: 1 } }],
        [{ alchemy: { Waterlily: 1 } }, { alchemy: { Honey: 1 } }],
        [{ alchemy: { Waterlily: 1 } }, { alchemy: { Mushroom: 1 } }],
      ]);
      break;
    }
    case MarketTradeType.RubyForGoods: {
      [lhs, rhs] = game.player.chooseFromList(prompt2, [
        [{ rubies: 1 }, { alchemy: { Honey: 2 } }],
        [{ rubies: 1 }, { alchemy: { Mushroom: 2 } }],
        [{ rubies: 1 }, { alchemy: { Waterlily: 2 } }],
        [{ rubies: 1 }, { alchemy: { Honey: 1, Mushroom: 1 } }],
        [{ rubies: 1 }, { alchemy: { Honey: 1, Waterlily: 1 } }],
        [{ rubies: 1 }, { alchemy: { Mushroom: 1, Waterlily: 1 } }],
      ]);
      break;
    }
    case MarketTradeType.GoodsForRuby: {
      [lhs, rhs] = game.player.chooseFromList(prompt2, [
        [{ alchemy: { Honey: 2 } }, { rubies: 1 }],
        [{ alchemy: { Mushroom: 2 } }, { rubies: 1 }],
        [{ alchemy: { Waterlily: 2 } }, { rubies: 1 }],
        [{ alchemy: { Honey: 1, Mushroom: 1 } }, { rubies: 1 }],
        [{ alchemy: { Honey: 1, Waterlily: 1 } }, { rubies: 1 }],
        [{ alchemy: { Mushroom: 1, Waterlily: 1 } }, { rubies: 1 }],
      ]);
      break;
    }
  }
  const newCharacterState = game.state.character.tradeItems(lhs, rhs);
  if (newCharacterState === null) {
    return null;
  }
  return game.withState({
    ...game.state,
    character: newCharacterState,
  });
}

export enum MarlonInteractionType {
  RevealDialect,
  RevealIngredients,
  GiveIngredients,
}

function interactWithMarlon(game: BootstrappedGame): BootstrappedGame | null {
  const interactionType = game.player.chooseFromList(
    {
      context: "interactWithMarlon.type",
      key: JSON.stringify([game.promptNumber, 0]),
    },
    [
      MarlonInteractionType.RevealDialect,
      MarlonInteractionType.RevealIngredients,
      MarlonInteractionType.GiveIngredients,
    ]
  );
  switch (interactionType) {
    case MarlonInteractionType.RevealDialect: {
      const choices = [...game.state.recipes.entries()].flatMap(
        ([idx, recipe]) => {
          if (recipe.dialect === null) {
            const result: [number, Recipe0] = [idx, recipe];
            return [result];
          } else {
            return [];
          }
        }
      );
      const [idx, recipe] = game.player.chooseFromList(
        {
          context: "interactWithMarlon.revealDialect.whichRecipe",
          key: JSON.stringify([game.promptNumber, 1]),
        },
        choices
      );
      const result = RecipeGenerator.generate(
        JSON.stringify([game.promptNumber, 2]),
        game.rng(),
        {
          recipeGenerator: game.state.recipeGenerator,
          recipe,
        }
      );
      if (result === null) {
        return null;
      }
      const newRecipes = [...game.state.recipes];
      newRecipes[idx] = result.recipe;
      const newInventory = Inventory.subtract(game.state.character.inventory, {
        rubies: recipe.rubiesCost,
      });
      if (newInventory === null) {
        return null;
      }
      return game.withState({
        ...game.state,
        recipes: newRecipes,
        recipeGenerator: result.recipeGenerator,
        character: game.state.character.withInventory(newInventory),
      });
    }
    case MarlonInteractionType.RevealIngredients: {
      const choices = [...game.state.recipes.entries()].flatMap(
        ([idx, recipe]) => {
          if (recipe.dialect !== null && !("ingredients" in recipe)) {
            const result: [number, Recipe1] = [idx, recipe];
            return [result];
          } else {
            return [];
          }
        }
      );
      const [idx, recipe] = game.player.chooseFromList(
        {
          context: "interactWithMarlon.revealIngredients.whichRecipe",
          key: JSON.stringify([game.promptNumber, 1]),
        },
        choices
      );
      const result = RecipeGenerator.generate(
        JSON.stringify([game.promptNumber, 2]),
        game.rng(),
        {
          recipeGenerator: game.state.recipeGenerator,
          recipe,
        }
      );
      if (result === null) {
        return null;
      }
      const newRecipes = [...game.state.recipes];
      newRecipes[idx] = result.recipe;
      const newInventory = Inventory.subtract(game.state.character.inventory, {
        translatedPages: { [recipe.dialect]: recipe.numPages },
      });
      if (newInventory === null) {
        return null;
      }
      return game.withState({
        ...game.state,
        recipes: newRecipes,
        recipeGenerator: result.recipeGenerator,
        character: game.state.character.withInventory(newInventory),
      });
    }
    case MarlonInteractionType.GiveIngredients: {
      const choices = [...game.state.recipes.entries()].flatMap(
        ([idx, recipe]) => {
          if ("ingredientsCollected" in recipe) {
            const result: [number, Recipe2] = [idx, recipe];
            return [result];
          } else {
            return [];
          }
        }
      );
      const [idx, recipe] = game.player.chooseFromList(
        {
          context: "interactWithMarlon.giveIngredients.whichRecipe",
          key: JSON.stringify([game.promptNumber, 1]),
        },
        choices
      );
      var promptSubnumber = 2;
      const contribution: { [key in AlchemicalResource]: number } = {
        Mushroom: 0,
        Honey: 0,
        Waterlily: 0,
      };
      for (const ingredientType in recipe.ingredients) {
        const howMuch = game.player.chooseFromRange(
          {
            context: "interactWithMerlon.giveIngredients.ingredientsAmounts",
            key: JSON.stringify([game.promptNumber, promptSubnumber]),
          },
          0,
          game.state.character.inventory.alchemy[ingredientType]
        );
        contribution[ingredientType] = howMuch;
        promptSubnumber += 1;
      }
      const result = Recipe.contributeIngredients({
        recipe,
        inventory: game.state.character.inventory,
        contribution,
      });
      if (result === null) {
        return null;
      }
      const newRecipes = [...game.state.recipes];
      newRecipes[idx] = result.recipe;
      return game.withState({
        ...game.state,
        recipes: newRecipes,
        character: game.state.character.withInventory(result.inventory),
      });
    }
  }
}

function interactWithMerchant(game: BootstrappedGame): BootstrappedGame | null {
  if (!game.state.character.skills.includes(Skill.Negotiation)) {
    return null;
  }
  const choices: Set<Dialect> = new Set();
  for (const d in Dialect) {
    if (
      game.state.character.inventory.rawPages[d] > 0 ||
      game.state.character.inventory.translatedPages[d] > 0
    ) {
      choices.add(d as Dialect);
    }
  }
  if (choices.size === 0) {
    return null;
  }
  const tradeWhat = game.player.chooseFromList(
    {
      context: "interactWithMerchant.tradeWhat",
      key: JSON.stringify([game.promptNumber, 0]),
    },
    [...choices.values()]
  );
  const tradeFor = game.player.chooseFromList(
    {
      context: "interactWithMerchant.tradeFor",
      key: JSON.stringify([game.promptNumber, 1]),
    },
    [Dialect.Bird, Dialect.Dragonfly, Dialect.Fish, Dialect.Mouse].filter(
      (d) => d != tradeWhat
    )
  );
  const cost: InventoryOpt =
    game.state.character.inventory.rawPages[tradeWhat] > 0
      ? { rawPages: { [tradeWhat]: 1 } }
      : { translatedPages: { [tradeWhat]: 1 } };
  const newCharacterState = game.state.character.tradeItems(cost, {
    rawPages: { [tradeFor]: 1 },
  });
  if (newCharacterState === null) {
    return null;
  }
  return game.withState({
    ...game.state,
    character: newCharacterState,
  });
}

function sageLearnableSkills(sageId: SageId): Skill[] {
  switch (sageId) {
    case SageId.WithChimney:
      return [Skill.HeftyPockets, Skill.Negotiation];
    case SageId.SmoothRoof:
      return [Skill.WoodlandExplorer, Skill.SwiftBoots];
    case SageId.SharpRoof:
      return [Skill.Mountaineering, Skill.Spelunking];
  }
}

function interactWithSage(
  sageId: SageId,
  game: BootstrappedGame
): BootstrappedGame | null {
  const whatCanBeTranslated = [
    Dialect.Bird,
    Dialect.Dragonfly,
    Dialect.Fish,
    Dialect.Mouse,
  ].filter((d) => game.state.character.inventory.rawPages[d] > 0);
  if (whatCanBeTranslated.length === 0) {
    return null;
  }
  const translateWhat = game.player.chooseFromList(
    {
      context: "interactWithSage.translateWhat",
      key: JSON.stringify([game.promptNumber, 0]),
    },
    whatCanBeTranslated
  );
  const learnableSkills: Array<Skill | null> = [
    ...sageLearnableSkills(sageId).filter(
      (s) => !game.state.character.skills.includes(s)
    ),
    null,
  ];
  var newCharacterState = game.state.character.tradeItems(
    { rawPages: { [translateWhat]: 1 } },
    { translatedPages: { [translateWhat]: 1 } }
  );
  if (newCharacterState === null) {
    return null;
  }
  const learnWhat =
    learnableSkills.length > 1
      ? game.player.chooseFromList(
          {
            context: "interactWithSage.learnWhat",
            key: JSON.stringify([game.promptNumber, 1]),
          },
          learnableSkills
        )
      : null;
  if (learnWhat !== null) {
    newCharacterState = newCharacterState.withSkill(learnWhat);
    if (newCharacterState === null) {
      return null;
    }
  }
  return game.withState({
    ...game.state,
    character: newCharacterState,
  });
}

function takeAction(
  action: GameAction,
  game: BootstrappedGame
): BootstrappedGame | null {
  const afterAction = evalThunk(() => {
    switch (action.type) {
      case GameActionType.Move:
        return moveAction(action.target, game);
      case GameActionType.Interact: {
        if (!Position.areAdjacent(action.target, game.state.charPos)) {
          return null;
        }
        const cell = game.state.world.get(action.target);
        if (cell === null) {
          return null;
        }
        if (cell.object === undefined) {
          return buildProductionBuilding(action.target, cell, game);
        }
        switch (cell.object.type) {
          case WorldObjectType.Cave:
            return enterCave(action.target, game);
          case WorldObjectType.Market:
            return interactWithMarket(game);
          case WorldObjectType.Marlon:
            return interactWithMarlon(game);
          case WorldObjectType.Merchant:
            return interactWithMerchant(game);
          case WorldObjectType.Portal:
            return interactWithPortal(action.target, game);
          case WorldObjectType.ProductionBuilding:
            return interactWithProductionBuilding(
              cell.object.data.produces,
              game
            );
          case WorldObjectType.Sage:
            return interactWithSage(cell.object.data.id, game);
          case WorldObjectType.Village:
            return interactWithVillage(action.target, cell, game);
          default:
            return null;
        }
      }
    }
  });
  if (afterAction === null) {
    return null;
  }
  return afterAction.advancePromptNumber();
}

export function runGame(sourceRng: Prng, player: IPlayer) {
  var game = BootstrappedGame.createInitial(sourceRng, player);
  while (true) {
    player.show(
      {
        context: "gameState",
        key: JSON.stringify(game.promptNumber),
      },
      game.state
    );
    const possibleMoves: GameAction[] =
      World.listCellsCanReachAndCanEndTurnThere(
        game.state.world,
        game.state.charPos,
        game.state.character.movementSpeed(),
        game.state.character.canTraverse
      ).map(({ pos }) => ({
        type: GameActionType.Move,
        target: pos,
      }));
    const possibleInteractions: GameAction[] = game.state.world
      .getAdjacents(game.state.charPos)
      .map(({ pos }) => ({
        type: GameActionType.Interact,
        target: pos,
      }));
    const action = game.player.chooseFromList(
      {
        context: "chooseAction",
        key: JSON.stringify(game.promptNumber),
      },
      [...possibleMoves, ...possibleInteractions]
    );
    const game2 = takeAction(action, game.advancePromptNumber());
    if (game2 !== null) {
      game = game2;
    }
  }
}