import React from "react";
import {
  AlchemicalResource,
  Character,
  Dialect,
  GameActionError,
  GameState,
  Skill,
  runGame,
} from "../game";
import { Question, Show, UIPlayer } from "./player";
import HistoryWidget, { DialogueHistory } from "./HistoryWidget";
import { IInput, Prng, PrngState, Prompt } from "../entities";
import Board from "./Board";
import RecipesWidget from "./RecipesWidget";
import LostPagesWidget from "./LostPagesWidget";
import { alchemyStr, dialectStr, progressBarStr, unaryStr } from "./utils";
import { FrozenDialogueEntry, GameData } from "./gameData";
import { RngContext } from "../protocol";

function ErrorPrompt(deps: { error: GameActionError }) {
  return <div className="errorPrompt">{JSON.stringify(deps.error)}</div>;
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

export type GameInit =
  | {
      type: "newGame";
      seed: string;
    }
  | {
      type: "loadGame";
      data: GameData;
    };

function initHistory(init: GameInit): DialogueHistory {
  return init.type === "loadGame"
    ? DialogueHistory.from(
        init.data.history.map(FrozenDialogueEntry.toDialogueEntry)
      )
    : DialogueHistory.create();
}

class PrngWithCallback implements IInput<RngContext> {
  public constructor(
    private rng: Prng<RngContext>,
    private onUpdate: (state: PrngState) => void
  ) {}

  public chooseFromRange = async (
    prompt: Prompt<RngContext>,
    l: number,
    r: number
  ) => {
    const result = await this.rng.chooseFromRange(prompt, l, r);
    this.onUpdate(this.rng.state());
    return result;
  };

  public chooseFromList: <T>(
    prompt: Prompt<RngContext>,
    ls: T[]
  ) => Promise<T> = async (prompt, ls) => {
    const result = await this.rng.chooseFromList(prompt, ls);
    this.onUpdate(this.rng.state());
    return result;
  };
}

export default function Game(deps: {
  init: GameInit;
  onUpdate: (update: {
    state?: GameState;
    history?: DialogueHistory;
    rngState?: PrngState;
  }) => void;
}) {
  const { init, onUpdate } = deps;

  const [lastInit, setLastInit] = React.useState<GameInit | null>(null);
  const [activeQuestion, setActiveQuestion] = React.useState<Question | null>(
    null
  );
  const [gameState, setGameState] = React.useState<GameState | null>(null);
  const [dialogueHistory, setDialogueHistory] = React.useState(
    initHistory(init)
  );
  const [latestError, setError] = React.useState<GameActionError | null>(null);

  if (init !== lastInit) {
    setLastInit(init);
    if (activeQuestion !== null) {
      activeQuestion.answer.reject("new game starting");
    }
    setActiveQuestion(null);
    setGameState(null);
    setDialogueHistory(initHistory(init));
    setError(null);
  }

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
      setDialogueHistory((dialogueHistory) => {
        const newHistory = dialogueHistory.add({
          type: "show",
          data: s,
        });
        onUpdate({ history: newHistory });
        return newHistory;
      });
      if (s.prompt.context === "gameState") {
        onUpdate({ state: s.what });
        setGameState(s.what);
      }
    };
    const player = new UIPlayer(onNewActiveQuestion, onShow);
    const rng = new PrngWithCallback(
      new Prng(init.type === "newGame" ? init.seed : init.data.rngState),
      (rngState) => onUpdate({ rngState })
    );
    runGame(
      init.type === "loadGame"
        ? {
            state: init.data.state,
            promptNumber: init.data.history.length,
          }
        : null,
      rng,
      player,
      setError
    ).catch((reason): void => {
      console.log("game ended with error", { reason: JSON.stringify(reason) });
    });
  }, [init, onUpdate, setActiveQuestion, setGameState, setDialogueHistory]);

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
      style={{
        flexGrow: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", overflowY: "clip", flexGrow: 1 }}>
        <div
          ref={historyContainerRef}
          style={{
            width: "40%",
            height: "100%",
            overflowY: "auto",
          }}
        >
          <HistoryWidget history={dialogueHistory} />
        </div>
        <Board question={activeQuestion} gameState={gameState} />
        <div style={{ width: "40%", height: "100%", overflowY: "auto" }}>
          {gameState !== null && (
            <>
              <RecipesWidget state={gameState} />
              <LostPagesWidget
                lostPagesGenerator={gameState.lostPagesGenerator}
              />
              <InventoryWidget character={gameState.character} />
              <SkillsWidget learnedSkills={gameState.character.skills} />
            </>
          )}
        </div>
      </div>
      {latestError && <ErrorPrompt error={latestError} />}
    </div>
  );
}
