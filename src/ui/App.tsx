import React from "react";
import Game, { GameInit } from "./Game";
import { GameState } from "../game";
import { DialogueHistory } from "./HistoryWidget";
import { PrngState } from "../entities";
import { FrozenDialogueEntry, GameData } from "./gameData";
import { evalThunk } from "../utils";
import { randomInt } from "fp-ts/lib/Random";

function entryMatchesGameState(
  entry: FrozenDialogueEntry,
  gameState: GameState
): boolean {
  if (entry.type === "show" && entry.data.prompt.context === "gameState") {
    return entry.data.what === gameState;
  }
  return false;
}

function loadInitGameData() {
  const str = localStorage.getItem("gameData");
  console.log("local storage gameData", str);
  if (str === null) {
    return null;
  }
  try {
    return GameData.deserialize(str);
  } catch (e) {
    console.log("could not deserialize game data", {
      error: e,
      data: str,
    });
  }
  return null;
}

class UndoStack {
  public constructor(
    private stack: GameData[] = [],
    public freeze: boolean = false
  ) {}

  public tryPush = (gameData: GameData) => {
    if (!this.freeze) {
      this.stack.push(gameData);
    }
  };

  public rewindOne = (): GameData | undefined => {
    if (this.stack.length >= 2) {
      this.stack = this.stack.slice(0, -1);
      return this.stack.slice(-1)[0]!;
    }
  };

  public tryClear = () => {
    if (!this.freeze) {
      this.stack = [];
    }
  };
}

class GameTracker {
  private isInsideUndo: boolean;

  public constructor(
    private undoStack: UndoStack,
    private currGameData: GameData | null,
    private accumulatedUpdate: Partial<GameData>
  ) {
    this.isInsideUndo = false;
  }

  public unfreezeUndoStack = () => {
    this.undoStack.freeze = false;
  };

  public onNewGame = (seed: string) => {
    this.undoStack = new UndoStack();
    this.currGameData = null;
    this.accumulatedUpdate = { initialSeed: seed };
  };

  public onUpdate = (update: {
    state?: GameState;
    history?: DialogueHistory;
    rngState?: PrngState;
  }) => {
    if (
      update.state !== undefined &&
      update.state !== this.currGameData?.state
    ) {
      this.accumulatedUpdate.state = update.state;
    }
    if (update.rngState !== undefined) {
      this.accumulatedUpdate.rngState = update.rngState;
      if (!this.isInsideUndo) {
        this.undoStack.tryClear();
      }
    }
    if (update.history !== undefined) {
      this.accumulatedUpdate.history = update.history
        .getHistory()
        .flatMap((d) => {
          const e = FrozenDialogueEntry.fromDialogueEntry(d);
          if (e === null) {
            return [];
          }
          return [e];
        });
    }

    const newGameData: GameData | null = evalThunk(() => {
      if (this.currGameData === null) {
        if (
          this.accumulatedUpdate.history !== undefined &&
          this.accumulatedUpdate.rngState !== undefined &&
          this.accumulatedUpdate.state !== undefined
        ) {
          return {
            initialSeed: this.accumulatedUpdate.initialSeed,
            history: this.accumulatedUpdate.history!,
            rngState: this.accumulatedUpdate.rngState!,
            state: this.accumulatedUpdate.state!,
          };
        }
      }
      if (
        this.accumulatedUpdate.history !== undefined &&
        this.accumulatedUpdate.state !== undefined &&
        entryMatchesGameState(
          this.accumulatedUpdate.history.slice(-1)[0]!,
          this.accumulatedUpdate.state
        )
      ) {
        return {
          initialSeed: this.currGameData?.initialSeed,
          history: this.accumulatedUpdate.history!,
          state: this.accumulatedUpdate.state!,
          rngState:
            this.accumulatedUpdate.rngState ?? this.currGameData!.rngState,
        };
      }
      return null;
    });

    if (newGameData !== null) {
      this.undoStack.tryPush(newGameData);

      if (this.currGameData !== null || this.isInsideUndo) {
        localStorage.setItem("gameData", GameData.serialize(newGameData));
      }

      this.currGameData = newGameData;
      this.accumulatedUpdate = {};
      this.isInsideUndo = false;
      this.undoStack.freeze = true;
    }
  };

  public startUndo = (): GameData | undefined => {
    const prev = this.undoStack.rewindOne();
    if (prev !== undefined) {
      this.currGameData = null;
      this.undoStack.freeze = true;
      this.isInsideUndo = true;
      return prev;
    }
  };
}

namespace GameTracker {
  export function create(seed?: string): GameTracker {
    return new GameTracker(new UndoStack(), null, { initialSeed: seed });
  }
}

export default function App() {
  const [gameInit, setGameInit] = React.useState<GameInit | null>(() => {
    const initGameData = loadInitGameData();
    if (initGameData !== null) {
      return { type: "loadGame", data: initGameData };
    }
    return null;
  });
  const gameInitSeed = evalThunk(() => {
    switch (gameInit?.type) {
      case "loadGame":
      case "undo":
        return gameInit.data.initialSeed;
      case "newGame":
        return gameInit.seed;
      case null:
        return undefined;
    }
  });
  const gameTrackerRef = React.useRef(GameTracker.create(gameInitSeed));

  const onUpdate = React.useCallback(gameTrackerRef.current.onUpdate, [
    gameTrackerRef,
  ]);
  const onUserAction = React.useCallback(() => {
    gameTrackerRef.current.unfreezeUndoStack();
  }, [gameTrackerRef]);

  const seedInputRef = React.useRef<HTMLInputElement>(null);
  const defaultSeedInput = gameInitSeed ?? "rng seed";
  const [seedInput, setSeedInput] = React.useState<string>(defaultSeedInput);
  const handleSeedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeedInput(e.target.value);
  };

  const autocollectResourcesRef = React.useRef<boolean>(true);
  const onAutocollectSettingChange = () => {
    autocollectResourcesRef.current = !autocollectResourcesRef.current;
  };

  const handleOnStart = () => {
    gameTrackerRef.current.onNewGame(seedInput);
    setGameInit({
      type: "newGame",
      seed: seedInput,
    });
  };

  const handleOnStartRandomSeed = () => {
    const randomSeed = `${randomInt(0, 1023456789)()}`;
    gameTrackerRef.current.onNewGame(randomSeed);
    if (seedInputRef.current) {
      seedInputRef.current.value = randomSeed;
    }
    setGameInit({
      type: "newGame",
      seed: randomSeed,
    });
  };

  const handleUndo = () => {
    const gameData = gameTrackerRef.current.startUndo();
    if (gameData !== undefined) {
      setGameInit({
        type: "undo",
        data: gameData,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "z" && e.ctrlKey) {
      handleUndo();
    }
  };

  const appRef = React.useRef<HTMLDivElement>(null);
  const handleBlur = (e: React.FocusEvent) => {
    if (appRef.current !== null) {
      if (e.relatedTarget === null) {
        appRef.current.focus();
      }
    }
  };

  return (
    <div
      ref={appRef}
      className="app"
      tabIndex={-1}
      style={{ display: "flex", flexDirection: "column", height: "95vh" }}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <div className="controlPanel">
        <div>
          <input
            id="seedInput"
            ref={seedInputRef}
            onChange={handleSeedInputChange}
            defaultValue={defaultSeedInput}
          />
          <button onClick={handleOnStart}>
            Start game with specified random seed
          </button>
          <button onClick={handleOnStartRandomSeed}>
            Start game with random random seed
          </button>
        </div>
        <div>
          <button onClick={handleUndo}>Undo turn (ctrl + z)</button>
          <input
            id="autocollectGoods"
            type="checkbox"
            defaultChecked={true}
            onClick={onAutocollectSettingChange}
          />
          <label htmlFor="autocollectGoods">autocollect goods</label>
        </div>
      </div>
      {gameInit !== null && (
        <Game
          init={gameInit}
          onUpdate={onUpdate}
          autoCollectResources={autocollectResourcesRef}
          onUserAction={onUserAction}
        />
      )}
    </div>
  );
}
