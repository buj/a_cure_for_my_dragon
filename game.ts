import { Prng } from "./prng";

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
  pages: {
    [key in Dialect]: {
      raw: number;
      translated: number;
    };
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
      pages: {
        Bird: { raw: 0, translated: 0 },
        Dragonfly: { raw: 0, translated: 0 },
        Fish: { raw: 0, translated: 0 },
        Mouse: { raw: 0, translated: 0 },
      },
    };
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
    prng: Prng,
    generator: LostPagesGenerator
  ): { lostPage: LostPage; generator: LostPagesGenerator } {
    const shift = prng.randint(0, 5);
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
    prng: Prng,
    input: { village: Village; lostPagesGenerator: LostPagesGenerator }
  ): { village: Village; lostPagesGenerator: LostPagesGenerator } | null {
    const { village, lostPagesGenerator } = input;
    if (village.pages.length != 0) {
      return null;
    }
    const { lostPage, generator: newLostPagesGenerator } =
      LostPagesGenerator.generate(prng, lostPagesGenerator);
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
    prng: Prng,
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
        prng,
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

type Recipe0 = {
  dialect: null;
  numPages: number;
};

type Recipe1 = {
  dialect: Dialect;
  numPages: number;
  numPagesCollected: number;
};

type Recipe2 = {
  dialect: Dialect;
  numPages: number;
  ingredients: { [key in AlchemicalResource]?: number };
  ingredientsCollected: { [key in AlchemicalResource]?: number };
};

type Recipe3 = {
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

  export function contributePages(
    prng: Prng,
    input: {
      recipe: Recipe;
      inventory: Inventory;
      contribution: number;
      recipeGenerator: RecipeGenerator;
    }
  ): {
    recipe: Recipe;
    inventory: Inventory;
    recipeGenerator: RecipeGenerator;
  } | null {
    const {
      recipe,
      inventory,
      contribution: contributionRaw,
      recipeGenerator,
    } = input;
    if (!("numPagesCollected" in recipe)) {
      return null;
    }
    const contribution = Math.min(
      contributionRaw,
      recipe.numPages - recipe.numPagesCollected,
      inventory.pages[recipe.dialect].translated
    );
    if (contribution <= 0) {
      return null;
    }
    const newInventory: Inventory = {
      ...inventory,
      pages: {
        ...inventory.pages,
        [recipe.dialect]: {
          ...inventory.pages[recipe.dialect],
          translated: inventory.pages[recipe.dialect].translated - contribution,
        },
      },
    };
    var newRecipe: Recipe = recipe;
    var newRecipeGenerator: RecipeGenerator = recipeGenerator;
    if (recipe.numPagesCollected + contribution == recipe.numPages) {
      const { recipeGenerator: recipeGenerator2, recipe: recipe2 } =
        RecipeGenerator.generate(prng, { recipeGenerator, recipe })!;
      newRecipe = recipe2;
      newRecipeGenerator = recipeGenerator2;
    }
    return {
      recipe: newRecipe,
      inventory: newInventory,
      recipeGenerator: newRecipeGenerator,
    };
  }
}

enum IngredientsCombination {
  HoneyWaterlily,
  WaterlilyMushroom,
  MushroomHoney,
}

function ingredientsCombinationToList(
  c: IngredientsCombination
): AlchemicalResource[] {
  switch (c) {
    case IngredientsCombination.HoneyWaterlily:
      return [AlchemicalResource.Honey, AlchemicalResource.Waterlily];
    case IngredientsCombination.MushroomHoney:
      return [AlchemicalResource.Mushroom, AlchemicalResource.Honey];
    case IngredientsCombination.WaterlilyMushroom:
      return [AlchemicalResource.Waterlily, AlchemicalResource.Mushroom];
  }
}

export type RecipeGenerator = {
  remainingDialects: Dialect[];
  ingredientsRemainingCombinations: IngredientsCombination[];
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
        IngredientsCombination.HoneyWaterlily,
        IngredientsCombination.WaterlilyMushroom,
        IngredientsCombination.MushroomHoney,
      ],
      ingredientsRemainingCounts: [1, 2, 2, 3, 3, 4],
    };
  }

  export function generate(
    prng: Prng,
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
      const { chosen: dialect, rest: remainingDialects } = prng.choice2(
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
          numPagesCollected: 0,
        },
      };
    } else if (
      "numPagesCollected" in recipe &&
      recipe.numPagesCollected >= recipe.numPages
    ) {
      const { chosen: ingredientsCombo, rest: remainingIngredientsCombos } =
        prng.choice2(recipeGenerator.ingredientsRemainingCombinations);
      const [ingredient1, ingredient2] =
        ingredientsCombinationToList(ingredientsCombo);
      const { chosen: count1, rest: ingredientsRemainingCounts } = prng.choice2(
        recipeGenerator.ingredientsRemainingCounts
      );
      const { chosen: count2, rest: ingredientsRemainingCounts2 } =
        prng.choice2(ingredientsRemainingCounts);
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
  Village = "v",
  Market = "m",
  Portal = "p",
  Merchant = "M",
  Cave = "c",
  Sage1 = "1",
  Sage2 = "2",
  Sage3 = "3",
  Marlon = "t",
  Forest = "f",
  Mountain = "^",
  Lake = "l",
  Plains = " ",
  Start = "0",
  Void = "X",
}

const worldInit: Array<[string, string]> = [
  ["M  0  v ", "p"],
  ["        ", "  "],
  ["     l  ", "   "],
  ["f  v    ", "1  f"],
  ["vf      ", "   fv"],
  ["ff     c", "^   ff"],
  ["     m  ", " ^     "],
  ["        ", "        "],
  ["p  3    ", "t   l   M"],
  ["       ", "      v  "],
  ["v  l  ", "   m     "],
  ["     ", "c       0"],
  ["    ", " ^^      "],
  ["0  ", "     2 l "],
  ["  ", "v        "],
  [" ", "   ff    "],
  ["", "M  fvf  p"],
];

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
      id: 1 | 2 | 3;
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
      case WorldInit.Sage1:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Sage,
            data: {
              id: 1,
            },
          },
        };
      case WorldInit.Sage2:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Sage,
            data: {
              id: 2,
            },
          },
        };
      case WorldInit.Sage3:
        return {
          terrain: WorldTerrainType.Plains,
          object: {
            type: WorldObjectType.Sage,
            data: {
              id: 3,
            },
          },
        };
      case WorldInit.Start:
        return {
          terrain: WorldTerrainType.Plains,
        };
      case WorldInit.Village:
        return {
          terrain: WorldTerrainType.Plains,
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
}

type WorldRow<T> = {
  leftReversed: T[];
  right: T[];
};

export class World<T> {
  public constructor(public rows: WorldRow<T>[]) {}

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
}

export class Character {
  public inventory: Inventory;
  public skills: Skill[];
  public artifacts: Artifact[];

  constructor() {
    this.inventory = Inventory.createInitial();
    this.skills = [];
    this.artifacts = [];
  }

  public withSkill(skill: Skill): Character {
    if (skill in this.skills) {
      return this;
    }
    return {
      ...this,
      skills: [...this.skills, skill],
    };
  }

  public withArtifact(artifact: Artifact): Character {
    if (artifact in this.artifacts) {
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
      (Skill.HeftyPockets in this.skills ? 1 : 0) +
      (Artifact.LeatherBackpack in this.artifacts ? 1 : 0)
    );
  }

  public movementSpeed(): number {
    return 2 + (Skill.SwiftBoots in this.skills ? 1 : 0);
  }

  public canTraverse(cell: Cell): boolean {
    if (cell.object !== undefined) {
      return cell.object.type === WorldObjectType.PreviouslyVisited;
    }
    switch (cell.terrain) {
      case WorldTerrainType.Forest:
        return Skill.WoodlandExplorer in this.skills;
      case WorldTerrainType.Mountain:
        return Skill.Mountaineering in this.skills;
      case WorldTerrainType.Plains:
        return true;
      case WorldTerrainType.Lake:
      case WorldTerrainType.Void:
        return false;
    }
  }
}

export class GameState {
  public character: Character;
  public world: World<Cell>;
  public charPos: Position;
  public turnNumber: number;

  public constructor(startPos: Position) {
    const winit = World.init(worldInit);
    if ((winit.get(startPos) ?? WorldInit.Void) !== WorldInit.Start) {
      throw new Error("Invalid starting position");
    }
    this.character = new Character();
    this.world = winit.map(WorldInit.mapToCell);
    this.charPos = startPos;
    this.turnNumber = 0;
  }
}
