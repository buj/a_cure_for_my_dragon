import React from "react";
import Game, { GameInit } from "./Game";
import { GameState } from "../game";
import { DialogueHistory } from "./HistoryWidget";
import { PrngState } from "../entities";
import { FrozenDialogueEntry, GameData } from "./gameData";

export default function App() {
  const [currGameData, setCurrGameData] = React.useState<Partial<GameData>>({});
  const [gameInit, setGameInit] = React.useState<GameInit | null>(null);

  const onUpdate = React.useCallback(
    (update: {
      state?: GameState;
      history?: DialogueHistory;
      rngState?: PrngState;
    }) => {
      setCurrGameData((oldData: Partial<GameData>) => {
        const result = { ...oldData };
        if (update.state !== undefined) {
          result.state = update.state;
        }
        if (update.history !== undefined) {
          result.history = update.history.getHistory().flatMap((d) => {
            const e = FrozenDialogueEntry.fromDialogueEntry(d);
            if (e === null) {
              return [];
            }
            return [e];
          });
        }
        if (update.rngState !== undefined) {
          result.rngState = update.rngState;
        }
        return result;
      });
    },
    [setCurrGameData]
  );

  const [seedInput, setSeedInput] = React.useState<string>("rng seed");
  const handleSeedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeedInput(e.target.value);
  };

  const handleOnStart = () => {
    setGameInit({
      type: "newGame",
      seed: seedInput,
    });
  };

  return (
    <div
      className="app"
      style={{ display: "flex", flexDirection: "column", height: "95vh" }}
    >
      <div className="controlPanel">
        <input
          id="seedInput"
          onChange={handleSeedInputChange}
          defaultValue={"rng seed"}
        />
        <button onClick={handleOnStart}>Start game</button>
      </div>
      {gameInit !== null && <Game init={gameInit} onUpdate={onUpdate} />}
    </div>
  );
}
