import React from "react";
import {
  Cell,
  World,
  Recipe,
  Dialect,
  AlchemicalResource,
  Recipe2,
  Recipe3,
  GameState,
  RecipeGenerator,
  runGame,
} from "./game";
import { IPlayer, Prng, Prompt } from "./entities";
import { Deferred, createDeferred } from "./utils";
import { QuestionContext, ShowContext } from "./protocol";

function dialectStr(d: string): string {
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

function alchemyStr(a: string): string {
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

function progressBarStr(numerator: number, denominator: number): string {
  const numRemaining = denominator - numerator;
  if (numRemaining < 0) {
    throw new Error("progressBar: numerator greater than denominator");
  }
  const fulfilledStr = Array(numerator).fill("☑").flat().join();
  const remainingStr = Array(numRemaining).fill("☐").flat().join();
  return `${fulfilledStr}${remainingStr}`;
}

function RecipeWidget(deps: { recipe: Recipe }) {
  const { recipe } = deps;
  if (recipe.dialect === null) {
    const costStr = Array(recipe.rubiesCost).fill("💎").flat().join();
    const numPagesStr = `[?]⨉${recipe.numPages}`;
    return (
      <div className="recipe">
        {costStr} → {numPagesStr}
      </div>
    );
  }
  if (!("ingredients" in recipe)) {
    const numPagesStr: string = `[${dialectStr(recipe.dialect)}]⨉${
      recipe.numPages
    }`;
    return <div className="recipe">{numPagesStr}</div>;
  }

  var lines;
  if ("ingredientsCollected" in recipe) {
    lines = Object.keys(recipe.ingredients).map((key) => {
      const line = `${alchemyStr(key)} : ${progressBarStr(
        recipe.ingredientsCollected[key as AlchemicalResource]!,
        recipe.ingredients[key as AlchemicalResource]!
      )}`;
      return <div className="recipe.ingredient">{line}</div>;
    });
  } else {
    lines = Object.entries(recipe.ingredients).map(([key, value]) => {
      const line = `${alchemyStr(key)} : ${progressBarStr(value, value)}`;
      return <div className="recipe.ingredient">{line}</div>;
    });
    lines = [...lines, <div className="recipe.finished">finished!</div>];
  }
  return <div className="recipe">{lines}</div>;
}

function RecipeGeneratorWidget(deps: { recipeGenerator: RecipeGenerator }) {
  const { recipeGenerator } = deps;
  const remainingDialectsStr = recipeGenerator.remainingDialects
    .map(dialectStr)
    .join(", ");
  const remainingCountsStr = recipeGenerator.ingredientsRemainingCounts
    .map((c) => `${c}`)
    .join(", ");
  const remainingIngredientCombinationsStr =
    recipeGenerator.ingredientsRemainingCombinations
      .map((ls) => ls.map(alchemyStr).join())
      .join(", ");
  return (
    <div className="recipeGenerator">
      <div>remaining dialects: {remainingDialectsStr}</div>
      <div>
        remaining ingredients combinations: {remainingIngredientCombinationsStr}
      </div>
      <div>remaining ingredients counts: {remainingCountsStr}</div>
    </div>
  );
}

function RecipesWidget(deps: { state: GameState }) {
  const { state } = deps;
  const recipesWidgets = state.recipes.map((recipe) =>
    RecipeWidget({ recipe })
  );
  return (
    <div className="recipes">
      {recipesWidgets}
      <RecipeGeneratorWidget
        recipeGenerator={state.recipeGenerator}
      ></RecipeGeneratorWidget>
    </div>
  );
}

type Question = {
  prompt: Prompt<QuestionContext>;
  query:
    | {
        type: "chooseFromRange";
        l: number;
        r: number;
      }
    | {
        type: "chooseFromList";
        ls: any[];
      };
  answer: Deferred<number>;
};

type Show = { prompt: Prompt<ShowContext>; what: any };

class UIPlayer implements IPlayer<QuestionContext, ShowContext> {
  public constructor(
    private setActiveQuestion: (q: Question) => void,
    private display: (s: Show) => void
  ) {}

  public chooseFromRange(
    prompt: Prompt<QuestionContext>,
    l: number,
    r: number
  ): Promise<number> {
    const answer = createDeferred<number>();
    this.setActiveQuestion({
      prompt,
      query: {
        type: "chooseFromRange",
        l,
        r,
      },
      answer,
    });
    return answer.promise;
  }

  public async chooseFromList<T>(
    prompt: Prompt<QuestionContext>,
    ls: T[]
  ): Promise<T> {
    const answer = createDeferred<number>();
    this.setActiveQuestion({
      prompt,
      query: {
        type: "chooseFromList",
        ls,
      },
      answer,
    });
    return ls[await answer.promise];
  }

  public show<T>(prompt: Prompt<ShowContext>, value: T) {
    this.display({
      prompt,
      what: value,
    });
  }
}

function PromptWidget(deps: { question: Question | null; info: Show | null }) {}

function Board(deps: {
  question: Question | null;
  gameState: GameState | null;
}) {
  const { question, gameState } = deps;
  return (
    <svg width="80%" viewBox="0 0 2970 2100">
      <image href="board.svg" width="100%" height="100%" />
    </svg>
  );
}

export default function Game() {
  const [question, setQuestion] = React.useState<Question | null>(null);
  const [info, setInfo] = React.useState<Show | null>(null);
  const [gameState, setGameState] = React.useState<GameState | null>(null);

  React.useEffect(() => {
    const setShow = (s: Show) => {
      if (s.prompt.context === "gameState") {
        setGameState(s.what);
      } else {
        setInfo(s);
      }
    };
    const player = new UIPlayer(setQuestion, setShow);
    const prng = new Prng("164012421");
    runGame(prng, player);
  }, [setQuestion, setInfo, setGameState]);

  return (
    <div>
      <Board question={question} gameState={gameState}></Board>
      {gameState !== null && <RecipesWidget state={gameState}></RecipesWidget>}
    </div>
  );
}
