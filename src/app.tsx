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
  InventoryOpt,
  Position,
  GameAction,
  GameActionType,
} from "./game";
import { IPlayer, Prng, Prompt } from "./entities";
import { Deferred, PromiseState, createDeferred, evalThunk } from "./utils";
import {
  PositionalQuestionContext,
  QuestionContext,
  RngContext,
  ShowContext,
  isPositionalQuestion,
} from "./protocol";

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

function unaryStr(n: number, unit: string = "☐"): string {
  return Array(n).fill(unit).flat().join();
}

function progressBarStr(numerator: number, denominator: number): string {
  const numRemaining = denominator - numerator;
  if (numRemaining < 0) {
    throw new Error("progressBar: numerator greater than denominator");
  }
  const fulfilledStr = unaryStr(numerator, "☑");
  const remainingStr = unaryStr(numRemaining);
  return `${fulfilledStr}${remainingStr}`;
}

function inventoryOptToString(x: InventoryOpt): string {
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
    return ls[await answer.promise]!;
  }

  public show<T>(prompt: Prompt<ShowContext>, value: T) {
    this.display({
      prompt,
      what: value,
    });
  }
}

type DialogueEntry =
  | {
      type: "question";
      data: Question;
    }
  | {
      type: "show";
      data: Show;
    };

namespace DialogueEntry {
  export function deriveKey(d: DialogueEntry): string {
    return JSON.stringify([d.type, d.data.prompt.key]);
  }
}

class DialogueHistory {
  public constructor(
    private history: Array<DialogueEntry> = [],
    private mapToOrd: Record<string, number> = {}
  ) {}

  // return this if no cutoff (i.e. `d` is not in history)
  cutOffBeyond(d: DialogueEntry): DialogueHistory | null {
    const ord = this.mapToOrd[DialogueEntry.deriveKey(d)];
    if (ord === undefined) {
      return null;
    }
    const newHistory = this.history.slice(0, ord + 1);
    const newMapToOrd = Object.fromEntries(
      Object.entries(this.mapToOrd).filter(([_, value]) => value <= ord)
    );
    return new DialogueHistory(newHistory, newMapToOrd);
  }

  public add(d: DialogueEntry): DialogueHistory {
    const afterCutoff = this.cutOffBeyond(d);
    if (afterCutoff !== null) {
      return afterCutoff;
    }
    const newHistory = [...this.history, d];
    const newMapToOrd = {
      ...this.mapToOrd,
      [DialogueEntry.deriveKey(d)]: this.history.length,
    };
    return new DialogueHistory(newHistory, newMapToOrd);
  }

  public getHistory(): Array<DialogueEntry> {
    return this.history;
  }
}

function translateQuestionContext(q: QuestionContext): string {
  if (typeof q === "object") {
    switch (q.keepOrReroll) {
      case "RecipeGenerator.generate.dialect":
        return "Do you want to reroll the generated recipe dialect?";
      case "RecipeGenerator.generate.ingredients":
        return "Do you want to reroll the generated recipe ingredients?";
      case "caveBarrel.1":
      case "caveBarrel.2":
        return "Do you want to reroll the loot from the barrel?";
      case "caveTreasure":
        return "Do you want to reroll the treasure?";
      case "interactWithVillage.afterPurchasePageReveal":
      case "interactWithVillage.revealFirstPage":
        return "Do you want to reroll the revealed village page?";
    }
  }
  switch (q) {
    case "cave.whichWay":
      return "Which way do you want to go next in the cave?";
    case "caveExit":
      return "Where do you want to exit the cave?";
    case "chooseAction":
      return "Choose an action to do (move: right click, interact: left click).";
    case "interactWithMarket.trade":
      return "What do you want to trade for what?";
    case "interactWithMarket.tradeType":
      return "What kind of trade?";
    case "interactWithMarlon.giveIngredients.whichRecipe":
      return "Which recipe do you want to contribute ingredients into?";
    case "interactWithMarlon.giveIngredients.ingredientsAmounts":
      return "How much do you want to contribute?";
    case "interactWithMarlon.revealDialect.whichRecipe":
      return "Which recipe's dialect do you want to reveal?";
    case "interactWithMarlon.revealIngredients.whichRecipe":
      return "Which recipe's ingredients do you want to reveal?";
    case "interactWithMarlon.type":
      return "What have you come to do at Marlon's?";
    case "interactWithMerchant.tradeFor":
      return "What page type do you want in return?";
    case "interactWithMerchant.tradeWhat":
      return "What page type do you want to trade?";
    case "interactWithSage.learnWhat":
      return "Which skill would you like to learn?";
    case "interactWithSage.translateWhat":
      return "Which page would you like to translate?";
    case "portalDestination":
      return "Choose portal destination.";
    case "startGame.honeyBuilding":
      return "Place the initial honey building (usual conditions apply -- it must be on mountains).";
    case "startGame.mushroomBuilding":
      return "Place the initial mushroom building (usual conditions apply -- it must be in forest).";
    case "startGame.waterlilyBuilding":
      return "Place the initial waterlily building (usual conditions apply -- it must be on a lake).";
    case "startGame.startPos":
      return "Choose your starting position.";
  }
}

function DialogueEntryVisualization(d: DialogueEntry) {
  switch (d.type) {
    case "question": {
      const questionText = translateQuestionContext(d.data.prompt.context);
      const answerText = evalThunk(() => {
        const answer = d.data.answer.getSync();
        switch (answer.state) {
          case PromiseState.Pending:
            return "...";
          case PromiseState.Resolved:
            return JSON.stringify(answer.value);
          case PromiseState.Rejected:
            return `<error: ${JSON.stringify(answer.reason)}>`;
        }
      });
      return (
        <div key={`Q(${d.data.prompt.key})`} className="historyQuestionEntry">
          <div>{`❓: ${questionText}`}</div>
          <div>{answerText}</div>
        </div>
      );
    }
    case "show": {
      const content = evalThunk(() => {
        switch (d.data.prompt.context) {
          case "caveBarrel.1":
          case "caveBarrel.2": {
            return `You got the following resources: ${inventoryOptToString(
              d.data.what
            )}`;
          }
          case "caveTreasure": {
            return `You got the following treasure: ${d.data.what}`;
          }
          case "gameState": {
            return `Move ${(d.data.what as GameState).turnNumber}`;
          }
        }
      });
      return (
        <div key={`S(${d.data.prompt.key})`} className="historyShowEntry">
          💬: {content}
        </div>
      );
    }
  }
}

function HistoryWidget(deps: { history: DialogueHistory }) {
  const { history } = deps;
  return (
    <div className="history">
      {history.getHistory().map(DialogueEntryVisualization)}
    </div>
  );
}

function ActiveQuestionWidget(deps: { question: Question }) {
  const { question: q } = deps;
  const questionText = translateQuestionContext(q.prompt.context);
  if (isPositionalQuestion(q.prompt.context)) {
    return <div className="activeQuestion">{questionText}</div>;
  }
  switch (q.query.type) {
    case "chooseFromList": {
      const optionsButtons = [...q.query.ls.entries()].map(([idx, option]) => {
        const clickHandler = () => {
          q.answer.resolve(idx);
        };
        return (
          <button key={idx} onClick={clickHandler}>
            {JSON.stringify(option)}
          </button>
        );
      });
      return (
        <div className="activeQuestion">
          {questionText}
          {optionsButtons}
        </div>
      );
    }
    case "chooseFromRange": {
      const [value, setValue] = React.useState(q.query.l);
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(parseInt(e.target.value));
      };
      const submit = () => {
        q.answer.resolve(value);
      };
      return (
        <div className="activeQuestion">
          {questionText}
          <input
            type="number"
            min={q.query.l}
            max={q.query.r}
            step="1"
            defaultValue={q.query.l}
            onChange={handleChange}
          />
          <button onClick={submit}>Submit</button>
        </div>
      );
    }
  }
}

class Vector2d {
  public constructor(public x: number, public y: number) {}

  public add(other: Vector2d): Vector2d {
    return new Vector2d(this.x + other.x, this.y + other.y);
  }

  public sub(other: Vector2d): Vector2d {
    return new Vector2d(this.x - other.x, this.y - other.y);
  }

  public mul(k: number): Vector2d {
    return new Vector2d(this.x * k, this.y * k);
  }

  public div(k: number): Vector2d {
    return new Vector2d(this.x / k, this.y / k);
  }
}

namespace BoardImpl {
  const origin = new Vector2d(645, 77);
  const dy = new Vector2d(-21.375, 37.3125);
  const dx = new Vector2d(42.9375, 0);
  export const hexRadius = 21.5;

  function getCenterPixelForPos(pos: Position): Vector2d {
    return origin.add(dx.mul(pos.x).add(dy.mul(pos.y)));
  }

  function getPosForPixel(pixel: Vector2d): Position {
    const relPos = pixel.sub(origin);
    const y = relPos.y / dy.y;
    const x = relPos.sub(dy.mul(y)).x / dx.x;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function computeSvgViewboxCoordsOfEvent(
    svgRef: React.RefObject<SVGSVGElement>,
    event: React.MouseEvent<SVGSVGElement>
  ): Vector2d {
    const svgElem = svgRef.current!;
    const tmp = svgElem.createSVGPoint();
    tmp.x = event.clientX;
    tmp.y = event.clientY;
    const transformedPoint = tmp.matrixTransform(
      svgElem.getScreenCTM()!.inverse()
    );
    return new Vector2d(transformedPoint.x, transformedPoint.y);
  }

  export function onClick(
    q: Question,
    event: React.MouseEvent<SVGSVGElement>,
    svgRef: React.RefObject<SVGSVGElement>
  ) {
    if (!isPositionalQuestion(q.prompt.context)) {
      return;
    }
    if (q.query.type !== "chooseFromList") {
      throw new Error("positional question but query is not a list");
    }
    const pixel = computeSvgViewboxCoordsOfEvent(svgRef, event);
    const pos = getPosForPixel(pixel);
    if (q.prompt.context === "chooseAction") {
      const actionType = evalThunk(() => {
        switch (event.button) {
          case 0:
            return GameActionType.Interact;
          case 2:
            return GameActionType.Move;
          default:
            return null;
        }
      });
      if (actionType === null) {
        return;
      }
      const matches = [
        ...q.query.ls.map((x) => x as GameAction).entries(),
      ].filter(
        ([_, action]) =>
          action.type === actionType &&
          action.target.x === pos.x &&
          action.target.y === pos.y
      );
      if (matches.length > 0) {
        if (matches.length > 1) {
          throw new Error(
            "unexpected: multiple matches for a given position and mouse button"
          );
        }
        q.answer.resolve(matches[0]![0]);
      }
    }
    const matches = [...q.query.ls.map((x) => x as Position).entries()].filter(
      ([_, { x, y }]) => x === pos.x && y === pos.y
    );
    if (matches.length > 0) {
      if (matches.length > 1) {
        throw new Error("unexpected: multiple matches for a given position");
      }
      q.answer.resolve(matches[0]![0]);
    }
  }

  export function onMouseMove(
    q: Question,
    event: React.MouseEvent<SVGSVGElement>,
    svgRef: React.RefObject<SVGSVGElement>,
    cursorRef: React.RefObject<SVGCircleElement>
  ) {
    if (!isPositionalQuestion(q.prompt.context)) {
      return;
    }
    if (q.query.type !== "chooseFromList") {
      throw new Error("positional question but query is not a list");
    }
    const pixel = computeSvgViewboxCoordsOfEvent(svgRef, event);
    const pos = getPosForPixel(pixel);

    var matched: boolean;
    if (q.prompt.context === "chooseAction") {
      const matches = [
        ...q.query.ls.map((x) => x as GameAction).entries(),
      ].filter(
        ([_, action]) => action.target.x === pos.x && action.target.y === pos.y
      );
      matched = matches.length > 0;
    } else {
      const matches = [
        ...q.query.ls.map((x) => x as Position).entries(),
      ].filter(([_, { x, y }]) => x === pos.x && y === pos.y);
      matched = matches.length > 0;
    }

    const cursor = cursorRef.current!;
    if (matched) {
      const targetPixel = getCenterPixelForPos(pos);
      cursor.setAttribute("cx", targetPixel.x.toString());
      cursor.setAttribute("cy", targetPixel.y.toString());
      cursor.setAttribute("visibility", "visible");
    } else {
      cursor.setAttribute("visibility", "hidden");
    }
  }
}

function Board(deps: {
  question: Question | null;
  gameState: GameState | null;
}) {
  const { question, gameState } = deps;
  const svgRef = React.useRef<SVGSVGElement>(null);
  const cursorRef = React.useRef<SVGCircleElement>(null);
  const onClick = evalThunk(() => {
    if (question === null) {
      return undefined;
    }
    return (e: React.MouseEvent<SVGSVGElement>) => {
      BoardImpl.onClick(question, e, svgRef);
    };
  });
  const onMouseMove = evalThunk(() => {
    if (question === null) {
      return undefined;
    }
    return (e: React.MouseEvent<SVGSVGElement>) => {
      BoardImpl.onMouseMove(question, e, svgRef, cursorRef);
    };
  });
  return (
    <svg
      ref={svgRef}
      width="80%"
      viewBox="0 0 1052 744"
      onClick={onClick}
      onMouseMove={onMouseMove}
    >
      <image href="board.svg" width="100%" height="100%" />
      <circle
        ref={cursorRef}
        visibility="hidden"
        r={BoardImpl.hexRadius}
        fill="none"
        stroke-width="3"
        stroke="#008800"
      />
    </svg>
  );
}

export default function Game() {
  const [activeQuestion, setActiveQuestion] = React.useState<Question | null>(
    null
  );
  const [gameState, setGameState] = React.useState<GameState | null>(null);
  const [dialogueHistory, setDialogueHistory] = React.useState(
    new DialogueHistory()
  );

  React.useEffect(() => {
    const show = (s: Show) => {
      setDialogueHistory((dialogueHistory) =>
        dialogueHistory.add({
          type: "show",
          data: s,
        })
      );
      if (s.prompt.context === "gameState") {
        setGameState(s.what);
      }
    };
    const player = new UIPlayer(setActiveQuestion, show);
    const prng = new Prng("164012421");
    runGame(prng, player);
  }, [setActiveQuestion, setGameState, setDialogueHistory]);

  return (
    <div className="game">
      {activeQuestion !== null && (
        <ActiveQuestionWidget question={activeQuestion}></ActiveQuestionWidget>
      )}
      <HistoryWidget history={dialogueHistory}></HistoryWidget>
      <Board question={activeQuestion} gameState={gameState}></Board>
      {gameState !== null && <RecipesWidget state={gameState}></RecipesWidget>}
    </div>
  );
}
