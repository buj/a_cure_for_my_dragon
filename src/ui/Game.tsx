import React from "react";
import {
  AlchemicalResource,
  Character,
  Dialect,
  GameActionError,
  GameState,
  Inventory,
  Skill,
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

function InventoryWidget(deps: { character: Character }) {
  const { character } = deps;
  const elems: React.JSX.Element[] = [];
  if (character.inventory.rubies > 0) {
    elems.push(<div>💎: {unaryStr(character.inventory.rubies)}</div>);
  }
  for (const a in AlchemicalResource) {
    const count = character.inventory.alchemy[a as AlchemicalResource];
    if (count > 0) {
      elems.push(
        <div>
          {alchemyStr(a)}: {unaryStr(count)}
        </div>
      );
    }
  }
  for (const d in Dialect) {
    const rawCount = character.inventory.rawPages[d as Dialect];
    const translatedCount = character.inventory.translatedPages[d as Dialect];
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
      <div>capacity: {unaryStr(character.storageCapacity())}</div>
      {elems}
    </div>
  );
}

function SkillsWidget(deps: { learnedSkills: Skill[] }) {
  const { learnedSkills } = deps;
  const elems = Object.values(Skill).map((s) => {
    const tags = ["skill"].concat(learnedSkills.includes(s) ? ["learned"] : []);
    return <div className={tags.join(" ")}>{s}</div>;
  });
  return (
    <div className="skills window">
      <h4>Skills</h4>
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

  const historyContainerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (historyContainerRef.current) {
      historyContainerRef.current.scrollTop =
        historyContainerRef.current.scrollHeight;
    }
  }, [dialogueHistory]);

  return (
    <div
      className="game"
      style={{ display: "flex", flexDirection: "column", height: "95vh" }}
    >
      <div style={{ display: "flex", overflowY: "clip", flexGrow: 1 }}>
        <div
          ref={historyContainerRef}
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
            <InventoryWidget character={gameState.character} />
            <SkillsWidget learnedSkills={gameState.character.skills} />
          </div>
        )}
      </div>
      {latestError && <ErrorPrompt error={latestError} />}
    </div>
  );
}
