import React from "react";
import { QuestionContext, isPositionalQuestion } from "../protocol";
import { PromiseState, evalThunk } from "../utils";
import { Question, Show } from "./player";
import {
  alchemyStr,
  dialectStr,
  inventoryOptToString,
  lostPageStr,
  visualizeUnknown,
} from "./utils";
import {
  AlchemicalResource,
  GameState,
  LostPage,
  RecipeGenerator,
} from "../game";

export type DialogueEntry =
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

export class DialogueHistory {
  constructor(
    private history: Array<DialogueEntry>,
    private mapToOrd: Record<string, number>
  ) {}

  /** Returns `null` if no cutoff (i.e. `d` is not in history),
   * and returns `this` if cutoff is exactly at the end (nothing is
   * cut off, but `d` is in history).
   */
  cutOffBeyond = (d: DialogueEntry): DialogueHistory | null => {
    const ord = this.mapToOrd[DialogueEntry.deriveKey(d)];
    if (ord === undefined) {
      return null;
    }
    if (ord === this.history.length - 1) {
      return this;
    }
    const newHistory = this.history.slice(0, ord + 1);
    const newMapToOrd = Object.fromEntries(
      Object.entries(this.mapToOrd).filter(([_, value]) => value <= ord)
    );
    return new DialogueHistory(newHistory, newMapToOrd);
  };

  /** Returns `this` if `d` is the very last entry of the history. */
  public add = (d: DialogueEntry): DialogueHistory => {
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
  };

  public getHistory = (): Array<DialogueEntry> => {
    return this.history;
  };
}

export namespace DialogueHistory {
  export function create(): DialogueHistory {
    return new DialogueHistory([], {});
  }

  export function from(history: Array<DialogueEntry>): DialogueHistory {
    const mapToOrd: Record<string, number> = {};
    for (const [i, d] of history.entries()) {
      const key = DialogueEntry.deriveKey(d);
      mapToOrd[key] = i;
    }
    return new DialogueHistory(history, mapToOrd);
  }
}

function translateQuestionContext(q: QuestionContext): string {
  if (typeof q === "object") {
    switch (q.type) {
      case "keepOrReroll": {
        switch (q.rngCtx) {
          case "RecipeGenerator.generate.dialect":
            return `Do you want to reroll the generated recipe dialect (${dialectStr(
              q.value
            )}) ?`;
          case "RecipeGenerator.generate.ingredients": {
            const ingredientsStr = (q.value as AlchemicalResource[])
              .map(alchemyStr)
              .join("");
            return `Do you want to reroll the generated recipe ingredients (${ingredientsStr}) ?`;
          }
          case "RecipeGenerator.generate.ingredient1RequiredAmount":
            return `Do you want to reroll ingredient 1 required amount (${q.value}) ?`;
          case "RecipeGenerator.generate.ingredient2RequiredAmount":
            return `Do you want to reroll ingredient 2 required amount (${q.value}) ?`;
          case "caveBarrel.1":
          case "caveBarrel.2": {
            const lootStr = inventoryOptToString(q.value);
            return `Do you want to reroll the loot from the barrel (${lootStr}) ?`;
          }
          case "caveTreasure":
            return `Do you want to reroll the treasure (${q.value}) ?`;
          case "interactWithVillage.revealPage": {
            return `Lost pages will advance ${q.value}, do you want to reroll?`;
          }
        }
        throw new Error("unexpected, this should be unreachable");
      }
      case "interactWithMarlon.giveIngredients.ingredientsAmounts": {
        return `How much ${alchemyStr(
          q.ingredient
        )} do you want to contribute?`;
      }
    }
  }
  switch (q) {
    case "cave.whichWay":
      return "Which way do you want to go next in the cave?";
    case "caveExit":
      return "Where do you want to exit the cave?";
    case "chooseAction":
      return "Choose an action to do (move: left click, interact: middle click).";
    case "interactWithMarket.trade":
      return "What do you want to trade for what?";
    case "interactWithMarket.tradeType":
      return "What kind of trade?";
    case "interactWithMarlon.giveIngredients.whichRecipe":
      return "Which recipe do you want to contribute ingredients into?";
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
      return "Which skill would you like to learn? (cost: 1💎 if any)";
    case "interactWithSage.translateWhat":
      return "Which page would you like to translate? (cost: 1💎 if any)";
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
      const answerElem = evalThunk(() => {
        const answer = d.data.answer.getSync();
        switch (answer.state) {
          case PromiseState.Pending:
            return (
              <PendingQuestionChoices
                question={d.data}
              ></PendingQuestionChoices>
            );
          case PromiseState.Resolved: {
            switch (d.data.query.type) {
              case "chooseFromList":
                return (
                  <div>{visualizeUnknown(d.data.query.ls[answer.value])}</div>
                );
              case "chooseFromRange":
                return <div>{answer.value}</div>;
            }
          }
          case PromiseState.Rejected:
            return <div>{`<error: ${JSON.stringify(answer.reason)}>`}</div>;
        }
      });
      return (
        <div key={`Q(${d.data.prompt.key})`} className="historyEntry">
          <div>{`❓: ${questionText}`}</div>
          {answerElem}
        </div>
      );
    }
    case "show": {
      const content = evalThunk(() => {
        if (typeof d.data.prompt.context === "object") {
          return `Rerolled to ${visualizeUnknown(d.data.what)}`;
        }
        switch (d.data.prompt.context) {
          case "RecipeGenerator.generate.dialect": {
            return `Recipe has dialect ${dialectStr(d.data.what)}`;
          }
          case "RecipeGenerator.generate.ingredients": {
            return `Recipe requires ${inventoryOptToString(d.data.what)}`;
          }
          case "caveBarrel.1":
          case "caveBarrel.2": {
            return `You got the following resources: ${inventoryOptToString(
              d.data.what
            )}`;
          }
          case "caveTreasure": {
            return `You got the following treasure: ${d.data.what}`;
          }
          case "interactWithVillage.revealPage": {
            const page = d.data.what as LostPage;
            return `Village has page ${lostPageStr(page)}]`;
          }
          case "gameState": {
            return `Move ${(d.data.what as GameState).turnNumber}`;
          }
          case "victory": {
            return "You win!";
          }
        }
      });
      return (
        <div key={`S(${d.data.prompt.key})`} className="historyEntry">
          💬: {content}
        </div>
      );
    }
  }
}

export default function HistoryWidget(deps: { history: DialogueHistory }) {
  const { history } = deps;

  // filter out gameState updates that do not correspond to moves
  const ls = evalThunk(() => {
    var lastTurnNumber: number = -1;
    var tmp: DialogueEntry[] = [];
    for (const d of history.getHistory()) {
      switch (d.type) {
        case "question": {
          tmp.push(d);
          break;
        }
        case "show": {
          switch (d.data.prompt.context) {
            case "gameState": {
              const turnNumber = (d.data.what as GameState).turnNumber;
              if (turnNumber > lastTurnNumber) {
                lastTurnNumber = turnNumber;
                tmp.push(d);
              }
              break;
            }
            default: {
              tmp.push(d);
              break;
            }
          }
        }
      }
    }
    return tmp;
  });

  return <div className="history">{ls.map(DialogueEntryVisualization)}</div>;
}

function PendingQuestionChoices(deps: { question: Question }) {
  const { question: q } = deps;
  if (isPositionalQuestion(q.prompt.context)) {
    return;
  }
  switch (q.query.type) {
    case "chooseFromList": {
      const optionsButtons = [...q.query.ls.entries()].map(([idx, option]) => {
        const buttonRef = React.useRef<HTMLButtonElement>(null);
        const clickHandler = () => {
          q.answer.resolve(idx);
          if (buttonRef.current !== null) {
            buttonRef.current.blur();
          }
        };
        return (
          <button ref={buttonRef} key={idx} onClick={clickHandler}>
            {visualizeUnknown(option)}
          </button>
        );
      });
      return <>{optionsButtons}</>;
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
        <>
          <input
            type="number"
            min={q.query.l}
            max={q.query.r}
            step="1"
            defaultValue={q.query.l}
            onChange={handleChange}
          />
          <button onClick={submit}>Submit</button>
        </>
      );
    }
  }
}
