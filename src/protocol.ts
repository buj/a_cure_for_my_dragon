export type RngContext =
  | "RecipeGenerator.generate.dialect"
  | "RecipeGenerator.generate.ingredients"
  | "RecipeGenerator.generate.ingredient1RequiredAmount"
  | "RecipeGenerator.generate.ingredient2RequiredAmount"
  | "caveBarrel.1"
  | "caveBarrel.2"
  | "caveTreasure"
  | "interactWithVillage.revealPage";

export type QuestionContext =
  | "startGame.startPos"
  | "startGame.honeyBuilding"
  | "startGame.waterlilyBuilding"
  | "startGame.mushroomBuilding"
  | "cave.whichWay"
  | "caveExit"
  | "portalDestination"
  | "interactWithMarket.tradeType"
  | "interactWithMarket.trade"
  | "interactWithMarlon.type"
  | "interactWithMarlon.revealDialect.whichRecipe"
  | "interactWithMarlon.revealIngredients.whichRecipe"
  | "interactWithMarlon.giveIngredients.whichRecipe"
  | "interactWithMarlon.giveIngredients.ingredientsAmounts"
  | "interactWithMerchant.tradeWhat"
  | "interactWithMerchant.tradeFor"
  | "interactWithSage.translateWhat"
  | "interactWithSage.learnWhat"
  | "chooseAction"
  | { keepOrReroll: RngContext; value: any };

export type PositionalQuestionContext =
  | "caveExit"
  | "chooseAction"
  | "portalDestination"
  | "startGame.honeyBuilding"
  | "startGame.mushroomBuilding"
  | "startGame.waterlilyBuilding"
  | "startGame.startPos";

export function isPositionalQuestion(
  ctx: QuestionContext
): ctx is PositionalQuestionContext {
  switch (ctx) {
    case "caveExit":
    case "chooseAction":
    case "portalDestination":
    case "startGame.honeyBuilding":
    case "startGame.mushroomBuilding":
    case "startGame.waterlilyBuilding":
    case "startGame.startPos":
      return true;
    default:
      return false;
  }
}

export type ShowContext =
  | "RecipeGenerator.generate.dialect"
  | "RecipeGenerator.generate.ingredients"
  | "caveBarrel.1"
  | "caveBarrel.2"
  | "caveTreasure"
  | "interactWithVillage.revealPage"
  | "gameState"
  | { reroll: RngContext };
