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
} from "./game";

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

function RecipeWidget(inputs: { recipe: Recipe }) {
  const { recipe } = inputs;
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
        recipe.ingredientsCollected[key],
        recipe.ingredients[key]
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

function RecipeGeneratorWidget(input: { recipeGenerator: RecipeGenerator }) {
  const { recipeGenerator } = input;
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

function RecipesWidget(input: { state: GameState }) {
  const { state } = input;
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

// world: World<Cell>,
// callbacks: { onHexClick: (pos: { x: number; y: number }) => void }
function Board() {
  return (
    <svg width="80%" viewBox="0 0 2970 2100">
      <image href="board.svg" width="100%" height="100%" />
    </svg>
  );
}

export default function Game() {
  return (
    <div>
      <Board></Board>
    </div>
  );
}
