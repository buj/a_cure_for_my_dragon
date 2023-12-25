import React from "react";
import {
  AlchemicalResource,
  GameState,
  Recipe,
  RecipeGenerator,
} from "../game";
import { alchemyStr, dialectStr, progressBarStr } from "./utils";

function RecipeWidget(deps: { recipe: Recipe }) {
  const { recipe } = deps;
  if (recipe.dialect === null) {
    const costStr = Array(recipe.rubiesCost).fill("💎").flat().join("");
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
      .map((ls) => ls.map(alchemyStr).join(""))
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

export default function RecipesWidget(deps: { state: GameState }) {
  const { state } = deps;
  const recipesWidgets = state.recipes.map((recipe) =>
    RecipeWidget({ recipe })
  );
  return (
    <div className="recipes window">
      <h4>Recipes</h4>
      {recipesWidgets}
      <RecipeGeneratorWidget
        recipeGenerator={state.recipeGenerator}
      ></RecipeGeneratorWidget>
    </div>
  );
}
