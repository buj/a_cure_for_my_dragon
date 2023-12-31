import { IPlayer, Prompt } from "../entities";
import {
  GameAction,
  GameActionType,
  GameState,
  WorldObjectType,
} from "../game";
import { QuestionContext, ShowContext } from "../protocol";
import { Deferred, createDeferred } from "../utils";

export type Question = {
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

export type Show = { prompt: Prompt<ShowContext>; what: any };

export class UIPlayer implements IPlayer<QuestionContext, ShowContext> {
  private gameState: GameState | null;

  public constructor(
    private setActiveQuestion: (q: Question) => void,
    private display: (s: Show) => void,
    private autoCollectResources: { current: boolean },
    private onUserAction: () => void
  ) {
    this.gameState = null;
  }

  makeDeferredWithUserActionHook(): Deferred<number> {
    const inner = createDeferred<number>();
    return {
      ...inner,
      resolve: (value: number) => {
        this.onUserAction();
        inner.resolve(value);
      },
    };
  }

  public chooseFromRange = (
    prompt: Prompt<QuestionContext>,
    l: number,
    r: number
  ): Promise<number> => {
    const answer = this.makeDeferredWithUserActionHook();
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
  };

  public chooseFromList: <T>(
    prompt: Prompt<QuestionContext>,
    ls: T[]
  ) => Promise<T> = async (prompt, ls) => {
    var answer = this.makeDeferredWithUserActionHook();
    if (
      this.gameState !== null &&
      this.autoCollectResources.current &&
      prompt.context === "chooseAction"
    ) {
      try {
        const gameState = this.gameState;
        const relevantResourceCollectActions = [
          ...ls.map((a) => a as GameAction).entries(),
        ].filter(([_, a]) => {
          if (a.type === GameActionType.Interact) {
            const cell = gameState.world.get(a.target);
            if (cell?.object?.type === WorldObjectType.ProductionBuilding) {
              const produce = cell.object.data.produces;
              if (
                gameState.character.inventory.alchemy[produce] <
                gameState.character.storageCapacity()
              ) {
                return true;
              }
            }
          }
          return false;
        });
        if (relevantResourceCollectActions.length > 0) {
          answer = createDeferred<number>();
          answer.resolve(relevantResourceCollectActions[0]![0]);
        }
      } catch (e) {
        console.log("auto-resource collector failed with error", e);
      }
    }
    this.setActiveQuestion({
      prompt,
      query: {
        type: "chooseFromList",
        ls,
      },
      answer,
    });
    return ls[await answer.promise]!;
  };

  public show: (prompt: Prompt<ShowContext>, value: any) => void = (
    prompt,
    value
  ) => {
    if (prompt.context === "gameState") {
      this.gameState = value;
    }
    this.display({
      prompt,
      what: value,
    });
  };
}
