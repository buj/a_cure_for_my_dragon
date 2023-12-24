import React from "react";
import {
  AlchemicalResource,
  Dialect,
  GameActionError,
  GameState,
  Inventory,
  runGame,
} from "../game";
import { Question, Show, UIPlayer } from "./player";
import HistoryWidget, { DialogueHistory } from "./HistoryWidget";
import { Prng } from "../entities";
import Board from "./Board";
import RecipesWidget from "./RecipesWidget";
import LostPagesWidget from "./LostPagesWidget";
import { alchemyStr, dialectStr, progressBarStr, unaryStr } from "./utils";

function ErrorPrompt(deps: { error: GameActionError }) {
  return <div className="errorPrompt window">{JSON.stringify(deps.error)}</div>;
}

function InventoryWidget(deps: { inventory: Inventory }) {
  const { inventory } = deps;
  const elems: React.JSX.Element[] = [];
  if (inventory.rubies > 0) {
    elems.push(<div>💎: {unaryStr(inventory.rubies)}</div>);
  }
  for (const a in AlchemicalResource) {
    const count = inventory.alchemy[a as AlchemicalResource];
    if (count > 0) {
      elems.push(
        <div>
          {alchemyStr(a)}: {unaryStr(count)}
        </div>
      );
    }
  }
  for (const d in Dialect) {
    const rawCount = inventory.rawPages[d as Dialect];
    const translatedCount = inventory.translatedPages[d as Dialect];
    if (rawCount + translatedCount > 0) {
      elems.push(
        <div>
          {dialectStr(d)}:{" "}
          {progressBarStr(translatedCount, translatedCount + rawCount)}
        </div>
      );
    }
  }
  return (
    <div className="inventory window">
      <h4>Inventory</h4>
      {elems}
    </div>
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
  const [latestError, setError] = React.useState<GameActionError | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setError(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [latestError, setError]);

  React.useEffect(() => {
    const onNewActiveQuestion = (q: Question) => {
      setDialogueHistory((dialogueHistory) =>
        dialogueHistory.add({
          type: "question",
          data: q,
        })
      );
      setActiveQuestion(q);
    };
    const onShow = (s: Show) => {
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
    const player = new UIPlayer(onNewActiveQuestion, onShow);
    const prng = new Prng("164012421");
    runGame(prng, player, setError);
  }, [setActiveQuestion, setGameState, setDialogueHistory]);

  return (
    <div
      className="game"
      style={{ display: "flex", flexDirection: "column", height: "95vh" }}
    >
      <div style={{ display: "flex", overflowY: "clip", flexGrow: 1 }}>
        <div
          style={{
            width: "20%",
            height: "100%",
            overflowY: "auto",
          }}
        >
          <HistoryWidget history={dialogueHistory} />
        </div>
        <div style={{ width: "60%", maxHeight: "100%" }}>
          <Board question={activeQuestion} gameState={gameState} />
        </div>
        {gameState !== null && (
          <div style={{ width: "20%", height: "100%", overflowY: "auto" }}>
            <RecipesWidget state={gameState} />
            <LostPagesWidget
              lostPagesGenerator={gameState.lostPagesGenerator}
            />
            <InventoryWidget inventory={gameState.character.inventory} />
          </div>
        )}
      </div>
      {latestError && <ErrorPrompt error={latestError} />}
    </div>
  );
}
