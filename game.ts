import { ControlledInput, IInput, IPlayer, Prng, Prompt } from "./entities";

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

export type InventoryOpt = {
  rubies?: number;
  alchemy?: {
    [key in AlchemicalResource]?: number;
  };
  pages?: {
    [key in Dialect]?: {
      raw?: number;
      translated?: number;
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
    promptKey: string,
    rng: IInput,
    generator: LostPagesGenerator
  ): { lostPage: LostPage; generator: LostPagesGenerator } {
    const shift = rng.chooseFromRange(
      {
        context: "LostPagesGenerator.generate.shift",
        key: promptKey,
      },
      0,
      5
    );
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
    promptKey: string,
    rng: IInput,
    input: { village: Village; lostPagesGenerator: LostPagesGenerator }
  ): { village: Village; lostPagesGenerator: LostPagesGenerator } | null {
    const { village, lostPagesGenerator } = input;
    if (village.pages.length != 0) {
      return null;
    }
    const { lostPage, generator: newLostPagesGenerator } =
      LostPagesGenerator.generate(promptKey, rng, lostPagesGenerator);
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
    promptKey: string,
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
        promptKey,
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
    promptKey: string,
    rng: IInput,
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
        RecipeGenerator.generate(promptKey, rng, { recipeGenerator, recipe })!;
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
          numPagesCollected: 0,
        },
      };
    } else if (
      "numPagesCollected" in recipe &&
      recipe.numPagesCollected >= recipe.numPages
    ) {
      const { chosen: ingredientsCombo, rest: remainingIngredientsCombos } =
        IInput.chooseFromListWithoutReplacement(
          rng,
          {
            context: "RecipeGenerator.generate.ingredients",
            key: JSON.stringify([promptKey, 0]),
          },
          recipeGenerator.ingredientsRemainingCombinations
        );
      const [ingredient1, ingredient2] =
        ingredientsCombinationToList(ingredientsCombo);
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
    const newRubies = Math.min(
      this.inventory.rubies + (items.rubies ?? 0),
      this.storageCapacity()
    );
    const newAlchemy = { ...this.inventory.alchemy };
    if (items.alchemy !== undefined) {
      for (const key in items.alchemy) {
        newAlchemy[key] = Math.min(
          newAlchemy[key] + items.alchemy[key],
          this.storageCapacity()
        );
      }
    }
    const newPages = { ...this.inventory.pages };
    if (items.pages !== undefined) {
      for (const key in items.pages) {
        newPages[key] = Math.min(newPages[key] + items.pages[key], 4);
      }
    }
    return {
      ...this,
      inventory: {
        rubies: newRubies,
        alchemy: newAlchemy,
        pages: newPages,
      },
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
};

export namespace GameState {
  export function initial(startPos: Position): GameState {
    const winit = World.init(worldInit);
    if ((winit.get(startPos) ?? WorldInit.Void) !== WorldInit.Start) {
      throw new Error("Invalid starting position");
    }
    return {
      character: new Character(),
      world: winit.map(WorldInit.mapToCell),
      charPos: startPos,
      turnNumber: 0,
      lostPagesGenerator: LostPagesGenerator.create(),
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

  public nextPromptNumber(): BootstrappedGame {
    return new BootstrappedGame({
      ...this,
      promptNumber: this.promptNumber + 1,
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
  const reachables = game.state.world.bfs(
    game.state.charPos,
    movementSpeed,
    game.state.character.canTraverse
  );
  const reachablePositions = reachables.map((x) => x.pos);
  const isReachable =
    reachablePositions.filter((pos) => pos.x === target.x && pos.y === target.y)
      .length > 0;
  if (!isReachable) {
    return null;
  }
  const cell = game.state.world.get(target)!;
  if (cell.object !== undefined) {
    return null;
  }
  return game.withState({
    ...game.state,
    turnNumber: game.state.turnNumber + 1,
    charPos: target,
    world: game.state.world.set(target, {
      terrain: cell.terrain,
      object: {
        type: WorldObjectType.PreviouslyVisited,
        data: {
          turnNumber: game.state.turnNumber,
        },
      },
    }),
  });
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

  switch (whichWay) {
    case "barrel": {
      const ctx2: Prompt = {
        context: "caveBarrel.2",
        key: JSON.stringify([game.promptNumber, 2]),
      };
      const gain2 = caveBarrel(ctx2, game.rng());
      game.player.show(ctx2, gain2);
      const state2 = {
        ...state1,
        character: state1.character.gainItems(gain2),
      };
      return game.withState(state2).nextPromptNumber();
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
      const state2 = {
        ...state1,
        character: state1.character.withArtifact(gainedArtifact),
      };
      return game.withState(state2).nextPromptNumber();
    }
    default:
      throw new Error("unexpected");
  }
}

export function takeAction(
  action: GameAction,
  game: BootstrappedGame
): BootstrappedGame | null {
  switch (action.type) {
    case GameActionType.Move:
      return moveAction(action.target, game);
    case GameActionType.Interact: {
      const cell = game.state.world.get(action.target);
      if (cell === null || cell.object === undefined) {
        return null;
      }
      switch (cell.object.type) {
        case WorldObjectType.Cave:
          return enterCave(action.target, game);
        case WorldObjectType.Market:
          return null; // TODO
        case WorldObjectType.Marlon:
          return null; // TODO
        case WorldObjectType.Merchant:
          return null; // TODO
        case WorldObjectType.Portal:
          return null; // TODO
        case WorldObjectType.ProductionBuilding:
          return null; // TODO
        case WorldObjectType.Sage:
          return null; // TODO
        case WorldObjectType.Village:
          return null; // TODO
        default:
          return null;
      }
    }
  }
}
