export type RngContext =
  | "RecipeGenerator.generate.dialect"
  | "RecipeGenerator.generate.ingredients"
  | "caveBarrel.1"
  | "caveBarrel.2"
  | "caveTreasure"
  | "interactWithVillage.revealFirstPage"
  | "interactWithVillage.afterPurchasePageReveal";

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
  | "interactWithMerlon.giveIngredients.ingredientsAmounts"
  | "interactWithMerchant.tradeWhat"
  | "interactWithMerchant.tradeFor"
  | "interactWithSage.translateWhat"
  | "interactWithSage.learnWhat"
  | "chooseAction"
  | { keepOrReroll: RngContext };

export type ShowContext =
  | "caveBarrel.1"
  | "caveBarrel.2"
  | "caveTreasure"
  | "gameState";
