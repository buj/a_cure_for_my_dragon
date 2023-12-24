import React from "react";
import { QuestionContext, isPositionalQuestion } from "../protocol";
import { PromiseState, evalThunk } from "../utils";
import { Question, Show } from "./player";
import { inventoryOptToString } from "./utils";
import { GameState } from "../game";

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

export class DialogueHistory {
  public constructor(
    private history: Array<DialogueEntry> = [],
    private mapToOrd: Record<string, number> = {}
  ) {}

  // return this if no cutoff (i.e. `d` is not in history)
  cutOffBeyond = (d: DialogueEntry): DialogueHistory | null => {
    const ord = this.mapToOrd[DialogueEntry.deriveKey(d)];
    if (ord === undefined) {
      return null;
    }
    const newHistory = this.history.slice(0, ord + 1);
    const newMapToOrd = Object.fromEntries(
      Object.entries(this.mapToOrd).filter(([_, value]) => value <= ord)
    );
    return new DialogueHistory(newHistory, newMapToOrd);
  };

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
                  <div>{JSON.stringify(d.data.query.ls[answer.value])}</div>
                );
              case "chooseFromRange":
                return <div>{JSON.stringify(answer.value)}</div>;
            }
          }
          case PromiseState.Rejected:
            return <div>{`<error: ${JSON.stringify(answer.reason)}>`}</div>;
        }
      });
      return (
        <div key={`Q(${d.data.prompt.key})`} className="historyQuestionEntry">
          <div>{`❓: ${questionText}`}</div>
          {answerElem}
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

export default function HistoryWidget(deps: { history: DialogueHistory }) {
  const { history } = deps;
  return (
    <div className="history">
      {history.getHistory().map(DialogueEntryVisualization)}
    </div>
  );
}

function PendingQuestionChoices(deps: { question: Question }) {
  const { question: q } = deps;
  if (isPositionalQuestion(q.prompt.context)) {
    return;
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