import React from "react";
import Game, { GameInit } from "./Game";
import { GameState } from "../game";
import { DialogueHistory } from "./HistoryWidget";
import { PrngState } from "../entities";
import { FrozenDialogueEntry, GameData } from "./gameData";
import { evalThunk } from "../utils";

export default function App() {
  const initGameData = evalThunk(() => {
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
  });

  const currGameDataRef = React.useRef<Partial<GameData>>(initGameData ?? {});
  const [gameInit, setGameInit] = React.useState<GameInit | null>(
    initGameData !== null ? { type: "loadGame", data: initGameData } : null
  );

  const onUpdate = React.useCallback(
    (update: {
      state?: GameState;
      history?: DialogueHistory;
      rngState?: PrngState;
      sync?: true;
    }) => {
      const gameDataRef = currGameDataRef.current;
      if (update.state !== undefined) {
        gameDataRef.state = update.state;
      }
      if (update.rngState !== undefined) {
        gameDataRef.rngState = update.rngState;
      }
      if (update.history !== undefined) {
        gameDataRef.history = update.history.getHistory().flatMap((d) => {
          const e = FrozenDialogueEntry.fromDialogueEntry(d);
          if (e === null) {
            return [];
          }
          return [e];
        });
      }
      if (update.sync) {
        localStorage.setItem(
          "gameData",
          GameData.serialize({
            rngState: gameDataRef.rngState!,
            state: gameDataRef.state!,
            history: gameDataRef.history!,
          })
        );
      }
    },
    [currGameDataRef]
  );

  const [seedInput, setSeedInput] = React.useState<string>("rng seed");
  const handleSeedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeedInput(e.target.value);
  };

  const autocollectResourcesRef = React.useRef<boolean>(true);
  const onAutocollectSettingChange = () => {
    autocollectResourcesRef.current = !autocollectResourcesRef.current;
  };

  const handleOnStart = () => {
    currGameDataRef.current = {};
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
        <div>
          <input
            id="seedInput"
            onChange={handleSeedInputChange}
            defaultValue={"rng seed"}
          />
          <button onClick={handleOnStart}>Start game</button>
        </div>
        <div>
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
        />
      )}
    </div>
  );
}
